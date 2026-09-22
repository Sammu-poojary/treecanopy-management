const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();
const User = require('../models/User');

const OFFICIAL_EMAIL = 'officials@gmail.com';
const OFFICIAL_PASSWORD = 'officials@123';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '516349052894-mrhftjps3e3cbjp3jropeu7sf6sh05ls.apps.googleusercontent.com');

// @route   POST /api/auth/google
// @desc    Google Sign-In Authentication
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { credential, portal } = req.body;
    if (!credential) {
      return res.status(400).json({ msg: 'Google credential token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: [
        process.env.GOOGLE_CLIENT_ID,
        '516349052894-mrhftjps3e3cbjp3jropeu7sf6sh05ls.apps.googleusercontent.com'
      ].filter(Boolean),
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ msg: 'Invalid Google token payload' });
    }

    const { email, name, picture, sub } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail });

    let role = portal === 'Tree Cutter' ? 'Tree Cutter' : 'Citizen';

    if (normalizedEmail === OFFICIAL_EMAIL) {
      role = 'Official';
    } else if (normalizedEmail === 'admin@example.com') {
      role = 'Admin';
    }

    if (!user) {
      // Register Google user automatically
      user = await User.create({
        name: name || 'Google User',
        email: normalizedEmail,
        phone: 'Google Auth',
        password: await bcrypt.hash(sub + 'google_secret_hash', 10),
        role: role,
        status: role === 'Tree Cutter' ? 'Pending' : 'Verified',
        avatar: picture || '',
        profileImage: picture || '',
      });
    }

    // Role check enforcement per portal
    if (portal === 'Tree Cutter' && user.role !== 'Tree Cutter') {
      return res.status(403).json({ msg: 'Access denied: Account is not registered as a Tree Cutter.' });
    }

    res.json({
      msg: 'Google authentication successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatar: picture || user.avatar || user.profileImage || '',
        profileImage: picture || user.profileImage || user.avatar || '',
        address: user.address || '',
      },
    });
  } catch (error) {
    console.error('Google Auth verification error:', error);
    res.status(401).json({ msg: 'Google login failed', error: error.message });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      businessName,
      company,
      businessType,
      gstin,
      tradeLicense,
      panNumber,
      authorizedPersonName,
      address
    } = req.body;

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

    const isTimberBuyer = role === 'Timber Buyer' || role === 'Timber Merchant';
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      role: role || 'Citizen',
      status: role === 'Tree Cutter' ? 'Pending' : 'Verified',
      businessName: businessName || company || (isTimberBuyer ? name : ''),
      company: company || businessName || (isTimberBuyer ? name : ''),
      businessType: businessType || (isTimberBuyer ? 'Sawmill / Lumber Mill' : ''),
      gstin: gstin || '',
      tradeLicense: tradeLicense || '',
      panNumber: panNumber || '',
      authorizedPersonName: authorizedPersonName || name,
      address: address || '',
    });

    res.status(201).json({
      msg: isTimberBuyer
        ? `Timber Merchant Account for "${user.businessName || user.name}" registered successfully!`
        : 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        businessName: user.businessName,
        company: user.company,
        businessType: user.businessType,
        gstin: user.gstin,
        tradeLicense: user.tradeLicense,
        profileImage: user.profileImage || user.avatar || '',
        avatar: user.avatar || user.profileImage || '',
        address: user.address || '',
      },
    });
  } catch (error) {
    res.status(500).json({ msg: 'Registration failed', error: error.message });
  }
});

// Auto-seed default convenience accounts if missing
const seedDefaultRoleAccounts = async () => {
  try {
    const defaultAccounts = [
      {
        email: 'delivery@canopy.gov.in',
        name: 'Raghavendra Rao (Delivery Exec)',
        phone: '9845012345',
        password: await bcrypt.hash('delivery123', 10),
        role: 'Delivery Partner',
        status: 'Verified',
        address: 'Municipal EV Cargo Hub, Udupi'
      },
      {
        email: 'processing@canopy.gov.in',
        name: 'Ajjarkadu Yard Manager',
        phone: '9845099881',
        password: await bcrypt.hash('yard123', 10),
        role: 'Processing Officer',
        status: 'Verified',
        address: 'Ajjarkadu Municipal Biomass Processing Center'
      },
      {
        email: 'merchant@canopy.gov.in',
        name: 'Coastal Woodcrafts & Sawmills',
        phone: '9845077665',
        password: await bcrypt.hash('merchant123', 10),
        role: 'Timber Merchant',
        status: 'Verified',
        address: 'Industrial Area, Manipal Road, Udupi'
      },
      {
        email: 'cutter@canopy.gov.in',
        name: 'Manjunath Arborist',
        phone: '9845033442',
        password: await bcrypt.hash('cutter123', 10),
        role: 'Tree Cutter',
        status: 'Verified',
        address: 'Ward 12, Udupi'
      },
      {
        email: 'citizen@example.com',
        name: 'Suresh Prabhu',
        phone: '9845066778',
        password: await bcrypt.hash('citizen123', 10),
        role: 'Citizen',
        status: 'Verified',
        address: 'Kunjibettu, Udupi'
      }
    ];

    for (const acc of defaultAccounts) {
      const existing = await User.findOne({ email: acc.email });
      if (!existing) {
        await User.create(acc);
      }
    }
  } catch (err) {
    console.warn('Default role account seed notice:', err.message);
  }
};
seedDefaultRoleAccounts();

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

      let officialUser = await User.findOne({ email: OFFICIAL_EMAIL });
      if (!officialUser) {
        officialUser = await User.create({
          name: 'Municipal Official',
          email: OFFICIAL_EMAIL,
          phone: '0000000000',
          password: await bcrypt.hash(OFFICIAL_PASSWORD, 10),
          role: 'Official',
          status: 'Verified',
        });
      }

      return res.json({
        msg: 'User logged in successfully',
        user: {
          id: officialUser._id,
          name: officialUser.name,
          email: officialUser.email,
          phone: officialUser.phone || '',
          role: 'Official',
          status: officialUser.status || 'Verified',
          profileImage: officialUser.profileImage || officialUser.avatar || '',
          avatar: officialUser.avatar || officialUser.profileImage || '',
          address: officialUser.address || '',
        },
      });
    }

    let user = await User.findOne({ email: normalizedEmail });

    // Auto-create on demand for demo accounts if missing
    if (!user) {
      if (normalizedEmail === 'delivery@canopy.gov.in' && password === 'delivery123') {
        user = await User.create({
          name: 'Raghavendra Rao (Delivery Exec)',
          email: normalizedEmail,
          phone: '9845012345',
          password: await bcrypt.hash('delivery123', 10),
          role: 'Delivery Partner',
          status: 'Verified',
          address: 'Municipal EV Cargo Hub, Udupi'
        });
      } else if (normalizedEmail === 'processing@canopy.gov.in' && password === 'yard123') {
        user = await User.create({
          name: 'Ajjarkadu Yard Manager',
          email: normalizedEmail,
          phone: '9845099881',
          password: await bcrypt.hash('yard123', 10),
          role: 'Processing Officer',
          status: 'Verified',
          address: 'Ajjarkadu Municipal Biomass Processing Center'
        });
      } else if (normalizedEmail === 'merchant@canopy.gov.in' && password === 'merchant123') {
        user = await User.create({
          name: 'Coastal Woodcrafts & Sawmills',
          email: normalizedEmail,
          phone: '9845077665',
          password: await bcrypt.hash('merchant123', 10),
          role: 'Timber Merchant',
          status: 'Verified',
          address: 'Industrial Area, Manipal Road, Udupi'
        });
      } else if (normalizedEmail === 'cutter@canopy.gov.in' && password === 'cutter123') {
        user = await User.create({
          name: 'Manjunath Arborist',
          email: normalizedEmail,
          phone: '9845033442',
          password: await bcrypt.hash('cutter123', 10),
          role: 'Tree Cutter',
          status: 'Verified',
          address: 'Ward 12, Udupi'
        });
      } else if (normalizedEmail === 'citizen@example.com' && password === 'citizen123') {
        user = await User.create({
          name: 'Suresh Prabhu',
          email: normalizedEmail,
          phone: '9845066778',
          password: await bcrypt.hash('citizen123', 10),
          role: 'Citizen',
          status: 'Verified',
          address: 'Kunjibettu, Udupi'
        });
      }
    }

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

    // Allow flexible role matching for Timber Buyer/Merchant, Delivery Partner, etc.
    const normPortal = (portal || '').toLowerCase().trim();
    const normRole = (user.role || '').toLowerCase().trim();

    const isTimberPortal = normPortal.includes('timber') || normPortal.includes('merchant') || normPortal.includes('buyer');
    const isTimberRole = normRole.includes('timber') || normRole.includes('merchant') || normRole.includes('buyer');

    const isCutterPortal = normPortal.includes('cutter') || normPortal.includes('arborist');
    const isCutterRole = normRole.includes('cutter') || normRole.includes('arborist');

    const isDeliveryPortal = normPortal.includes('delivery');
    const isDeliveryRole = normRole.includes('delivery');

    const isCitizenPortal = normPortal.includes('citizen');
    const isCitizenRole = normRole.includes('citizen');

    const isOfficialPortal = normPortal.includes('official') || normPortal.includes('admin');
    const isOfficialRole = normRole.includes('official') || normRole.includes('admin');

    const matchesPortal = !portal ||
      normPortal === normRole ||
      normRole.includes(normPortal) ||
      normPortal.includes(normRole) ||
      (isTimberPortal && isTimberRole) ||
      (isCutterPortal && isCutterRole) ||
      (isDeliveryPortal && isDeliveryRole) ||
      (isCitizenPortal && isCitizenRole) ||
      (isOfficialPortal && isOfficialRole);

    if (!matchesPortal) {
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
        status: user.status || 'Verified',
        businessName: user.businessName || user.company || user.name,
        company: user.company || user.businessName || user.name,
        businessType: user.businessType || (user.role?.includes('Timber') ? 'Sawmill / Lumber Mill' : ''),
        gstin: user.gstin || '',
        tradeLicense: user.tradeLicense || '',
        panNumber: user.panNumber || '',
        merchantStatus: user.merchantStatus || 'Verified',
        profileImage: user.profileImage || user.avatar || '',
        avatar: user.avatar || user.profileImage || '',
        address: user.address || '',
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

// @route   GET /api/auth/cutters
// @desc    Get all registered Tree Cutters (Real database query)
// @access  Public / Protected
router.get('/cutters', async (req, res) => {
  try {
    const cutters = await User.find({ role: 'Tree Cutter' }).select('-password').sort({ createdAt: -1 });
    res.json({ cutters });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to fetch tree cutters', error: error.message });
  }
});

// @route   GET /api/auth/profile/:id
// @desc    Get user profile by ID or email
// @access  Public / Protected
router.get('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let user;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).select('-password -resetToken -resetTokenExpiry');
    } else {
      user = await User.findOne({ email: id.toLowerCase().trim() }).select('-password -resetToken -resetTokenExpiry');
    }
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to fetch profile', error: error.message });
  }
});

// @route   PATCH /api/auth/profile/:id
// @desc    Update user profile (profileImage, avatar, name, phone, address)
// @access  Public / Protected
router.patch('/profile/:id', async (req, res) => {
  try {
    const { profileImage, avatar, name, phone, address } = req.body;
    const updateFields = {};
    if (profileImage !== undefined) {
      updateFields.profileImage = profileImage;
      updateFields.avatar = profileImage;
    } else if (avatar !== undefined) {
      updateFields.avatar = avatar;
      updateFields.profileImage = avatar;
    }
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (address) updateFields.address = address;

    let user;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findByIdAndUpdate(req.params.id, updateFields, { returnDocument: 'after' }).select('-password');
    } else {
      user = await User.findOneAndUpdate({ email: req.params.id.toLowerCase().trim() }, updateFields, { returnDocument: 'after' }).select('-password');
    }
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to update profile', error: error.message });
  }
});

// @route   PATCH /api/auth/users/:id
// @desc    Update user info (alias for profile update)
router.patch('/users/:id', async (req, res) => {
  try {
    const { profileImage, avatar, name, phone, address, role, status } = req.body;
    const updateFields = {};
    if (profileImage !== undefined) {
      updateFields.profileImage = profileImage;
      updateFields.avatar = profileImage;
    } else if (avatar !== undefined) {
      updateFields.avatar = avatar;
      updateFields.profileImage = avatar;
    }
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (address) updateFields.address = address;
    if (role) updateFields.role = role;
    if (status) updateFields.status = status;

    let user;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findByIdAndUpdate(req.params.id, updateFields, { returnDocument: 'after' }).select('-password');
    } else {
      user = await User.findOneAndUpdate({ email: req.params.id.toLowerCase().trim() }, updateFields, { returnDocument: 'after' }).select('-password');
    }
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to update user', error: error.message });
  }
});

// @route   GET /api/auth/delivery-partners
// @desc    Get all registered and active delivery personnel
router.get('/delivery-partners', async (req, res) => {
  try {
    const partners = await User.find({
      role: { $in: ['Delivery Partner', 'Delivery'] }
    }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, partners });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to fetch delivery partners', error: error.message });
  }
});

// @route   POST /api/auth/register-delivery-partner
// @desc    Official/Admin quick registration of delivery personnel
router.post('/register-delivery-partner', async (req, res) => {
  try {
    const { name, email, phone, password, vehicleType, vehicleNumber, deliveryZone } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ msg: 'Name, email, and phone are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ msg: 'A user with this email address already exists' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'Delivery@123', salt);

    const partner = new User({
      name,
      email: cleanEmail,
      phone,
      password: hashedPassword,
      role: 'Delivery Partner',
      status: 'Verified',
      vehicleType: vehicleType || 'Three-Wheeler EV Cargo',
      vehicleNumber: vehicleNumber || 'KA-20-EV-4091',
      deliveryZone: deliveryZone || 'Udupi Central & Manipal Sector',
      isAvailable: true
    });

    await partner.save();

    res.status(201).json({
      success: true,
      partner: {
        _id: partner._id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        role: partner.role,
        vehicleType: partner.vehicleType,
        vehicleNumber: partner.vehicleNumber,
        deliveryZone: partner.deliveryZone,
        isAvailable: partner.isAvailable
      },
      msg: 'Delivery partner registered and verified successfully!'
    });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to register delivery partner', error: error.message });
  }
});

// @route   PATCH /api/auth/delivery-partners/:id/toggle-availability
router.patch('/delivery-partners/:id/toggle-availability', async (req, res) => {
  try {
    const partner = await User.findById(req.params.id);
    if (!partner) return res.status(404).json({ msg: 'Delivery partner not found' });

    partner.isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : !partner.isAvailable;
    await partner.save();

    res.json({ success: true, isAvailable: partner.isAvailable, partner });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to toggle availability', error: error.message });
  }
});

module.exports = router;


