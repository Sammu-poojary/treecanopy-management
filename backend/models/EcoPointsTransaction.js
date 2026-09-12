const mongoose = require('mongoose');

const ecoPointsTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    adoptionId: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ['EARN', 'REDEEM'],
      required: true,
    },
    points: {
      type: Number,
      required: true, // positive for EARN (+100), negative for REDEEM (-500)
    },
    description: {
      type: String,
      required: true,
    },
    referenceId: {
      type: String,
      default: null,
      index: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EcoPointsTransaction', ecoPointsTransactionSchema);
