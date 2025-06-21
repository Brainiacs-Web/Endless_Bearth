// backend/models/LoginHistory.js

const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['login', 'logout'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  location: {
    type: String
  },
  device: {
    type: String
  },
  userAgent: {
    type: String
  }
});

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
