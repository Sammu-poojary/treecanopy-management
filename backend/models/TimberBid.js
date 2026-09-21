const mongoose = require('mongoose');

const timberBidSchema = new mongoose.Schema({
  lotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TimberLot', required: true },
  lotNumber: { type: String, required: true },
  lotTitle: { type: String, required: true },
  
  bidderId: { type: mongoose.Schema.Types.Mixed, required: true },
  bidderName: { type: String, required: true },
  companyName: { type: String, default: 'Independent Carpenter / Sawmill' },
  bidderEmail: { type: String, default: '', lowercase: true },
  bidderPhone: { type: String, default: '' },
  bidderGstin: { type: String, default: '' },
  
  bidAmountInr: { type: Number, required: true },
  bidTimestamp: { type: Date, default: Date.now },
  isWinningBid: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Outbid', 'Won', 'Cancelled'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('TimberBid', timberBidSchema);
