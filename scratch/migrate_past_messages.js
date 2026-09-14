const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const ChatMessage = require('../backend/models/ChatMessage');
const User = require('../backend/models/User');

async function migrateMessages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB Atlas');

    const municipalOfficial = await User.findOne({ email: 'officials@gmail.com' });
    const municipalTreeOfficer = await User.findOne({ email: 'official@gmail.com' });
    const centralAdmin = await User.findOne({ email: 'admin@gmail.com' });

    const officialId = municipalOfficial ? String(municipalOfficial._id) : null;
    const treeOfficerId = municipalTreeOfficer ? String(municipalTreeOfficer._id) : null;
    const adminId = centralAdmin ? String(centralAdmin._id) : null;

    console.log('Target Real IDs:', { officialId, treeOfficerId, adminId });

    // Migrate officials-static -> officialId
    if (officialId) {
      await ChatMessage.updateMany({ senderId: 'officials-static' }, { $set: { senderId: officialId, senderName: municipalOfficial.name } });
      await ChatMessage.updateMany({ receiverId: 'officials-static' }, { $set: { receiverId: officialId, receiverName: municipalOfficial.name } });
    }

    // Migrate official-main -> treeOfficerId
    if (treeOfficerId) {
      await ChatMessage.updateMany({ senderId: 'official-main' }, { $set: { senderId: treeOfficerId, senderName: municipalTreeOfficer.name } });
      await ChatMessage.updateMany({ receiverId: 'official-main' }, { $set: { receiverId: treeOfficerId, receiverName: municipalTreeOfficer.name } });
    }

    // Migrate admin-static / admin-main -> adminId
    if (adminId) {
      await ChatMessage.updateMany({ senderId: { $in: ['admin-static', 'admin-main'] } }, { $set: { senderId: adminId, senderName: centralAdmin.name } });
      await ChatMessage.updateMany({ receiverId: { $in: ['admin-static', 'admin-main'] } }, { $set: { receiverId: adminId, receiverName: centralAdmin.name } });
    }

    // Recompute threadId for all ChatMessage docs
    const allMsgs = await ChatMessage.find({});
    for (const m of allMsgs) {
      if (m.senderId && m.receiverId && m.receiverId !== 'all') {
        const ids = [String(m.senderId), String(m.receiverId)].sort();
        m.threadId = `thread_${ids[0]}_${ids[1]}`;
        await m.save();
      }
    }

    console.log(`Successfully migrated and normalized ${allMsgs.length} messages.`);
    mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

migrateMessages();
