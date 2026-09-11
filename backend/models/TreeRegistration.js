const mongoose = require('mongoose');

const treeRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    scientificName: { type: String, required: true },
    image: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    locationText: { type: String, default: 'Udupi Region' },
    submittedBy: { type: String, required: true },
    submittedByEmail: { type: String, default: '' },
    submittedByUserId: { type: String, default: null },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    notes: { type: String, default: 'Submitted by citizen via CanopyLens AI' },
    healthScore: { type: Number, default: 90 },
    rejectionReason: { type: String, default: '' },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TreeRegistration', treeRegistrationSchema);
