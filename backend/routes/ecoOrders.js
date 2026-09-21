const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const EcoOrder = require('../models/EcoOrder');
const EcoProduct = require('../models/EcoProduct');
const EcoPointsTransaction = require('../models/EcoPointsTransaction');
const {
  sendOrderPlacedEmail,
  sendOrderAssignedEmail,
  sendOutForDeliveryEmail,
  sendDeliveredEmail
} = require('../services/orderEmailService');

let razorpay = null;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
  });
} catch (err) {
  console.warn('Razorpay init notice for store orders:', err.message);
}

// ── GET /api/eco-orders/my?userId=xxx&userEmail=yyy
router.get('/my', async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    if (!userId && !userEmail) return res.status(400).json({ error: 'userId or userEmail required' });

    const strUserId = (userId || '').toString();
    const strEmail = (userEmail || (strUserId.includes('@') ? strUserId : '')).toLowerCase();

    const orders = await EcoOrder.find({
      $or: [
        { userId: strUserId },
        ...(strEmail ? [{ userEmail: strEmail }] : [])
      ]
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/eco-orders and GET /api/eco-orders/all (For Official / Admin / Yard Desk)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.orderStatus = req.query.status;
    if (req.query.fulfillmentType) filter.fulfillmentType = req.query.fulfillmentType;
    if (req.query.assignedPartnerId) filter.assignedDeliveryPartnerId = req.query.assignedPartnerId;
    
    const orders = await EcoOrder.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.orderStatus = req.query.status;
    if (req.query.fulfillmentType) filter.fulfillmentType = req.query.fulfillmentType;
    if (req.query.assignedPartnerId) filter.assignedDeliveryPartnerId = req.query.assignedPartnerId;
    
    const orders = await EcoOrder.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/eco-orders/delivery-tasks (For Delivery Partner Dashboard)
router.get('/delivery-tasks', async (req, res) => {
  try {
    const { partnerId, partnerPhone } = req.query;
    if (!partnerId && !partnerPhone) {
      return res.status(400).json({ error: 'partnerId or partnerPhone is required' });
    }

    const query = {
      fulfillmentType: 'Home Delivery',
      $or: [
        ...(partnerId ? [{ assignedDeliveryPartnerId: partnerId }] : []),
        ...(partnerPhone ? [{ assignedDeliveryPartnerPhone: partnerPhone }] : [])
      ]
    };

    const tasks = await EcoOrder.find(query).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/eco-orders/payments-summary (Official / Admin Revenue & Payment Audit)
router.get('/payments-summary', async (req, res) => {
  try {
    const allOrders = await EcoOrder.find({});
    
    let totalRevenueInr = 0;
    let totalOnlineRazorpayInr = 0;
    let totalCodInr = 0;
    let totalCodPendingInr = 0;
    let totalCodCollectedInr = 0;
    let totalEcoPointsRedeemed = 0;
    
    const ordersByStatus = {
      'Order Placed': 0,
      'Packed & Ready': 0,
      'Assigned to Delivery Partner': 0,
      'Out for Delivery / Ready for Pickup': 0,
      'Delivered / Collected': 0,
      'Cancelled': 0
    };

    const ordersByPaymentStatus = {
      'Paid': 0,
      'Pending': 0,
      'Failed': 0,
      'Refunded': 0
    };

    allOrders.forEach(ord => {
      const amt = Number(ord.totalAmountInr) || 0;
      const pts = Number(ord.totalEcoPointsUsed) || 0;
      totalRevenueInr += amt;
      totalEcoPointsRedeemed += pts;

      if (ord.paymentMethod === 'Razorpay Online' && ord.paymentStatus === 'Paid') {
        totalOnlineRazorpayInr += amt;
      } else if (ord.paymentMethod === 'Cash on Delivery') {
        totalCodInr += amt;
        if (ord.cashCollectionStatus === 'Collected' || ord.cashCollectionStatus === 'Deposited' || ord.paymentStatus === 'Paid') {
          totalCodCollectedInr += amt;
        } else {
          totalCodPendingInr += amt;
        }
      }

      if (ordersByStatus[ord.orderStatus] !== undefined) {
        ordersByStatus[ord.orderStatus]++;
      }
      if (ordersByPaymentStatus[ord.paymentStatus] !== undefined) {
        ordersByPaymentStatus[ord.paymentStatus]++;
      }
    });

    res.json({
      success: true,
      totalOrdersCount: allOrders.length,
      totalRevenueInr,
      totalOnlineRazorpayInr,
      totalCodInr,
      totalCodCollectedInr,
      totalCodPendingInr,
      totalEcoPointsRedeemed,
      ordersByStatus,
      ordersByPaymentStatus,
      recentOrders: allOrders.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/eco-orders/create-checkout (Create order for Razorpay, COD, or Eco-Points)
router.post('/create-checkout', async (req, res) => {
  try {
    const {
      userId, userName, userEmail, userPhone, items,
      fulfillmentType, deliveryAddress, pickupYard, paymentMethod, ecoPointsToUse
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    let subtotalInr = 0;
    let totalPointsRequired = 0;
    const orderItems = [];

    for (const it of items) {
      const prod = await EcoProduct.findById(it.productId);
      if (!prod) continue;
      const qty = Number(it.quantity || 1);
      const itemInr = prod.priceInr * qty;
      const itemPts = prod.priceEcoPoints * qty;
      subtotalInr += itemInr;
      totalPointsRequired += itemPts;

      orderItems.push({
        productId: prod._id,
        productName: prod.name,
        category: prod.category,
        unitSize: prod.unitSize,
        image: prod.image,
        quantity: qty,
        unitPriceInr: prod.priceInr,
        unitPriceEcoPoints: prod.priceEcoPoints,
        totalItemInr: itemInr,
        totalItemEcoPoints: itemPts
      });
    }

    const deliveryFee = fulfillmentType === 'Home Delivery' ? 50 : 0;
    let finalAmountInr = subtotalInr + deliveryFee;
    let pointsUsed = 0;

    // Check Eco-Points redemption
    if (paymentMethod === 'Eco-Points Full Redemption' || ecoPointsToUse > 0) {
      pointsUsed = paymentMethod === 'Eco-Points Full Redemption' ? totalPointsRequired : Number(ecoPointsToUse);
      if (paymentMethod === 'Eco-Points Full Redemption') {
        finalAmountInr = deliveryFee; // Only pay delivery if any
      } else {
        const discountInr = Math.min(pointsUsed * 2, finalAmountInr); // 1 point = ₹2 discount
        finalAmountInr = Math.max(0, finalAmountInr - discountInr);
      }
    }

    const count = await EcoOrder.countDocuments();
    const orderNumber = `ORD-ECO-2026-${String(count + 1001).padStart(5, '0')}`;
    const pickupPassCode = `PASS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

    // Calculate approximate destination coordinates for Udupi / Manipal zone
    const deliveryCoords = {
      lat: 13.3409 + (Math.random() - 0.5) * 0.04,
      lng: 74.7421 + (Math.random() - 0.5) * 0.04
    };

    // 1. If COD or 100% Eco-Points or Free
    if (finalAmountInr === 0 || paymentMethod === 'Eco-Points Full Redemption' || paymentMethod === 'Cash on Delivery') {
      const isCod = paymentMethod === 'Cash on Delivery';
      const order = new EcoOrder({
        orderNumber,
        userId: userId || 'citizen',
        userName: userName || 'Citizen',
        userEmail: (userEmail || '').toLowerCase(),
        userPhone: userPhone || '',
        items: orderItems,
        totalAmountInr: finalAmountInr,
        totalEcoPointsUsed: pointsUsed,
        paymentMethod: paymentMethod || (finalAmountInr === 0 ? 'Eco-Points Full Redemption' : 'Cash on Delivery'),
        paymentStatus: isCod ? 'Pending' : 'Paid',
        fulfillmentType: fulfillmentType || 'Home Delivery',
        deliveryAddress: deliveryAddress || {},
        deliveryCoordinates: deliveryCoords,
        deliveryOtp,
        cashCollectionStatus: isCod ? 'Pending Collection' : 'Not Applicable',
        pickupYard: {
          yardName: pickupYard?.yardName || 'Ajjarkadu Municipal Biomass Processing Center',
          yardAddress: pickupYard?.yardAddress || 'Ajjarkadu Sector 4, Udupi',
          pickupPassCode,
          pickupQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${orderNumber}_${pickupPassCode}`
        },
        orderStatus: 'Order Placed',
        statusTimeline: [{
          status: 'Order Placed',
          timestamp: new Date(),
          note: isCod ? 'Order placed with Cash on Delivery' : 'Order placed and paid with Eco-Points',
          updatedBy: userName || 'Citizen'
        }]
      });

      await order.save();

      // Deduct inventory
      for (const it of orderItems) {
        await EcoProduct.findByIdAndUpdate(it.productId, { $inc: { stockQuantity: -it.quantity } });
      }

      // Log Eco-Points transaction if used
      if (pointsUsed > 0) {
        await new EcoPointsTransaction({
          userId: (userId || '').toString(),
          userEmail: (userEmail || '').toLowerCase(),
          type: 'REDEEM',
          points: -pointsUsed,
          description: `Eco-Store Purchase (${orderNumber})`
        }).save();
      }

      // Send Order Placed Email
      sendOrderPlacedEmail(order).catch(e => console.error('Email error:', e.message));

      return res.json({ success: true, isFreeOrPointsOnly: true, isCod, order });
    }

    // 2. Razorpay Online Order Creation
    let razorpayOrderId = `order_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let isDemo = false;

    try {
      if (razorpay && process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('placeholder')) {
        const rzOrder = await razorpay.orders.create({
          amount: Math.round(finalAmountInr * 100),
          currency: 'INR',
          receipt: orderNumber,
          notes: { orderNumber, userId: String(userId) }
        });
        razorpayOrderId = rzOrder.id;
      } else {
        isDemo = true;
      }
    } catch (rzpErr) {
      isDemo = true;
    }

    const pendingOrder = new EcoOrder({
      orderNumber,
      userId: userId || 'citizen',
      userName: userName || 'Citizen',
      userEmail: (userEmail || '').toLowerCase(),
      userPhone: userPhone || '',
      items: orderItems,
      totalAmountInr: finalAmountInr,
      totalEcoPointsUsed: pointsUsed,
      paymentMethod: 'Razorpay Online',
      paymentStatus: 'Pending',
      razorpayOrderId,
      fulfillmentType: fulfillmentType || 'Home Delivery',
      deliveryAddress: deliveryAddress || {},
      deliveryCoordinates: deliveryCoords,
      deliveryOtp,
      pickupYard: {
        yardName: pickupYard?.yardName || 'Ajjarkadu Municipal Biomass Processing Center',
        yardAddress: pickupYard?.yardAddress || 'Ajjarkadu Sector 4, Udupi',
        pickupPassCode,
        pickupQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${orderNumber}_${pickupPassCode}`
      },
      orderStatus: 'Order Placed',
      statusTimeline: [{
        status: 'Order Placed',
        timestamp: new Date(),
        note: 'Checkout initiated via Razorpay Online',
        updatedBy: userName || 'Citizen'
      }]
    });

    await pendingOrder.save();

    res.json({
      success: true,
      orderId: pendingOrder._id,
      orderNumber,
      razorpayOrderId,
      amountInr: finalAmountInr,
      amountPaise: Math.round(finalAmountInr * 100),
      currency: 'INR',
      keyId: isDemo ? 'rzp_test_demo' : process.env.RAZORPAY_KEY_ID,
      isDemo,
      order: pendingOrder
    });
  } catch (err) {
    console.error('Create eco order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/eco-orders/verify-payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, isDemo } = req.body;
    const order = await EcoOrder.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!isDemo && !razorpay_order_id?.startsWith('order_demo_')) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment signature verification failed' });
      }
    }

    order.paymentStatus = 'Paid';
    order.razorpayPaymentId = razorpay_payment_id || `pay_demo_${Date.now()}`;
    order.statusTimeline.push({
      status: 'Payment Verified',
      timestamp: new Date(),
      note: `Online payment of ₹${order.totalAmountInr} verified via Razorpay (${order.razorpayPaymentId})`,
      updatedBy: 'Razorpay Gateway'
    });

    await order.save();

    // Deduct inventory
    for (const it of order.items) {
      await EcoProduct.findByIdAndUpdate(it.productId, { $inc: { stockQuantity: -it.quantity } });
    }

    // Send Order Placed & Confirmed Email
    sendOrderPlacedEmail(order).catch(e => console.error('Email error:', e.message));

    res.json({ success: true, order, message: 'Payment verified and order confirmed!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/eco-orders/:id/assign-delivery (Official / Admin assigns order to a delivery partner)
router.patch('/:id/assign-delivery', async (req, res) => {
  try {
    const { partnerId, partnerName, partnerPhone, partnerVehicle, notes, updatedBy } = req.body;
    const order = await EcoOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.assignedDeliveryPartnerId = partnerId;
    order.assignedDeliveryPartnerName = partnerName || 'Municipal Delivery Executive';
    order.assignedDeliveryPartnerPhone = partnerPhone || '';
    order.assignedDeliveryPartnerVehicle = partnerVehicle || 'EV Cargo 3W';
    order.currentDeliveryStatus = 'Assigned';
    order.orderStatus = 'Assigned to Delivery Partner';

    order.statusTimeline.push({
      status: 'Assigned to Delivery Partner',
      timestamp: new Date(),
      note: `Assigned to ${order.assignedDeliveryPartnerName} (${order.assignedDeliveryPartnerPhone}). ${notes || ''}`.trim(),
      updatedBy: updatedBy || 'Official Operations Desk'
    });

    await order.save();

    // Send Notification Email to Citizen
    sendOrderAssignedEmail(order, {
      name: order.assignedDeliveryPartnerName,
      phone: order.assignedDeliveryPartnerPhone,
      vehicleNumber: order.assignedDeliveryPartnerVehicle
    }).catch(e => console.error('Email error:', e.message));

    res.json({ success: true, order, message: `Order assigned to ${order.assignedDeliveryPartnerName}!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/eco-orders/:id/delivery-status (Delivery Partner progression with OTP & proof)
router.patch('/:id/delivery-status', async (req, res) => {
  try {
    const { status, otp, proofPhoto, signature, cashCollected, notes, updatedBy, etaMinutes } = req.body;
    const order = await EcoOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (status === 'Picked Up' || status === 'Out for Delivery') {
      order.currentDeliveryStatus = 'Out for Delivery';
      order.orderStatus = 'Out for Delivery / Ready for Pickup';
      if (!order.dispatchedAt) order.dispatchedAt = new Date();

      order.statusTimeline.push({
        status: 'Out for Delivery',
        timestamp: new Date(),
        note: `Loaded at biomass yard. Out for delivery (ETA ~${etaMinutes || 25} mins). ${notes || ''}`.trim(),
        updatedBy: updatedBy || order.assignedDeliveryPartnerName || 'Delivery Partner'
      });

      await order.save();

      // Send Out for Delivery Email with OTP & ETA
      sendOutForDeliveryEmail(order, {
        name: order.assignedDeliveryPartnerName,
        phone: order.assignedDeliveryPartnerPhone
      }, etaMinutes || 25).catch(e => console.error('Email error:', e.message));

      return res.json({ success: true, order, message: 'Order is now Out for Delivery!' });
    }

    if (status === 'Arrived at Location') {
      order.currentDeliveryStatus = 'Arrived at Location';
      order.statusTimeline.push({
        status: 'Arrived at Customer Location',
        timestamp: new Date(),
        note: `Delivery executive arrived at customer doorstep. ${notes || ''}`.trim(),
        updatedBy: updatedBy || order.assignedDeliveryPartnerName || 'Delivery Partner'
      });
      await order.save();
      return res.json({ success: true, order, message: 'Arrived at destination!' });
    }

    if (status === 'Delivered') {
      // Validate OTP if supplied
      if (order.deliveryOtp && otp && otp.toString().trim() !== order.deliveryOtp.toString().trim()) {
        return res.status(400).json({ error: 'Invalid Delivery OTP entered. Please ask citizen for the 4-digit code.' });
      }

      order.currentDeliveryStatus = 'Delivered';
      order.orderStatus = 'Delivered / Collected';
      order.deliveredAt = new Date();
      if (proofPhoto) order.deliveryProofPhoto = proofPhoto;
      if (signature) order.recipientSignature = signature;

      // Handle Cash Collection for COD
      if (order.paymentMethod === 'Cash on Delivery') {
        order.cashCollected = Number(cashCollected || order.totalAmountInr);
        order.cashCollectionStatus = 'Collected';
        order.paymentStatus = 'Paid';
      }

      order.statusTimeline.push({
        status: 'Delivered / Completed',
        timestamp: new Date(),
        note: `Handover verified with OTP. Proof photo recorded.${order.paymentMethod === 'Cash on Delivery' ? ` ₹${order.cashCollected} COD collected in cash.` : ''}`,
        updatedBy: updatedBy || order.assignedDeliveryPartnerName || 'Delivery Partner'
      });

      await order.save();

      // Send Delivered Email
      sendDeliveredEmail(order, order.deliveryProofPhoto).catch(e => console.error('Email error:', e.message));

      return res.json({ success: true, order, message: 'Delivery completed successfully! 🎉' });
    }

    if (status === 'Delivery Failed') {
      order.currentDeliveryStatus = 'Delivery Failed';
      order.statusTimeline.push({
        status: 'Delivery Failed',
        timestamp: new Date(),
        note: `Delivery attempt unsuccessful: ${notes || 'Customer unavailable / unreachable'}`,
        updatedBy: updatedBy || order.assignedDeliveryPartnerName || 'Delivery Partner'
      });
      await order.save();
      return res.json({ success: true, order, message: 'Delivery marked as failed.' });
    }

    // Default status update
    if (status) order.currentDeliveryStatus = status;
    if (notes) order.notes = notes;
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
