const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.Mixed, required: true },
  productName: { type: String, required: true },
  category: { type: String, default: 'Organic Compost' },
  unitSize: { type: String, default: '5 kg' },
  image: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPriceInr: { type: Number, default: 0 },
  unitPriceEcoPoints: { type: Number, default: 0 },
  totalItemInr: { type: Number, default: 0 },
  totalItemEcoPoints: { type: Number, default: 0 }
});

const ecoOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, required: true }, // e.g. ORD-ECO-2026-9041
  userId: { type: mongoose.Schema.Types.Mixed, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true, lowercase: true },
  userPhone: { type: String, default: '' },
  
  items: [orderItemSchema],
  subtotalInr: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  pointsDiscountInr: { type: Number, default: 0 },
  totalAmountInr: { type: Number, default: 0 },
  totalEcoPointsUsed: { type: Number, default: 0 },
  paymentMethod: {
    type: String,
    enum: ['Razorpay Online', 'Cash on Delivery', 'COD', 'Eco-Points Full Redemption', 'Eco-Points + Razorpay Hybrid', 'Cash on Pickup'],
    default: 'Razorpay Online'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  
  // Fulfillment: Home Delivery vs Self-Pickup at Yard
  fulfillmentType: {
    type: String,
    enum: ['Home Delivery', 'Yard Self-Pickup', 'Yard Pickup'],
    default: 'Home Delivery'
  },
  deliveryAddress: {
    fullName: { type: String, default: '' },
    street: { type: String, default: '' },
    city: { type: String, default: 'Udupi' },
    postalCode: { type: String, default: '576101' },
    landmark: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    preferredSlot: { type: String, default: 'Morning (9 AM - 1 PM)' }
  },
  pickupYard: {
    yardName: { type: String, default: 'Ajjarkadu Municipal Biomass Processing Center' },
    yardAddress: { type: String, default: 'Ajjarkadu Sector 4, Udupi' },
    pickupPassCode: { type: String, default: '' },
    pickupQrCode: { type: String, default: '' }
  },
  
  orderStatus: {
    type: String,
    enum: ['Order Placed', 'Packed & Ready', 'Assigned to Delivery Partner', 'Out for Delivery / Ready for Pickup', 'Delivered / Collected', 'Cancelled'],
    default: 'Order Placed'
  },
  
  // Delivery Partner Assignment & Live Execution
  assignedDeliveryPartnerId: { type: mongoose.Schema.Types.Mixed, default: null },
  assignedDeliveryPartnerName: { type: String, default: '' },
  assignedDeliveryPartnerPhone: { type: String, default: '' },
  assignedDeliveryPartnerVehicle: { type: String, default: '' },
  
  currentDeliveryStatus: {
    type: String,
    enum: ['Unassigned', 'Assigned', 'Picked Up', 'Out for Delivery', 'Arrived at Location', 'Delivered', 'Delivery Failed'],
    default: 'Unassigned'
  },
  
  deliveryCoordinates: {
    lat: { type: Number, default: 13.3409 },
    lng: { type: Number, default: 74.7421 }
  },
  
  deliveryOtp: { type: String, default: '' },
  deliveryProofPhoto: { type: String, default: '' },
  recipientSignature: { type: String, default: '' },
  
  // Cash on Delivery (COD) / Payment Reconciliation
  cashCollected: { type: Number, default: 0 },
  cashCollectionStatus: {
    type: String,
    enum: ['Not Applicable', 'Pending Collection', 'Collected', 'Deposited'],
    default: 'Not Applicable'
  },
  treasurySettledAt: { type: Date, default: null },
  treasurySettledBy: { type: String, default: '' },
  
  statusTimeline: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    updatedBy: { type: String, default: 'System' }
  }],
  
  deliveryDate: { type: Date, default: null },
  dispatchedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('EcoOrder', ecoOrderSchema);
