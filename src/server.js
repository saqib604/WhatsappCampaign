const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const WhatsAppWebJSAdapter = require('./whatsapp-webjs.adapter');
const { processCampaign } = require('./runner');

const app = express();
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });
const prisma = new PrismaClient();

// Dynamic Engine Driver – swap this line to change messaging adapters
const activeEngine = new WhatsAppWebJSAdapter();
activeEngine.initialize().catch((err) => {
    console.error('Failed to initialize WhatsApp engine:', err);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// ---------------------------------------------------------------------------
// Dashboard – campaigns, metrics, templates
// ---------------------------------------------------------------------------
app.get('/', async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            include: {
                template: true,
                _count: { select: { messages: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const templates = await prisma.template.findMany({
            orderBy: { name: 'asc' }
        });

        const enrichedCampaigns = await Promise.all(
            campaigns.map(async (c) => {
                const sent = await prisma.message.count({
                    where: { campaignId: c.id, status: 'SENT' }
                });
                const failed = await prisma.message.count({
                    where: { campaignId: c.id, status: 'FAILED' }
                });
                const pending = await prisma.message.count({
                    where: { campaignId: c.id, status: 'PENDING' }
                });
                return {
                    ...c,
                    metrics: { sent, failed, pending }
                };
            })
        );

        res.render('dashboard', {
            campaigns: enrichedCampaigns,
            templates,
            engineReady: await activeEngine.isReady()
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load dashboard: ' + err.message);
    }
});

// ---------------------------------------------------------------------------
// Template creation
// ---------------------------------------------------------------------------
app.post('/templates', async (req, res) => {
    try {
        const { name, content } = req.body;
        if (!name || !content) {
            return res.status(400).send('Name and content are required.');
        }
        await prisma.template.create({ data: { name, content } });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to create template: ' + err.message);
    }
});

// ---------------------------------------------------------------------------
// Campaign launch + CSV import
// ---------------------------------------------------------------------------
app.post('/campaigns/launch', upload.single('csvFile'), async (req, res) => {
    const { campaignName, templateId, genericMessageText } = req.body;

    if (!campaignName) {
        return res.status(400).send('Campaign name is required.');
    }
    if (!req.file) {
        return res.status(400).send('CSV file is required.');
    }

    const filePath = req.file.path;
    const records = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => records.push(data))
        .on('end', async () => {
            try {
                if (records.length === 0) {
                    fs.unlinkSync(filePath);
                    return res.status(400).send('CSV file is empty or could not be parsed.');
                }

                const newCampaign = await prisma.campaign.create({
                    data: {
                        name: campaignName,
                        templateId: templateId || null,
                        status: 'DRAFT'
                    }
                });

                const messagesPayload = records.map((row) => {
                    const rawPhone =
                        row.phone ||
                        row.phoneNumber ||
                        row.mobile ||
                        row.Phone ||
                        row.PHONE ||
                        '';
                    return {
                        campaignId: newCampaign.id,
                        phoneNumber: String(rawPhone).trim(),
                        status: 'PENDING',
                        variables: row,
                        sentText: genericMessageText || ''
                    };
                });

                await prisma.message.createMany({ data: messagesPayload });
                fs.unlinkSync(filePath);

                // Fire-and-forget background processing
                processCampaign(newCampaign.id, activeEngine).catch((err) => {
                    console.error('Campaign processing error:', err);
                });

                res.redirect('/');
            } catch (err) {
                console.error(err);
                try {
                    fs.unlinkSync(filePath);
                } catch (_) {}
                res.status(500).send(
                    'An error occurred during campaign import: ' + err.message
                );
            }
        })
        .on('error', (err) => {
            console.error(err);
            try {
                fs.unlinkSync(filePath);
            } catch (_) {}
            res.status(500).send('Failed to parse CSV: ' + err.message);
        });
});

// Health / readiness check
app.get('/health', async (req, res) => {
    res.json({
        ok: true,
        whatsappReady: await activeEngine.isReady()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Campaign platform running on http://localhost:${PORT}`);
    console.log('Waiting for WhatsApp QR scan (if first run)...');
});
