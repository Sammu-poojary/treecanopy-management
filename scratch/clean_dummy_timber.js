const mongoose = require('mongoose');

async function clean() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/treecanopy');
    console.log('Connected to MongoDB');

    const TimberLot = mongoose.model('TimberLot', new mongoose.Schema({}, { strict: false }));
    const TimberBid = mongoose.model('TimberBid', new mongoose.Schema({}, { strict: false }));

    // Delete dummy seeded lots
    const res = await TimberLot.deleteMany({
      lotNumber: { $in: ['TMB-LOT-2026-101', 'TMB-LOT-2026-102', 'TMB-LOT-2026-103'] }
    });
    console.log('Deleted dummy lots:', res.deletedCount);

    // Also check all lots
    const lots = await TimberLot.find({});
    console.log('Remaining lots count:', lots.length);
    for (const l of lots) {
      console.log(`- ${l.lotNumber}: ${l.treeSpecies || l.species} (${l.totalWeightKg || l.estimatedWeightKg}kg) Image: ${l.featuredImage?.slice(0, 40)}...`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

clean();
