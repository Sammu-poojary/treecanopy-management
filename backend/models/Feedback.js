const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    category: {
      type: String,
      enum: ['Citizen', 'Tree Cutter', 'Official', 'Other', 'General', 'Map', 'Reports', 'Performance'],
      default: 'Citizen',
    },
    name: {
      type: String,
      trim: true,
      default: 'Anonymous',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
