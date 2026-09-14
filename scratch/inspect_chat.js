const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const ChatMessage = require('../backend/models/ChatMessage');
const User = require('../backend/models/User');

async function checkChat() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB Atlas');

    const users = await User.find({}).select('_id name username role email');
    console.log('=== USERS ===');
    users.forEach(u => console.log(`${u._id} | ${u.name || u.username} | ${u.role} | ${u.email}`));

    const msgs = await ChatMessage.find({}).sort({ createdAt: -1 }).limit(30);
    console.log('\n=== RECENT CHAT MESSAGES ===');
    msgs.forEach(m => {
      console.log(`[${m.createdAt ? m.createdAt.toISOString() : 'NO_DATE'}] Sender: ${m.senderName} (${m.senderId}, ${m.senderRole}) -> Receiver: ${m.receiverName} (${m.receiverId}, ${m.receiverRole}) | Thread: ${m.threadId} | Msg: "${m.message}"`);
    });

    mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

checkChat();
