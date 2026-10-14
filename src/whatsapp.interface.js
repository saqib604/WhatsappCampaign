/**
 * Base structural interface for WhatsApp messaging adapters.
 * Implement this class to plug in different WhatsApp engines.
 */
class WhatsAppAdapter {
    async initialize() {
        throw new Error("Method 'initialize()' must be implemented.");
    }

    async sendWhatsApp(to, text) {
        throw new Error("Method 'sendWhatsApp()' must be implemented.");
    }

    async isReady() {
        throw new Error("Method 'isReady()' must be implemented.");
    }
}

module.exports = WhatsAppAdapter;
