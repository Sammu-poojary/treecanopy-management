const mongoose = require('mongoose');

const wasteIntakeSchema = new mongoose.Schema({
  shipmentId: { type: String, unique: true, required: true }, // e.g. WST-2026-0042
  complaintId: { type: mongoose.Schema.Types.Mixed, default: null },
  workOrderTitle: { type: String, default: 'Tree Pruning & Clearance' },
  cutterId: { type: mongoose.Schema.Types.Mixed, default: null },
  cutterName: { type: String, default: 'Tree Cutter' },
  disposalYard: { type: String, required: true, default: 'Ajjarkadu Municipal Compost Center, Udupi' },
  vehicleNumber: { type: String, default: 'KA-20-TR-4821' },
  vehicleType: { type: String, enum: ['Mini Tipper Truck', 'Tractor Trailer', 'Utility Pickup', 'Heavy Dump Truck'], default: 'Mini Tipper Truck' },
  
  // Segregated Biomass Weights & Dimensions
  biomass: {
    leavesWeightKg: { type: Number, default: 0 },
    branchesWeightKg: { type: Number, default: 0 },
    logsCount: { type: Number, default: 0 },
    logsWeightKg: { type: Number, default: 0 },
    treeSpecies: { type: String, default: 'Mixed Foliage' },
    approxLogDiameterCm: { type: Number, default: 0 },
    approxLogLengthMeters: { type: Number, default: 0 },
    isDiseased: { type: Boolean, default: false },
    diseasedNotes: { type: String, default: '' },
    estimatedTotalVolumeM3: { type: Number, default: 0 }
  },

  proofImageUrl: { type: String, default: '' },
  weighbridgeSlipUrl: { type: String, default: '' },
  gpsLocation: {
    lat: { type: String, default: '13.3409' },
    lng: { type: String, default: '74.7421' },
    address: { type: String, default: 'Udupi Processing Facility' }
  },

  status: {
    type: String,
    enum: ['Delivered', 'Verified', 'Assigned to Batch', 'Rejected'],
    default: 'Delivered'
  },
  allocatedStream: {
    type: String,
    enum: ['Composting', 'Timber Auction', 'Chipping / Mulch', 'Bio-Containment Quarantine', 'Mixed'],
    default: 'Composting'
  },
  
  assignedCompostBatchId: { type: mongoose.Schema.Types.Mixed, default: null },
  assignedTimberLotId: { type: mongoose.Schema.Types.Mixed, default: null },

  verifiedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  verifiedByName: { type: String, default: '' },
  verifiedAt: { type: Date, default: null },
  verificationNotes: { type: String, default: '' },
  deliveredAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('WasteIntake', wasteIntakeSchema);
