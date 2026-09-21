const express = require('express');
const router = express.Router();
const CompostBatch = require('../models/CompostBatch');
const EcoProduct = require('../models/EcoProduct');
const WasteIntake = require('../models/WasteIntake');

// Seed sample batches if empty
const seedSampleBatches = async () => {
  const count = await CompostBatch.countDocuments();
  if (count === 0) {
    const sampleBatches = [
      {
        batchNumber: 'CMP-BATCH-2026-007',
        facilityName: 'Ajjarkadu Municipal Composting Center, Udupi',
        rawBiomassInputKg: 1200,
        currentStage: 'Retail Packaging',
        stageProgress: 88,
        startDate: new Date(Date.now() - 40 * 24 * 3600 * 1000),
        targetCompletionDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        avgDecompositionTempC: 58,
        phLevel: 7.1,
        organicCarbonPercent: 19.2,
        nitrogenPercent: 1.9,
        qualityCertificationGrade: 'Grade A Premium Organic',
        totalYieldKg: 680,
        packaged5KgBags: 80,
        packaged10KgBags: 20,
        packaged25KgBags: 4,
        managedByName: 'Ravi Acharya (Biomass Officer)',
        notes: 'High nitrogen feedstock from neem and banyan pruned foliage.'
      },
      {
        batchNumber: 'CMP-BATCH-2026-008',
        facilityName: 'Korangrapady Biomass Processing Facility, Udupi',
        rawBiomassInputKg: 850,
        currentStage: 'Thermophilic Decomposition',
        stageProgress: 45,
        startDate: new Date(Date.now() - 18 * 24 * 3600 * 1000),
        targetCompletionDate: new Date(Date.now() + 25 * 24 * 3600 * 1000),
        avgDecompositionTempC: 62,
        phLevel: 6.8,
        qualityCertificationGrade: 'Grade A Premium Organic',
        managedByName: 'Sunil Poojary (Yard Supervisor)',
        notes: 'Daily temperature checked. Turned twice weekly.'
      }
    ];
    await CompostBatch.insertMany(sampleBatches);
  }
};
seedSampleBatches().catch(err => console.warn('CompostBatch seed notice:', err.message));

// ── GET /api/compost-batches
router.get('/', async (req, res) => {
  try {
    const list = await CompostBatch.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/compost-batches (Start new compost batch)
router.post('/', async (req, res) => {
  try {
    const { facilityName, intakeIds, rawBiomassInputKg, bioCultureType, managedByName, notes } = req.body;
    const count = await CompostBatch.countDocuments();
    const batchNumber = `CMP-BATCH-2026-${String(count + 1).padStart(3, '0')}`;
    const targetCompletionDate = new Date(Date.now() + 45 * 24 * 3600 * 1000); // 45 days standard cycle

    const batch = new CompostBatch({
      batchNumber,
      facilityName: facilityName || 'Ajjarkadu Municipal Composting Center, Udupi',
      intakeIds: intakeIds || [],
      rawBiomassInputKg: Number(rawBiomassInputKg || 500),
      currentStage: 'Ingestion & Shredding',
      stageProgress: 15,
      targetCompletionDate,
      bioCultureType: bioCultureType || 'Trichoderma Viride + EM-1 Microbial Inoculant',
      managedByName: managedByName || 'Biomass Processing Manager',
      notes: notes || '',
      temperatureLogs: [{
        tempC: 32,
        moisturePercent: 55,
        ambientTempC: 29,
        date: new Date(),
        notedBy: managedByName || 'Biomass Manager',
        actionTaken: 'Initial shredding & bio-culture spray'
      }]
    });

    await batch.save();

    // Mark linked intakes as assigned to batch
    if (intakeIds && intakeIds.length > 0) {
      await WasteIntake.updateMany({ _id: { $in: intakeIds } }, { status: 'Assigned to Batch', assignedCompostBatchId: batch._id });
    }

    res.status(201).json({ success: true, batch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/compost-batches/:id/advance-stage (Advance lifecycle stage)
router.patch('/:id/advance-stage', async (req, res) => {
  try {
    const { newStage, progress, tempC, moisturePercent, actionTaken, notedBy } = req.body;
    const batch = await CompostBatch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    if (newStage) batch.currentStage = newStage;
    if (typeof progress === 'number') batch.stageProgress = progress;

    if (tempC !== undefined) {
      batch.temperatureLogs.push({
        tempC: Number(tempC),
        moisturePercent: Number(moisturePercent || 50),
        ambientTempC: 28,
        date: new Date(),
        notedBy: notedBy || 'Processing Manager',
        actionTaken: actionTaken || `Advanced to ${newStage || batch.currentStage}`
      });
      batch.avgDecompositionTempC = Number(tempC);
    }

    if (newStage === 'Completed') {
      batch.status = 'Completed';
      batch.stageProgress = 100;
      batch.actualCompletionDate = new Date();
    }

    await batch.save();
    res.json({ success: true, batch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/compost-batches/:id/package-to-store (Package output into retail stock)
router.post('/:id/package-to-store', async (req, res) => {
  try {
    const { packaged5KgBags, packaged10KgBags, packaged25KgBags, pricePer5Kg, pricePer10Kg, pricePer25Kg } = req.body;
    const batch = await CompostBatch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const num5 = Number(packaged5KgBags || 0);
    const num10 = Number(packaged10KgBags || 0);
    const num25 = Number(packaged25KgBags || 0);
    const totalKg = (num5 * 5) + (num10 * 10) + (num25 * 25);

    batch.packaged5KgBags = (batch.packaged5KgBags || 0) + num5;
    batch.packaged10KgBags = (batch.packaged10KgBags || 0) + num10;
    batch.packaged25KgBags = (batch.packaged25KgBags || 0) + num25;
    batch.totalYieldKg = (batch.totalYieldKg || 0) + totalKg;
    batch.currentStage = 'Retail Packaging';
    batch.stageProgress = 95;
    await batch.save();

    // Auto-update or create 5kg product stock in EcoProduct catalog
    if (num5 > 0) {
      await EcoProduct.findOneAndUpdate(
        { sku: 'CMP-5KG-ORG' },
        {
          $inc: { stockQuantity: num5 },
          $set: {
            name: 'CanopyGuard Certified Organic Compost (5kg)',
            category: 'Organic Compost',
            unitSize: '5 kg Bag',
            weightKg: 5,
            priceInr: Number(pricePer5Kg || 99),
            priceEcoPoints: 40,
            isAvailable: true,
            linkedBatchNumber: batch.batchNumber
          }
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, batch, message: `Successfully packaged ${totalKg} kg into retail inventory.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
