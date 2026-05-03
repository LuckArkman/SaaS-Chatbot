const mongoose = require('mongoose');
const Message = require('./node-version/src/models/nosql/Message');

async function test() {
  await mongoose.connect('mongodb://saas_chatbot:3702959@saas_mongo:27017/SaaS_Chatbot?authSource=admin');
  const msgs = await Message.find({ contact_phone: '5511998828726' }).sort({ timestamp: -1 }).limit(10);
  console.log(msgs.map(m => ({ content: m.content, external_id: m.external_id, timestamp: m.timestamp })));
  process.exit(0);
}

test();
