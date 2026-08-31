const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, default: 1 },
  status: { type: String, enum: ['Available', 'Assigned', 'Maintenance'], default: 'Available' },
  addedAt: { type: String }, // e.g. "30 Jun 2026"
  imageUrl: { type: String, default: '' },
  purchaseCount: { type: Number, default: 0 },
  purchaseRequests: [
    {
      userId: { type: String },
      userName: { type: String },
      requestedAt: { type: String }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Property', PropertySchema);
