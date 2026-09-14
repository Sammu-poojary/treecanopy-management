const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const User = require('../backend/models/User');

async function testRealDBPartners() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const userId = '6aa63ed05a48b4168487b717'; // Snow

    const dbPartners = await User.find({ role: { $in: ['Official', 'official', 'Admin', 'admin'] } }).select('name username role _id email');

    const partnerMap = new Map();

    dbPartners.forEach(p => {
      partnerMap.set(String(p._id), {
        _id: String(p._id),
        name: p.name || p.username || 'User',
        role: p.role,
        email: p.email || ''
      });
    });

    const finalPartners = Array.from(partnerMap.values()).filter(p => String(p._id) !== String(userId));
    console.log('=== CLEAN REGISTERED PARTNERS IN DB ===');
    console.log(finalPartners);

    mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

testRealDBPartners();
