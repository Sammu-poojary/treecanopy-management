const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    pointsRequired: {
      type: Number,
      required: true,
      min: 1,
    },
    rewardType: {
      type: String,
      enum: [
        'Native Seed Kit',
        'Native Sapling',
        'Tree Plantation Sponsorship',
        'Adopt Another Tree',
        'Special Certificate',
        'Tree Care Kit',
        'Community Plantation',
        'Digital / Platform',
      ],
      default: 'Digital / Platform',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    quantityAvailable: {
      type: Number,
      default: null, // null means unlimited
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    redemptionInstructions: {
      type: String,
      default: '',
    },
    validityDays: {
      type: Number,
      default: 30,
    },
    collectionMethod: {
      type: String,
      default: 'Municipal Center Pickup / Program Credit',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reward', rewardSchema);
