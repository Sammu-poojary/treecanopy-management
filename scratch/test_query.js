const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const ChatMessage = require('../backend/models/ChatMessage');

async function testRealQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const snowId = '6aa63ed05a48b4168487b717';
    
    const partners = [
      { id: '6a3a28431319086ca6c7dfc4', name: 'Central Admin (admin@gmail.com)' },
      { id: '6a3a28441319086ca6c7dfc7', name: 'Municipal Tree Officer (official@gmail.com)' },
      { id: '6aa77e5de3e2a38f055d53c7', name: 'Municipal Official (officials@gmail.com)' },
      { id: '6a3ab12d534438c0e01dbf01', name: 'Ram (ramofficials@gmail.com)' }
    ];

    for (const p of partners) {
      const uStr = String(snowId).trim();
      const pStr = String(p.id).trim();
      const ids = [uStr, pStr].sort();
      const computedThread = `thread_${ids[0]}_${ids[1]}`;

      const query = {
        $or: [
          { threadId: computedThread },
          { senderId: uStr, receiverId: pStr },
          { senderId: pStr, receiverId: uStr }
        ]
      };

      const msgs = await ChatMessage.find(query).sort({ createdAt: 1 });
      console.log(`\n=== MESSAGES FOR ${p.name} === Count: ${msgs.length}`);
      msgs.forEach(m => console.log(` - [${m.senderName} -> ${m.receiverName}]: ${m.message}`));
    }

    mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

testRealQuery();
