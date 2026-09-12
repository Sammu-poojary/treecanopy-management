const express = require('express');
const router = express.Router();
const Reward = require('../models/Reward');
const Redemption = require('../models/Redemption');
const EcoPointsTransaction = require('../models/EcoPointsTransaction');
const Adoption = require('../models/Adoption');
const Notification = require('../models/Notification');

// Default initial catalogue rewards
const DEFAULT_REWARDS = [
  {
    name: 'Native Seed Kit',
    description: 'Small collection of native fruit and shade tree seeds for community or home garden planting.',
    pointsRequired: 250,
    rewardType: 'Native Seed Kit',
    imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=500&auto=format&fit=crop&q=60',
    quantityAvailable: 100,
    isActive: true,
    redemptionInstructions: 'Present your redemption code at the Municipal Horticulture Center or Udupi Urban Forestry Office.',
    validityDays: 30,
    collectionMethod: 'Municipal Center Pickup',
  },
  {
    name: 'Native Sapling',
    description: 'A healthy 6-month-old native sapling (Neem, Jackfruit, or Mahogany) ready for urban planting.',
    pointsRequired: 500,
    rewardType: 'Native Sapling',
    imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500&auto=format&fit=crop&q=60',
    quantityAvailable: 50,
    isActive: true,
    redemptionInstructions: 'Collect your sapling at the nearest sector nursery with your digital redemption voucher.',
    validityDays: 45,
    collectionMethod: 'Sector Nursery Pickup',
  },
  {
    name: 'Tree Plantation Sponsorship',
    description: 'Sponsor the plantation and 1-year maintenance of a new canopy tree in high-heat urban zones.',
    pointsRequired: 750,
    rewardType: 'Tree Plantation Sponsorship',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500&auto=format&fit=crop&q=60',
    quantityAvailable: null, // Unlimited
    isActive: true,
    redemptionInstructions: 'Your sponsorship will be queued for the upcoming municipal greening drive. You will receive plantation GPS updates.',
    validityDays: 90,
    collectionMethod: 'Program Credit / Direct Action',
  },
  {
    name: 'Special Guardian Certificate',
    description: 'Gold-embossed physical Certificate of Environmental Guardianship signed by the Urban Forestry Commissioner.',
    pointsRequired: 1250,
    rewardType: 'Special Certificate',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500&auto=format&fit=crop&q=60',
    quantityAvailable: 25,
    isActive: true,
    redemptionInstructions: 'Delivered to your registered address or available for pickup at City Hall.',
    validityDays: 60,
    collectionMethod: 'Courier / City Hall Pickup',
  },
  {
    name: 'Tree Care Kit',
    description: 'Professional tree maintenance toolkit: pruning shears, organic fertilizer, watering gauge, and tree guard tags.',
    pointsRequired: 1500,
    rewardType: 'Tree Care Kit',
    imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&auto=format&fit=crop&q=60',
    quantityAvailable: 20,
    isActive: true,
    redemptionInstructions: 'Collect your kit at the Forestry Command Center upon presenting your code.',
    validityDays: 30,
    collectionMethod: 'Command Center Pickup',
  },
  {
    name: 'Community Plantation Contribution',
    description: 'Fund 5 community saplings and protective iron guards in public parks and school assembly yards.',
    pointsRequired: 2000,
    rewardType: 'Community Plantation',
    imageUrl: 'https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=500&auto=format&fit=crop&q=60',
    quantityAvailable: null,
    isActive: true,
    redemptionInstructions: 'Dedicated plaque acknowledgment during annual World Environment Day celebrations.',
    validityDays: 180,
    collectionMethod: 'Community Program Credit',
  },
];

// Helper: Seed default rewards if database catalogue is empty
const seedDefaultRewardsIfEmpty = async () => {
  try {
    await Reward.deleteMany({ $or: [{ name: 'Adopt Another Tree' }, { rewardType: 'Adopt Another Tree' }] });
    const count = await Reward.countDocuments();
    if (count === 0) {
      await Reward.insertMany(DEFAULT_REWARDS);
      console.log('[Rewards API] Initial default rewards catalogue seeded successfully.');
    }
  } catch (err) {
    console.error('[Rewards API] Error seeding default rewards:', err);
  }
};

// Helper: Calculate user's authoritative net Eco-Points balance
const calculateUserNetBalance = async (userId) => {
  const strUserId = userId.toString();
  // 1. Calculate total earned from Adoptions
  const adoptions = await Adoption.find({ userId: strUserId, status: 'Active' });
  const totalEarnedAdoptions = adoptions.reduce((sum, a) => sum + (a.totalEcoPoints || 0), 0);

  // 2. Calculate total EARN transactions
  const earnTx = await EcoPointsTransaction.aggregate([
    { $match: { userId: strUserId, type: 'EARN' } },
    { $group: { _id: null, total: { $sum: '$points' } } }
  ]);
  const totalEarnTx = earnTx.length > 0 ? earnTx[0].total : 0;

  const totalEarned = Math.max(totalEarnedAdoptions, totalEarnTx);

  // 3. Calculate total REDEEM transactions (points are stored negative or positive in REDEEM)
  const redeemTx = await EcoPointsTransaction.aggregate([
    { $match: { userId: strUserId, type: 'REDEEM' } },
    { $group: { _id: null, total: { $sum: { $abs: '$points' } } } }
  ]);
  const totalRedeemed = redeemTx.length > 0 ? redeemTx[0].total : 0;

  return {
    totalEarned,
    totalRedeemed,
    netBalance: Math.max(0, totalEarned - totalRedeemed)
  };
};

// @route   GET /api/rewards
// @desc    List all active available rewards
// @access  Public / Citizen
router.get('/', async (req, res) => {
  try {
    await seedDefaultRewardsIfEmpty();
    const rewards = await Reward.find({ isActive: true }).sort({ pointsRequired: 1 });
    res.json(rewards);
  } catch (err) {
    console.error('Error fetching rewards:', err);
    res.status(500).json({ msg: 'Server error fetching rewards catalogue' });
  }
});

// @route   GET /api/rewards/my-redemptions
// @desc    Get user redemption history & status
// @access  Public / Citizen
router.get('/my-redemptions', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ msg: 'userId query parameter is required' });
    }
    const redemptions = await Redemption.find({ userId: userId.toString() })
      .populate('rewardId')
      .sort({ createdAt: -1 });
    res.json(redemptions);
  } catch (err) {
    console.error('Error fetching redemptions:', err);
    res.status(500).json({ msg: 'Server error fetching redemption history' });
  }
});

// @route   POST /api/rewards/redeem
// @desc    Redeem an active reward using Eco-Points with authoritative backend validation
// @access  Public / Citizen
router.post('/redeem', async (req, res) => {
  try {
    const { userId, userName, userEmail, rewardId } = req.body;

    if (!userId || !rewardId) {
      return res.status(400).json({ success: false, message: 'userId and rewardId are required' });
    }

    const strUserId = userId.toString();

    // 1. Fetch reward from database
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({ success: false, message: 'Reward not found' });
    }
    if (!reward.isActive) {
      return res.status(400).json({ success: false, message: 'This reward is currently inactive' });
    }
    if (reward.quantityAvailable !== null && reward.quantityAvailable <= 0) {
      return res.status(400).json({ success: false, message: 'This reward is currently out of stock' });
    }

    // 2. Authoritatively calculate user's current net available balance
    const { netBalance } = await calculateUserNetBalance(strUserId);

    if (netBalance < reward.pointsRequired) {
      return res.status(400).json({
        success: false,
        message: `Insufficient Eco-Points. You have ${netBalance} points, but this reward requires ${reward.pointsRequired} points.`,
        netBalance,
        pointsRequired: reward.pointsRequired,
      });
    }

    // 3. Generate unique redemption code
    const dateCode = Date.now().toString().slice(-6);
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const redemptionCode = `CG-RED-${dateCode}-${randomHex}`;

    const newBalance = netBalance - reward.pointsRequired;

    // 4. Create Redemption Record
    const redemption = new Redemption({
      userId: strUserId,
      userName: userName || 'Eco Guardian',
      userEmail: userEmail || '',
      rewardId: reward._id,
      rewardNameSnapshot: reward.name,
      pointsSpent: reward.pointsRequired,
      redemptionCode,
      status: 'Pending',
      notes: reward.collectionMethod ? `Collection method: ${reward.collectionMethod}` : '',
    });
    await redemption.save();

    // 5. Create EcoPointsTransaction Ledger Record
    const transaction = new EcoPointsTransaction({
      userId: strUserId,
      type: 'REDEEM',
      points: -reward.pointsRequired,
      description: `${reward.name} Redemption`,
      referenceId: redemption._id.toString(),
      balanceAfter: newBalance,
    });
    await transaction.save();

    // 6. Decrement available quantity if limited
    if (reward.quantityAvailable !== null && reward.quantityAvailable > 0) {
      reward.quantityAvailable -= 1;
      await reward.save();
    }

    // 7. Dispatch Notification to user
    try {
      await Notification.create({
        targetUserId: strUserId,
        targetRole: 'Citizen',
        type: 'redemption_submitted',
        title: '🎉 Reward Redemption Submitted',
        message: `Your request for '${reward.name}' (${reward.pointsRequired} Pts) has been submitted! Voucher Code: ${redemptionCode}`,
        relatedId: redemption._id.toString(),
      });
    } catch (_) {}

    res.json({
      success: true,
      message: '🎉 Reward redeemed successfully!',
      redemption,
      points: {
        spent: reward.pointsRequired,
        remaining: newBalance,
      },
    });
  } catch (err) {
    console.error('Error processing redemption:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error processing redemption' });
  }
});

// @route   GET /api/rewards/points-history
// @desc    Get user Eco-Points transaction history ledger
// @access  Public / Citizen
router.get('/points-history', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ msg: 'userId query parameter is required' });
    }
    const strUserId = userId.toString();

    let transactions = await EcoPointsTransaction.find({ userId: strUserId })
      .sort({ createdAt: -1 });

    // If user has adoptions but no transactions in ledger yet, auto-synthesize adoption EARN entries
    if (transactions.length === 0) {
      const adoptions = await Adoption.find({ userId: strUserId, status: 'Active' });
      const rawEntries = [];

      for (const adoption of adoptions) {
        // Welcome bonus entry (+100 Pts)
        rawEntries.push({
          _id: `syn_welcome_${adoption._id}`,
          userId: strUserId,
          adoptionId: adoption._id.toString(),
          type: 'EARN',
          points: 100,
          description: `Adopted ${adoption.treeName} (${adoption.nickname || 'Living Pledge'})`,
          createdAt: new Date(adoption.adoptedAt || adoption.createdAt),
        });

        // Care logs entries
        if (Array.isArray(adoption.careLogs)) {
          for (const log of adoption.careLogs) {
            if (log.action !== 'Health Check' || log.note !== 'Initial adoption health inspection completed.') {
              const actKey = (log.action || '').toUpperCase().replace(/\s+/g, '_');
              const defaultPoints = {
                WATERED: 50,
                MULCHED: 75,
                HEALTH_CHECK: 60,
                PHOTO_UPDATE: 80,
                FERTILIZED: 70,
                PRUNED_DEAD_LEAVES: 65,
                PEST_CONTROL: 75,
              }[actKey] || 50;

              const pts = (log.pointsEarned !== undefined && log.pointsEarned !== null) ? log.pointsEarned : defaultPoints;

              rawEntries.push({
                _id: `syn_log_${log._id || Math.random()}`,
                userId: strUserId,
                adoptionId: adoption._id.toString(),
                type: 'EARN',
                points: pts,
                description: `${log.action} check-in for ${adoption.nickname || adoption.treeName}`,
                createdAt: new Date(log.timestamp || new Date()),
              });
            }
          }
        }
      }

      // Sort CHRONOLOGICALLY ASCENDING to calculate cumulative running balance
      rawEntries.sort((a, b) => a.createdAt - b.createdAt);

      let cumulativeBalance = 0;
      const synthesized = rawEntries.map(entry => {
        cumulativeBalance += entry.points;
        return {
          ...entry,
          balanceAfter: cumulativeBalance,
        };
      });

      // Sort DESCENDING for display (newest transaction first)
      synthesized.sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ transactions: synthesized, netBalance: cumulativeBalance });
    }

    const { netBalance } = await calculateUserNetBalance(strUserId);
    res.json({ transactions, netBalance });
  } catch (err) {
    console.error('Error fetching points history:', err);
    res.status(500).json({ msg: 'Server error fetching points history' });
  }
});

// ── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// @route   POST /api/rewards
// @desc    Admin: Create a new reward
// @access  Admin
router.post('/', async (req, res) => {
  try {
    const { name, description, pointsRequired, rewardType, imageUrl, quantityAvailable, redemptionInstructions, validityDays, collectionMethod } = req.body;
    if (!name || !description || !pointsRequired) {
      return res.status(400).json({ msg: 'name, description, and pointsRequired are required' });
    }
    const reward = new Reward({
      name,
      description,
      pointsRequired: Number(pointsRequired),
      rewardType: rewardType || 'Digital / Platform',
      imageUrl: imageUrl || '',
      quantityAvailable: quantityAvailable === '' || quantityAvailable === null ? null : Number(quantityAvailable),
      redemptionInstructions: redemptionInstructions || '',
      validityDays: validityDays ? Number(validityDays) : 30,
      collectionMethod: collectionMethod || 'Municipal Center Pickup',
    });
    await reward.save();
    res.status(201).json({ msg: 'Reward created successfully', reward });
  } catch (err) {
    console.error('Error creating reward:', err);
    res.status(500).json({ msg: 'Server error creating reward' });
  }
});

// @route   PUT /api/rewards/:id
// @desc    Admin: Update existing reward
// @access  Admin
router.put('/:id', async (req, res) => {
  try {
    const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reward) return res.status(404).json({ msg: 'Reward not found' });
    res.json({ msg: 'Reward updated successfully', reward });
  } catch (err) {
    res.status(500).json({ msg: 'Server error updating reward' });
  }
});

// @route   DELETE /api/rewards/:id
// @desc    Admin: Soft-deactivate a reward
// @access  Admin
router.delete('/:id', async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) return res.status(404).json({ msg: 'Reward not found' });
    reward.isActive = false;
    await reward.save();
    res.json({ msg: 'Reward deactivated successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error deactivating reward' });
  }
});

// @route   GET /api/rewards/admin/redemptions
// @desc    Admin: Fetch all citizen redemption requests
// @access  Admin / Official
router.get('/admin/redemptions', async (req, res) => {
  try {
    await seedDefaultRewardsIfEmpty();
    const redemptions = await Redemption.find()
      .populate('rewardId')
      .sort({ createdAt: -1 });

    const totalRedemptions = redemptions.length;
    const pendingCount = redemptions.filter(r => r.status === 'Pending').length;
    const approvedCount = redemptions.filter(r => ['Approved', 'Ready for Collection', 'Plantation Scheduled'].includes(r.status)).length;
    const completedCount = redemptions.filter(r => ['Completed', 'Collected'].includes(r.status)).length;
    const totalPointsRedeemed = redemptions.reduce((sum, r) => sum + (r.pointsSpent || 0), 0);

    res.json({
      redemptions,
      metrics: {
        totalRedemptions,
        pendingCount,
        approvedCount,
        completedCount,
        totalPointsRedeemed,
      },
    });
  } catch (err) {
    console.error('Error fetching admin redemptions:', err);
    res.status(500).json({ msg: 'Server error fetching redemptions' });
  }
});

// @route   PUT /api/rewards/admin/redemptions/:id/status
// @desc    Admin: Update redemption status (Pending -> Approved -> Ready for Collection -> Collected/Completed / Rejected)
// @access  Admin / Official
router.put('/admin/redemptions/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ msg: 'status is required' });

    const redemption = await Redemption.findById(req.params.id);
    if (!redemption) return res.status(404).json({ msg: 'Redemption record not found' });

    redemption.status = status;
    if (notes) redemption.notes = notes;
    if (['Completed', 'Collected'].includes(status)) {
      redemption.processedAt = new Date();
    }
    await redemption.save();

    // Dispatch Notification to Citizen
    let notifType = 'redemption_approved';
    let notifTitle = '✨ Redemption Approved';
    let notifMsg = `Your redemption for '${redemption.rewardNameSnapshot}' has been approved!`;

    if (status === 'Ready for Collection') {
      notifType = 'redemption_ready';
      notifTitle = '📦 Reward Ready for Collection';
      notifMsg = `Your reward '${redemption.rewardNameSnapshot}' (Code: ${redemption.redemptionCode}) is ready for pickup!`;
    } else if (['Completed', 'Collected'].includes(status)) {
      notifType = 'redemption_completed';
      notifTitle = '🌳 Redemption Completed';
      notifMsg = `Your reward '${redemption.rewardNameSnapshot}' has been marked as fully completed. Thank you for supporting Udupi urban greening!`;
    } else if (status === 'Rejected') {
      notifType = 'redemption_rejected';
      notifTitle = '❌ Redemption Request Update';
      notifMsg = `Your redemption for '${redemption.rewardNameSnapshot}' was updated to Rejected. Note: ${notes || 'Contact Municipal Support'}.`;
    }

    try {
      await Notification.create({
        targetUserId: redemption.userId,
        targetRole: 'Citizen',
        type: notifType,
        title: notifTitle,
        message: notifMsg,
        relatedId: redemption._id.toString(),
      });
    } catch (_) {}

    res.json({ msg: `Redemption status updated to '${status}'`, redemption });
  } catch (err) {
    console.error('Error updating redemption status:', err);
    res.status(500).json({ msg: 'Server error updating redemption status' });
  }
});

module.exports = router;
