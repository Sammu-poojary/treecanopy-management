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
  image: { type: String }, // primary / thumbnail image URL (backward compat)
  images: [{ type: String }], // multi-photo gallery array (Cloudinary URLs)
  lat: { type: Number, default: 13.3409 },
  lng: { type: Number, default: 74.7421 },
  addedAt: { type: String }, // e.g. "29 Jun 2026"

  // Extended taxonomy & ecology fields
  nativeRegion: { type: String },
  iucnStatus: { type: String }, // e.g. "Least Concern", "Vulnerable", "Endangered"
  flowerColor: { type: String },
  fruitColor: { type: String },
  culturalUses: { type: String }, // traditional / cultural / medicinal uses
  conservationNotes: { type: String },

  // Subscription adoption fields
  monthlyAdoptionFee: { type: Number, default: 500 },
  yearlyAdoptionFee: { type: Number, default: 6000 },
  isAdopted: { type: Boolean, default: false },
  activeSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Tree', TreeSchema);
