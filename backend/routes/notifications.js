const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get notifications for a user (by userId or role)
// @access  Protected
router.get('/', async (req, res) => {
  try {
    const { userId, role, unreadOnly } = req.query;

    if (!userId && !role) {
      return res.status(400).json({ msg: 'userId or role is required' });
    }

    const query = {
      $or: [
        { targetUserId: userId },
        { targetRole: role },
        { targetRole: null, targetUserId: null }, // system-wide
      ],
    };

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    // Sort unread notifications first, then newest created
    const notifications = await Notification.find(query)
      .sort({ isRead: 1, createdAt: -1 })
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

    const matchConditions = [
      { targetUserId: null, targetRole: null },
      { targetUserId: { $exists: false } }
    ];
    if (userId) matchConditions.push({ targetUserId: userId });
    if (role) matchConditions.push({ targetRole: role });

    await Notification.updateMany(
      {
        $or: matchConditions,
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

    let notification;
    try {
      notification = await Notification.create({
        targetUserId: targetUserId || null,
        targetRole: targetRole || null,
        type,
        title,
        message,
        relatedId: relatedId || null,
      });
    } catch (createErr) {
      // Fallback if 'equipment_reminder' type is rejected by older enum schema
      notification = await Notification.create({
        targetUserId: targetUserId || null,
        targetRole: targetRole || null,
        type: 'task_assigned',
        title,
        message,
        relatedId: relatedId || null,
      });
    }

    res.status(201).json({ msg: 'Notification created', notification });
  } catch (error) {
    console.error('Create notification error:', error.message);
    res.status(500).json({ msg: 'Failed to create notification', error: error.message });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification by ID
// @access  Protected
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.json({ msg: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error.message);
    res.status(500).json({ msg: 'Failed to delete notification', error: error.message });
  }
});

// @route   POST /api/notifications/clear-read
// @desc    Clear all read notifications for a user
// @access  Protected
router.post('/clear-read', async (req, res) => {
  try {
    const { userId, role } = req.body;

    const matchConditions = [
      { targetUserId: null, targetRole: null },
      { targetUserId: { $exists: false } }
    ];
    if (userId) matchConditions.push({ targetUserId: userId });
    if (role) matchConditions.push({ targetRole: role });

    await Notification.deleteMany({
      $or: matchConditions,
      isRead: true,
    });
    res.json({ msg: 'Read notifications cleared' });
  } catch (error) {
    console.error('Clear read notifications error:', error.message);
    res.status(500).json({ msg: 'Failed to clear read notifications', error: error.message });
  }
});

// @route   POST /api/notifications/clear-all
// @desc    Clear ALL notifications (both read & unread) for a user
// @access  Protected
router.post('/clear-all', async (req, res) => {
  try {
    const { userId, role } = req.body;

    const matchConditions = [
      { targetUserId: null, targetRole: null },
      { targetUserId: { $exists: false } }
    ];
    if (userId) matchConditions.push({ targetUserId: userId });
    if (role) matchConditions.push({ targetRole: role });

    await Notification.deleteMany({
      $or: matchConditions,
    });
    res.json({ msg: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all notifications error:', error.message);
    res.status(500).json({ msg: 'Failed to clear notifications', error: error.message });
  }
});

const nodemailer = require('nodemailer');

// @route   POST /api/notifications/send-email
// @desc    Send automated email notification (for return reminders, warnings, alerts)
// @access  Public / Internal
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, body, html } = req.body;

    if (!to || (!body && !html)) {
      return res.status(400).json({ msg: 'Recipient email "to" and message content are required.' });
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    const emailSubject = subject || '🌳 CanopyGuard Equipment Return Notification';
    const emailText = body || '';
    const emailHtml = html || `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: auto; padding: 20px; background: #061a14; color: #ffffff; border-radius: 12px; border: 1px solid #10b981;">
        <h2 style="color: #10b981; margin-top: 0;">🌳 Municipal Equipment Alert</h2>
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 16px; border-radius: 8px; font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap;">
          ${emailText}
        </div>
        <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 16px; text-align: center;">
          CanopyGuard Municipal Tree Management System • Udupi Zone
        </p>
      </div>
    `;

    if (emailUser && emailPass) {
      try {
        const transporter = nodemailer.createTransport(
          process.env.SMTP_HOST
            ? {
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: emailUser, pass: emailPass },
              }
            : {
                service: 'gmail',
                auth: { user: emailUser, pass: emailPass },
              }
        );

        await transporter.sendMail({
          from: `"CanopyGuard Municipal System" <${emailUser}>`,
          to,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });

        console.log(`[EMAIL DISPATCHED SUCCESS] To: ${to} | Subject: ${emailSubject}`);
        return res.json({ msg: 'Email dispatched successfully to recipient.', to });
      } catch (smtpErr) {
        console.error('[SMTP FAILED] Falling back to Ethereal test inbox:', smtpErr.message);
      }
    }

    // Fallback: Ethereal test account with clickable preview URL logged
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });

    const info = await testTransporter.sendMail({
      from: `"CanopyGuard Municipal System" <${testAccount.user}>`,
      to,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('======================================================');
    console.log('📬 [EQUIPMENT REMINDER EMAIL DISPATCHED via Ethereal]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`🔗 CLICKABLE WEB INBOX PREVIEW URL: ${previewUrl}`);
    console.log('======================================================\n');

    return res.json({
      msg: 'Email dispatched via test inbox (preview link logged in server console).',
      to,
      previewUrl
    });
  } catch (error) {
    console.error('Send email error:', error.message);
    res.status(500).json({ msg: 'Failed to send email notification', error: error.message });
  }
});

module.exports = router;
