const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['Citizen', 'Official', 'Tree Cutter', 'Admin', 'Delivery Partner', 'Delivery', 'Processing Officer', 'Timber Merchant', 'Timber Buyer'],
      default: 'Citizen',
    },
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Verified',
    },
    businessName: {
      type: String,
      default: '',
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    businessType: {
      type: String,
      default: '',
    },
    gstin: {
      type: String,
      default: '',
      trim: true,
    },
    tradeLicense: {
      type: String,
      default: '',
      trim: true,
    },
    panNumber: {
      type: String,
      default: '',
      trim: true,
    },
    authorizedPersonName: {
      type: String,
      default: '',
      trim: true,
    },
    merchantStatus: {
      type: String,
      enum: ['Verified', 'Pending Verification', 'Active'],
      default: 'Verified',
    },
    securityDepositBalance: {
      type: Number,
      default: 0,
    },
    profileImage: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    vehicleType: {
      type: String,
      default: 'Three-Wheeler EV Cargo',
    },
    vehicleNumber: {
      type: String,
      default: '',
    },
    deliveryZone: {
      type: String,
      default: 'Udupi Central & Manipal Sector',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    currentLocation: {
      lat: { type: Number, default: 13.3409 },
      lng: { type: Number, default: 74.7421 },
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
