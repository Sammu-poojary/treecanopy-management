const express = require('express');
const router = express.Router();
const CompostBatch = require('../models/CompostBatch');
const EcoProduct = require('../models/EcoProduct');
const WasteIntake = require('../models/WasteIntake');

// Stage lifecycle: order + expected duration in days
const STAGE_ORDER = [
  'Ingestion & Shredding',
  'Thermophilic Decomposition',
  'Curing & Stabilization',
  'Sieving & Refining',
  'Retail Packaging',
  'Completed'
];
const STAGE_DURATION_DAYS = {
  'Ingestion & Shredding': 3,
  'Thermophilic Decomposition': 21,
  'Curing & Stabilization': 14,
  'Sieving & Refining': 3,
  'Retail Packaging': 999 // stays until packaged manually
};

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
    const {
      facilityName, location,
      intakeIds, sourceIntakeId, _sourceIntakeId,
      rawBiomassInputKg, initialWeightKg, foliageWeightKg, woodchipsWeightKg,
      bioCultureType, managedByName, notes,
      batchCode, batchNumber: reqBatchNumber
    } = req.body;

    const count = await CompostBatch.countDocuments();
    const batchNumber = batchCode || reqBatchNumber || `CMP-BATCH-2026-${String(count + 1).padStart(3, '0')}`;
    const targetCompletionDate = new Date(Date.now() + 45 * 24 * 3600 * 1000); // 45 days standard cycle

    const rawIds = [
      ...(Array.isArray(intakeIds) ? intakeIds : (intakeIds ? [intakeIds] : [])),
      sourceIntakeId,
      _sourceIntakeId
    ].filter(Boolean);

    const totalWeight = Number(rawBiomassInputKg || initialWeightKg || (Number(foliageWeightKg || 0) + Number(woodchipsWeightKg || 0)) || 500);

    const batch = new CompostBatch({
      batchNumber,
      facilityName: facilityName || location || 'Ajjarkadu Municipal Composting Center, Udupi',
      intakeIds: rawIds,
      rawBiomassInputKg: totalWeight,
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

    // Mark linked intakes as assigned to batch in MongoDB
    if (rawIds.length > 0) {
      await WasteIntake.updateMany(
        { $or: [{ _id: { $in: rawIds } }, { shipmentId: { $in: rawIds } }] },
        {
          status: 'Assigned to Batch',
          assignedCompostBatchId: batch._id,
          allocatedStream: 'Composting'
        }
      );
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

// ── POST /api/compost-batches/:id/package-to-store (Package output into retail stock — dynamic bag sizes & weights)
router.post('/:id/package-to-store', async (req, res) => {
  try {
    const {
      packages, // Array: [{ weightKg: 25, quantity: 4, priceInr: 399, priceEcoPoints: 160, name: '' }, ...]
      packaged5KgBags, packaged10KgBags, packaged25KgBags, bulkMulchKg,
      pricePer5Kg, pricePer10Kg, pricePer25Kg, pricePerKgMulch,
      qualityGrade, packagingNotes, markAsCompleted
    } = req.body;

    const batch = await CompostBatch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const facility = batch.facilityName || 'Ajjarkadu Municipal Biomass Processing Center';
    const batchNum = batch.batchNumber;

    let itemsToProcess = [];

    // 1. If dynamic packages array provided
    if (Array.isArray(packages) && packages.length > 0) {
      itemsToProcess = packages
        .filter(p => Number(p.quantity) > 0 && Number(p.weightKg) > 0)
        .map(p => ({
          weightKg: Number(p.weightKg),
          quantity: Number(p.quantity),
          priceInr: Number(p.priceInr || (Number(p.weightKg) * 16)),
          priceEcoPoints: Number(p.priceEcoPoints || Math.round((p.priceInr || p.weightKg * 16) * 0.4)),
          name: p.name || `CanopyGuard Organic Compost (${p.weightKg} kg ${p.weightKg >= 25 ? 'Sack' : 'Bag'})`,
          unitSize: `${p.weightKg} kg ${p.weightKg >= 25 ? 'Sack' : 'Bag'}`
        }));
    } else {
      // 2. Legacy fallback fields
      const num5  = Number(packaged5KgBags  || 0);
      const num10 = Number(packaged10KgBags || 0);
      const num25 = Number(packaged25KgBags || 0);

      if (num5 > 0) itemsToProcess.push({ weightKg: 5, quantity: num5, priceInr: Number(pricePer5Kg || 99), priceEcoPoints: 40, name: 'CanopyGuard Organic Compost (5 kg)', unitSize: '5 kg Bag' });
      if (num10 > 0) itemsToProcess.push({ weightKg: 10, quantity: num10, priceInr: Number(pricePer10Kg || 179), priceEcoPoints: 75, name: 'CanopyGuard Organic Compost (10 kg)', unitSize: '10 kg Bag' });
      if (num25 > 0) itemsToProcess.push({ weightKg: 25, quantity: num25, priceInr: Number(pricePer25Kg || 399), priceEcoPoints: 170, name: 'CanopyGuard Organic Compost (25 kg Bulk)', unitSize: '25 kg Sack' });
    }

    const mulch = Number(bulkMulchKg || 0);
    let totalKg = itemsToProcess.reduce((sum, item) => sum + (item.weightKg * item.quantity), 0) + mulch;

    if (totalKg <= 0) {
      return res.status(400).json({ error: 'No valid packets or mulch quantity provided.' });
    }

    // Process each package into EcoProduct (Increment stock if exists, or create if new)
    for (const item of itemsToProcess) {
      const sku = `CMP-${item.weightKg}KG-ORG`;

      // Update legacy counters on batch if matched
      if (item.weightKg === 5) batch.packaged5KgBags = (batch.packaged5KgBags || 0) + item.quantity;
      else if (item.weightKg === 10) batch.packaged10KgBags = (batch.packaged10KgBags || 0) + item.quantity;
      else if (item.weightKg === 25) batch.packaged25KgBags = (batch.packaged25KgBags || 0) + item.quantity;

      await EcoProduct.findOneAndUpdate(
        { sku },
        {
          $inc: { stockQuantity: item.quantity },
          $set: {
            name: item.name,
            description: `100% certified organic compost from municipal canopy tree biomass. Enriched with Trichoderma & beneficial soil microbes. Packed at ${facility}.`,
            category: 'Organic Compost',
            unitSize: item.unitSize,
            weightKg: item.weightKg,
            priceInr: item.priceInr,
            priceEcoPoints: item.priceEcoPoints,
            isAvailable: true,
            sourceFacility: facility,
            linkedBatchNumber: batchNum
          },
          $setOnInsert: {
            image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
            npkRatio: '2.4 : 1.2 : 1.8',
            usageInstructions: 'Mix 1 part organic compost with 3 parts soil for potted plants or apply 2 inches around garden root zones.',
            benefits: ['100% Organic Municipal Recycled', 'Rich in Humic Acid and Beneficial Microbes', 'Enhances Soil Moisture & Nutrient Retention']
          }
        },
        { upsert: true, new: true }
      );
    }

    // Process Bulk Mulch if any
    if (mulch > 0) {
      batch.bulkMulchYieldKg = (batch.bulkMulchYieldKg || 0) + mulch;
      await EcoProduct.findOneAndUpdate(
        { sku: 'CMP-MULCH-BULK' },
        {
          $inc: { stockQuantity: mulch },
          $set: {
            name: 'CanopyGuard Bio-Mulch & Woodchips (per kg)',
            description: 'Chipped branch bio-mulch from urban tree clearances. Ideal for garden paths & moisture retention.',
            category: 'Bio-Mulch & Woodchips',
            unitSize: 'Per kg',
            weightKg: 1,
            priceInr: Number(pricePerKgMulch || 15),
            priceEcoPoints: 6,
            isAvailable: true,
            sourceFacility: facility,
            linkedBatchNumber: batchNum
          },
          $setOnInsert: {
            image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=80'
          }
        },
        { upsert: true, new: true }
      );
    }

    // Update batch yield and lifecycle state
    batch.totalYieldKg = (batch.totalYieldKg || 0) + totalKg;
    if (qualityGrade) batch.qualityCertificationGrade = qualityGrade;
    if (packagingNotes) batch.notes = packagingNotes;

    const estFinishedYield = Math.round((batch.rawBiomassInputKg || 500) * 0.45);
    const isFinished = markAsCompleted || (batch.totalYieldKg >= estFinishedYield);

    if (isFinished) {
      batch.currentStage = 'Completed';
      batch.status = 'Completed';
      batch.stageProgress = 100;
      batch.actualCompletionDate = new Date();
    } else {
      batch.currentStage = 'Retail Packaging';
      batch.stageProgress = Math.min(99, Math.max(80, Math.round((batch.totalYieldKg / estFinishedYield) * 100)));
    }

    await batch.save();

    res.json({
      success: true,
      batch,
      totalKg,
      message: `Successfully packaged ${totalKg} kg into retail store inventory.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/compost-batches/auto-advance  (called on page load to progress timed-out stages)
router.post('/auto-advance', async (req, res) => {
  try {
    const activeBatches = await CompostBatch.find({ status: 'Active' });
    const advanced = [];

    for (const batch of activeBatches) {
      const currStageIdx = STAGE_ORDER.indexOf(batch.currentStage);
      // Retail Packaging requires manual packaging action; Completed is terminal
      if (currStageIdx < 0 || batch.currentStage === 'Retail Packaging' || batch.currentStage === 'Completed') continue;

      const stageStart = batch.updatedAt || batch.startDate || batch.createdAt;
      const daysSince = (Date.now() - new Date(stageStart).getTime()) / (1000 * 60 * 60 * 24);
      const expectedDays = STAGE_DURATION_DAYS[batch.currentStage] || 999;

      if (daysSince >= expectedDays) {
        const nextStage = STAGE_ORDER[currStageIdx + 1];
        const isCompleting = nextStage === 'Completed';
        batch.currentStage = nextStage;
        batch.stageProgress = isCompleting ? 100 : Math.min(95, Math.round(((currStageIdx + 2) / (STAGE_ORDER.length - 1)) * 100));
        if (isCompleting) { batch.status = 'Completed'; batch.actualCompletionDate = new Date(); }
        batch.temperatureLogs.push({
          tempC: batch.avgDecompositionTempC || 55,
          moisturePercent: 50, ambientTempC: 29, date: new Date(),
          notedBy: 'Auto-Advance System',
          actionTaken: `Auto-advanced to "${nextStage}" after ${Math.round(daysSince)} days in previous stage`
        });
        await batch.save();
        advanced.push({ id: batch._id, batchNumber: batch.batchNumber, newStage: nextStage });
      }
    }

    res.json({ success: true, advanced, total: advanced.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

