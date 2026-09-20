const mongoose = require('mongoose');

const careTaskSchema = new mongoose.Schema({
  taskType: { type: String, enum: ['Watering', 'Fertilizing', 'Mulching', 'Pruning', 'Inspection', 'Cleaning', 'Other'], default: 'Watering' },
  description: { type: String, default: '' },
  proofImageUrl: { type: String, default: '' },
  proofPublicId: { type: String, default: '' },
  uploadedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  uploadedByName: { type: String, default: '' },
  uploadedByRole: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Validated', 'Rejected'], default: 'Pending' },
  validatedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  validatedByName: { type: String, default: '' },
  validatedAt: { type: Date, default: null },
  validationNote: { type: String, default: '' },
});

const paymentHistorySchema = new mongoose.Schema({
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  amount: { type: Number },
  plan: { type: String },
  paidAt: { type: Date, default: Date.now },
  periodStart: { type: Date },
  periodEnd: { type: Date },
});

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.Mixed, required: true },
  userName: { type: String, default: 'Citizen' },
  userEmail: { type: String, default: '', lowercase: true },
  userPhone: { type: String, default: '' },
  treeId: { type: mongoose.Schema.Types.Mixed, required: true },
  treeName: { type: String, required: true },
  treeScientificName: { type: String, default: '' },
  treeLocation: { type: String, default: '' },
  treeImage: { type: String, default: '' },
  adoptionType: { type: String, enum: ['self', 'subscription'], default: 'subscription' },
  plan: { type: String, enum: ['monthly', 'yearly'], default: null },
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending_payment', 'active', 'assigned', 'lapsed', 'cancelled'], default: 'pending_payment' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  startDate: { type: Date, default: Date.now },
  nextRenewalDate: { type: Date, default: null },
  lastReminderSentAt: { type: Date, default: null },
  autoRenew: { type: Boolean, default: false },
  paymentHistory: [paymentHistorySchema],
  assignedCutterId: { type: mongoose.Schema.Types.Mixed, default: null },
  assignedCutterName: { type: String, default: '' },
  assignedAt: { type: Date, default: null },
  assignedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  assignedByName: { type: String, default: '' },
  careTasks: [careTaskSchema],
  certificateNumber: { type: String, unique: true, sparse: true },
  adminNote: { type: String, default: '' },
}, { timestamps: true });

subscriptionSchema.pre('save', function () {
  if (!this.certificateNumber) {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.certificateNumber = 'SUB-' + Date.now().toString().slice(-6) + '-' + randomHex;
  }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
