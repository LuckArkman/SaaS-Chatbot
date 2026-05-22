const fs = require('fs');
const content = fs.readFileSync('d:/SaaS-Chatbot/node-version/src/services/whatsappCore.js', 'utf8');

let open = 0;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Simple count (ignoring comments/strings for now, but usually enough)
    let matchesOpen = line.match(/{/g);
    let matchesClose = line.match(/}/g);
    if (matchesOpen) open += matchesOpen.length;
    if (matchesClose) open -= matchesClose.length;
    console.log(`${i + 1}: [${open}] ${line}`);
}
