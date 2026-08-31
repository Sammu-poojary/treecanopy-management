const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// @route   POST /api/feedback
// @desc    Submit feedback
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { rating, category, name, email, message } = req.body;

    if (!rating || !message) {
      return res.status(400).json({ msg: 'Rating and message are required.' });
    }

    const feedback = await Feedback.create({ rating, category, name, email, message });

    res.status(201).json({ msg: 'Feedback submitted successfully!', feedback });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ msg: 'Failed to submit feedback. Please try again.' });
  }
});

// @route   GET /api/feedback
// @desc    Get all feedback (admin)
// @access  Public (would be protected in production)
router.get('/', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json({ feedbacks, total: feedbacks.length });
  } catch (error) {
    res.status(500).json({ msg: 'Failed to fetch feedback.' });
  }
});

module.exports = router;
