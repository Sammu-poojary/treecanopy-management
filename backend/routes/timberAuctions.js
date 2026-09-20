const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const TimberLot = require('../models/TimberLot');
const TimberBid = require('../models/TimberBid');
const User = require('../models/User');

// Seed sample timber auction lots if empty
const seedSampleLots = async () => {
  // Clean up any fake dummy bidder data from existing lots
  try {
    await TimberLot.updateMany(
      { 'highestBidder.companyName': { $in: ['Suresh Wood Industries Pvt Ltd', 'Karthik Furnishings Udupi', 'Manipal Food Processing'] } },
      {
        $set: {
          totalBidsCount: 0,
          currentHighestBidInr: 0,
          highestBidder: { bidderId: null, bidderName: '', companyName: '', bidderPhone: '', bidTimestamp: null }
        }
      }
    );
    // Delete any fake test bids
    await TimberBid.deleteMany({
      bidderCompany: { $in: ['Suresh Wood Industries Pvt Ltd', 'Karthik Furnishings Udupi', 'Manipal Food Processing'] }
    });
  } catch (err) {
    console.warn('TimberLot cleanup notice:', err.message);
  }

  const count = await TimberLot.countDocuments();
  if (count === 0) {
    const now = new Date();
    const lots = [
      {
        lotNumber: 'TMB-LOT-2026-101',
        title: '3x Premium Mature Rosewood Trunk Logs (Grade A Hardwood)',
        treeSpecies: 'Rosewood (Dalbergia latifolia)',
        woodGrade: 'Grade A Construction Hardwood',
        originLocation: 'Kalsanka Avenue Sector, Udupi',
        storageYard: 'Santhekatte Municipal Timber Depot, Udupi',
        logCount: 3,
        totalWeightKg: 850,
        dimensions: { avgDiameterCm: 48, avgLengthMeters: 3.4, totalVolumeCubicMeters: 1.85 },
        moistureContentPercent: 16,
        featuredImage: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80',
        images: [
          'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80'
        ],
        inspectionNotes: 'Dense heartwood, straight grain, debarked, zero rot or insect tunnels. Ideal for fine furniture, heavy door frames, and ornamental carving.',
        startingBidInr: 18000,
        reservePriceInr: 22000,
        bidStepIncrementInr: 500,
        currentHighestBidInr: 0,
        totalBidsCount: 0,
        highestBidder: {
          bidderId: null,
          bidderName: '',
          companyName: '',
          bidderPhone: '',
          bidTimestamp: null
        },
        auctionStartTime: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
        auctionEndTime: new Date(now.getTime() + 18 * 3600 * 1000), // Ends in 18 hours
        status: 'Live Bidding'
      },
      {
        lotNumber: 'TMB-LOT-2026-102',
        title: '4x Seasoned Honge (Pongamia) Timber Logs (Furniture Grade)',
        treeSpecies: 'Honge / Indian Beech (Pongamia pinnata)',
        woodGrade: 'Grade B Furniture / Framing',
        originLocation: 'Manipal Lake Promenade, Udupi',
        storageYard: 'Korangrapady Municipal Timber Depot, Udupi',
        logCount: 4,
        totalWeightKg: 620,
        dimensions: { avgDiameterCm: 40, avgLengthMeters: 2.9, totalVolumeCubicMeters: 1.45 },
        moistureContentPercent: 19,
        featuredImage: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80',
        images: [
          'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80'
        ],
        inspectionNotes: 'Well-seasoned structural wood with attractive grain pattern. Suitable for interior framing and rustic tables.',
        startingBidInr: 9500,
        reservePriceInr: 12000,
        bidStepIncrementInr: 250,
        currentHighestBidInr: 0,
        totalBidsCount: 0,
        highestBidder: {
          bidderId: null,
          bidderName: '',
          companyName: '',
          bidderPhone: '',
          bidTimestamp: null
        },
        auctionStartTime: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
        auctionEndTime: new Date(now.getTime() + 2 * 24 * 3600 * 1000), // Ends in 2 days
        status: 'Live Bidding'
      },
      {
        lotNumber: 'TMB-LOT-2026-103',
        title: 'Bulk Firewood & Split Hardwood Logs Lot (1.2 Tonnes)',
        treeSpecies: 'Mixed Canopy Hardwoods (Acacia & Eucalyptus)',
        woodGrade: 'Grade C Firewood & Slabs',
        originLocation: 'Central Park Storm Clearance, Ajjarkadu',
        storageYard: 'Ajjarkadu Municipal Biomass Processing Center',
        logCount: 18,
        totalWeightKg: 1200,
        dimensions: { avgDiameterCm: 25, avgLengthMeters: 1.5, totalVolumeCubicMeters: 2.1 },
        moistureContentPercent: 14,
        featuredImage: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&auto=format&fit=crop&q=80',
        inspectionNotes: 'Dry split hardwood suitable for commercial bakeries, brick kilns, boiler units, and domestic fire pits.',
        startingBidInr: 4500,
        reservePriceInr: 5500,
        bidStepIncrementInr: 200,
        currentHighestBidInr: 0,
        totalBidsCount: 0,
        highestBidder: {
          bidderId: null,
          bidderName: '',
          companyName: '',
          bidderPhone: '',
          bidTimestamp: null
        },
        auctionStartTime: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
        auctionEndTime: new Date(now.getTime() + 8 * 3600 * 1000), // Ends in 8 hours
        status: 'Live Bidding'
      }
    ];
    await TimberLot.insertMany(lots);
  }
};
seedSampleLots().catch(err => console.warn('TimberLot seed notice:', err.message));

// ── GET /api/timber-auctions (List lots with status & category filter)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.woodGrade) filter.woodGrade = req.query.woodGrade;
    const lots = await TimberLot.find(filter).sort({ auctionEndTime: 1, createdAt: -1 });
    res.json(lots);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    if (!lot) return res.status(404).json({ error: 'Timber lot not found' });
    const bids = await TimberBid.find({ lotId: lot._id }).sort({ bidAmountInr: -1, createdAt: -1 });
    res.json({ lot, bids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/timber-auctions (Create new timber auction lot)
router.post('/', async (req, res) => {
  try {
    const {
      title, treeSpecies, woodGrade, originLocation, storageYard,
      logCount, totalWeightKg, avgDiameterCm, avgLengthMeters, totalVolumeCubicMeters,
      startingBidInr, reservePriceInr, bidStepIncrementInr, auctionDurationHours,
      inspectionNotes, imageBase64, intakeShipmentId
    } = req.body;

    let featuredImage = 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=800&auto=format&fit=crop&q=80';
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      try {
        const uploadRes = await cloudinary.uploader.upload(imageBase64, {
          folder: 'treecanopy/timber-lots',
          resource_type: 'image'
        });
        featuredImage = uploadRes.secure_url;
      } catch (uploadErr) {
        console.warn('Timber photo upload warning:', uploadErr.message);
      }
    }

    const count = await TimberLot.countDocuments();
    const lotNumber = `TMB-LOT-2026-${String(count + 101).padStart(3, '0')}`;
    const now = new Date();
    const duration = Number(auctionDurationHours || 48); // default 48h
    const auctionEndTime = new Date(now.getTime() + duration * 3600 * 1000);

    const startBid = Number(startingBidInr || 5000);

    const lot = new TimberLot({
      lotNumber,
      title: title || `${logCount || 2}x ${treeSpecies || 'Hardwood'} Logs (${woodGrade || 'Grade A'})`,
      treeSpecies: treeSpecies || 'Hardwood',
      woodGrade: woodGrade || 'Grade A Construction Hardwood',
      originLocation: originLocation || 'Udupi Canopy Sector',
      storageYard: storageYard || 'Santhekatte Municipal Timber Depot, Udupi',
      logCount: Number(logCount || 2),
      totalWeightKg: Number(totalWeightKg || 500),
      dimensions: {
        avgDiameterCm: Number(avgDiameterCm || 40),
        avgLengthMeters: Number(avgLengthMeters || 3.0),
        totalVolumeCubicMeters: Number(totalVolumeCubicMeters || 1.2)
      },
      featuredImage,
      images: [featuredImage],
      inspectionNotes: inspectionNotes || 'Quality-inspected municipal timber lot.',
      startingBidInr: startBid,
      reservePriceInr: Number(reservePriceInr || startBid * 1.2),
      bidStepIncrementInr: Number(bidStepIncrementInr || 500),
      currentHighestBidInr: startBid,
      auctionStartTime: now,
      auctionEndTime,
      status: 'Live Bidding',
      intakeShipmentId: intakeShipmentId || null
    });

    await lot.save();

    // Link and update source WasteIntake if provided
    if (req.body.intakeId || intakeShipmentId) {
      try {
        const WasteIntake = require('../models/WasteIntake');
        await WasteIntake.findOneAndUpdate(
          { $or: [{ _id: req.body.intakeId }, { shipmentId: intakeShipmentId }].filter(Boolean) },
          {
            status: 'Verified',
            allocatedStream: 'Timber Auction',
            assignedTimberLotId: lot._id,
            verifiedByName: req.body.verifiedByName || 'Official Timber Officer',
            verifiedAt: new Date()
          }
        );
      } catch (intakeErr) {
        console.warn('WasteIntake link notice:', intakeErr.message);
      }
    }

    res.status(201).json({ success: true, lot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/timber-auctions/:id/bid (Place commercial bid)
router.post('/:id/bid', async (req, res) => {
  try {
    const { bidderId, bidderName, companyName, bidderEmail, bidderPhone, bidderGstin, bidAmountInr } = req.body;
    const lot = await TimberLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found' });

    if (lot.status !== 'Live Bidding' && new Date() > new Date(lot.auctionEndTime)) {
      return res.status(400).json({ error: 'This auction has already closed.' });
    }

    const minRequired = (lot.totalBidsCount === 0)
      ? lot.startingBidInr
      : lot.currentHighestBidInr + (lot.bidStepIncrementInr || 500);

    const bidNum = Number(bidAmountInr);
    if (isNaN(bidNum) || bidNum < minRequired) {
      return res.status(400).json({
        error: `Bid must be at least ₹${minRequired.toLocaleString('en-IN')} (Current: ₹${lot.currentHighestBidInr.toLocaleString('en-IN')} + Step: ₹${lot.bidStepIncrementInr || 500})`
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
    await lot.save();

    res.json({
      success: true,
      message: `✅ Bid of ₹${bidNum.toLocaleString('en-IN')} placed successfully! You are now the highest bidder.`,
      lot,
      bid: newBid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/timber-auctions/:id/settle-gatepass (Generate winner gate pass)
router.post('/:id/settle-gatepass', async (req, res) => {
  try {
    const { vehicleNumber, verifiedByGuard } = req.body;
    const lot = await TimberLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found' });

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
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/timber-auctions/:id/mark-delivered (Official Yard Delivery Confirmation)
router.patch('/:id/mark-delivered', async (req, res) => {
  try {
    const { vehicleNumber, verifiedByGuard, deliveryNotes } = req.body;
    const lot = await TimberLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Timber lot not found' });

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
