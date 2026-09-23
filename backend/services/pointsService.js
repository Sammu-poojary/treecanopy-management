const Adoption = require('../models/Adoption');
const EcoPointsTransaction = require('../models/EcoPointsTransaction');

/**
 * Authoritatively calculates a user's net available Eco-Points balance.
 * Considers both active adoptions/care-logs and all EARN/REDEEM transactions in the ledger.
 */
const calculateUserNetBalance = async (userId, userEmail = '') => {
  const strUserId = (userId || '').toString();
  const strEmail = (userEmail || (strUserId.includes('@') ? strUserId : '')).toLowerCase();

  const userQuery = {
    $or: [
      { userId: strUserId },
      ...(strEmail ? [{ userEmail: strEmail }] : [])
    ]
  };

  // 1. Calculate earned points from active Adoptions & Care logs
  let totalEarnedAdoptions = 0;
  try {
    const adoptions = await Adoption.find({ ...userQuery, status: 'Active' });
    totalEarnedAdoptions = adoptions.reduce((sum, a) => {
      let carePts = 0;
      if (Array.isArray(a.careLogs)) {
        carePts = a.careLogs.reduce((cSum, l) => {
          if (l.action === 'Health Check' && l.note === 'Initial adoption health inspection completed.') return cSum;
          const actKey = (l.action || '').toUpperCase().replace(/\s+/g, '_');
          const defaultPts = { WATERED: 50, MULCHED: 75, HEALTH_CHECK: 60, PHOTO_UPDATE: 80, FERTILIZED: 70, PRUNED_DEAD_LEAVES: 65, PEST_CONTROL: 75 }[actKey] || 50;
          return cSum + (l.pointsEarned !== undefined && l.pointsEarned !== null ? l.pointsEarned : defaultPts);
        }, 0);
      }
      return sum + Math.max(a.totalEcoPoints || 100, 100 + carePts);
    }, 0);
  } catch (err) {
    console.warn('Error fetching adoptions in pointsService:', err.message);
  }

  // 2. Calculate EARN transactions from ledger
  let totalEarnTx = 0;
  try {
    const earnTx = await EcoPointsTransaction.aggregate([
      {
        $match: {
          $or: [
            { userId: strUserId },
            ...(strEmail ? [{ userEmail: strEmail }] : [])
          ],
          type: 'EARN'
        }
      },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);
    totalEarnTx = earnTx.length > 0 ? earnTx[0].total : 0;
  } catch (err) {
    console.warn('Error aggregating EARN tx:', err.message);
  }

  const totalEarned = Math.max(totalEarnedAdoptions, totalEarnTx);

  // 3. Calculate REDEEM transactions from ledger
  let totalRedeemed = 0;
  try {
    const redeemTx = await EcoPointsTransaction.aggregate([
      {
        $match: {
          $or: [
            { userId: strUserId },
            ...(strEmail ? [{ userEmail: strEmail }] : [])
          ],
          type: 'REDEEM'
        }
      },
      { $group: { _id: null, total: { $sum: { $abs: '$points' } } } }
    ]);
    totalRedeemed = redeemTx.length > 0 ? redeemTx[0].total : 0;
  } catch (err) {
    console.warn('Error aggregating REDEEM tx:', err.message);
  }

  const netBalance = Math.max(0, totalEarned - totalRedeemed);

  return {
    totalEarned,
    totalRedeemed,
    netBalance
  };
};

module.exports = {
  calculateUserNetBalance
};
