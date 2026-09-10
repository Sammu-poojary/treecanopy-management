const mongoose = require('mongoose');

const careLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['Watered', 'Mulched', 'Health Check', 'Photo Update', 'Fertilized', 'Pruned Dead Leaves'],
    required: true,
  },
  note: {
    type: String,
    trim: true,
    default: '',
  },
  photoUrl: {
    type: String,
    default: '',
  },
  pointsEarned: {
    type: Number,
    default: 50,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const adoptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    userName: {
      type: String,
      default: 'Eco Guardian',
    },
    userEmail: {
      type: String,
      default: '',
      lowercase: true,
    },
    treeId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    treeName: {
      type: String,
      required: true,
    },
    treeScientificName: {
      type: String,
      default: '',
    },
    treeFamily: {
      type: String,
      default: '',
    },
    treeLocation: {
      type: String,
      default: '',
    },
    treeImage: {
      type: String,
      default: '',
    },
    nickname: {
      type: String,
      trim: true,
      default: '',
    },
    certificateNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    adoptedAt: {
      type: Date,
      default: Date.now,
    },
    lastCareDate: {
      type: Date,
      default: Date.now,
    },
    careStreak: {
      type: Number,
      default: 1,
    },
    careLogs: [careLogSchema],
    totalEcoPoints: {
      type: Number,
      default: 100, // 100 welcome points on adoption
    },
    status: {
      type: String,
      enum: ['Active', 'Relinquished'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

// Auto-generate certificate number before saving if not present
adoptionSchema.pre('save', function (next) {
  if (!this.certificateNumber) {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.certificateNumber = `CG-GUARD-${Date.now().toString().slice(-6)}-${randomHex}`;
  }
  next();
});

module.exports = mongoose.model('Adoption', adoptionSchema);



