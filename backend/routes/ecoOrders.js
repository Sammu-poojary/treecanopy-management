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

const getRazorpayClient = () => {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (keyId && keySecret && !keyId.includes('placeholder')) {
    try {
      return new Razorpay({ key_id: keyId, key_secret: keySecret });
    } catch (err) {
      console.warn('Razorpay initialization notice:', err.message);
      return null;
    }
  }
  return null;
};

// ── GET /api/eco-orders/my and /api/eco-orders/my-orders?userId=xxx&userEmail=yyy
const getMyOrdersHandler = async (req, res) => {
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
};

router.get('/my', getMyOrdersHandler);
router.get('/my-orders', getMyOrdersHandler);

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
    let totalOnlinePendingInr = 0;
    let totalCodInr = 0;
    let totalDriverCashInHandInr = 0; // Collected by drivers from citizens, pending turn-in to office
    let totalCodDepositedInr = 0; // Cleared and deposited into municipal treasury
    let totalCodPendingInr = 0; // Pending delivery to citizen
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

    const driverCashMap = {};

    allOrders.forEach(ord => {
      const amt = Number(ord.totalAmountInr) || 0;
      const pts = Number(ord.totalEcoPointsUsed) || 0;
      totalEcoPointsRedeemed += pts;

      const isCod = ord.paymentMethod === 'Cash on Delivery' || ord.paymentMethod === 'COD';

      if (ord.paymentMethod === 'Razorpay Online') {
        if (ord.paymentStatus === 'Paid') {
          totalOnlineRazorpayInr += amt;
          totalRevenueInr += amt;
        } else {
          totalOnlinePendingInr += amt;
        }
      } else if (isCod) {
        totalCodInr += amt;
        if (ord.cashCollectionStatus === 'Deposited') {
          totalCodDepositedInr += amt;
          totalRevenueInr += amt;
        } else if (ord.cashCollectionStatus === 'Collected') {
          const cashAmt = Number(ord.cashCollected) || amt;
          totalDriverCashInHandInr += cashAmt;
          const driverKey = ord.assignedDeliveryPartnerName || 'Unassigned Driver';
          driverCashMap[driverKey] = (driverCashMap[driverKey] || 0) + cashAmt;
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
      totalOnlinePendingInr,
      totalCodInr,
      totalDriverCashInHandInr,
      totalCodDepositedInr,
      totalCodPendingInr,
      totalEcoPointsRedeemed,
      driverCashMap,
      ordersByStatus,
      ordersByPaymentStatus,
      recentOrders: allOrders.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/eco-orders/create-checkout (Create order for Razorpay, COD, or Eco-Points)
const createCheckoutHandler = async (req, res) => {
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
    let razorpayOrderId = null;
    let isDemo = false;
    const rzpClient = getRazorpayClient();

    if (rzpClient) {
      try {
        const rzOrder = await rzpClient.orders.create({
          amount: Math.round(finalAmountInr * 100),
          currency: 'INR',
          receipt: orderNumber.replace(/[^a-zA-Z0-9_-]/g, '').slice(-40),
          notes: { orderNumber, userId: String(userId) }
        });
        razorpayOrderId = rzOrder.id;
      } catch (rzpErr) {
        console.warn('Razorpay live order create notice:', rzpErr?.error?.description || rzpErr?.message || rzpErr);
        isDemo = true;
      }
    } else {
      isDemo = true;
    }

    const effectiveRazorpayKey = (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('placeholder'))
      ? process.env.RAZORPAY_KEY_ID.trim()
      : 'rzp_test_1DP5mmOlF5G5ag';

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
      razorpayOrderId: razorpayOrderId || `order_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
      razorpayOrderId: razorpayOrderId,
      amountInr: finalAmountInr,
      amountPaise: Math.round(finalAmountInr * 100),
      currency: 'INR',
      keyId: effectiveRazorpayKey,
      isDemo,
      order: pendingOrder
    });
  } catch (err) {
    console.error('Create eco order error:', err);
    res.status(500).json({ error: err.message });
  }
};

router.post('/create-checkout', createCheckoutHandler);
router.post('/', createCheckoutHandler);

// ── POST /api/eco-orders/verify-payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, isDemo } = req.body;
    const order = await EcoOrder.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (!isDemo && razorpay_order_id && !razorpay_order_id.startsWith('order_demo_') && keySecret && !keySecret.includes('placeholder')) {
      try {
        const expectedSig = crypto
          .createHmac('sha256', keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');
        if (expectedSig !== razorpay_signature) {
          return res.status(400).json({ error: 'Payment signature verification failed' });
        }
      } catch (sigErr) {
        console.warn('Signature verification check notice:', sigErr.message);
        return res.status(400).json({ error: 'Payment verification failed: ' + sigErr.message });
      }
    }

    order.paymentStatus = 'Paid';
    order.razorpayPaymentId = razorpay_payment_id || `pay_${Date.now()}`;
    if (razorpay_order_id) order.razorpayOrderId = razorpay_order_id;
    order.statusTimeline.push({
      status: 'Payment Verified',
      timestamp: new Date(),
      note: `Online payment of ₹${order.totalAmountInr} verified via Razorpay Gateway (${order.razorpayPaymentId})`,
      updatedBy: 'Razorpay Gateway'
    });

    await order.save();

    // Deduct inventory
    for (const it of order.items) {
      await EcoProduct.findByIdAndUpdate(it.productId, { $inc: { stockQuantity: -it.quantity } });
    }

    // Deduct Eco-Points if used for partial payment
    if (order.totalEcoPointsUsed > 0) {
      await new EcoPointsTransaction({
        userId: (order.userId || '').toString(),
        userEmail: (order.userEmail || '').toLowerCase(),
        type: 'REDEEM',
        points: -order.totalEcoPointsUsed,
        description: `Eco-Store Purchase (${order.orderNumber})`
      }).save();
    }

    // Send Order Placed & Confirmed Email
    sendOrderPlacedEmail(order).catch(e => console.error('Email error:', e.message));

    res.json({ success: true, order, message: 'Payment verified and order confirmed!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/eco-orders/:id/update-payment (Admin / Official / Delivery manual payment status update)
router.patch('/:id/update-payment', async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, cashCollectionStatus, cashCollected, notes, updatedBy } = req.body;
    const order = await EcoOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (cashCollectionStatus) order.cashCollectionStatus = cashCollectionStatus;
    if (cashCollected !== undefined) order.cashCollected = Number(cashCollected);

    order.statusTimeline.push({
      status: 'Payment Status Updated',
      timestamp: new Date(),
      note: notes || `Payment status updated to ${order.paymentStatus} (${order.paymentMethod || 'N/A'}). Cash: ₹${order.cashCollected || 0} (${order.cashCollectionStatus || 'N/A'}).`,
      updatedBy: updatedBy || 'Official Operations Desk'
    });

    await order.save();
    res.json({ success: true, order, message: `Payment status updated to ${order.paymentStatus}!` });
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

      // Handle Cash Collection for COD: Collected by driver from customer, pending turn-in to office
      if (order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'COD') {
        order.cashCollected = Number(cashCollected || order.totalAmountInr);
        order.cashCollectionStatus = 'Collected'; // Held by delivery driver
        order.paymentStatus = 'Pending'; // Awaiting official treasury settlement
      }

      order.statusTimeline.push({
        status: 'Delivered / Handover Completed',
        timestamp: new Date(),
        note: `Handover verified with OTP.${order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'COD' ? ` ₹${order.cashCollected} COD collected in cash by driver ${updatedBy || order.assignedDeliveryPartnerName || 'Driver'}. In transit for Municipal Treasury deposit.` : ' Pre-paid online via Razorpay.'}`,
        updatedBy: updatedBy || order.assignedDeliveryPartnerName || 'Delivery Partner'
      });

      await order.save();

      // Send Delivered Email
      sendDeliveredEmail(order).catch(e => console.error('Email error:', e.message));

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

// ── POST /api/eco-orders/:id/settle-cash (Official / Admin clears single order COD cash into treasury)
router.post('/:id/settle-cash', async (req, res) => {
  try {
    const { settledBy, notes } = req.body;
    const order = await EcoOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!order.cashCollected) order.cashCollected = order.totalAmountInr;
    order.cashCollectionStatus = 'Deposited';
    order.paymentStatus = 'Paid';
    order.treasurySettledAt = new Date();
    order.treasurySettledBy = settledBy || 'Municipal Treasury Official';

    order.statusTimeline.push({
      status: 'COD Cash Settled to Treasury',
      timestamp: new Date(),
      note: `₹${order.cashCollected} physical cash received from delivery executive ${order.assignedDeliveryPartnerName || 'Executive'} and cleared into Municipal Treasury. Verified by ${settledBy || 'Municipal Official'}.${notes ? ` (${notes})` : ''}`,
      updatedBy: settledBy || 'Municipal Official'
    });

    await order.save();
    res.json({ success: true, order, message: `₹${order.cashCollected} COD cash cleared into Municipal Treasury!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/eco-orders/settle-driver-cash (Official / Admin clears all collected cash for a delivery partner)
router.post('/settle-driver-cash', async (req, res) => {
  try {
    const { partnerId, partnerName, settledBy, notes } = req.body;
    const query = {
      $or: [
        ...(partnerId ? [{ assignedDeliveryPartnerId: partnerId }] : []),
        ...(partnerName ? [{ assignedDeliveryPartnerName: partnerName }] : [])
      ],
      cashCollectionStatus: 'Collected'
    };

    const pendingOrders = await EcoOrder.find(query);
    if (pendingOrders.length === 0) {
      return res.json({ success: true, count: 0, totalSettled: 0, message: 'No pending cash to settle for this driver.' });
    }

    let totalSettled = 0;
    for (const order of pendingOrders) {
      const amt = Number(order.cashCollected) || Number(order.totalAmountInr) || 0;
      totalSettled += amt;
      order.cashCollectionStatus = 'Deposited';
      order.paymentStatus = 'Paid';
      order.treasurySettledAt = new Date();
      order.treasurySettledBy = settledBy || 'Municipal Treasury Official';
      order.statusTimeline.push({
        status: 'COD Cash Settled to Treasury',
        timestamp: new Date(),
        note: `₹${amt} physical cash submitted & deposited into Municipal Treasury from delivery partner ${partnerName || order.assignedDeliveryPartnerName}. Verified by ${settledBy || 'Municipal Official'}.${notes ? ` (${notes})` : ''}`,
        updatedBy: settledBy || 'Municipal Official'
      });
      await order.save();
    }

    res.json({
      success: true,
      count: pendingOrders.length,
      totalSettled,
      message: `Successfully cleared ${pendingOrders.length} orders totaling ₹${totalSettled} from ${partnerName || 'delivery partner'} into Municipal Treasury!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
