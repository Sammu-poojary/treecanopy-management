const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');

// Helper: get shift status based on IST time
function getShiftStatusIST(shiftName) {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const hour = istNow.getUTCHours();
  const minute = istNow.getUTCMinutes();
  const currentMinutes = hour * 60 + minute;

  if (shiftName === 'Morning') {
    if (currentMinutes < 9 * 60) return { closed: true, reason: 'Morning shift opens at 9:00 AM' };
    if (currentMinutes >= 12 * 60) return { closed: true, reason: 'Morning shift closed at 12:00 PM' };
    return { closed: false };
  }
  if (shiftName === 'Afternoon') {
    if (currentMinutes < 12 * 60) return { closed: true, reason: 'Afternoon shift opens at 12:00 PM' };
    if (currentMinutes >= 15 * 60) return { closed: true, reason: 'Afternoon shift closed at 3:00 PM' };
    return { closed: false };
  }
  if (shiftName === 'Evening') {
    if (currentMinutes < 15 * 60) return { closed: true, reason: 'Evening shift opens at 3:00 PM' };
    if (currentMinutes >= 17 * 60) return { closed: true, reason: 'Evening session closed after 5:00 PM' };
    return { closed: false };
  }
  return { closed: true, reason: 'Invalid shift' };
}

// Helper: get current shift based on IST time
function getCurrentShift() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const hour = istNow.getUTCHours();
  if (hour >= 9 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 15) return 'Afternoon';
  if (hour >= 15 && hour < 17) return 'Evening';
  return null;
}

// Helper: get today's date string in IST
function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  return istNow.toISOString().slice(0, 10);
}

// @route   POST /api/attendance/mark
// @desc    Mark attendance for current shift
// @access  Protected (Official / Tree Cutter)
router.post('/mark', async (req, res) => {
  try {
    const { userId, userName, role, location, shiftOverride, bypassTimeCheck } = req.body;

    if (!userId || !userName || !role) {
      return res.status(400).json({ msg: 'userId, userName and role are required' });
    }

    if (!['Official', 'Tree Cutter'].includes(role)) {
      return res.status(403).json({ msg: 'Only Officials and Tree Cutters can mark attendance' });
    }

    const shift = shiftOverride || getCurrentShift();
    if (!shift) {
      return res.status(400).json({
        msg: 'Outside working hours. All shift sessions are closed for today. Shifts: Morning (9 AM–12 PM), Afternoon (12 PM–3 PM), Evening (3 PM–5 PM)',
      });
    }

    // Enforce strict shift cutoff times
    const shiftStatus = getShiftStatusIST(shift);
    if (shiftStatus.closed && !bypassTimeCheck) {
      return res.status(400).json({
        msg: `${shiftStatus.reason}. Cannot mark attendance after shift session closing time.`,
      });
    }

    const date = getTodayIST();

    // Check for duplicate
    const existing = await Attendance.findOne({ userId, date, shift });
    if (existing) {
      return res.status(409).json({
        msg: `Attendance already marked for ${shift} shift today.`,
        attendance: existing,
      });
    }

    const attendance = await Attendance.create({
      userId,
      userName,
      role,
      date,
      shift,
      location: location || '',
    });

    // Notify admins/officials about attendance
    await Notification.create({
      targetRole: 'Admin',
      type: 'attendance_marked',
      title: 'Attendance Marked',
      message: `${userName} (${role}) has marked attendance for ${shift} shift on ${date}.`,
      relatedId: attendance._id.toString(),
    });

    res.status(201).json({
      msg: `Attendance marked for ${shift} shift successfully.`,
      attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ msg: 'Attendance already marked for this shift today.' });
    }
    console.error('Attendance mark error:', error.message);
    res.status(500).json({ msg: 'Failed to mark attendance', error: error.message });
  }
});

// @route   GET /api/attendance
// @desc    Get all attendance records (Admin / Official view)
// @access  Protected
router.get('/', async (req, res) => {
  try {
    const { date, role, userId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (role) filter.role = role;
    if (userId) filter.userId = userId;

    const records = await Attendance.find(filter).sort({ createdAt: -1 });
    res.json({ records });
  } catch (error) {
    console.error('Fetch attendance error:', error.message);
    res.status(500).json({ msg: 'Failed to fetch attendance', error: error.message });
  }
});

// @route   GET /api/attendance/me
// @desc    Get attendance records for a specific user
// @access  Protected
router.get('/me', async (req, res) => {
  try {
    const { userId, userName } = req.query;
    if (!userId && !userName) return res.status(400).json({ msg: 'userId or userName is required' });

    const filter = {};
    if (userId && userName) {
      filter.$or = [{ userId }, { userName }];
    } else if (userId) {
      filter.userId = userId;
    } else {
      filter.userName = userName;
    }

    const records = await Attendance.find(filter).sort({ date: -1, createdAt: -1 });
    res.json({ records });
  } catch (error) {
    console.error('Fetch my attendance error:', error.message);
    res.status(500).json({ msg: 'Failed to fetch attendance', error: error.message });
  }
});

// @route   GET /api/attendance/today-summary
// @desc    Get today's attendance summary (count by role)
// @access  Admin / Official
router.get('/today-summary', async (req, res) => {
  try {
    const date = getTodayIST();
    const records = await Attendance.find({ date });
    const officialCount = records.filter(r => r.role === 'Official').length;
    const cutterCount = records.filter(r => r.role === 'Tree Cutter').length;
    res.json({ date, officialCount, cutterCount, total: records.length, records });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to fetch today summary', error: error.message });
  }
});

module.exports = router;
