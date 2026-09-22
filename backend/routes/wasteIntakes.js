const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const WasteIntake = require('../models/WasteIntake');
const Complaint = require('../models/Complaint');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Seed sample intakes if empty
const seedSampleIntakes = async () => {
  const count = await WasteIntake.countDocuments();
  if (count === 0) {
    const samples = [
      {
        shipmentId: 'WST-2026-0041',
        workOrderTitle: 'Fallen Neem Tree Clearing - MG Road',
        cutterName: 'Boxy',
        disposalYard: 'Ajjarkadu Municipal Compost Center, Udupi',
        vehicleNumber: 'KA-20-TR-4821',
        vehicleType: 'Mini Tipper Truck',
        biomass: {
          leavesWeightKg: 180,
          branchesWeightKg: 240,
          logsCount: 2,
          logsWeightKg: 450,
          treeSpecies: 'Neem (Azadirachta indica)',
          approxLogDiameterCm: 38,
          approxLogLengthMeters: 2.8,
          isDiseased: false,
          estimatedTotalVolumeM3: 1.2
        },
        proofImageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80',
        status: 'Delivered',
        allocatedStream: 'Composting',
        deliveredAt: new Date(Date.now() - 2 * 3600 * 1000)
      },
      {
        shipmentId: 'WST-2026-0042',
        workOrderTitle: 'Hazardous Rosewood Limb Pruning - Kalsanka',
        cutterName: 'Sameeksha',
        disposalYard: 'Santhekatte Municipal Timber Depot, Udupi',
        vehicleNumber: 'KA-20-TR-5910',
        vehicleType: 'Tractor Trailer',
        biomass: {
          leavesWeightKg: 60,
          branchesWeightKg: 110,
          logsCount: 3,
          logsWeightKg: 780,
          treeSpecies: 'Rosewood (Dalbergia latifolia)',
          approxLogDiameterCm: 48,
          approxLogLengthMeters: 3.4,
          isDiseased: false,
          estimatedTotalVolumeM3: 1.85
        },
        proofImageUrl: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=600&auto=format&fit=crop&q=80',
        status: 'Verified',
        allocatedStream: 'Timber Auction',
        verifiedByName: 'Processing Officer',
        verifiedAt: new Date(Date.now() - 1 * 3600 * 1000),
        deliveredAt: new Date(Date.now() - 5 * 3600 * 1000)
      }
    ];
    await WasteIntake.insertMany(samples);
  }
};
seedSampleIntakes().catch(err => console.warn('WasteIntake seed notice:', err.message));

// ── GET /api/waste-intakes (List all with filters)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.cutterId) filter.cutterId = req.query.cutterId;
    if (req.query.stream) filter.allocatedStream = req.query.stream;
    const list = await WasteIntake.find(filter).sort({ deliveredAt: -1, createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/waste-intakes (Create shipment from Tree Cutter task)
router.post('/', async (req, res) => {
  try {
    const {
      complaintId, workOrderTitle, cutterId, cutterName, disposalYard,
      vehicleNumber, vehicleType, biomass, proofImageBase64, gpsLocation
    } = req.body;

    let proofImageUrl = '';
    if (proofImageBase64 && proofImageBase64.startsWith('data:image')) {
      try {
        const uploadRes = await cloudinary.uploader.upload(proofImageBase64, {
          folder: 'treecanopy/waste-intake',
          resource_type: 'image'
        });
        proofImageUrl = uploadRes.secure_url;
      } catch (uploadErr) {
        console.warn('Cloudinary upload warning:', uploadErr.message);
      }
    } else if (proofImageBase64) {
      proofImageUrl = proofImageBase64;
    }

    const count = await WasteIntake.countDocuments();
    const shipmentId = `WST-2026-${String(count + 1).padStart(4, '0')}`;

    const intake = new WasteIntake({
      shipmentId,
      complaintId: complaintId || null,
      workOrderTitle: workOrderTitle || 'Field Tree Clearance',
      cutterId: cutterId || null,
      cutterName: cutterName || 'Tree Cutter',
      disposalYard: disposalYard || 'Ajjarkadu Municipal Compost Center, Udupi',
      vehicleNumber: vehicleNumber || 'KA-20-TR-0001',
      vehicleType: vehicleType || 'Mini Tipper Truck',
      biomass: {
        leavesWeightKg: Number(biomass?.leavesWeightKg || 0),
        branchesWeightKg: Number(biomass?.branchesWeightKg || 0),
        logsCount: Number(biomass?.logsCount || 0),
        logsWeightKg: Number(biomass?.logsWeightKg || 0),
        treeSpecies: biomass?.treeSpecies || 'Mixed Municipal Species',
        approxLogDiameterCm: Number(biomass?.approxLogDiameterCm || 0),
        approxLogLengthMeters: Number(biomass?.approxLogLengthMeters || 0),
        isDiseased: Boolean(biomass?.isDiseased),
        diseasedNotes: biomass?.diseasedNotes || '',
        estimatedTotalVolumeM3: Number(biomass?.estimatedTotalVolumeM3 || 0)
      },
      proofImageUrl,
      gpsLocation: gpsLocation || { lat: '13.3409', lng: '74.7421', address: disposalYard || 'Udupi' },
      status: 'Delivered',
      allocatedStream: Number(biomass?.logsWeightKg || 0) > 200 ? 'Timber Auction' : 'Composting'
    });

    await intake.save();

    // If linked to a Complaint, update its status
    if (complaintId) {
      try {
        await Complaint.findByIdAndUpdate(complaintId, {
          status: 'Waste Disposed',
          wasteProofUrl: proofImageUrl || undefined,
          wasteProofStatus: 'Pending'
        });
      } catch (compErr) {
        console.warn('Linked complaint sync warning:', compErr.message);
      }
    }

    res.status(201).json({ success: true, intake, message: 'Waste shipment logged successfully' });
  } catch (err) {
    console.error('Create waste intake error:', err);
    res.status(500).json({ error: err.message });
  }
});

const mongoose = require('mongoose');

// ── PATCH /api/waste-intakes/:id/verify (Processing Manager weighbridge verify)
router.patch('/:id/verify', async (req, res) => {
  try {
    const { status, verifiedById, verifiedByName, verificationNotes, allocatedStream } = req.body;
    const filter = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { shipmentId: req.params.id };

    const intake = await WasteIntake.findOneAndUpdate(
      filter,
      {
        status: status || 'Verified',
        verifiedBy: verifiedById || null,
        verifiedByName: verifiedByName || 'Processing Officer',
        verifiedAt: new Date(),
        verificationNotes: verificationNotes || '',
        allocatedStream: allocatedStream || undefined
      },
      { returnDocument: 'after' }
    );
    if (!intake) return res.status(404).json({ error: 'Shipment not found' });
    res.json({ success: true, intake });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/waste-intakes/:id (Update any waste intake fields like routing/assigned IDs)
router.patch('/:id', async (req, res) => {
  try {
    const filter = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { shipmentId: req.params.id };

    const intake = await WasteIntake.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    if (!intake) return res.status(404).json({ error: 'Shipment not found' });
    res.json({ success: true, intake });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
