const mongoose = require('mongoose');
const ErrorReport = require('./src/models/nosql/ErrorReport');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
  await mongoose.connect('mongodb://saas_chatbot:3702959@127.0.0.1:27017/SaaS_Chatbot?authSource=admin');
  const logs = await ErrorReport.find().sort({ timestamp: -1 }).limit(3);
  console.log(`Found ${logs.length} error reports.`);
  logs.forEach(log => {
    console.log(`- [${log.timestamp}] HTTP ${log.error_code} na Rota: ${log.method} ${log.route}`);
    console.log('  Description:', log.description.split('\n')[0]);
    console.log('  Payload:', JSON.stringify(log.payload));
  });
  process.exit(0);
}
check();
