const mongoose = require('mongoose');

const TreeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scientificName: { type: String, required: true },
  family: { type: String },
  origin: { type: String },
  category: { type: String },
  lifespan: { type: String },
  height: { type: String },
  ageRange: { type: String },
  canopySpread: { type: String },
  description: { type: String },
  climate: { type: String },
  soilType: { type: String },
  sunlight: { type: String },
  growthRate: { type: String },
  leafType: { type: String },
  floweringSeason: { type: String },
  fruitingSeason: { type: String },
  carbonSequestration: { type: String },
  notes: { type: String },
  healthScore: { type: Number, default: 90 },
  canopyCoverage: { type: Number, default: 80 },
  waterRequirement: { type: String, default: 'Medium' },
  benefits: [{ type: String }],
  diseases: [{ type: String }],
  pests: [{ type: String }],
  image: { type: String }, // stores base64 data URL or uploaded file URL
  lat: { type: Number, default: 15.3600 },
  lng: { type: Number, default: 75.1300 },
  addedAt: { type: String } // date string formatted for UI, e.g. "29 Jun 2026"
}, { timestamps: true });

module.exports = mongoose.model('Tree', TreeSchema);

