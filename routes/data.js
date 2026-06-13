const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const TrackerData = require('../models/TrackerData');

// GET user's data (called when app loads)
router.get('/', auth, async (req, res) => {
  try {
    const data = await TrackerData.findOne({ userId: req.userId });
    res.json(data ? data.state : {});
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// SAVE/SYNC user's data (called when state changes)
router.post('/sync', auth, async (req, res) => {
  try {
    await TrackerData.findOneAndUpdate(
      { userId: req.userId },
      { state: req.body, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;