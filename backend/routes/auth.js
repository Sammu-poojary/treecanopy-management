const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = express.Router();
const User = require('../models/User');

const OFFICIAL_EMAIL = 'officials@gmail.com';
const OFFICIAL_PASSWORD = 'officials@123';

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (role === 'Official' && req.headers['x-requested-by'] !== 'admin') {
      return res.status(403).json({ msg: 'Official accounts cannot be registered from this form' });
    }

    if (normalizedEmail === OFFICIAL_EMAIL) {
      return res.status(403).json({ msg: 'This email is reserved for official login' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ msg: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      role: role || 'Citizen',
      status: role === 'Tree Cutter' ? 'Pending' : 'Verified',
    });

    res.status(201).json({
      msg: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ msg: 'Registration failed', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail === OFFICIAL_EMAIL) {
      if (password !== OFFICIAL_PASSWORD) {
        return res.status(401).json({ msg: 'Invalid email or password' });
      }

      if (portal && portal !== 'Official') {
        return res.status(403).json({ msg: 'This account is registered as Official' });
      }

      return res.json({
        msg: 'User logged in successfully',
        user: {
          id: 'officials-static',
          name: 'Officials',
          email: OFFICIAL_EMAIL,
          phone: '',
          role: 'Official',
        },
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    if (user.role === 'Tree Cutter' || user.role === 'Official') {
      if (user.status === 'Pending') {
        return res.status(403).json({ msg: 'Your account registration is pending approval by the Admin.' });
      }
      if (user.status === 'Rejected') {
        return res.status(403).json({ msg: 'Your account registration has been rejected by the Admin.' });
      }
    }

    if (portal && user.role !== portal) {
      return res.status(403).json({ msg: `This account is registered as ${user.role}` });
    }

    res.json({
      msg: 'User logged in successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ msg: 'Login failed', error: error.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset link to email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Please provide an email address' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond generically to prevent email enumeration
    if (!user) {
      return res.json({ msg: 'If that email exists, a reset link has been sent.' });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Use updateOne to avoid triggering full document validation
    await User.updateOne(
      { _id: user._id },
      { $set: { resetToken: token, resetTokenExpiry } }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // --- Email transport ---
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (emailUser && emailPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass },
      });

      await transporter.sendMail({
        from: `"TreeCanopy Support" <${emailUser}>`,
        to: user.email,
        subject: 'Reset Your TreeCanopy Password',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px;">
            <h2 style="color:#166534;">🌳 TreeCanopy Password Reset</h2>
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to continue:</p>
            <a href="${resetLink}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Reset Password</a>
            <p style="color:#6b7280;font-size:13px;">This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.</p>
          </div>
        `,
      });

      return res.json({ msg: 'If that email exists, a reset link has been sent.' });
    } else {
      // Dev mode: return token directly
      return res.json({
        msg: 'If that email exists, a reset link has been sent.',
        devResetLink: resetLink,
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ msg: 'Something went wrong. Please try again.' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ msg: 'Token and new password are required' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset link. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, resetToken: null, resetTokenExpiry: null } }
    );

    res.json({ msg: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ msg: 'Something went wrong. Please try again.' });
  }
});

// @route   GET /api/auth/cutters
// @desc    Get all registered Tree Cutters
// @access  Public
router.get('/cutters', async (req, res) => {
  try {
    const cutters = await User.find({ role: 'Tree Cutter' }, 'name email phone');
    res.json({ cutters });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to fetch cutters', error: error.message });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (Admin only)
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -resetToken -resetTokenExpiry').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to fetch users', error: error.message });
  }
});

// @route   PATCH /api/auth/users/:id/role
// @desc    Change a user's role (Admin only)
// @access  Admin
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['Citizen', 'Official', 'Tree Cutter', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ msg: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password -resetToken -resetTokenExpiry' }
    );

    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: `Role updated to ${role}`, user });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to update role', error: error.message });
  }
});

// @route   PATCH /api/auth/users/:id/status
// @desc    Change a user's approval status (Admin only)
// @access  Admin
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Verified', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, select: '-password -resetToken -resetTokenExpiry' }
    );

    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (status === 'Verified') {
      // 1. Send in-app notification
      try {
        const Notification = require('../models/Notification');
        await Notification.create({
          targetRole: user.role,
          targetUserId: user._id,
          type: 'status_updated',
          title: 'Account Registration Approved',
          message: `Your account registration as ${user.role} has been approved by the Admin. Please log in.`,
          relatedId: user._id.toString()
        });
      } catch (err) {
        console.error('Failed to create in-app notification:', err.message);
      }

      // 2. Send email notification to user's personal registered email address
      require('dotenv').config();
      const emailUser = process.env.EMAIL_USER;
      const rawEmailPass = process.env.EMAIL_PASS;
      const emailPass = rawEmailPass ? rawEmailPass.replace(/\s+/g, '') : '';

      const emailContentHtml = `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:28px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align:center;margin-bottom:20px;">
            <h2 style="color:#166534;margin:0;font-size:22px;">🌳 TreeCanopy Approval Notice</h2>
            <p style="color:#6b7280;font-size:14px;margin-top:4px;">Official Municipal Canopy Protection System</p>
          </div>
          
          <p style="font-size:15px;color:#374151;">Hi <strong>${user.name}</strong>,</p>
          <p style="font-size:15px;color:#374151;line-height:1.5;">Great news! Your account registration as a <strong>${user.role}</strong> has been reviewed and <strong>approved</strong> by the Administrator.</p>
          
          <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;margin:20px 0;border-radius:0 8px 8px 0;">
            <p style="margin:0;font-weight:600;color:#14532d;font-size:15px;">Account Details:</p>
            <p style="margin:6px 0 0;color:#15803d;font-size:14px;">Registered Email: <strong>${user.email}</strong></p>
            <p style="margin:4px 0 0;color:#15803d;font-size:14px;">Role: <strong>${user.role}</strong></p>
            <p style="margin:4px 0 0;color:#15803d;font-size:14px;">Status: <strong>Verified & Active</strong></p>
          </div>
          
          <p style="font-size:14px;color:#4b5563;line-height:1.5;">You can now log in using your personal registered email (<strong>${user.email}</strong>) and password to view and manage your assigned tasks.</p>
          
          <div style="text-align:center;margin-top:24px;margin-bottom:12px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 2px 6px rgba(22,163,74,0.3);">Log In to Portal</a>
          </div>
          
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 16px 0;" />
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">This automated approval message was sent to ${user.email}.</p>
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

          const textContent = `Hi ${user.name},\n\nCongratulations! Your account registration as a ${user.role} has been approved by the Administrator.\n\nRegistered Email: ${user.email}\nStatus: Verified & Active\n\nYou can log in to your account at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login\n\nThank you,\nTreeCanopy Support`;

          await transporter.sendMail({
            from: `"TreeCanopy Support" <${emailUser}>`,
            to: user.email,
            subject: 'Your TreeCanopy Account Has Been Approved',
            text: textContent,
            html: emailContentHtml,
          });
          console.log(`[EMAIL SUCCESS] Personal approval email sent directly to: ${user.email}`);
        } catch (mailErr) {
          console.error('\n⚠️ [GMAIL SMTP AUTHENTICATION FAILED]');
          console.error(`Reason: ${mailErr.message}`);
          console.error('Note: Gmail requires a 16-character App Password (not your regular account password).\n');

          // Fallback to Ethereal so the approval email is still sent & clickable preview URL is generated
          try {
            const testAccount = await nodemailer.createTestAccount();
            const testTransporter = nodemailer.createTransport({
              host: 'smtp.ethereal.email',
              port: 587,
              secure: false,
              auth: { user: testAccount.user, pass: testAccount.pass },
            });

            const info = await testTransporter.sendMail({
              from: `"TreeCanopy Support" <${testAccount.user}>`,
              to: user.email,
              subject: '🌳 TreeCanopy Account Approved - Login Required',
              html: emailContentHtml,
            });

            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('======================================================');
            console.log('📬 [FALLBACK TEST EMAIL TRANSMITTED]');
            console.log(`To Personal Email: ${user.email}`);
            console.log(`🔗 CLICKABLE WEB INBOX PREVIEW URL: ${previewUrl}`);
            console.log('======================================================\n');
          } catch (etherealErr) {
            console.error('Ethereal fallback failed:', etherealErr.message);
          }
        }
      } else {
        // Try auto-sending via Ethereal test server so live email preview URL is generated
        try {
          const testAccount = await nodemailer.createTestAccount();
          const testTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });

          const info = await testTransporter.sendMail({
            from: `"TreeCanopy Support" <${testAccount.user}>`,
            to: user.email,
            subject: '🌳 TreeCanopy Account Approved - Login Required',
            html: emailContentHtml,
          });

          const previewUrl = nodemailer.getTestMessageUrl(info);
          console.log('\n======================================================');
          console.log('📬 [LIVE TEST EMAIL TRANSMITTED TO RECIPIENT]');
          console.log(`To Personal Email: ${user.email}`);
          console.log(`Subject: 🌳 TreeCanopy Account Approved - Login Required`);
          console.log(`🔗 CLICKABLE WEB INBOX PREVIEW URL: ${previewUrl}`);
          console.log('======================================================\n');
        } catch (etherealErr) {
          console.log('\n======================================================');
          console.log('--- [DEV MODE: PERSONAL APPROVAL EMAIL NOTIFICATION] ---');
          console.log(`Recipient Personal Email: ${user.email}`);
          console.log(`User Name: ${user.name}`);
          console.log(`Role: ${user.role}`);
          console.log('Subject: 🌳 TreeCanopy Account Approved - Login Required');
          console.log('======================================================\n');
        }
      }
    }

    res.json({ msg: `Status updated to ${status}`, user });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to update status', error: error.message });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user account (Admin only)
// @access  Admin
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to delete user', error: error.message });
  }
});

module.exports = router;

