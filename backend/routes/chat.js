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

    // 1. Fetch registered users from MongoDB (case-insensitive role check)
    let dbPartners = [];
    if (normRole === 'Tree Cutter') {
      dbPartners = await User.find({ role: { $in: ['Official', 'official', 'Admin', 'admin'] } }).select('name username role _id email');
    } else {
      dbPartners = await User.find({ role: { $in: ['Tree Cutter', 'tree cutter', 'Official', 'official', 'Admin', 'admin'] } }).select('name username role _id email');
    }

    // 2. Inspect existing ChatMessages involving this user to include any active conversation partners
    const pastMsgs = await ChatMessage.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).select('senderId senderName senderRole receiverId receiverName receiverRole');

    const msgPartners = [];
    pastMsgs.forEach(m => {
      if (m.senderId && String(m.senderId) !== String(userId) && !m.senderId.includes('static')) {
        msgPartners.push({ _id: String(m.senderId), name: m.senderName || 'Staff Member', role: m.senderRole || 'Official' });
      }
      if (m.receiverId && m.receiverId !== 'all' && String(m.receiverId) !== String(userId) && !m.receiverId.includes('static')) {
        msgPartners.push({ _id: String(m.receiverId), name: m.receiverName || 'Staff Member', role: m.receiverRole || 'Official' });
      }
    });

    // 3. Merge registered users into map
    const partnerMap = new Map();

    dbPartners.forEach(p => {
      partnerMap.set(String(p._id), {
        _id: String(p._id),
        name: p.name || p.username || 'User',
        role: normalizeRole(p.role),
        email: p.email || ''
      });
    });

    msgPartners.forEach(p => {
      if (!partnerMap.has(p._id)) {
        partnerMap.set(p._id, p);
      }
    });

    // 4. Fetch latest message timestamp per partner & sort active conversations to top
    const allUserMsgs = await ChatMessage.find({
      $or: [
        { senderId: userId },
        { receiverId: userId },
        { receiverRole: normRole },
        { receiverId: 'all' }
      ]
    }).sort({ createdAt: -1 });

    const partnerLastMsgMap = new Map();
    allUserMsgs.forEach(m => {
      const sId = String(m.senderId);
      const rId = String(m.receiverId);
      const otherId = (sId === String(userId)) ? rId : sId;
      if (otherId && otherId !== 'all' && !partnerLastMsgMap.has(otherId)) {
        partnerLastMsgMap.set(otherId, new Date(m.createdAt).getTime());
      }
    });

    const finalPartners = Array.from(partnerMap.values())
      .filter(p => String(p._id) !== String(userId))
      .filter(p => {
        if (normRole === 'Tree Cutter' && normalizeRole(p.role) === 'Tree Cutter') {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = partnerLastMsgMap.get(a._id) || 0;
        const timeB = partnerLastMsgMap.get(b._id) || 0;
        return timeB - timeA; // Most recent active conversation first!
      });

    res.json({
      partners: finalPartners,
      recentMessages: allUserMsgs.slice(0, 100)
    });
  } catch (err) {
    console.error('Error fetching chat threads:', err);
    res.status(500).json({ msg: 'Server error fetching chat threads' });
  }
});

// GET /api/chat/messages - Get message history for a given specific thread/partner
router.get('/messages', async (req, res) => {
  try {
    const { threadId, userId, partnerId } = req.query;

    if (!userId || !partnerId) {
      if (threadId) {
        const messages = await ChatMessage.find({ threadId }).sort({ createdAt: 1 });
        return res.json(messages);
      }
      return res.status(400).json({ msg: 'userId and partnerId parameters are required' });
    }

    const uStr = String(userId).trim();
    const pStr = String(partnerId).trim();

    // Compute standard computed threadId
    const ids = [uStr, pStr].sort();
    const computedThread = `thread_${ids[0]}_${ids[1]}`;

    // Strictly isolate messages between this specific user and this specific partner
    const query = {
      $or: [
        { threadId: computedThread },
        { senderId: uStr, receiverId: pStr },
        { senderId: pStr, receiverId: uStr }
      ]
    };

    const messages = await ChatMessage.find(query).sort({ createdAt: 1 });
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
