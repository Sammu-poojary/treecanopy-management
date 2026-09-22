const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const Subscription = require('../models/Subscription');
const Tree = require('../models/Tree');
const User = require('../models/User');
const Adoption = require('../models/Adoption');
const EcoPointsTransaction = require('../models/EcoPointsTransaction');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let razorpay = null;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
  });
} catch (err) {
  console.warn('Razorpay initialization notice:', err.message);
}


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"TreeCanopy MGMT" <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// ── POST /api/subscriptions/send-reminders  (must be before /:id routes)
router.post('/send-reminders', async (req, res) => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringSubs = await Subscription.find({
      status: { $in: ['active', 'assigned'] },
      adoptionType: 'subscription',
      nextRenewalDate: { $lte: threeDaysLater, $gte: now },
      $or: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      ],
    });

    let sent = 0;
    for (const sub of expiringSubs) {
      if (sub.userEmail) {
        const renewDate = new Date(sub.nextRenewalDate).toLocaleDateString('en-IN');
        await sendEmail(
          sub.userEmail,
          `Renewal Reminder – ${sub.treeName}`,
          `<div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;">
            <h2 style="color:#166534;">🌳 Subscription Renewal Reminder</h2>
            <p>Dear <strong>${sub.userName}</strong>,</p>
            <p>Your <strong>${sub.plan}</strong> subscription for tree <strong>${sub.treeName}</strong> is due for renewal on <strong>${renewDate}</strong>.</p>
            <p>Please log in to your citizen portal and renew to continue supporting your adopted tree.</p>
            <p style="color:#6b7280;font-size:0.85rem;">If not renewed by ${renewDate}, the tree will be released for adoption.</p>
          </div>`
        );
        sub.lastReminderSentAt = now;
        await sub.save();
        sent++;
      }
    }

    // Mark lapsed subscriptions (past renewal date)
    const lapsedSubs = await Subscription.find({
      status: { $in: ['active', 'assigned'] },
      adoptionType: 'subscription',
      nextRenewalDate: { $lt: now },
    });
    for (const sub of lapsedSubs) {
      sub.status = 'lapsed';
      await sub.save();
      await Tree.findByIdAndUpdate(sub.treeId, { isAdopted: false, activeSubscriptionId: null });
      if (sub.userEmail) {
        await sendEmail(
          sub.userEmail,
          `Subscription Lapsed – ${sub.treeName}`,
          `<div style="font-family:Arial,sans-serif;padding:24px;">
            <p>Dear <strong>${sub.userName}</strong>, your subscription for <strong>${sub.treeName}</strong> has lapsed. The tree has been released. You may re-adopt it at any time.</p>
          </div>`
        );
      }
    }

    res.json({ success: true, remindersSent: sent, lapsedMarked: lapsedSubs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { treeId, plan, userId } = req.body;
    if (!treeId || !plan || !userId) return res.status(400).json({ error: 'Missing required fields' });

    const tree = await Tree.findById(treeId);
    if (!tree) return res.status(404).json({ error: 'Tree not found' });
    const existingAdoption = await Adoption.findOne({ treeId: treeId.toString(), status: 'Active' });
    if (tree.isAdopted || existingAdoption) return res.status(400).json({ error: 'This tree is already adopted' });

    const amount = plan === 'monthly' ? (tree.monthlyAdoptionFee || 500) : (tree.yearlyAdoptionFee || 6000);

    let order = null;
    let isDemo = false;

    try {
      if (razorpay && process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('placeholder')) {
        order = await razorpay.orders.create({
          amount: amount * 100,
          currency: 'INR',
          receipt: `sub_${Date.now()}`,
          notes: { treeId: treeId.toString(), userId: userId.toString(), plan },
        });
      }
    } catch (rzpErr) {
      console.warn('Razorpay live order creation failed (falling back to sandbox demo mode):', rzpErr?.error || rzpErr?.message);
      isDemo = true;
    }

    if (!order) {
      isDemo = true;
      order = {
        id: `order_demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        amount: amount * 100,
        currency: 'INR',
      };
    }

    res.json({
      orderId: order.id,
      amount: amount * 100,
      currency: 'INR',
      keyId: isDemo ? 'rzp_test_demo' : process.env.RAZORPAY_KEY_ID,
      treeName: tree.name,
      treeLocation: tree.origin || '',
      planAmount: amount,
      plan,
      isDemo,
    });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions/verify-payment
router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      treeId, plan, userId, userName, userEmail, userPhone, isDemo
    } = req.body;

    const isDemoOrder = isDemo || (razorpay_order_id && razorpay_order_id.startsWith('order_demo_'));

    if (!isDemoOrder) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment signature verification failed' });
      }
    }

    const tree = await Tree.findById(treeId);
    if (!tree) return res.status(404).json({ error: 'Tree not found' });

    const amount = plan === 'monthly' ? (tree.monthlyAdoptionFee || 500) : (tree.yearlyAdoptionFee || 6000);
    const startDate = new Date();
    const nextRenewalDate = new Date(startDate);
    if (plan === 'monthly') nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
    else nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);

    const subscription = new Subscription({
      userId, userName: userName || 'Citizen', userEmail: userEmail || '',
      userPhone: userPhone || '', treeId, treeName: tree.name,
      treeScientificName: tree.scientificName || '', treeLocation: tree.origin || '',
      treeImage: tree.image || (tree.images && tree.images[0]) || '',
      adoptionType: 'subscription', plan, amount, status: 'active',
      razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature, startDate, nextRenewalDate,
      paymentHistory: [{
        razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
        amount, plan, paidAt: new Date(), periodStart: startDate, periodEnd: nextRenewalDate,
      }],
    });
    await subscription.save();
    await Tree.findByIdAndUpdate(treeId, { isAdopted: true, activeSubscriptionId: subscription._id });

    // Sync corresponding Adoption record & award +100 Eco-Points
    try {
      const strUserId = (userId || '').toString();
      const strEmail = (userEmail || '').toLowerCase();
      const existingAdoption = await Adoption.findOne({
        $or: [
          { userId: strUserId },
          ...(strEmail ? [{ userEmail: strEmail }] : [])
        ],
        treeId: treeId.toString(),
        status: 'Active'
      });
      if (!existingAdoption) {
        const newAdoption = new Adoption({
          userId: strUserId,
          userName: userName || 'Citizen',
          userEmail: strEmail,
          treeId: treeId.toString(),
          treeName: tree.name,
          treeScientificName: tree.scientificName || '',
          treeFamily: tree.family || '',
          treeLocation: tree.origin || 'Udupi Canopy',
          treeImage: tree.image || (tree.images && tree.images[0]) || '',
          nickname: tree.name,
          totalEcoPoints: 100,
          certificateNumber: subscription.certificateNumber,
          status: 'Active',
          careLogs: [{
            action: 'Health Check',
            note: 'Initial adoption health inspection completed.',
            verificationStatus: 'Verified',
            pointsEarned: 100,
            timestamp: new Date()
          }]
        });
        await newAdoption.save();

        await new EcoPointsTransaction({
          userId: strUserId,
          userEmail: strEmail,
          adoptionId: newAdoption._id.toString(),
          type: 'EARN',
          points: 100,
          description: `Adopted ${tree.name} (${plan === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'})`
        }).save();
      }
    } catch (adoptionSyncErr) {
      console.error('Adoption/EcoPoints sync error in verify-payment:', adoptionSyncErr);
    }

    if (userEmail) {
      await sendEmail(
        userEmail,
        `🌳 Tree Adoption Confirmed – ${tree.name}`,
        `<div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;">
          <h2 style="color:#166534;">Adoption Confirmed!</h2>
          <p>Dear <strong>${userName}</strong>, you have successfully adopted <strong>${tree.name}</strong>.</p>
          <p><strong>Plan:</strong> ${plan === 'monthly' ? 'Monthly – ₹500' : 'Yearly – ₹6,000'}</p>
          <p><strong>Certificate:</strong> ${subscription.certificateNumber}</p>
          <p><strong>Next Renewal:</strong> ${nextRenewalDate.toLocaleDateString('en-IN')}</p>
          <p>A tree cutter will be assigned within 24 hours to care for your tree.</p>
        </div>`
      );
    }

    res.json({ success: true, subscription, message: 'Subscription activated successfully' });
  } catch (err) {
    console.error('verify-payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions/self-adopt
router.post('/self-adopt', async (req, res) => {
  try {
    const { treeId, userId, userName, userEmail, userPhone } = req.body;
    if (!treeId || !userId) return res.status(400).json({ error: 'Missing required fields' });

    const tree = await Tree.findById(treeId);
    if (!tree) return res.status(404).json({ error: 'Tree not found' });
    const existingAdoption = await Adoption.findOne({ treeId: treeId.toString(), status: 'Active' });
    if (tree.isAdopted || existingAdoption) return res.status(400).json({ error: 'This tree is already adopted' });

    const subscription = new Subscription({
      userId, userName: userName || 'Citizen', userEmail: userEmail || '',
      userPhone: userPhone || '', treeId, treeName: tree.name,
      treeScientificName: tree.scientificName || '', treeLocation: tree.origin || '',
      treeImage: tree.image || (tree.images && tree.images[0]) || '',
      adoptionType: 'self', plan: null, amount: 0, status: 'active',
    });
    await subscription.save();
    await Tree.findByIdAndUpdate(treeId, { isAdopted: true, activeSubscriptionId: subscription._id });

    // Sync corresponding Adoption record & award +100 Eco-Points
    try {
      const strUserId = (userId || '').toString();
      const strEmail = (userEmail || '').toLowerCase();
      const existingAdoption2 = await Adoption.findOne({
        $or: [
          { userId: strUserId },
          ...(strEmail ? [{ userEmail: strEmail }] : [])
        ],
        treeId: treeId.toString(),
        status: 'Active'
      });
      if (!existingAdoption2) {
        const newAdoption = new Adoption({
          userId: strUserId,
          userName: userName || 'Citizen',
          userEmail: strEmail,
          treeId: treeId.toString(),
          treeName: tree.name,
          treeScientificName: tree.scientificName || '',
          treeFamily: tree.family || '',
          treeLocation: tree.origin || 'Udupi Canopy',
          treeImage: tree.image || (tree.images && tree.images[0]) || '',
          nickname: tree.name,
          totalEcoPoints: 100,
          certificateNumber: subscription.certificateNumber,
          status: 'Active',
          careLogs: [{
            action: 'Health Check',
            note: 'Initial adoption health inspection completed.',
            verificationStatus: 'Verified',
            pointsEarned: 100,
            timestamp: new Date()
          }]
        });
        await newAdoption.save();

        await new EcoPointsTransaction({
          userId: strUserId,
          userEmail: strEmail,
          adoptionId: newAdoption._id.toString(),
          type: 'EARN',
          points: 100,
          description: `Adopted ${tree.name} (Self-Care Pledge)`
        }).save();
      }
    } catch (adoptionSyncErr) {
      console.error('Adoption/EcoPoints sync error in self-adopt:', adoptionSyncErr);
    }

    res.json({ success: true, subscription, message: 'Self-adoption created successfully' });
  } catch (err) {
    console.error('self-adopt error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/subscriptions/my?userId=xxx&userEmail=yyy
router.get('/my', async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    if (!userId && !userEmail) return res.status(400).json({ error: 'userId or userEmail required' });

    const strUserId = (userId || '').toString();
    const strEmail = (userEmail || (strUserId.includes('@') ? strUserId : '')).toLowerCase();

    const filter = {
      $or: [
        { userId: strUserId },
        ...(strEmail ? [{ userEmail: strEmail }] : [])
      ]
    };
    const subs = await Subscription.find(filter).sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/subscriptions/all
router.get('/all', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.plan) filter.plan = req.query.plan;
    if (req.query.adoptionType) filter.adoptionType = req.query.adoptionType;
    const subs = await Subscription.find(filter).sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/subscriptions/cutter-duties?cutterId=xxx&cutterName=yyy
router.get('/cutter-duties', async (req, res) => {
  try {
    const { cutterId, cutterName } = req.query;
    if (!cutterId && !cutterName) return res.status(400).json({ error: 'cutterId or cutterName required' });

    const conditions = [];
    if (cutterId) {
      conditions.push({ assignedCutterId: cutterId });
      conditions.push({ assignedCutterId: cutterId.toString() });
    }
    if (cutterName) {
      conditions.push({ assignedCutterName: new RegExp(cutterName.trim(), 'i') });
    }

    // Fetch all subscriptions assigned to this cutter (active + assigned)
    const subs = await Subscription.find({
      $or: conditions,
      status: { $in: ['assigned', 'active', 'lapsed'] }
    }).sort({ assignedAt: -1, createdAt: -1 });

    // Augment each subscription with schedule info
    const now = new Date();
    const enriched = subs.map(sub => {
      const obj = sub.toObject();
      const doneTasks = (obj.careTasks || []).filter(t => t.uploadedAt);
      const lastCareDate = doneTasks.length > 0
        ? new Date(Math.max(...doneTasks.map(t => new Date(t.uploadedAt).getTime())))
        : null;
      const baseDate = lastCareDate || obj.assignedAt || obj.createdAt || now;
      const nextCareDue = new Date(new Date(baseDate).getTime() + 7 * 24 * 60 * 60 * 1000);
      const daysUntilDue = Math.ceil((nextCareDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      obj._scheduleInfo = {
        lastCareDate: lastCareDate ? lastCareDate.toISOString() : null,
        nextCareDue: nextCareDue.toISOString(),
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
        pendingTaskCount: (obj.careTasks || []).filter(t => t.status === 'Pending').length,
        validatedTaskCount: (obj.careTasks || []).filter(t => t.status === 'Validated').length,
        totalTaskCount: (obj.careTasks || []).length,
      };
      return obj;
    });

    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/subscriptions/payment-report
router.get('/payment-report', async (req, res) => {
  try {
    const all = await Subscription.find({ adoptionType: 'subscription' });
    const totalRevenue = all.reduce((sum, s) => sum + (s.amount || 0), 0);
    const active = all.filter(s => ['active', 'assigned'].includes(s.status)).length;
    const lapsed = all.filter(s => s.status === 'lapsed').length;
    const cancelled = all.filter(s => s.status === 'cancelled').length;
    const monthly = all.filter(s => s.plan === 'monthly');
    const yearly = all.filter(s => s.plan === 'yearly');
    res.json({
      totalRevenue, active, lapsed, cancelled,
      monthlyCount: monthly.length, yearlyCount: yearly.length,
      monthlyRevenue: monthly.reduce((sum, s) => sum + (s.amount || 0), 0),
      yearlyRevenue: yearly.reduce((sum, s) => sum + (s.amount || 0), 0),
      recent: all.slice(-20).reverse(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/subscriptions/:id
router.get('/:id', async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/subscriptions/:id/assign-cutter
router.patch('/:id/assign-cutter', async (req, res) => {
  try {
    const { cutterId, cutterName, assignedById, assignedByName } = req.body;
    if (!cutterId) return res.status(400).json({ error: 'cutterId required' });

    const sub = await Subscription.findByIdAndUpdate(
      req.params.id,
      {
        assignedCutterId: cutterId, assignedCutterName: cutterName || 'Tree Cutter',
        assignedAt: new Date(), assignedBy: assignedById || null,
        assignedByName: assignedByName || '', status: 'assigned',
      },
      { returnDocument: 'after' }
    );
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (sub.userEmail) {
      await sendEmail(
        sub.userEmail,
        `Tree Cutter Assigned – ${sub.treeName}`,
        `<div style="font-family:Arial,sans-serif;padding:24px;">
          <p>Dear <strong>${sub.userName}</strong>, tree cutter <strong>${cutterName}</strong> has been assigned to care for your adopted tree <strong>${sub.treeName}</strong>. You can view their care proofs in your Subscriptions tab.</p>
        </div>`
      );
    }

    res.json({ success: true, subscription: sub });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/subscriptions/:id/upload-proof
router.post('/:id/upload-proof', async (req, res) => {
  try {
    const { taskType, description, uploadedBy, uploadedByName, uploadedByRole, imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const uploadResult = await cloudinary.uploader.upload(imageBase64, {
      folder: 'treecanopy/care-proofs',
      resource_type: 'image',
    });

    sub.careTasks.push({
      taskType: taskType || 'Watering',
      description: description || '',
      proofImageUrl: uploadResult.secure_url,
      proofPublicId: uploadResult.public_id,
      uploadedBy: uploadedBy || null,
      uploadedByName: uploadedByName || '',
      uploadedByRole: uploadedByRole || 'Tree Cutter',
      uploadedAt: new Date(),
      status: 'Pending',
    });
    await sub.save();

    res.json({ success: true, task: sub.careTasks[sub.careTasks.length - 1], subscription: sub });
  } catch (err) {
    console.error('upload-proof error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/subscriptions/:id/tasks/:taskId/validate
router.patch('/:id/tasks/:taskId/validate', async (req, res) => {
  try {
    const { status, validationNote, validatedById, validatedByName } = req.body;
    if (!['Validated', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be Validated or Rejected' });
    }

    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const task = sub.careTasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.status = status;
    task.validationNote = validationNote || '';
    task.validatedBy = validatedById || null;
    task.validatedByName = validatedByName || '';
    task.validatedAt = new Date();
    await sub.save();

    if (sub.userEmail) {
      await sendEmail(
        sub.userEmail,
        `Care Task ${status} – ${sub.treeName}`,
        `<div style="font-family:Arial,sans-serif;padding:24px;">
          <p>Dear <strong>${sub.userName}</strong>, a <strong>${task.taskType}</strong> care task for <strong>${sub.treeName}</strong> has been <strong>${status.toLowerCase()}</strong>.</p>
          ${validationNote ? `<p><strong>Note:</strong> ${validationNote}</p>` : ''}
        </div>`
      );
    }

    res.json({ success: true, task, subscription: sub });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/subscriptions/:id/cancel
router.patch('/:id/cancel', async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { returnDocument: 'after' }
    );
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    await Tree.findByIdAndUpdate(sub.treeId, { isAdopted: false, activeSubscriptionId: null });
    res.json({ success: true, subscription: sub });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/subscriptions/:id/renew-order
router.post('/:id/renew-order', async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const tree = await Tree.findById(sub.treeId);
    const amount = sub.plan === 'monthly'
      ? (tree ? tree.monthlyAdoptionFee : 500) || 500
      : (tree ? tree.yearlyAdoptionFee : 6000) || 6000;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `renew_${sub._id}_${Date.now()}`,
      notes: { subscriptionId: sub._id.toString(), plan: sub.plan, renew: 'true' },
    });
    res.json({ orderId: order.id, amount: amount * 100, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, planAmount: amount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/subscriptions/:id/verify-renewal
router.post('/:id/verify-renewal', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expectedSig !== razorpay_signature) return res.status(400).json({ error: 'Signature verification failed' });

    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const now = new Date();
    const base = sub.nextRenewalDate && sub.nextRenewalDate > now ? sub.nextRenewalDate : now;
    const newRenewal = new Date(base);
    if (sub.plan === 'monthly') newRenewal.setMonth(newRenewal.getMonth() + 1);
    else newRenewal.setFullYear(newRenewal.getFullYear() + 1);

    sub.nextRenewalDate = newRenewal;
    sub.status = sub.assignedCutterId ? 'assigned' : 'active';
    sub.razorpayPaymentId = razorpay_payment_id;
    sub.paymentHistory.push({
      razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
      amount: sub.amount, plan: sub.plan, paidAt: now, periodStart: now, periodEnd: newRenewal,
    });
    await sub.save();
    await Tree.findByIdAndUpdate(sub.treeId, { isAdopted: true, activeSubscriptionId: sub._id });

    res.json({ success: true, subscription: sub });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
