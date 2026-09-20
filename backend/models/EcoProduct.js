const mongoose = require('mongoose');

const ecoProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true, required: true }, // e.g. CMP-5KG-01
  category: {
    type: String,
    enum: ['Organic Compost', 'Bio-Mulch & Woodchips', 'Soil Conditioners', 'Bio-Char', 'Native Saplings', 'Gardening Kits'],
    default: 'Organic Compost'
  },
  description: { type: String, required: true },
  unitSize: { type: String, default: '5 kg Bag' }, // e.g. 5 kg, 10 kg, 25 kg, 1 Sapling
  weightKg: { type: Number, default: 5 },
  
  // Pricing: Currency (INR) and Eco-Points
  priceInr: { type: Number, required: true, default: 99 },
  priceEcoPoints: { type: Number, default: 40 }, // points needed for full redemption
  allowEcoPointsRedemption: { type: Boolean, default: true },
  
  // Inventory
  stockQuantity: { type: Number, default: 100 },
  lowStockThreshold: { type: Number, default: 10 },
  isAvailable: { type: Boolean, default: true },
  
  // Media & Certifications
  image: { type: String, default: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80' },
  galleryImages: [{ type: String }],
  npkRatio: { type: String, default: '2.4 : 1.2 : 1.8' },
  organicMatterPercent: { type: Number, default: 65 },
  sourceFacility: { type: String, default: 'Ajjarkadu Municipal Biomass Processing Center' },
  linkedBatchNumber: { type: String, default: '' },
  
  // Usage & Application Guide
  usageInstructions: { type: String, default: 'Mix 1 part organic compost with 3 parts soil for potted plants or spread 2 inches around garden root zones.' },
  benefits: [{ type: String }],
  ratingsAvg: { type: Number, default: 4.9 },
  ratingsCount: { type: Number, default: 18 }
}, { timestamps: true });

module.exports = mongoose.model('EcoProduct', ecoProductSchema);
