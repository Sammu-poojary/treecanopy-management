const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const UserGoalProgress = require('../models/UserGoalProgress');
const Adoption = require('../models/Adoption');
const EcoPointsTransaction = require('../models/EcoPointsTransaction');
const Notification = require('../models/Notification');

const DEFAULT_GOALS = [
  {
    title: 'September Canopy Care Goal',
    description: 'Complete 8 verified care check-ins (watering, mulching, pruning) for your adopted trees.',
    targetType: 'care_count',
    targetValue: 8,
    rewardPoints: 100,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
    isActive: true,
  },
  {
    title: '7-Day Care Streak Milestone',
    description: 'Maintain a continuous 7-day care streak through consistent tree check-ins.',
    targetType: 'streak_days',
    targetValue: 7,
    rewardPoints: 75,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    title: 'Canopy Patron Goal',
    description: 'Adopt at least 3 living trees across Udupi municipality.',
    targetType: 'tree_count',
    targetValue: 3,
    rewardPoints: 150,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    title: 'Photo Journalist Badge Goal',
    description: 'Upload 4 photographic health inspection updates for your adopted trees.',
    targetType: 'photo_count',
    targetValue: 4,
    rewardPoints: 90,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
];

const seedDefaultGoalsIfEmpty = async () => {
  try {
    const count = await Goal.countDocuments();
    if (count === 0) {
      await Goal.insertMany(DEFAULT_GOALS);
      console.log('[Goals API] Initial default care goals seeded successfully.');
    }
  } catch (err) {
    console.error('[Goals API] Error seeding goals:', err);
  }
};

// @route   GET /api/goals
// @desc    Get all active goals with user progress computed dynamically
// @access  Public / Citizen
router.get('/', async (req, res) => {
  try {
    await seedDefaultGoalsIfEmpty();
    const { userId } = req.query;
    const goals = await Goal.find({ isActive: true }).sort({ createdAt: -1 });

    if (!userId) {
      return res.json(goals.map(g => ({ goal: g, currentValue: 0, isCompleted: false, claimed: false })));
    }

    const strUserId = userId.toString();
    const adoptions = await Adoption.find({ userId: strUserId, status: 'Active' });

    const totalTreesAdopted = adoptions.length;
    const totalCareLogs = adoptions.reduce((sum, a) => sum + (a.careLogs?.length || 0), 0);
    const maxStreak = adoptions.reduce((max, a) => Math.max(max, a.careStreak || 1), 1);
    const photoLogsCount = adoptions.reduce((sum, a) => {
      const pLogs = (a.careLogs || []).filter(l => l.photoUrl && l.photoUrl.length > 5);
      return sum + pLogs.length;
    }, 0);

    const userProgress = await UserGoalProgress.find({ userId: strUserId });
    const progressMap = {};
    userProgress.forEach(p => {
      progressMap[p.goalId.toString()] = p;
    });

    const result = goals.map(goal => {
      let currentVal = 0;
      if (goal.targetType === 'care_count') currentVal = totalCareLogs;
      else if (goal.targetType === 'streak_days') currentVal = maxStreak;
      else if (goal.targetType === 'tree_count') currentVal = totalTreesAdopted;
      else if (goal.targetType === 'photo_count') currentVal = photoLogsCount;

      const pDoc = progressMap[goal._id.toString()];
      const isCompleted = currentVal >= goal.targetValue;
      const claimed = pDoc ? pDoc.isCompleted : false;

      return {
        goal,
        currentValue: Math.min(currentVal, goal.targetValue),
        isCompleted,
        claimed,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching goals:', err);
    res.status(500).json({ msg: 'Server error fetching goals' });
  }
});

// @route   POST /api/goals/:id/claim
// @desc    Claim reward points for a completed goal
// @access  Public / Citizen
router.post('/:id/claim', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ msg: 'userId is required' });

    const strUserId = userId.toString();
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ msg: 'Goal not found' });

    let progress = await UserGoalProgress.findOne({ userId: strUserId, goalId: goal._id });
    if (progress && progress.isCompleted) {
      return res.status(400).json({ msg: 'You have already claimed this goal reward!' });
    }

    // Verify completion authoritatively
    const adoptions = await Adoption.find({ userId: strUserId, status: 'Active' });
    let currentVal = 0;
    if (goal.targetType === 'care_count') {
      currentVal = adoptions.reduce((sum, a) => sum + (a.careLogs?.length || 0), 0);
    } else if (goal.targetType === 'streak_days') {
      currentVal = adoptions.reduce((max, a) => Math.max(max, a.careStreak || 1), 1);
    } else if (goal.targetType === 'tree_count') {
      currentVal = adoptions.length;
    } else if (goal.targetType === 'photo_count') {
      currentVal = adoptions.reduce((sum, a) => sum + (a.careLogs || []).filter(l => l.photoUrl).length, 0);
    }

    if (currentVal < goal.targetValue) {
      return res.status(400).json({ msg: `Goal not completed yet. (${currentVal}/${goal.targetValue})` });
    }

    if (!progress) {
      progress = new UserGoalProgress({
        userId: strUserId,
        goalId: goal._id,
        currentValue: currentVal,
        isCompleted: true,
        completedAt: new Date(),
      });
    } else {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }
    await progress.save();

    // Log EARN transaction
    const totalEarnedAdoptions = adoptions.reduce((sum, a) => sum + (a.totalEcoPoints || 0), 0);
    const earnTx = await EcoPointsTransaction.aggregate([
      { $match: { userId: strUserId, type: 'EARN' } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);
    const redeemTx = await EcoPointsTransaction.aggregate([
      { $match: { userId: strUserId, type: 'REDEEM' } },
      { $group: { _id: null, total: { $sum: { $abs: '$points' } } } }
    ]);
    const totalEarned = Math.max(totalEarnedAdoptions, earnTx.length > 0 ? earnTx[0].total : 0);
    const totalRedeemed = redeemTx.length > 0 ? redeemTx[0].total : 0;
    const currentNet = Math.max(0, totalEarned - totalRedeemed);

    const transaction = new EcoPointsTransaction({
      userId: strUserId,
      type: 'EARN',
      points: goal.rewardPoints,
      description: `Goal Milestone: ${goal.title}`,
      referenceId: `goal_${goal._id}`,
      balanceAfter: currentNet + goal.rewardPoints,
    });
    await transaction.save();

    // Dispatch Notification
    try {
      await Notification.create({
        targetUserId: strUserId,
        targetRole: 'Citizen',
        type: 'goal_completed',
        title: '🎯 Goal Milestone Achieved!',
        message: `Congratulations! You completed '${goal.title}' and claimed +${goal.rewardPoints} Eco-Points!`,
        relatedId: goal._id.toString(),
      });
    } catch (_) {}

    res.json({
      msg: `🎯 Goal completed! +${goal.rewardPoints} Eco-Points claimed!`,
      pointsAwarded: goal.rewardPoints,
    });
  } catch (err) {
    console.error('Error claiming goal reward:', err);
    res.status(500).json({ msg: 'Server error claiming goal reward' });
  }
});

module.exports = router;
