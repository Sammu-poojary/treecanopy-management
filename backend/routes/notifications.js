const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get notifications for a user (by userId or role)
// @access  Protected
router.get('/', async (req, res) => {
  try {
    const { userId, role } = req.query;

    if (!userId && !role) {
      return res.status(400).json({ msg: 'userId or role is required' });
    }

    // Fetch notifications targeted at this specific user OR broadcast to their role
    const query = {
      $or: [
        { targetUserId: userId },
        { targetRole: role },
        { targetRole: null, targetUserId: null }, // system-wide
      ],
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Fetch notifications error:', error.message);
    res.status(500).json({ msg: 'Failed to fetch notifications', error: error.message });
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Protected
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    res.json({ msg: 'Marked as read', notification });
  } catch (error) {
    console.error('Mark read error:', error.message);
    res.status(500).json({ msg: 'Failed to mark notification', error: error.message });
  }
});

// @route   PATCH /api/notifications/read-all
// @desc    Mark all notifications as read for a user
// @access  Protected
router.patch('/read-all', async (req, res) => {
  try {
    const { userId, role } = req.body;

    await Notification.updateMany(
      {
        $or: [
          { targetUserId: userId },
          { targetRole: role },
        ],
        isRead: false,
      },
      { isRead: true }
    );

    res.json({ msg: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error.message);
    res.status(500).json({ msg: 'Failed to mark all as read', error: error.message });
  }
});

// @route   POST /api/notifications
// @desc    Create a notification (internal / admin use)
// @access  Protected
router.post('/', async (req, res) => {
  try {
    const { targetUserId, targetRole, type, title, message, relatedId } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ msg: 'type, title, and message are required' });
    }

    const notification = await Notification.create({
      targetUserId: targetUserId || null,
      targetRole: targetRole || null,
      type,
      title,
      message,
      relatedId: relatedId || null,
    });

    res.status(201).json({ msg: 'Notification created', notification });
  } catch (error) {
    console.error('Create notification error:', error.message);
    res.status(500).json({ msg: 'Failed to create notification', error: error.message });
  }
});

module.exports = router;
