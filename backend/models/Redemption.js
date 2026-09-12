const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: 'Eco Guardian',
    },
    userEmail: {
      type: String,
      default: '',
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
      required: true,
    },
    rewardNameSnapshot: {
      type: String,
      required: true,
    },
    pointsSpent: {
      type: Number,
      required: true,
    },
    redemptionCode: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Approved',
        'Ready for Collection',
        'Collected',
        'Plantation Scheduled',
        'Completed',
        'Rejected',
        'Cancelled',
      ],
      default: 'Pending',
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Redemption', redemptionSchema);
