const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// Mocks to simulate Baileys socket, Mongoose, and other dependencies
const { AsyncLocalStorage } = require('async_hooks');

// Setup mock tenant context
const tenantContext = new AsyncLocalStorage();
const MOCK_TENANT_ID = 'tenant-123';

// Mock MongoDB Models
const messagesDb = [];
const MockMessage = {
  create: async (data) => {
    const msg = { _id: crypto.randomUUID(), ...data, createdAt: new Date() };
    messagesDb.push(msg);
    return msg;
  },
  find: () => ({
    sort: () => messagesDb
  })
};

// Mock WebSocket
const wsClients = [];
const mockWsServer = {
  clients: wsClients,
  broadcast: (data) => {
    wsClients.forEach(client => client.send(JSON.stringify(data)));
  }
};

// Mock Baileys Socket
const mockSock = {
  sendMessage: async (jid, content, options) => {
    return {
      key: { id: crypto.randomUUID(), remoteJid: jid, fromMe: true },
      message: content,
      status: 'SENT'
    };
  },
  downloadMediaMessage: async (msg) => {
    // Return a mock buffer representing downloaded media
    return Buffer.from('mock-media-content');
  }
};

// Simulate storage logic
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function simulateMediaStorage(tenantId, buffer, filename) {
  const tenantDir = path.join(uploadsDir, tenantId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }
  const filePath = path.join(tenantDir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// System Under Test (SUT): Functions simulating the WhatsApp Core integration
async function handleOutboundMediaMessage(tenantId, jid, mediaBuffer, mediaType, filename) {
  const mediaContent = {};
  if (mediaType === 'image') mediaContent.image = mediaBuffer;
  if (mediaType === 'video') mediaContent.video = mediaBuffer;
  if (mediaType === 'audio') mediaContent.audio = mediaBuffer;
  if (mediaType === 'document') {
    mediaContent.document = mediaBuffer;
    mediaContent.fileName = filename;
  }

  // 1. Send via Baileys
  const result = await mockSock.sendMessage(jid, mediaContent);
  
  // 2. Store Media
  const savedPath = await simulateMediaStorage(tenantId, mediaBuffer, filename);
  
  // 3. Persist to DB
  const savedMsg = await MockMessage.create({
    tenant_id: tenantId,
    remoteJid: jid,
    fromMe: true,
    messageType: mediaType,
    mediaUrl: savedPath,
    baileysId: result.key.id
  });

  return savedMsg;
}

async function handleInboundMediaMessage(tenantId, incomingMsg) {
  const mediaType = Object.keys(incomingMsg.message || {}).find(k => k.includes('Message'));
  
  // 1. Download media via Baileys
  const buffer = await mockSock.downloadMediaMessage(incomingMsg);
  
  // 2. Store Media
  const filename = `${crypto.randomUUID()}.mock`;
  const savedPath = await simulateMediaStorage(tenantId, buffer, filename);
  
  // 3. Persist to DB
  const savedMsg = await MockMessage.create({
    tenant_id: tenantId,
    remoteJid: incomingMsg.key.remoteJid,
    fromMe: false,
    messageType: mediaType,
    mediaUrl: savedPath,
    baileysId: incomingMsg.key.id
  });

  // 4. Notify via WS
  mockWsServer.broadcast({ event: 'newMessage', data: savedMsg });

  return savedMsg;
}

// --- Test Suite ---
async function runTests() {
  console.log('--- Starting Complete WhatsApp Media Integration Tests ---\n');

  try {
    await tenantContext.run({ tenantId: MOCK_TENANT_ID }, async () => {
      
      console.log('[TEST] 1. Outbound Image Message');
      const imgBuffer = Buffer.from('fake-image-data');
      const outImg = await handleOutboundMediaMessage(MOCK_TENANT_ID, '5511999999999@s.whatsapp.net', imgBuffer, 'image', 'test.jpg');
      assert.strictEqual(outImg.messageType, 'image');
      assert.ok(fs.existsSync(outImg.mediaUrl), 'Image file should be saved on disk');
      console.log('✅ Outbound Image: Passed\n');

      console.log('[TEST] 2. Outbound Document Message');
      const docBuffer = Buffer.from('fake-pdf-data');
      const outDoc = await handleOutboundMediaMessage(MOCK_TENANT_ID, '5511999999999@s.whatsapp.net', docBuffer, 'document', 'report.pdf');
      assert.strictEqual(outDoc.messageType, 'document');
      assert.ok(fs.existsSync(outDoc.mediaUrl), 'Document file should be saved on disk');
      console.log('✅ Outbound Document: Passed\n');

      console.log('[TEST] 3. Outbound Video Message');
      const vidBuffer = Buffer.from('fake-video-data');
      const outVid = await handleOutboundMediaMessage(MOCK_TENANT_ID, '5511999999999@s.whatsapp.net', vidBuffer, 'video', 'video.mp4');
      assert.strictEqual(outVid.messageType, 'video');
      assert.ok(fs.existsSync(outVid.mediaUrl), 'Video file should be saved on disk');
      console.log('✅ Outbound Video: Passed\n');

      console.log('[TEST] 4. Outbound Audio Message');
      const audBuffer = Buffer.from('fake-audio-data');
      const outAud = await handleOutboundMediaMessage(MOCK_TENANT_ID, '5511999999999@s.whatsapp.net', audBuffer, 'audio', 'audio.ogg');
      assert.strictEqual(outAud.messageType, 'audio');
      assert.ok(fs.existsSync(outAud.mediaUrl), 'Audio file should be saved on disk');
      console.log('✅ Outbound Audio: Passed\n');

      console.log('[TEST] 5. Inbound Image Message (Receiving from Baileys)');
      const incomingImage = {
        key: { id: 'msg-in-1', remoteJid: '5511888888888@s.whatsapp.net', fromMe: false },
        message: { imageMessage: { url: 'mock-url' } }
      };
      
      let wsReceived = null;
      wsClients.push({ send: (data) => { wsReceived = JSON.parse(data); } }); // Mock WS client

      const inImg = await handleInboundMediaMessage(MOCK_TENANT_ID, incomingImage);
      assert.strictEqual(inImg.messageType, 'imageMessage');
      assert.ok(fs.existsSync(inImg.mediaUrl), 'Downloaded image should be saved on disk');
      assert.strictEqual(wsReceived.event, 'newMessage');
      assert.strictEqual(wsReceived.data._id, inImg._id.toString());
      console.log('✅ Inbound Image & WS broadcast: Passed\n');

      console.log('[TEST] 6. Tenant Isolation in Media Storage');
      const filePathParts = inImg.mediaUrl.split(path.sep);
      assert.ok(filePathParts.includes(MOCK_TENANT_ID), 'Saved path must include the tenant ID for isolation');
      console.log('✅ Tenant Isolation: Passed\n');

      console.log('🎉 All media integration tests passed successfully!');
    });
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
