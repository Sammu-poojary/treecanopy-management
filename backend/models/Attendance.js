const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['Official', 'Tree Cutter'],
      required: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    shift: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening'],
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// One attendance per user per shift per day
attendanceSchema.index({ userId: 1, date: 1, shift: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
