const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      enum: ['care_count', 'streak_days', 'tree_count', 'photo_count'],
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
    },
    rewardPoints: {
      type: Number,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Goal', goalSchema);
