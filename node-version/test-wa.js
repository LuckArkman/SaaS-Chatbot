const whatsappService = require('./src/services/whatsappCore');
const logger = require('./src/utils/logger');
logger.level = 'info';

async function test() {
  console.log("Starting test session...");
  // Listen to broadcast events on connectionManager if we want, or just wait for QR
  // We can just call it and it will log.
  try {
    await whatsappService.initializeSession(1, 'test-session');
    console.log("Initialize called, waiting for events (QR Code)...");
    
    // give it 20 seconds to emit a QR code
    setTimeout(() => {
      console.log("Test finished.");
      process.exit(0);
    }, 20000);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
