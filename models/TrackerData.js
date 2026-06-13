const mongoose = require('mongoose');

const trackerDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  state: { type: Object, default: {} }, // stores your entire app state as JSON
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TrackerData', trackerDataSchema);