const { PrismaClient } = require('@prisma/client');
const compileTemplate = require('./compiler');

const prisma = new PrismaClient();

/**
 * Background campaign processor.
 * Sends messages sequentially with a random 4–8 second delay
 * to reduce the risk of spam flags on the WhatsApp account.
 */
async function processCampaign(campaignId, messagingEngine) {
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { template: true }
    });

    if (!campaign || campaign.status !== 'DRAFT') {
        return;
    }

    await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'PROCESSING' }
    });

    const pendingMessages = await prisma.message.findMany({
        where: { campaignId: campaignId, status: 'PENDING' }
    });

    for (const message of pendingMessages) {
        try {
            // Compile values dynamically if a Template is attached
            let finalBody = message.sentText;
            if (campaign.template) {
                finalBody = compileTemplate(campaign.template.content, message.variables);
            }

            // Persist the actual compiled body that was sent
            await prisma.message.update({
                where: { id: message.id },
                data: { sentText: finalBody }
            });

            // Dispatch via active adapter
            await messagingEngine.sendWhatsApp(message.phoneNumber, finalBody);

            await prisma.message.update({
                where: { id: message.id },
                data: { status: 'SENT', sentAt: new Date() }
            });
        } catch (error) {
            await prisma.message.update({
                where: { id: message.id },
                data: {
                    status: 'FAILED',
                    errorMessage: error.message || String(error)
                }
            });
        }

        // Human-like delay (4–8 seconds) between messages
        const dynamicDelay = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000;
        await new Promise((resolve) => setTimeout(resolve, dynamicDelay));
    }

    await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED' }
    });
}

module.exports = { processCampaign };
