const mongoose = require('mongoose');

const timberLotSchema = new mongoose.Schema({
  lotNumber: { type: String, unique: true, required: true }, // e.g. TMB-LOT-2026-104
  title: { type: String, required: true }, // e.g. 4x Matured Rosewood Trunk Logs (Grade A Hardwood)
  treeSpecies: { type: String, required: true, default: 'Rosewood (Dalbergia latifolia)' },
  woodGrade: {
    type: String,
    enum: ['Grade A Construction Hardwood', 'Grade B Furniture / Framing', 'Grade C Firewood & Slabs', 'Specialty Craft Wood'],
    default: 'Grade A Construction Hardwood'
  },
  originLocation: { type: String, default: 'Ajjarkadu Ward 4, Udupi' },
  storageYard: { type: String, default: 'Santhekatte Municipal Timber Depot, Udupi' },
  
  // Physical measurements
  logCount: { type: Number, required: true, default: 3 },
  totalWeightKg: { type: Number, required: true, default: 850 },
  dimensions: {
    avgDiameterCm: { type: Number, default: 45 },
    avgLengthMeters: { type: Number, default: 3.2 },
    totalVolumeCubicMeters: { type: Number, default: 1.65 }
  },
  moistureContentPercent: { type: Number, default: 18 },
  cuttingDate: { type: Date, default: Date.now },
  intakeShipmentId: { type: mongoose.Schema.Types.Mixed, default: null },

  // Photos
  featuredImage: { type: String, default: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80' },
  images: [{ type: String }],
  inspectionNotes: { type: String, default: 'Straight-grain, seasoned, bark stripped, zero pest infestation.' },

  // Auction Details
  startingBidInr: { type: Number, required: true, default: 12000 },
  reservePriceInr: { type: Number, default: 15000 },
  bidStepIncrementInr: { type: Number, default: 500 },
  currentHighestBidInr: { type: Number, default: 12000 },
  totalBidsCount: { type: Number, default: 0 },
  
  highestBidder: {
    bidderId: { type: mongoose.Schema.Types.Mixed, default: null },
    bidderName: { type: String, default: '' },
    companyName: { type: String, default: '' },
    bidderPhone: { type: String, default: '' },
    bidTimestamp: { type: Date, default: null }
  },

  auctionStartTime: { type: Date, required: true },
  auctionEndTime: { type: Date, required: true },
  
  status: {
    type: String,
    enum: [
      'Upcoming',
      'Live Bidding',
      'Live',
      'Active',
      'Ended - Awaiting Payment',
      'Winner Declared & Certificate Issued',
      'Sold & Gate-Pass Issued',
      'Sold',
      'Delivered & Dispatched',
      'Collected',
      'Closed',
      'Unsold / Relisted'
    ],
    default: 'Live Bidding'
  },

  // Official Certificate of Allotment
  allotmentCertificate: {
    certificateNumber: { type: String, default: '' },
    awardedTo: { type: String, default: '' },
    bidderContact: { type: String, default: '' },
    winningBidAmountInr: { type: Number, default: 0 },
    issuedAt: { type: Date, default: null },
    issuedByOfficial: { type: String, default: '' },
    officialNotes: { type: String, default: '' }
  },

  // Gate-Pass generated for the winner
  gatePass: {
    passCode: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' },
    issuedAt: { type: Date, default: null },
    isCollected: { type: Boolean, default: false },
    collectedAt: { type: Date, default: null },
    verifiedByGuard: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('TimberLot', timberLotSchema);
