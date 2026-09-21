const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const TimberLot = require('../models/TimberLot');
const TimberBid = require('../models/TimberBid');
const User = require('../models/User');

// ── PUT /api/timber-auctions/:id (Update timber lot — handles photo upload)
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.imageBase64 && updates.imageBase64.startsWith('data:image')) {
      try {
        const uploadRes = await cloudinary.uploader.upload(updates.imageBase64, {
          folder: 'treecanopy/timber-lots',
          resource_type: 'image'
        });
        updates.featuredImage = uploadRes.secure_url;
        updates.images = [uploadRes.secure_url];
      } catch (uploadErr) {
        console.warn('Timber photo upload warning:', uploadErr.message);
      }
      delete updates.imageBase64;
    }

    const lot = await TimberLot.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!lot) return res.status(404).json({ error: 'Timber lot not found' });
    res.json({ success: true, lot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/timber-auctions/:id (Delete timber lot)
router.delete('/:id', async (req, res) => {
  try {
    const lot = await TimberLot.findByIdAndDelete(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found' });
    await TimberBid.deleteMany({ lotId: req.params.id });
    res.json({ success: true, message: `Timber lot ${lot.lotNumber} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/timber-auctions (List lots with status & category filter)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.woodGrade) filter.woodGrade = req.query.woodGrade;
    const lots = await TimberLot.find(filter).sort({ auctionEndTime: 1, createdAt: -1 }).lean();

    // Attach bids array to each lot
    const lotIds = lots.map(l => l._id);
    const bids = await TimberBid.find({ lotId: { $in: lotIds } }).sort({ bidAmountInr: -1, createdAt: -1 }).lean();

    const bidsByLot = {};
    bids.forEach(b => {
      const lid = b.lotId.toString();
      if (!bidsByLot[lid]) bidsByLot[lid] = [];
      bidsByLot[lid].push(b);
    });

    const lotsWithBids = lots.map(l => ({
      ...l,
      bids: bidsByLot[l._id.toString()] || []
    }));

    res.json(lotsWithBids);
  } catch (err) {
    res.status(500).json({ error: err.message, message: err.message });
  }
});

// ── GET /api/timber-auctions/buyers (List all registered timber buyers & sawmills)
router.get('/buyers', async (req, res) => {
  try {
    const buyers = await User.find({
      $or: [
        { role: { $in: ['Timber Buyer', 'Timber Merchant'] } },
        { businessName: { $exists: true, $ne: '', $ne: null } }
      ]
    }).select('-password').sort({ createdAt: -1 });

    // Attach bid counts & won lots stats to each buyer
    const buyersWithStats = await Promise.all(
      buyers.map(async (b) => {
        const bidsCount = await TimberBid.countDocuments({
          $or: [{ bidderEmail: b.email }, { bidderPhone: b.phone }, { bidderId: b._id.toString() }]
        });
        const wonLots = await TimberLot.find({
          'highestBidder.bidderPhone': b.phone,
          status: { $in: ['Winner Declared & Certificate Issued', 'Sold & Gate-Pass Issued', 'Delivered & Dispatched'] }
        }).select('lotNumber treeSpecies startingBidInr currentHighestBidInr status');

        return {
          id: b._id,
          name: b.name,
          companyName: b.businessName || b.company || b.name,
          businessType: b.businessType || 'Sawmill / Lumber Mill',
          email: b.email,
          phone: b.phone,
          gstin: b.gstin || 'Unspecified',
          tradeLicense: b.tradeLicense || 'Pending',
          address: b.address || 'Udupi Industrial Zone',
          status: b.status || 'Verified',
          registeredAt: b.createdAt,
          totalBidsPlaced: bidsCount,
          wonLotsCount: wonLots.length,
          wonLots
        };
      })
    );

    res.json(buyersWithStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/timber-auctions/register-buyer (Timber Buyer / Wood Merchant Registration)
router.post('/register-buyer', async (req, res) => {
  try {
    const {
      bidderName,
      companyName,
      bidderEmail,
      bidderPhone,
      businessType,
      gstin,
      tradeLicense,
      panNumber,
      address,
      password
    } = req.body;

    if (!bidderName || !bidderPhone || !companyName) {
      return res.status(400).json({ error: 'Representative name, phone number, and sawmill/company name are required.' });
    }

    const emailToUse = (bidderEmail || `${bidderPhone}@timber.buyer`).toLowerCase().trim();
    let existingUser = await User.findOne({
      $or: [{ email: emailToUse }, { phone: bidderPhone }]
    });

    const defaultPwd = password || 'merchant123';
    const hashedPassword = await bcrypt.hash(defaultPwd, 10);

    if (existingUser) {
      existingUser.name = bidderName || existingUser.name;
      existingUser.businessName = companyName || existingUser.businessName;
      existingUser.company = companyName || existingUser.company;
      existingUser.businessType = businessType || existingUser.businessType || 'Sawmill / Lumber Mill';
      existingUser.gstin = gstin || existingUser.gstin || '';
      existingUser.tradeLicense = tradeLicense || existingUser.tradeLicense || '';
      existingUser.panNumber = panNumber || existingUser.panNumber || '';
      existingUser.address = address || existingUser.address || '';
      if (!existingUser.role?.includes('Timber') && existingUser.role === 'Citizen') {
        existingUser.role = 'Timber Buyer';
      }
      existingUser.merchantStatus = 'Verified';
      await existingUser.save();

      return res.json({
        success: true,
        message: `✅ Timber Buyer Profile updated for "${existingUser.businessName || existingUser.name}". You are authorized to bid!`,
        user: {
          id: existingUser._id,
          bidderId: existingUser._id.toString(),
          bidderName: existingUser.name,
          companyName: existingUser.businessName || existingUser.company || existingUser.name,
          bidderEmail: existingUser.email,
          bidderPhone: existingUser.phone,
          businessType: existingUser.businessType,
          gstin: existingUser.gstin,
          tradeLicense: existingUser.tradeLicense,
          role: existingUser.role,
          isRegistered: true,
          status: existingUser.status || 'Verified'
        }
      });
    }

    const newUser = await User.create({
      name: bidderName,
      email: emailToUse,
      phone: bidderPhone,
      password: hashedPassword,
      role: 'Timber Buyer',
      status: 'Verified',
      businessName: companyName,
      company: companyName,
      businessType: businessType || 'Sawmill / Lumber Mill',
      gstin: gstin || '',
      tradeLicense: tradeLicense || '',
      panNumber: panNumber || '',
      authorizedPersonName: bidderName,
      address: address || '',
      merchantStatus: 'Verified',
    });

    res.status(201).json({
      success: true,
      message: `🎉 Timber Buyer registration successful! Welcome, "${newUser.businessName}". You can now place live bids.`,
      user: {
        id: newUser._id,
        bidderId: newUser._id.toString(),
        bidderName: newUser.name,
        companyName: newUser.businessName,
        bidderEmail: newUser.email,
        bidderPhone: newUser.phone,
        businessType: newUser.businessType,
        gstin: newUser.gstin,
        tradeLicense: newUser.tradeLicense,
        role: newUser.role,
        isRegistered: true,
        status: 'Verified'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/timber-auctions/:id (Lot details with full bid history)
router.get('/:id', async (req, res) => {
  try {
    const lot = await TimberLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found', message: 'Timber lot not found' });
    const bids = await TimberBid.find({ lotId: lot._id }).sort({ bidAmountInr: -1, createdAt: -1 });
    res.json({ lot, bids });
  } catch (err) {
    res.status(500).json({ error: err.message, message: err.message });
  }
});

// ── GET /api/timber-auctions/:id/bids (Bid history array for a lot)
router.get('/:id/bids', async (req, res) => {
  try {
    const lot = await TimberLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found', message: 'Timber lot not found' });
    const bids = await TimberBid.find({ lotId: lot._id }).sort({ bidAmountInr: -1, createdAt: -1 });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message, message: err.message });
  }
});

// ── POST /api/timber-auctions (Create new timber auction lot)
router.post('/', async (req, res) => {
  try {
    const {
      title, treeSpecies, species, woodGrade, originLocation, storageYard, yardLocation,
      logCount, totalWeightKg, estimatedWeightKg, avgDiameterCm, averageDiameterCm,
      avgLengthMeters, approxLengthM, totalVolumeCubicMeters,
      startingBidInr, reservePriceInr, reservePrice, bidStepIncrementInr, bidIncrement,
      auctionDurationHours, inspectionNotes, description, imageBase64,
      intakeShipmentId
    } = req.body;

    const count = await TimberLot.countDocuments();
    const year = new Date().getFullYear();
    const lotNumber = `TMB-LOT-${year}-${String(count + 101).padStart(3, '0')}`;

    const start = new Date();
    const end = new Date(Date.now() + (Number(auctionDurationHours) || 72) * 3600 * 1000);

    let featuredImage = 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80';
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      const filename = `timber-lot-${Date.now()}.jpg`;
      const filepath = path.join(UPLOAD_DIR, filename);
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
      featuredImage = `/uploads/timber-auctions/${filename}`;
    }

    const startBid = Number(startingBidInr || reservePriceInr || reservePrice || 10000);
    const lot = new TimberLot({
      lotNumber,
      title: title || `${treeSpecies || species || 'Hardwood'} Trunk Logs Batch`,
      treeSpecies: treeSpecies || species || 'Hardwood Logs',
      woodGrade: woodGrade || 'Grade A Construction Hardwood',
      originLocation: originLocation || 'Municipal Processing Yard, Udupi',
      storageYard: storageYard || yardLocation || 'Santhekatte Municipal Timber Depot, Udupi',
      logCount: Number(logCount) || 3,
      totalWeightKg: Number(totalWeightKg || estimatedWeightKg) || 750,
      dimensions: {
        avgDiameterCm: Number(avgDiameterCm || averageDiameterCm) || 40,
        avgLengthMeters: Number(avgLengthMeters || approxLengthM) || 3.0,
        totalVolumeCubicMeters: Number(totalVolumeCubicMeters) || 1.2
      },
      moistureContentPercent: 18,
      intakeShipmentId: intakeShipmentId || null,
      featuredImage,
      inspectionNotes: inspectionNotes || description || 'Inspected, bark stripped, grade verified.',
      startingBidInr: startBid,
      reservePriceInr: Number(reservePriceInr || reservePrice || startBid),
      bidStepIncrementInr: Number(bidStepIncrementInr || bidIncrement || 500),
      currentHighestBidInr: startBid,
      totalBidsCount: 0,
      auctionStartTime: start,
      auctionEndTime: end,
      status: 'Live Bidding'
    });

    await lot.save();

    if (intakeShipmentId) {
      try {
        const WasteIntake = require('../models/WasteIntake');
        await WasteIntake.findByIdAndUpdate(intakeShipmentId, {
          assignedTimberLotId: lot._id,
          status: 'Processed'
        });
      } catch (e) {
        console.error('Could not link intake shipment to timber lot:', e.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `🎉 Timber Auction Lot ${lot.lotNumber} listed successfully!`,
      lot
    });
  } catch (err) {
    res.status(500).json({ error: err.message, message: err.message });
  }
});

// ── POST /api/timber-auctions/:id/bid (Place commercial bid)
router.post('/:id/bid', async (req, res) => {
  try {
    const { bidderId, bidderName, companyName, bidderEmail, bidderPhone, bidderGstin } = req.body;
    const bidAmountInr = req.body.bidAmountInr || req.body.bidAmount || req.body.amount;
    const lot = await TimberLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found', message: 'Timber lot not found' });

    const isClosed = ['Sold & Gate-Pass Issued', 'Collected', 'Ended - Awaiting Payment', 'Closed', 'SOLD'].includes(lot.status);
    if (isClosed) {
      return res.status(400).json({ error: 'This auction has already closed.', message: 'This auction has already closed.' });
    }

    const minRequired = (lot.totalBidsCount === 0 || !lot.currentHighestBidInr)
      ? (lot.startingBidInr || 1000)
      : (lot.currentHighestBidInr + (lot.bidStepIncrementInr || 500));

    const bidNum = Number(bidAmountInr);
    if (isNaN(bidNum) || bidNum < minRequired) {
      const errMsg = `Bid must be at least ₹${minRequired.toLocaleString('en-IN')} (Current: ₹${(lot.currentHighestBidInr || 0).toLocaleString('en-IN')} + Min Step: ₹${lot.bidStepIncrementInr || 500})`;
      return res.status(400).json({
        error: errMsg,
        message: errMsg
      });
    }

    // Mark previous winning bids as outbid
    await TimberBid.updateMany({ lotId: lot._id, status: 'Active' }, { status: 'Outbid' });

    // Create new bid
    const newBid = new TimberBid({
      lotId: lot._id,
      lotNumber: lot.lotNumber,
      lotTitle: lot.title,
      bidderId: bidderId || `bidder_${Date.now()}`,
      bidderName: bidderName || 'Commercial Bidder',
      companyName: companyName || 'Sawmill / Carpentry Firm',
      bidderEmail: bidderEmail || '',
      bidderPhone: bidderPhone || '',
      bidderGstin: bidderGstin || '',
      bidAmountInr: bidNum,
      isWinningBid: true,
      status: 'Active'
    });
    await newBid.save();

    // Update lot's highest bid
    lot.currentHighestBidInr = bidNum;
    lot.totalBidsCount = (lot.totalBidsCount || 0) + 1;
    lot.highestBidder = {
      bidderId: newBid.bidderId,
      bidderName: newBid.bidderName,
      companyName: newBid.companyName,
      bidderPhone: newBid.bidderPhone,
      bidTimestamp: new Date()
    };
    if (lot.status !== 'Live Bidding') {
      lot.status = 'Live Bidding';
    }
    await lot.save();

    res.json({
      success: true,
      message: `✅ Bid of ₹${bidNum.toLocaleString('en-IN')} placed successfully! You are now the leading bidder.`,
      lot,
      bid: newBid
    });
  } catch (err) {
    res.status(500).json({ error: err.message, message: err.message });
  }
});

// ── POST /api/timber-auctions/:id/declare-winner (Official: Finalize auction & issue certificate)
router.post('/:id/declare-winner', async (req, res) => {
  try {
    const { officialName, officialNotes } = req.body;
    const lot = await TimberLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found' });

    if (!lot.highestBidder || !lot.highestBidder.bidderName || lot.totalBidsCount === 0) {
      return res.status(400).json({ error: 'Cannot declare winner: No commercial bids have been placed on this lot yet.' });
    }

    const certNumber = `CERT-TMB-2026-${lot.lotNumber.replace('TMB-LOT-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const passCode = `GP-${lot.lotNumber.replace('TMB-LOT-', '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    lot.status = 'Winner Declared & Certificate Issued';
    lot.allotmentCertificate = {
      certificateNumber: certNumber,
      awardedTo: lot.highestBidder.companyName || lot.highestBidder.bidderName,
      bidderContact: lot.highestBidder.bidderPhone,
      winningBidAmountInr: lot.currentHighestBidInr,
      issuedAt: new Date(),
      issuedByOfficial: officialName || 'Forestry & Circular Biomass Desk',
      officialNotes: officialNotes || 'Approved following competitive commercial timber salvage auction.'
    };

    lot.gatePass = {
      passCode,
      vehicleNumber: '',
      issuedAt: new Date(),
      isCollected: false,
      collectedAt: null,
      verifiedByGuard: ''
    };

    await lot.save();
    res.json({
      success: true,
      message: `✅ Winner officially declared for ${lot.lotNumber}. Allotment Certificate ${certNumber} generated.`,
      lot
    });
  } catch (err) {
    res.status(500).json({ error: err.message, message: err.message });
  }
});

// ── POST /api/timber-auctions/:id/settle-gatepass (Generate winner gate pass)
router.post('/:id/settle-gatepass', async (req, res) => {
  try {
    const { vehicleNumber, verifiedByGuard } = req.body;
    const lot = await TimberLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found', message: 'Timber lot not found' });

    const passCode = lot.gatePass?.passCode || `GP-${lot.lotNumber.replace('TMB-LOT-', '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    lot.status = 'Sold & Gate-Pass Issued';
    lot.gatePass = {
      passCode,
      vehicleNumber: vehicleNumber || 'KA-20-MB-9012',
      issuedAt: new Date(),
      isCollected: false,
      collectedAt: null,
      verifiedByGuard: verifiedByGuard || 'Santhekatte Depot Security'
    };
    await lot.save();

    res.json({ success: true, lot, gatePass: lot.gatePass });
  } catch (err) {
    res.status(500).json({ error: err.message, message: err.message });
  }
});

// ── PATCH /api/timber-auctions/:id/mark-delivered (Official Yard Delivery Confirmation)
router.patch('/:id/mark-delivered', async (req, res) => {
  try {
    const { vehicleNumber, verifiedByGuard, deliveryNotes } = req.body;
    const lot = await TimberLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found', message: 'Timber lot not found' });

    lot.status = 'Delivered & Dispatched';
    if (!lot.gatePass) lot.gatePass = {};
    lot.gatePass.isCollected = true;
    lot.gatePass.collectedAt = new Date();
    if (vehicleNumber) lot.gatePass.vehicleNumber = vehicleNumber;
    if (verifiedByGuard) lot.gatePass.verifiedByGuard = verifiedByGuard;
    if (deliveryNotes) lot.gatePass.deliveryNotes = deliveryNotes;

    await lot.save();
    res.json({
      success: true,
      message: `✅ Timber Lot ${lot.lotNumber} marked as successfully delivered & dispatched from municipal depot.`,
      lot
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
