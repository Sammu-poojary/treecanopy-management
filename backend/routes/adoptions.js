const express = require('express');
const router = express.Router();
const Adoption = require('../models/Adoption');
const Tree = require('../models/Tree');
const User = require('../models/User');

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
          timestamp: new Date(),
        },
      ],
    });

    const saved = await newAdoption.save();

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

    const adoptions = await Adoption.find({ userId, status: 'Active' }).sort({ createdAt: -1 });

    const totalPoints = adoptions.reduce((acc, curr) => acc + (curr.totalEcoPoints || 0), 0);
    const totalTreesAdopted = adoptions.length;
    const totalCareLogs = adoptions.reduce((acc, curr) => acc + (curr.careLogs?.length || 0), 0);

    // Compute badges based on metrics
    const badges = [
      { id: 'first_sprout', name: 'First Sprout', desc: 'Adopted 1st Tree', unlocked: totalTreesAdopted >= 1, icon: '🌱' },
      { id: 'master_hydrator', name: 'Master Hydrator', desc: 'Watered a tree 5+ times', unlocked: totalCareLogs >= 5, icon: '💧' },
      { id: 'green_patron', name: 'Canopy Patron', desc: 'Adopted 3+ Trees', unlocked: totalTreesAdopted >= 3, icon: '🌳' },
      { id: 'eco_centurion', name: 'Eco Centurion', desc: 'Earned 500+ Eco-Points', unlocked: totalPoints >= 500, icon: '⭐' },
      { id: 'forest_guardian', name: 'Forest Guardian', desc: 'Earned 1,000+ Eco-Points', unlocked: totalPoints >= 1000, icon: '🛡️' },
      { id: 'champion_streak', name: 'Century Caretaker', desc: 'Completed 10+ Care Logs', unlocked: totalCareLogs >= 10, icon: '🏆' },
    ];

    // Compute Rank
    let levelName = 'Seedling Guardian';
    let levelTier = 1;
    let nextTierPoints = 250;

    if (totalPoints >= 1000) {
      levelName = 'Eco Legend';
      levelTier = 5;
      nextTierPoints = 2000;
    } else if (totalPoints >= 600) {
      levelName = 'Forest Guardian';
      levelTier = 4;
      nextTierPoints = 1000;
    } else if (totalPoints >= 300) {
      levelName = 'Canopy Protector';
      levelTier = 3;
      nextTierPoints = 600;
    } else if (totalPoints >= 150) {
      levelName = 'Sapling Tender';
      levelTier = 2;
      nextTierPoints = 300;
    }

    res.json({
      adoptions,
      stats: {
        totalPoints,
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
// @desc    Log a care event (Watered, Mulched, Photo Update, etc.) and earn points
// @access  Public / Citizen
router.post('/:id/care-log', async (req, res) => {
  try {
    const { action, note, photoUrl } = req.body;
    const adoption = await Adoption.findById(req.params.id);

    if (!adoption) {
      return res.status(404).json({ msg: 'Adoption record not found' });
    }

    const earned = POINTS[action?.toUpperCase()?.replace(/\s+/g, '_')] || 50;

    // Update streak if cared on consecutive days
    const now = new Date();
    const lastCare = new Date(adoption.lastCareDate || adoption.createdAt);
    const diffHours = (now - lastCare) / (1000 * 60 * 60);

    let newStreak = adoption.careStreak || 1;
    if (diffHours >= 18 && diffHours <= 48) {
      newStreak += 1;
    } else if (diffHours > 48) {
      newStreak = 1; // reset streak if inactive for >2 days
    }

    adoption.careLogs.unshift({
      action: action || 'Watered',
      note: note || '',
      photoUrl: photoUrl || '',
      pointsEarned: earned,
      timestamp: now,
    });

    adoption.totalEcoPoints = (adoption.totalEcoPoints || 0) + earned;
    adoption.careStreak = newStreak;
    adoption.lastCareDate = now;

    await adoption.save();

    res.json({
      msg: `🌿 Awesome! Care activity logged: ${action}. You earned +${earned} Eco-Points!`,
      adoption,
      pointsEarned: earned,
      streak: newStreak,
    });
  } catch (err) {
    console.error('Error logging care action:', err);
    res.status(500).json({ msg: 'Server error logging care action', error: err.message });
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
