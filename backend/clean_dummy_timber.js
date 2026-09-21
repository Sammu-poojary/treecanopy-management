require('dotenv').config();
const mongoose = require('mongoose');

async function clean() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    const TimberLot = mongoose.model('TimberLot', new mongoose.Schema({}, { strict: false }));
    const TimberBid = mongoose.model('TimberBid', new mongoose.Schema({}, { strict: false }));

    // Delete dummy seeded lots with wedding photo / fake IDs
    const res = await TimberLot.deleteMany({
      $or: [
        { lotNumber: { $in: ['TMB-LOT-2026-101', 'TMB-LOT-2026-102', 'TMB-LOT-2026-103'] } },
        { featuredImage: { $regex: '1520854221256' } }
      ]
    });
    console.log('Deleted dummy lots:', res.deletedCount);

    await TimberBid.deleteMany({
      lotNumber: { $in: ['TMB-LOT-2026-101', 'TMB-LOT-2026-102', 'TMB-LOT-2026-103'] }
    });

    const lots = await TimberLot.find({});
    console.log('Remaining lots count:', lots.length);
    for (const l of lots) {
      console.log(`- ${l.lotNumber}: ${l.treeSpecies || l.species} (${l.totalWeightKg || l.estimatedWeightKg}kg) Image: ${l.featuredImage}`);
    }

    await mongoose.disconnect();
    console.log('Finished cleanly');
  } catch (err) {
    console.error(err);
  }
}

clean();
