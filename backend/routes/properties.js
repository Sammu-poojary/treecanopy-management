const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Notification = require('../models/Notification');

// @route   GET /api/properties
// @desc    Get all property inventory items
// @access  Public (filtered in frontend UI)
router.get('/', async (req, res) => {
  try {
    let properties = await Property.find().sort({ createdAt: -1 });
    if (properties.length === 0) {
      const defaultEquipment = [
        {
          name: 'Climbing Safety Rope (100m)',
          description: 'High tensile static climbing rope for arborist tree rigging and safety harness securing.',
          quantity: 6,
          status: 'Available',
          imageUrl: '/uploads/rope.webp',
          addedAt: '24 Jul 2026'
        },
        {
          name: 'Arborist Safety Boots & Gaiters',
          description: 'Steel-toe chainsaw resistant safety boots with non-slip tread soles for wet and rough terrain.',
          quantity: 10,
          status: 'Available',
          imageUrl: '/uploads/shoe.webp',
          addedAt: '24 Jul 2026'
        },
        {
          name: 'Heavy Duty Chainsaw (50cc)',
          description: '50cc petrol engine, 20-inch bar length, safety chain brake for tree felling and heavy limb cutting.',
          quantity: 5,
          status: 'Available',
          imageUrl: '/uploads/1783613351078-820602975.jpg',
          addedAt: '24 Jul 2026'
        },
        {
          name: 'Grass & Brush Cutter',
          description: 'High performance brush cutter with nylon line and 3-tooth metal blade for clearing thick undergrowth.',
          quantity: 8,
          status: 'Available',
          imageUrl: '/uploads/1784866092009-928327193.webp',
          addedAt: '24 Jul 2026'
        },
        {
          name: 'Telescopic Tree Pruner',
          description: 'Extendable pole pruner up to 14ft with sharp lopper blade and saw attachment for high branch trimming.',
          quantity: 6,
          status: 'Available',
          imageUrl: '/uploads/1784866219096-948464288.webp',
          addedAt: '24 Jul 2026'
        }
      ];
      properties = await Property.insertMany(defaultEquipment);
    }
    res.json(properties);
  } catch (err) {
    console.error('Error fetching/seeding properties:', err.message);
    res.status(500).json({ msg: 'Server error fetching properties' });
  }
});

// @route   POST /api/properties
// @desc    Create a new property inventory item
// @access  Admin
router.post('/', async (req, res) => {
  try {
    const { name, description, quantity, status, addedAt, imageUrl } = req.body;
    if (!name) {
      return res.status(400).json({ msg: 'Property name is required' });
    }

    const newProperty = new Property({
      name,
      description,
      quantity: quantity || 1,
      status: status || 'Available',
      addedAt: addedAt || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      imageUrl: imageUrl || ''
    });

    const savedProperty = await newProperty.save();
    res.status(201).json(savedProperty);
  } catch (err) {
    res.status(400).json({ msg: err.message || 'Server error creating property' });
  }
});

// @route   PATCH /api/properties/:id/purchase
// @desc    Tree Cutter purchases or reserves a property item
// @access  Tree Cutter
router.patch('/:id/purchase', async (req, res) => {
  try {
    const { userId, userName } = req.body;
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ msg: 'Property not found' });
    }

    if (property.quantity <= 0) {
      return res.status(400).json({ msg: 'This equipment is out of stock' });
    }

    property.quantity -= 1;
    property.purchaseCount = (property.purchaseCount || 0) + 1;
    property.purchaseRequests = property.purchaseRequests || [];
    property.purchaseRequests.push({
      userId: userId || 'unknown',
      userName: userName || 'Tree Cutter',
      requestedAt: new Date().toISOString()
    });

    if (property.quantity === 0) {
      property.status = 'Assigned';
    }

    await property.save();
    res.json(property);
  } catch (err) {
    res.status(500).json({ msg: 'Server error processing purchase', error: err.message });
  }
});

// @route   PATCH /api/properties/:id/return
// @desc    Tree Cutter returns a property item
// @access  Tree Cutter
router.patch('/:id/return', async (req, res) => {
  try {
    const { userId } = req.body;
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ msg: 'Property not found' });
    }

    const requestIndex = property.purchaseRequests.findIndex(
      r => r.userId === userId
    );

    if (requestIndex === -1) {
      return res.status(400).json({ msg: 'You have not purchased/reserved this equipment' });
    }

    // Remove the purchase request
    property.purchaseRequests.splice(requestIndex, 1);
    
    // Increment quantity
    property.quantity += 1;
    
    if (property.quantity > 0) {
      property.status = 'Available';
    }

    await property.save();
    res.json(property);
  } catch (err) {
    res.status(500).json({ msg: 'Server error processing return', error: err.message });
  }
});

// @route   DELETE /api/properties/:id
// @desc    Delete a property inventory item
// @access  Admin
router.delete('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ msg: 'Property not found' });
    }
    await Property.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error deleting property' });
  }
});

// @route   PATCH /api/properties/:id/status
// @desc    Admin update property status or quantity
// @access  Admin
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, quantity } = req.body;
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ msg: 'Property not found' });
    }
    if (status) property.status = status;
    if (quantity !== undefined) property.quantity = Number(quantity) || 0;
    await property.save();
    res.json({ msg: 'Property status updated successfully', property });
  } catch (err) {
    res.status(500).json({ msg: 'Server error updating status', error: err.message });
  }
});

// @route   POST /api/properties/remind-overdue
// @desc    Send late submit / return reminder to staff holding equipment
// @access  Admin
router.post('/remind-overdue', async (req, res) => {
  try {
    const { userId, userName, propertyId, propertyName } = req.body;
    if (!userName || !propertyName) {
      return res.status(400).json({ msg: 'userName and propertyName are required' });
    }

    const notification = await Notification.create({
      targetUserId: userId || null,
      targetRole: 'Tree Cutter',
      type: 'equipment_reminder',
      title: '⚠️ Action Required: Equipment Return Reminder',
      message: `Dear ${userName}, Municipal Admin reminds you to submit/return "${propertyName}" to the central property inventory. Please check in your equipment session.`,
      relatedId: propertyId || null,
    });

    res.json({ msg: `Late submission reminder sent to ${userName} successfully.`, notification });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to send reminder', error: err.message });
  }
});

// @route   POST /api/properties/remind-all-overdue
// @desc    Send late submit reminder to all staff holding assigned equipment
// @access  Admin
router.post('/remind-all-overdue', async (req, res) => {
  try {
    const properties = await Property.find({ 'purchaseRequests.0': { $exists: true } });
    let count = 0;

    for (const prop of properties) {
      for (const reqItem of (prop.purchaseRequests || [])) {
        await Notification.create({
          targetUserId: reqItem.userId || null,
          targetRole: 'Tree Cutter',
          type: 'equipment_reminder',
          title: '⚠️ Urgent: Overdue Equipment Return Reminder',
          message: `Dear ${reqItem.userName}, you currently hold "${prop.name}". Please return/submit this equipment to the municipal property inventory as soon as possible.`,
          relatedId: prop._id.toString(),
        });
        count++;
      }
    }

    res.json({ msg: `Sent ${count} late return reminders to staff members holding equipment.` });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to send bulk reminders', error: err.message });
  }
});

module.exports = router;
