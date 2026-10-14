const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const WhatsAppAdapter = require('./whatsapp.interface');

/**
 * Concrete WhatsApp adapter using whatsapp-web.js + LocalAuth.
 * Sessions are stored under ./wa_sessions so you only scan QR once.
 */
class WhatsAppWebJSAdapter extends WhatsAppAdapter {
    constructor() {
        super();
        this.client = new Client({
            authStrategy: new LocalAuth({ dataPath: './wa_sessions' }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });
        this.readyStatus = false;
    }

    async initialize() {
        this.client.on('qr', (qr) => {
            console.log('\n--- SCAN THIS QR CODE WITH YOUR WHATSAPP APP ---');
            console.log('Open WhatsApp → Linked Devices → Link a Device\n');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('WhatsApp Web Automation Instance is Ready and Authenticated!');
            this.readyStatus = true;
        });

        this.client.on('auth_failure', (msg) => {
            console.error('Session authentication failed:', msg);
            this.readyStatus = false;
        });

        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp client was disconnected:', reason);
            this.readyStatus = false;
        });

        return this.client.initialize();
    }

    async isReady() {
        return this.readyStatus;
    }

    async sendWhatsApp(to, text) {
        if (!this.readyStatus) {
            throw new Error('WhatsApp client interface is not ready/authenticated yet.');
        }

        let cleanNumber = String(to).replace(/\D/g, '');
        if (!cleanNumber.endsWith('@c.us')) {
            cleanNumber = `${cleanNumber}@c.us`;
        }

        const response = await this.client.sendMessage(cleanNumber, text);

        // Safely extract message id – structure can vary by whatsapp-web.js version
        let messageId = null;
        if (response) {
            if (response.id && typeof response.id === 'object' && response.id.id) {
                messageId = response.id.id;
            } else if (response.id && typeof response.id === 'string') {
                messageId = response.id;
            } else if (response._data && response._data.id) {
                messageId = response._data.id;
            }
        }

        return { messageId, internalDetails: response || null };
    }
}

module.exports = WhatsAppWebJSAdapter;
