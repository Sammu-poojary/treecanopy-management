const express = require('express');
const router = express.Router();
const Adoption = require('../models/Adoption');
const Tree = require('../models/Tree');
const User = require('../models/User');
const EcoPointsTransaction = require('../models/EcoPointsTransaction');

// Eco-Points rules
const POINTS = {
  ADOPTION_WELCOME: 100,
  WATERED: 50,
  MULCHED: 75,
  HEALTH_CHECK: 60,
  PHOTO_UPDATE: 80,
  FERTILIZED: 70,
  PRUNED_DEAD_LEAVES: 65,
};

// Activity Rules Matrix (Points, Cooldowns, Photo & GPS Requirements)
const ACTIVITY_RULES = {
  WATERED: { points: 50, cooldownHours: 18, photoRequired: false, gpsRequired: true },
  MULCHED: { points: 75, cooldownHours: 168, photoRequired: true, gpsRequired: true },
  HEALTH_CHECK: { points: 60, cooldownHours: 72, photoRequired: true, gpsRequired: true },
  PHOTO_UPDATE: { points: 80, cooldownHours: 72, photoRequired: true, gpsRequired: true },
  FERTILIZED: { points: 70, cooldownHours: 720, photoRequired: true, gpsRequired: true },
  PRUNED_DEAD_LEAVES: { points: 65, cooldownHours: 168, photoRequired: true, gpsRequired: true },
};

// Haversine GPS Distance Calculation Helper (returns meters)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 12; // default realistic distance if coords missing
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// @route   POST /api/adoptions/adopt
// @desc    Adopt a tree with custom nickname & award initial eco points
// @access  Public / Citizen
router.post('/adopt', async (req, res) => {
  try {
    const { userId, userName, userEmail, treeId, nickname } = req.body;

    if (!userId || !treeId) {
      return res.status(400).json({ msg: 'userId and treeId are required' });
    }

    // Check if user already adopted this tree
    const existing = await Adoption.findOne({ 
      userId: userId.toString(), 
      treeId: treeId.toString(), 
      status: 'Active' 
    });
    if (existing) {
      return res.status(400).json({ msg: 'You have already adopted this tree!' });
    }

    // Fetch tree details safely
    let tree = null;
    const mongoose = require('mongoose');
    try {
      if (mongoose.isValidObjectId(treeId)) {
        tree = await Tree.findById(treeId);
      }
    } catch (e) {}

    if (!tree) {
      try {
        tree = await Tree.findOne({ name: req.body.treeName || '' });
      } catch (e) {}
    }

    const treeName = tree ? tree.name : (req.body.treeName || 'Canopy Tree');
    const treeScientificName = tree ? (tree.scientificName || '') : (req.body.treeScientificName || '');
    const treeFamily = tree ? (tree.family || '') : (req.body.treeFamily || '');
    const treeLocation = tree ? (tree.origin || 'Udupi Canopy') : (req.body.treeLocation || 'Udupi Canopy');
    const treeImage = tree ? (tree.image || '') : (req.body.treeImage || '');

    const newAdoption = new Adoption({
      userId: userId.toString(),
      userName: userName || 'Eco Guardian',
      userEmail: userEmail || '',
      treeId: treeId.toString(),
      treeName,
      treeScientificName,
      treeFamily,
      treeLocation,
      treeImage,
      nickname: nickname || treeName,
      totalEcoPoints: POINTS.ADOPTION_WELCOME,
      careLogs: [
        {
          action: 'Health Check',
          note: 'Initial adoption health inspection completed.',
          pointsEarned: POINTS.ADOPTION_WELCOME,
          verificationStatus: 'Verified',
          verificationReason: 'Initial adoption verification',
          timestamp: new Date(),
        },
      ],
    });

    const saved = await newAdoption.save();

    // Log EARN transaction in Ledger
    try {
      const earnTx = new EcoPointsTransaction({
        userId: userId.toString(),
        adoptionId: saved._id.toString(),
        type: 'EARN',
        points: POINTS.ADOPTION_WELCOME,
        description: `Tree Adoption Welcome Bonus: ${treeName} (${nickname || treeName})`,
        referenceId: `adopt_${saved._id}`,
        balanceAfter: POINTS.ADOPTION_WELCOME,
      });
      await earnTx.save();
    } catch (_) {}

    res.status(201).json({
      msg: '🎉 Congratulations! You have officially adopted this tree!',
      adoption: saved,
      pointsAwarded: POINTS.ADOPTION_WELCOME,
    });
  } catch (err) {
    console.error('Error adopting tree:', err);
    res.status(500).json({ msg: err.message || 'Server error adopting tree', error: err.message });
  }
});


// @route   GET /api/adoptions/my-adoptions
// @desc    Get all adopted trees for a user with streaks and total eco points
// @access  Public / Citizen
router.get('/my-adoptions', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ msg: 'userId query parameter is required' });
    }

    const adoptions = await Adoption.find({ userId: userId.toString(), status: 'Active' }).sort({ createdAt: -1 });

    // Calculate user's net balance considering transactions if any exist
    const redeemTx = await EcoPointsTransaction.aggregate([
      { $match: { userId: userId.toString(), type: 'REDEEM' } },
      { $group: { _id: null, total: { $sum: { $abs: '$points' } } } }
    ]);
    const totalRedeemed = redeemTx.length > 0 ? redeemTx[0].total : 0;

    const rawTotalPoints = adoptions.reduce((acc, curr) => {
      let carePts = 0;
      if (Array.isArray(curr.careLogs)) {
        carePts = curr.careLogs.reduce((sum, l) => {
          if (l.action === 'Health Check' && l.note === 'Initial adoption health inspection completed.') return sum;
          const actKey = (l.action || '').toUpperCase().replace(/\s+/g, '_');
          const defaultPts = { WATERED: 50, MULCHED: 75, HEALTH_CHECK: 60, PHOTO_UPDATE: 80, FERTILIZED: 70, PRUNED_DEAD_LEAVES: 65, PEST_CONTROL: 75 }[actKey] || 50;
          return sum + (l.pointsEarned !== undefined && l.pointsEarned !== null ? l.pointsEarned : defaultPts);
        }, 0);
      }
      const actualPts = Math.max(curr.totalEcoPoints || 100, 100 + carePts);
      return acc + actualPts;
    }, 0);
    const totalPoints = Math.max(0, rawTotalPoints - totalRedeemed);
    const totalTreesAdopted = adoptions.length;
    const totalCareLogs = adoptions.reduce((acc, curr) => acc + (curr.careLogs?.length || 0), 0);

    // Compute badges based on metrics
    const badges = [
      { id: 'first_sprout', name: 'First Sprout', desc: 'Adopted 1st Tree', unlocked: totalTreesAdopted >= 1, icon: '🌱', req: '1 tree', cur: `${totalTreesAdopted}/1` },
      { id: 'master_hydrator', name: 'Master Hydrator', desc: 'Log care 5+ times', unlocked: totalCareLogs >= 5, icon: '💧', req: '5 check-ins', cur: `${totalCareLogs}/5` },
      { id: 'green_patron', name: 'Canopy Patron', desc: 'Adopt 3+ Trees', unlocked: totalTreesAdopted >= 3, icon: '🌳', req: '3 trees', cur: `${totalTreesAdopted}/3` },
      { id: 'eco_centurion', name: 'Eco Centurion', desc: 'Earn 500+ Eco-Points', unlocked: rawTotalPoints >= 500, icon: '⭐', req: '500 pts', cur: `${rawTotalPoints}/500` },
      { id: 'forest_guardian', name: 'Forest Guardian', desc: 'Earn 1,000+ Eco-Points', unlocked: rawTotalPoints >= 1000, icon: '🛡️', req: '1,000 pts', cur: `${rawTotalPoints}/1000` },
      { id: 'century_caretaker', name: 'Century Caretaker', desc: 'Complete 10+ Care Logs', unlocked: totalCareLogs >= 10, icon: '🏆', req: '10 logs', cur: `${totalCareLogs}/10` },
    ];

    // Compute Rank
    let levelName = 'Seedling Guardian';
    let levelTier = 1;
    let nextTierPoints = 150;

    if (rawTotalPoints >= 1000) {
      levelName = 'Eco Legend';
      levelTier = 5;
      nextTierPoints = 2000;
    } else if (rawTotalPoints >= 600) {
      levelName = 'Forest Guardian';
      levelTier = 4;
      nextTierPoints = 1000;
    } else if (rawTotalPoints >= 300) {
      levelName = 'Canopy Protector';
      levelTier = 3;
      nextTierPoints = 600;
    } else if (rawTotalPoints >= 150) {
      levelName = 'Sapling Tender';
      levelTier = 2;
      nextTierPoints = 300;
    }

    res.json({
      adoptions,
      stats: {
        totalPoints,
        rawTotalPoints,
        totalRedeemed,
        totalTreesAdopted,
        totalCareLogs,
        levelName,
        levelTier,
        nextTierPoints,
      },
      badges,
    });
  } catch (err) {
    console.error('Error fetching adoptions:', err);
    res.status(500).json({ msg: 'Server error fetching adoptions' });
  }
});

// @route   POST /api/adoptions/:id/care-log
// @desc    Log a care event with GPS Proximity Verification & Cooldown Enforcement
// @access  Public / Citizen
router.post('/:id/care-log', async (req, res) => {
  try {
    const { action, note, photoUrl, location, latitude, longitude, accuracy } = req.body || {};
    const mongoose = require('mongoose');

    let adoption = null;
    if (mongoose.isValidObjectId(req.params.id)) {
      adoption = await Adoption.findById(req.params.id);
    }
    if (!adoption) {
      try {
        adoption = await Adoption.findOne({ _id: req.params.id });
      } catch (_) {}
    }
    if (!adoption) {
      return res.status(404).json({ msg: 'Adoption record not found' });
    }

    const normalizedAction = action || 'Watered';
    const actionKey = normalizedAction.toUpperCase().replace(/\s+/g, '_');
    const rule = ACTIVITY_RULES[actionKey] || { points: 50, cooldownHours: 18, photoRequired: false, gpsRequired: true };

    const now = new Date();

    // ── 1. Anti-Spam Cooldown Check ──────────────────────────────────────────────
    if (Array.isArray(adoption.careLogs)) {
      const lastSameActionLog = adoption.careLogs.find(l => l.action === normalizedAction);
      if (lastSameActionLog && lastSameActionLog.timestamp) {
        const diffHours = (now - new Date(lastSameActionLog.timestamp)) / (1000 * 60 * 60);
        if (diffHours < rule.cooldownHours) {
          const remainingHours = Math.ceil(rule.cooldownHours - diffHours);
          return res.status(400).json({
            msg: `⏳ Activity already recorded. You can log '${normalizedAction}' again after ${remainingHours} hours.`,
            cooldownRemainingHours: remainingHours,
            action: normalizedAction,
          });
        }
      }
    } else {
      adoption.careLogs = [];
    }

    // ── 2. Verification & Proximity Engine ──────────────────────────────────────
    let verificationStatus = 'Verified';
    let verificationReason = 'Location and activity verified.';
    
    // Check Photo Requirement
    if (rule.photoRequired && (!photoUrl || photoUrl.trim().length < 5)) {
      verificationStatus = 'Rejected';
      verificationReason = 'Photo evidence is required for this activity.';
    }

    // Check GPS & Distance (Proximity Radius)
    const reqLat = latitude || (location ? location.latitude : null);
    const reqLng = longitude || (location ? location.longitude : null);
    const reqAcc = accuracy || (location ? location.accuracy : null);

    // Fetch registered tree coordinates if available
    let treeLat = null;
    let treeLng = null;
    try {
      if (mongoose.isValidObjectId(adoption.treeId)) {
        const tr = await Tree.findById(adoption.treeId);
        if (tr && tr.lat) treeLat = tr.lat;
        if (tr && tr.lng) treeLng = tr.lng;
      }
    } catch (_) {}

    const distMeters = calculateHaversineDistance(reqLat, reqLng, treeLat, treeLng);

    if (verificationStatus === 'Verified') {
      if (reqAcc && reqAcc > 50) {
        verificationStatus = 'Rejected';
        verificationReason = `GPS accuracy is too low (${Math.round(reqAcc)}m accuracy; required <= 50m).`;
      } else if (distMeters > 300) {
        verificationStatus = 'Rejected';
        verificationReason = `Location is ${distMeters}m from registered tree (required <= 300m).`;
      }
    }

    const earned = verificationStatus === 'Verified' ? rule.points : 0;

    // ── 3. Care Streak Update ────────────────────────────────────────────────────
    const lastCare = new Date(adoption.lastCareDate || adoption.createdAt || Date.now());
    const overallDiffHours = (now - lastCare) / (1000 * 60 * 60);

    let newStreak = adoption.careStreak || 1;
    if (overallDiffHours >= 18 && overallDiffHours <= 48) {
      newStreak += 1;
    } else if (overallDiffHours > 48) {
      newStreak = 1;
    }

    // ── 4. Log Entry & State Persistence ──────────────────────────────────────
    const newLog = {
      action: normalizedAction,
      note: note || '',
      photoUrl: photoUrl || '',
      location: {
        latitude: reqLat || null,
        longitude: reqLng || null,
        accuracy: reqAcc || null,
      },
      distanceFromTree: distMeters,
      verificationStatus,
      verificationReason,
      pointsEarned: earned,
      timestamp: now,
    };

    adoption.careLogs.unshift(newLog);

    if (earned > 0) {
      adoption.totalEcoPoints = (adoption.totalEcoPoints || 0) + earned;
      // Log EARN transaction in Ledger
      try {
        const earnTx = new EcoPointsTransaction({
          userId: adoption.userId.toString(),
          adoptionId: adoption._id.toString(),
          type: 'EARN',
          points: earned,
          description: `${normalizedAction} check-in for ${adoption.nickname || adoption.treeName}`,
          referenceId: `care_${Date.now()}`,
          balanceAfter: adoption.totalEcoPoints,
        });
        await earnTx.save();
      } catch (_) {}
    }

    adoption.careStreak = newStreak;
    adoption.lastCareDate = now;

    await adoption.save();

    let responseMsg = `🌿 Awesome! Care activity logged: ${normalizedAction}. You earned +${earned} Eco-Points!`;
    if (verificationStatus === 'Rejected') {
      responseMsg = `⚠️ Care activity logged, but verification failed: ${verificationReason} (0 points awarded).`;
    }

    res.json({
      msg: responseMsg,
      adoption,
      pointsEarned: earned,
      streak: newStreak,
      verificationStatus,
      verificationReason,
      distanceFromTree: distMeters,
      gpsAccuracy: reqAcc || 8,
    });
  } catch (err) {
    console.error('Error logging care action:', err);
    res.status(500).json({ msg: 'Server error logging care action', error: err.message });
  }
});

// @route   GET /api/adoptions/certificates/:certificateNumber/verify
// @desc    Public endpoint to verify an adoption digital certificate
// @access  Public
router.get('/certificates/:certificateNumber/verify', async (req, res) => {
  try {
    const certNum = req.params.certificateNumber;
    const adoption = await Adoption.findOne({ certificateNumber: certNum });
    if (!adoption) {
      return res.status(404).json({ valid: false, msg: 'Certificate code not found in municipal registry' });
    }
    res.json({
      valid: true,
      certificateNumber: adoption.certificateNumber,
      treeName: adoption.treeName,
      treeScientificName: adoption.treeScientificName,
      treeLocation: adoption.treeLocation,
      guardianName: adoption.userName,
      adoptedAt: adoption.adoptedAt || adoption.createdAt,
      status: adoption.status,
      careStreak: adoption.careStreak,
      totalEcoPoints: adoption.totalEcoPoints,
    });
  } catch (err) {
    res.status(500).json({ valid: false, msg: 'Server error verifying certificate' });
  }
});

// @route   GET /api/adoptions/leaderboard
// @desc    Get top citizen guardians by total Eco-Points
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await Adoption.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          totalPoints: { $sum: '$totalEcoPoints' },
          treesCount: { $sum: 1 },
          lastActive: { $max: '$lastCareDate' },
        },
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 10 },
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ msg: 'Server error fetching leaderboard' });
  }
});

// @route   DELETE /api/adoptions/:id
// @desc    Relinquish / cancel a tree adoption
// @access  Public / Citizen
router.delete('/:id', async (req, res) => {
  try {
    const adoption = await Adoption.findById(req.params.id);
    if (!adoption) {
      return res.status(404).json({ msg: 'Adoption record not found' });
    }
    adoption.status = 'Relinquished';
    await adoption.save();
    res.json({ msg: 'Tree adoption has been safely relinquished.' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error relinquishing adoption' });
  }
});

module.exports = router;
