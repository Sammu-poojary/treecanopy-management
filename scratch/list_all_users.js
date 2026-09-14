const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const User = require('../backend/models/User');

async function listAllUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB Atlas');

    const users = await User.find({});
    console.log(`Total Users in DB: ${users.length}\n`);

    users.forEach((u, idx) => {
      console.log(`[${idx + 1}] ID: ${u._id} | Name: "${u.name}" | Username: "${u.username}" | Email: "${u.email}" | Role: "${u.role}" | Status: "${u.status}"`);
    });

    mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

listAllUsers();
