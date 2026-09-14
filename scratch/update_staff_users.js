const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const User = require('../backend/models/User');

async function updateStaffUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB Atlas');

    // 1. Update Alex Admin -> Central Admin (admin)
    let adminUser = await User.findById('6a3a28431319086ca6c7dfc4');
    if (adminUser) {
      adminUser.name = 'Central Admin';
      adminUser.username = 'admin';
      adminUser.role = 'Admin';
      if (!adminUser.phone) adminUser.phone = '9999999999';
      await adminUser.save();
      console.log('Updated Alex Admin -> Central Admin');
    }

    // 2. Update Sarah Official -> Municipal Tree Officer (official@gmail.com)
    let officialUser1 = await User.findById('6a3a28441319086ca6c7dfc7');
    if (officialUser1) {
      officialUser1.name = 'Municipal Tree Officer';
      officialUser1.username = 'official';
      officialUser1.role = 'Official';
      officialUser1.email = 'official@gmail.com';
      if (!officialUser1.phone) officialUser1.phone = '9999999999';
      await officialUser1.save();
      console.log('Updated Sarah Official -> Municipal Tree Officer (official@gmail.com)');
    }

    // 3. Ensure Municipal Official account (officials@gmail.com)
    let officialUser2 = await User.findOne({ email: 'officials@gmail.com' });
    if (!officialUser2) {
      officialUser2 = await User.create({
        name: 'Municipal Official',
        username: 'officials',
        email: 'officials@gmail.com',
        phone: '9999999999',
        password: '$2a$10$hashedpasswordplaceholder',
        role: 'Official',
        status: 'Verified'
      });
      console.log('Created Municipal Official (officials@gmail.com)');
    } else {
      officialUser2.name = 'Municipal Official';
      officialUser2.username = 'officials';
      officialUser2.role = 'Official';
      if (!officialUser2.phone) officialUser2.phone = '9999999999';
      await officialUser2.save();
      console.log('Updated Municipal Official (officials@gmail.com)');
    }

    // 4. Ensure Ram account (ramofficials@gmail.com)
    let ramUser = await User.findById('6a3ab12d534438c0e01dbf01');
    if (ramUser) {
      ramUser.name = 'Ram';
      ramUser.username = 'ram';
      ramUser.role = 'Official';
      if (!ramUser.phone) ramUser.phone = '9999999999';
      await ramUser.save();
      console.log('Updated Ram account (ramofficials@gmail.com)');
    }

    console.log('\n=== RE-CHECKING ALL OFFICIAL & ADMIN ACCOUNTS ===');
    const staff = await User.find({ role: { $in: ['Official', 'official', 'Admin', 'admin'] } });
    staff.forEach(s => {
      console.log(`- ID: ${s._id} | Name: "${s.name}" | Username: "${s.username}" | Email: "${s.email}" | Role: "${s.role}"`);
    });

    mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

updateStaffUsers();
