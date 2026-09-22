const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

const issueLabels = {
  damaged: 'Damaged Tree',
  overhanging: 'Overhanging Branches',
  dead: 'Dead / Dying Tree',
  pest: 'Pest / Disease',
  roots: 'Roots Damage',
  fallen: 'Fallen Branch',
};

// Helper: create a notification
async function notify(targetRole, targetUserId, type, title, message, relatedId = null) {
  try {
    await Notification.create({ targetRole, targetUserId, type, title, message, relatedId });
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
}

// @route   POST /api/complaints
// @desc    Submit a new issue/complaint report
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { issueType, description, location, photoUrl, submittedBy, submittedByUserId, assignedTo, status, scheduledDate } = req.body;

    if (!issueType) {
      return res.status(400).json({ msg: 'Issue type is required' });
    }

    const complaintData = {
      issueType: issueType || 'routine',
      description: description || '',
      location: location || '',
      photoUrl: photoUrl || '',
      submittedBy: submittedBy || 'Official Scheduler',
      submittedByUserId: submittedByUserId || null,
      assignedTo: assignedTo || null,
      status: status || 'Pending',
    };

    if (scheduledDate) {
      const d = new Date(scheduledDate);
      if (!isNaN(d.getTime())) {
        complaintData.scheduledDate = d;
      }
    }

    const complaint = await Complaint.create(complaintData);

    // Notify Officials about new complaint
    await notify(
      'Official',
      null,
      'complaint_submitted',
      'New Complaint Submitted',
      `A new complaint (${issueLabels[issueType] || issueType}) has been submitted${location ? ` at ${location}` : ''}.`,
      complaint._id.toString()
    );

    // Notify Admins about new complaint
    await notify(
      'Admin',
      null,
      'complaint_submitted',
      'New Complaint Submitted',
      `A new complaint (${issueLabels[issueType] || issueType}) has been submitted${location ? ` at ${location}` : ''}.`,
      complaint._id.toString()
    );

    // Notify Tree Cutters about new complaint
    await notify(
      'Tree Cutter',
      null,
      'complaint_submitted',
      'New Complaint Submitted',
      `A new complaint (${issueLabels[issueType] || issueType}) has been submitted${location ? ` at ${location}` : ''}.`,
      complaint._id.toString()
    );

    // Notify the submitting citizen (if logged in)
    if (submittedByUserId) {
      await notify(
        null,
        submittedByUserId,
        'complaint_submitted',
        'Complaint Received',
        `Your complaint for "${issueLabels[issueType] || issueType}" has been submitted successfully. Track ID: ${complaint._id}`,
        complaint._id.toString()
      );
    }

    res.status(201).json({ msg: 'Complaint submitted successfully', complaint });
  } catch (error) {
    console.error('Complaint submission error:', error.message);
    res.status(500).json({ msg: 'Failed to submit complaint', error: error.message });
  }
});

// @route   GET /api/complaints
// @desc    Get all complaints (admin / officials)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { status, submittedByUserId, requiresReplantation, replantationStatus } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (submittedByUserId) filter.submittedByUserId = submittedByUserId;
    if (requiresReplantation !== undefined) filter.requiresReplantation = requiresReplantation === 'true';
    if (replantationStatus) filter.replantationStatus = replantationStatus;

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (error) {
    console.error('Fetch complaints error:', error.message);
    res.status(500).json({ msg: 'Failed to fetch complaints', error: error.message });
  }
});

// @route   GET /api/complaints/stats
// @desc    Get aggregate complaint statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'Pending' });
    const inReview = await Complaint.countDocuments({ status: 'In Review' });
    const scheduled = await Complaint.countDocuments({ status: 'Scheduled' });
    const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });

    res.json({ total, pending, inReview, scheduled, inProgress, resolved });
  } catch (error) {
    console.error('Stats error:', error.message);
    res.status(500).json({ msg: 'Failed to get stats', error: error.message });
  }
});

// @route   GET /api/complaints/:id
// @desc    Get a single complaint by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }
    res.json({ complaint });
  } catch (error) {
    console.error('Fetch complaint error:', error.message);
    res.status(500).json({ msg: 'Failed to fetch complaint', error: error.message });
  }
});

// @route   PATCH /api/complaints/:id
// @desc    Generic update for a complaint (status, priority, assignedTo, etc.)
// @access  Public
router.patch('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }
    res.json({ msg: 'Complaint updated successfully', complaint });
  } catch (error) {
    console.error('Update complaint error:', error.message);
    res.status(500).json({ msg: 'Failed to update complaint', error: error.message });
  }
});

// @route   PATCH /api/complaints/:id/status
// @desc    Update a complaint's status
// @access  Official / Admin
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, officialName, assignedTo, rejectionReason, replantationStatus } = req.body;
    const validStatuses = [
      'Pending', 'In Review', 'Scheduled', 'Assigned', 'In Progress',
      'Reached Location', 'Work Completed', 'Waste Disposed', 'Ready for Closure',
      'Completed', 'Resolved', 'Closed'
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ msg: `Invalid status value: ${status}` });
    }

    const complaintCheck = await Complaint.findById(req.params.id);
    if (!complaintCheck) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
    if (replantationStatus) updateData.replantationStatus = replantationStatus;
    if (status === 'In Review' && officialName) {
      updateData.verifiedBy = officialName;
      updateData.verifiedAt = new Date();
    }
    if (status === 'Resolved' || status === 'Waste Disposed' || status === 'Work Completed') {
      if (status === 'Resolved') {
        updateData.closedBy = officialName || 'Official';
        updateData.closedAt = new Date();
      }
      if (complaintCheck.issueType === 'dead') {
        updateData.requiresReplantation = true;
        if (complaintCheck.replantationStatus !== 'Planted') {
          updateData.replantationStatus = 'Pending';
        }
        if (!updateData.assignedTo && complaintCheck.assignedTo) {
          updateData.assignedTo = complaintCheck.assignedTo;
        }
      }
    }

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });

    // Send notification to citizen
    if (complaint.submittedByUserId) {
      await notify(
        null,
        complaint.submittedByUserId,
        'status_updated',
        'Complaint Status Updated',
        `Your complaint (${issueLabels[complaint.issueType] || complaint.issueType}) status changed to: ${status}.`,
        complaint._id.toString()
      );
    }

    // Notify cutter when assigned
    if ((status === 'Scheduled' || status === 'Assigned') && (assignedTo || complaint.assignedTo)) {
      await notify(
        'Tree Cutter',
        null,
        'task_assigned',
        'New Task Assigned',
        `A new task has been assigned: ${issueLabels[complaint.issueType] || complaint.issueType} at ${complaint.location || 'Unknown location'}.`,
        complaint._id.toString()
      );
    }

    // Auto-notify on Replantation Triggered
    if ((status === 'Resolved' || status === 'Waste Disposed' || status === 'Work Completed') && complaintCheck.issueType === 'dead') {
      await notify(
        'Tree Cutter',
        null,
        'replantation_assigned',
        '🌱 Eco-Restore Replantation Assigned',
        `Dead tree removal is complete. You are assigned to plant a replacement sapling at ${complaint.location || 'site'}.`,
        complaint._id.toString()
      );
      await notify(
        'Official',
        null,
        'replantation_needed',
        'Replantation Triggered',
        `A dead tree has been removed at ${complaint.location || 'site'}. Replantation is now assigned to ${complaint.assignedTo || 'Tree Cutter'}.`,
        complaint._id.toString()
      );
    }

    res.json({ msg: 'Status updated', complaint });
  } catch (error) {
    console.error('Update status error:', error.message);
    res.status(500).json({ msg: 'Failed to update status', error: error.message });
  }
});

// @route   PATCH /api/complaints/:id/images
// @desc    Update image URLs for before/progress/after/waste proof with GPS geo-tags
// @access  Tree Cutter
router.patch('/:id/images', async (req, res) => {
  try {
    const {
      beforeImageUrl,
      progressImageUrl,
      afterImageUrl,
      wasteProofUrl,
      beforeGps,
      progressGps,
      afterGps,
      status
    } = req.body;

    const updateData = {};
    if (beforeImageUrl !== undefined) {
      updateData.beforeImageUrl = beforeImageUrl;
      updateData.beforeImageStatus = 'Pending';
    }
    if (progressImageUrl !== undefined) {
      updateData.progressImageUrl = progressImageUrl;
      updateData.progressImageStatus = 'Pending';
    }
    if (afterImageUrl !== undefined) {
      updateData.afterImageUrl = afterImageUrl;
      updateData.afterImageStatus = 'Pending';
    }
    if (wasteProofUrl !== undefined) {
      updateData.wasteProofUrl = wasteProofUrl;
      updateData.wasteProofStatus = 'Pending';
    }
    if (beforeGps !== undefined) {
      updateData.beforeGps = beforeGps;
    }
    if (progressGps !== undefined) {
      updateData.progressGps = progressGps;
    }
    if (afterGps !== undefined) {
      updateData.afterGps = afterGps;
    }
    if (status) updateData.status = status;

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }

    // Notify officials that images were submitted for review
    if (beforeImageUrl || progressImageUrl || afterImageUrl || wasteProofUrl) {
      await notify(
        'Official',
        null,
        'work_completed',
        'Proof Images Submitted',
        `Tree cutter has submitted proof images for complaint at ${complaint.location || 'Unknown location'}.`,
        complaint._id.toString()
      );
    }

    res.json({ msg: 'Images updated', complaint });
  } catch (error) {
    console.error('Image update error:', error.message);
    res.status(500).json({ msg: 'Failed to update images', error: error.message });
  }
});

// @route   PATCH /api/complaints/:id/verify-images
// @desc    Official verifies or rejects submitted images
// @access  Official
router.patch('/:id/verify-images', async (req, res) => {
  try {
    const { beforeImageStatus, progressImageStatus, afterImageStatus, wasteProofStatus, officialName } = req.body;

    const updateData = {};
    if (beforeImageStatus) updateData.beforeImageStatus = beforeImageStatus;
    if (progressImageStatus) updateData.progressImageStatus = progressImageStatus;
    if (afterImageStatus) updateData.afterImageStatus = afterImageStatus;
    if (wasteProofStatus) updateData.wasteProofStatus = wasteProofStatus;

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }

    // Notify cutter
    await notify(
      'Tree Cutter',
      null,
      'status_updated',
      'Image Verification Update',
      `Your submitted images for task at ${complaint.location || 'Unknown location'} have been reviewed by ${officialName || 'Official'}.`,
      complaint._id.toString()
    );

    res.json({ msg: 'Image verification updated', complaint });
  } catch (error) {
    console.error('Verify images error:', error.message);
    res.status(500).json({ msg: 'Failed to verify images', error: error.message });
  }
});

const Tree = require('../models/Tree');

// @route   POST /api/complaints/:id/replant
// @desc    Register a newly planted tree to replace a dead tree
// @access  Tree Cutter
router.post('/:id/replant', async (req, res) => {
  try {
    const {
      name, scientificName, family, origin, category, lifespan, height, ageRange,
      canopySpread, description, climate, soilType, sunlight, growthRate, leafType,
      floweringSeason, fruitingSeason, carbonSequestration, notes, healthScore,
      canopyCoverage, waterRequirement, benefits, diseases, pests, lat, lng, image
    } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }

    // 1. Create a new Tree document
    const locationStr = complaint.location ? `${complaint.location}, Udupi` : 'Ajjarkadu Sector, Udupi';
    const treeLat = lat ? parseFloat(lat) : (complaint.locationCoordinates?.lat ? parseFloat(complaint.locationCoordinates.lat) : 13.3409);
    const treeLng = lng ? parseFloat(lng) : (complaint.locationCoordinates?.lng ? parseFloat(complaint.locationCoordinates.lng) : 74.7421);

    const newTree = await Tree.create({
      name: name || 'Indian Beech Sapling',
      scientificName: scientificName || 'Pongamia pinnata',
      family: family || 'Fabaceae',
      origin: origin || locationStr,
      category: category || 'Eco-Restore Replanted Sapling',
      lifespan: lifespan || '100+ years',
      height: height || '0.5 – 1.5 m',
      ageRange: ageRange || 'Young Sapling (0-1 yr)',
      canopySpread: canopySpread || '2 m',
      description: description || `Native sapling (${name || 'Sapling'}) planted under Municipal Eco-Restore initiative replacing a removed dead tree at ${locationStr}.`,
      climate: climate || 'Tropical monsoonal',
      soilType: soilType || 'Loamy soil',
      sunlight: sunlight || 'Full Sun',
      growthRate: growthRate || 'Moderate',
      leafType: leafType || 'Glossy green foliage',
      floweringSeason: floweringSeason || 'Mar – May',
      fruitingSeason: fruitingSeason || 'Jun – Sep',
      carbonSequestration: carbonSequestration || 'Estimated 0.5 tons CO2 annually',
      notes: notes || `Replanted under Eco-Restore for dead tree complaint #${complaint._id} at ${locationStr}. Monitored for initial establishment.`,
      healthScore: healthScore ? parseInt(healthScore) : 100,
      canopyCoverage: canopyCoverage ? parseInt(canopyCoverage) : 20,
      waterRequirement: waterRequirement || 'Medium',
      benefits: Array.isArray(benefits) ? benefits : benefits ? benefits.split(',').map(s => s.trim()) : ['Urban Cooling', 'Carbon Capture', 'Eco-Restore Replacement'],
      diseases: Array.isArray(diseases) ? diseases : diseases ? diseases.split(',').map(s => s.trim()) : [],
      pests: Array.isArray(pests) ? pests : pests ? pests.split(',').map(s => s.trim()) : [],
      lat: treeLat,
      lng: treeLng,
      image: image || complaint.replantedSaplingImage || '',
      addedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });

    // 2. Update the complaint with replanted tree details
    complaint.requiresReplantation = true;
    complaint.replantationStatus = 'Planted';
    complaint.replantedTreeId = newTree._id;
    complaint.replantedSaplingName = newTree.name;
    complaint.replantedScientificName = newTree.scientificName;
    complaint.replantedSaplingImage = newTree.image || image || '';
    complaint.replantedBy = req.body.cutterName || req.body.replantedBy || complaint.assignedTo || 'Tree Cutter';
    complaint.replantedAt = new Date();
    complaint.replantedGps = {
      lat: String(newTree.lat || 13.3409),
      lng: String(newTree.lng || 74.7421),
      capturedAt: new Date(),
    };
    complaint.status = 'Resolved';
    complaint.closedAt = new Date();
    complaint.closedBy = req.body.cutterName || complaint.assignedTo || 'Tree Cutter';
    await complaint.save();

    // 3. Notify Official and Citizen
    await notify(
      'Official',
      null,
      'tree_planted',
      'Sapling Planted Successfully',
      `A new sapling (${newTree.name}) has been planted at ${complaint.location || 'site'} to replace a dead tree.`,
      complaint._id.toString()
    );

    if (complaint.submittedByUserId) {
      await notify(
        null,
        complaint.submittedByUserId,
        'tree_planted',
        'New Sapling Planted!',
        `Good news! A new sapling (${newTree.name}) has been planted at the location of the dead tree you reported.`,
        complaint._id.toString()
      );
    }

    res.status(201).json({ msg: 'Sapling registered and replantation marked complete', tree: newTree, complaint });
  } catch (error) {
    console.error('Replant sapling error:', error.message);
    res.status(500).json({ msg: 'Failed to register replanted tree', error: error.message });
  }
});

module.exports = router;
