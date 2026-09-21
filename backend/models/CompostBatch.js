const mongoose = require('mongoose');

const temperatureReadingSchema = new mongoose.Schema({
  tempC: { type: Number, required: true },
  moisturePercent: { type: Number, default: 50 },
  ambientTempC: { type: Number, default: 28 },
  date: { type: Date, default: Date.now },
  notedBy: { type: String, default: 'Yard Officer' },
  actionTaken: { type: String, default: 'Aeration turning performed' }
});

const compostBatchSchema = new mongoose.Schema({
  batchNumber: { type: String, unique: true, required: true }, // e.g. CMP-BATCH-2026-008
  facilityName: { type: String, default: 'Ajjarkadu Municipal Composting Center, Udupi' },
  intakeIds: [{ type: mongoose.Schema.Types.Mixed, ref: 'WasteIntake' }],
  
  // Biomass Ingestion
  rawBiomassInputKg: { type: Number, required: true, default: 500 },
  leavesRatioPercent: { type: Number, default: 70 },
  chippedWoodRatioPercent: { type: Number, default: 30 },
  bioCultureInoculated: { type: Boolean, default: true },
  bioCultureType: { type: String, default: 'Trichoderma Viride + EM-1 Microbial Inoculant' },
  
  // Lifecycle Stages: Ingestion -> Decomposition -> Curing -> Sieving -> Packaging -> Ready for Distribution
  currentStage: {
    type: String,
    enum: ['Ingestion & Shredding', 'Thermophilic Decomposition', 'Curing & Stabilization', 'Sieving & Refining', 'Retail Packaging', 'Completed'],
    default: 'Ingestion & Shredding'
  },
  stageProgress: { type: Number, default: 15 }, // percentage (0-100)
  
  startDate: { type: Date, default: Date.now },
  targetCompletionDate: { type: Date },
  actualCompletionDate: { type: Date, default: null },

  // Sensor & Physical Readings
  temperatureLogs: [temperatureReadingSchema],
  avgDecompositionTempC: { type: Number, default: 55 },
  phLevel: { type: Number, default: 7.2 },
  organicCarbonPercent: { type: Number, default: 18.5 },
  nitrogenPercent: { type: Number, default: 1.8 },
  qualityCertificationGrade: { type: String, enum: ['Grade A Premium Organic', 'Grade B Soil Conditioner', 'Bulk Agricultural Grade'], default: 'Grade A Premium Organic' },

  // Packaging & Output Yield
  totalYieldKg: { type: Number, default: 0 },
  packaged5KgBags: { type: Number, default: 0 },
  packaged10KgBags: { type: Number, default: 0 },
  packaged25KgBags: { type: Number, default: 0 },
  bulkMulchYieldKg: { type: Number, default: 0 },

  // Linked EcoProduct created in store
  linkedProductId: { type: mongoose.Schema.Types.Mixed, default: null },

  managedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  managedByName: { type: String, default: 'Processing Manager' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Completed', 'Archived'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('CompostBatch', compostBatchSchema);
