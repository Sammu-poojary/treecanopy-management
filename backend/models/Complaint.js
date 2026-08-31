const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    issueType: {
      type: String,
      required: true,
      enum: ['damaged', 'overhanging', 'dead', 'pest', 'roots', 'fallen'],
    },
    description: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    photoUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Review', 'Scheduled', 'In Progress', 'Reached Location', 'Work Completed', 'Waste Disposed', 'Resolved'],
      default: 'Pending',
    },
    submittedBy: {
      type: String,
      default: 'Anonymous',
    },
    submittedByUserId: {
      type: String,
      default: null,
    },
    // Official assignment tracking
    assignedTo: {
      type: String,
      default: null, // cutter name or userId
    },
    assignedToId: {
      type: String,
      default: null,
    },
    verifiedBy: {
      type: String,
      default: null, // Official name
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    beforeImageUrl: {
      type: String,
      default: '',
    },
    progressImageUrl: {
      type: String,
      default: '',
    },
    afterImageUrl: {
      type: String,
      default: '',
    },
    wasteProofUrl: {
      type: String,
      default: '',
    },
    // Image verification by official
    beforeImageStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', ''],
      default: '',
    },
    progressImageStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', ''],
      default: '',
    },
    afterImageStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', ''],
      default: '',
    },
    wasteProofStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', ''],
      default: '',
    },
    // Geo Tagged Images coordinates
    beforeGps: {
      lat: { type: String, default: '' },
      lng: { type: String, default: '' },
      capturedAt: { type: Date, default: null }
    },
    progressGps: {
      lat: { type: String, default: '' },
      lng: { type: String, default: '' },
      capturedAt: { type: Date, default: null }
    },
    afterGps: {
      lat: { type: String, default: '' },
      lng: { type: String, default: '' },
      capturedAt: { type: Date, default: null }
    },
    // Closure
    closedBy: {
      type: String,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    // Replantation tracking
    requiresReplantation: {
      type: Boolean,
      default: false,
    },
    replantationStatus: {
      type: String,
      enum: ['None', 'Pending', 'Scheduled', 'Planted'],
      default: 'None',
    },
    replantedTreeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tree',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
