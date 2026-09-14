const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const User = require('../backend/models/User');

async function fetchAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    const users = await User.find({}).select('_id name username email role status createdAt');

    const officials = users.filter(u => {
      const r = (u.role || '').toLowerCase();
      return r.includes('official') || r.includes('officer');
    });

    const admins = users.filter(u => {
      const r = (u.role || '').toLowerCase();
      return r.includes('admin');
    });

    const cutters = users.filter(u => {
      const r = (u.role || '').toLowerCase();
      return r.includes('cutter') || r.includes('arborist');
    });

    const citizens = users.filter(u => {
      const r = (u.role || '').toLowerCase();
      return !r.includes('official') && !r.includes('officer') && !r.includes('admin') && !r.includes('cutter') && !r.includes('arborist');
    });

    console.log(`\n================ OFFICIAL ACCOUNTS (${officials.length}) ================`);
    officials.forEach((u, i) => {
      console.log(`${i + 1}. Name: "${u.name || u.username}" | Email: "${u.email}" | Role: "${u.role}" | ID: ${u._id}`);
    });

    console.log(`\n================ ADMIN ACCOUNTS (${admins.length}) ================`);
    admins.forEach((u, i) => {
      console.log(`${i + 1}. Name: "${u.name || u.username}" | Email: "${u.email}" | Role: "${u.role}" | ID: ${u._id}`);
    });

    console.log(`\n================ TREE CUTTER ACCOUNTS (${cutters.length}) ================`);
    cutters.forEach((u, i) => {
      console.log(`${i + 1}. Name: "${u.name || u.username}" | Email: "${u.email}" | Role: "${u.role}" | ID: ${u._id}`);
    });

    mongoose.disconnect();
  } catch (e) {
    console.error('Error fetching accounts:', e);
  }
}

fetchAccounts();
