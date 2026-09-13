const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper to normalize roles
const normalizeRole = (role) => {
  if (!role) return 'Citizen';
  const r = String(role).trim().toLowerCase();
  if (r.includes('admin')) return 'Admin';
  if (r.includes('official') || r.includes('officer')) return 'Official';
  if (r.includes('cutter') || r.includes('arborist') || r.includes('tree cutter')) return 'Tree Cutter';
  return 'Citizen';
};

// GET /api/chat/threads - Fetch eligible recipients & active conversation threads for a user
router.get('/threads', async (req, res) => {
  try {
    const { userId, userRole } = req.query;
    const normRole = normalizeRole(userRole);

    // Fetch registered users to populate eligible chat partners
    let partnerUsers = [];
    if (normRole === 'Tree Cutter') {
      // Tree Cutters can only chat with Officials and Admins (P2P Tree Cutter chat blocked)
      partnerUsers = await User.find({ role: { $in: ['Official', 'Admin'] } }).select('name username role _id email');
    } else if (normRole === 'Official') {
      // Officials can chat with Tree Cutters, Officials, and Admins
      partnerUsers = await User.find({ role: { $in: ['Tree Cutter', 'Official', 'Admin'] } }).select('name username role _id email');
    } else if (normRole === 'Admin') {
      // Admins can chat with Officials and Tree Cutters
      partnerUsers = await User.find({ role: { $in: ['Official', 'Tree Cutter', 'Admin'] } }).select('name username role _id email');
    }

    // Default sample recipients if user database has few records
    const defaultPartners = [
      { _id: 'official-main', name: 'Municipal Tree Officer (Zone 1)', role: 'Official', email: 'official@treecanopy.org' },
      { _id: 'admin-main', name: 'Canopy Central Admin', role: 'Admin', email: 'admin@treecanopy.org' },
    ];
    if (normRole === 'Official' || normRole === 'Admin') {
      defaultPartners.push({ _id: 'cutter-ramesh', name: 'Ramesh Kumar (Lead Cutter)', role: 'Tree Cutter', email: 'ramesh@treecanopy.org' });
      defaultPartners.push({ _id: 'cutter-suresh', name: 'Suresh Gowda (Arborist)', role: 'Tree Cutter', email: 'suresh@treecanopy.org' });
    }

    const mergedPartners = [...partnerUsers];
    defaultPartners.forEach(dp => {
      if (!mergedPartners.some(p => String(p._id) === String(dp._id))) {
        mergedPartners.push(dp);
      }
    });

    // Filter out current user from partner list
    const filteredPartners = mergedPartners.filter(p => String(p._id) !== String(userId));

    // Fetch active message threads involving this user or role
    const activeMessages = await ChatMessage.find({
      $or: [
        { senderId: userId },
        { receiverId: userId },
        { receiverRole: normRole },
        { receiverId: 'all' }
      ]
    }).sort({ createdAt: -1 }).limit(100);

    res.json({
      partners: filteredPartners,
      recentMessages: activeMessages
    });
  } catch (err) {
    console.error('Error fetching chat threads:', err);
    res.status(500).json({ msg: 'Server error fetching chat threads' });
  }
});

// GET /api/chat/messages - Get message history for a given thread
router.get('/messages', async (req, res) => {
  try {
    const { threadId } = req.query;
    if (!threadId) {
      return res.status(400).json({ msg: 'threadId parameter is required' });
    }

    const messages = await ChatMessage.find({ threadId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ msg: 'Server error fetching messages' });
  }
});

// POST /api/chat/send - Send a new chat message
router.post('/send', async (req, res) => {
  try {
    const {
      senderId,
      senderName,
      senderRole,
      receiverId,
      receiverName,
      receiverRole,
      threadId,
      message,
      contextType,
      relatedTaskId,
      relatedTaskTitle,
      relatedTaskLocation,
      locationLat,
      locationLng,
      locationAddress,
      attachments
    } = req.body;

    const normSenderRole = normalizeRole(senderRole);
    const normReceiverRole = normalizeRole(receiverRole);

    // Enforce Security/Business Rule: Tree Cutters CANNOT message each other
    if (normSenderRole === 'Tree Cutter' && normReceiverRole === 'Tree Cutter') {
      return res.status(403).json({
        msg: 'Direct communication between Tree Cutters is disabled. Please reach out to a Municipal Official or Admin regarding assigned work tasks.'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ msg: 'Message text cannot be empty' });
    }

    // Determine compute threadId if not provided
    let computedThreadId = threadId;
    if (!computedThreadId) {
      const ids = [String(senderId), String(receiverId || 'all')].sort();
      computedThreadId = `thread_${ids[0]}_${ids[1]}`;
    }

    const newMsg = new ChatMessage({
      threadId: computedThreadId,
      senderId: senderId || 'user-unknown',
      senderName: senderName || 'Staff Member',
      senderRole: normSenderRole,
      receiverId: receiverId || 'all',
      receiverName: receiverName || 'All Staff',
      receiverRole: normReceiverRole,
      message: message.trim(),
      contextType: contextType || null,
      relatedTaskId: relatedTaskId || null,
      relatedTaskTitle: relatedTaskTitle || null,
      relatedTaskLocation: relatedTaskLocation || null,
      locationLat: Number(locationLat) || null,
      locationLng: Number(locationLng) || null,
      locationAddress: locationAddress || null,
      attachments: Array.isArray(attachments) ? attachments : [],
      isRead: false
    });

    await newMsg.save();

    // Automatically dispatch Notification to receiver
    try {
      const taskContextSnippet = relatedTaskTitle ? ` [Re: ${relatedTaskTitle}]` : '';
      await Notification.create({
        targetUserId: receiverId && receiverId !== 'all' ? receiverId : null,
        targetRole: normReceiverRole,
        type: 'chat_message',
        title: `💬 New Message from ${senderName || normSenderRole}`,
        message: `${message.trim().slice(0, 100)}${taskContextSnippet}`,
        relatedId: relatedTaskId || computedThreadId
      });
    } catch (notifErr) {
      console.warn('Could not dispatch chat notification:', notifErr.message);
    }

    res.status(201).json(newMsg);
  } catch (err) {
    console.error('Error sending chat message:', err);
    res.status(500).json({ msg: 'Server error sending message' });
  }
});

// PATCH /api/chat/mark-read - Mark thread messages as read
router.patch('/mark-read', async (req, res) => {
  try {
    const { threadId, userId } = req.body;
    if (!threadId) {
      return res.status(400).json({ msg: 'threadId is required' });
    }

    await ChatMessage.updateMany(
      { threadId, receiverId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ msg: 'Messages marked as read' });
  } catch (err) {
    console.error('Error marking messages read:', err);
    res.status(500).json({ msg: 'Server error marking messages read' });
  }
});

// GET /api/chat/unread-count - Get total unread count for user
router.get('/unread-count', async (req, res) => {
  try {
    const { userId, userRole } = req.query;
    const normRole = normalizeRole(userRole);

    const count = await ChatMessage.countDocuments({
      isRead: false,
      senderId: { $ne: userId },
      $or: [
        { receiverId: userId },
        { receiverRole: normRole }
      ]
    });

    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ unreadCount: 0 });
  }
});

module.exports = router;
