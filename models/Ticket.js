// backend/models/Ticket.js

const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String, // we store the user’s userID string (e.g. "Edu-ABC123XYZ")
    required: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  userPhone: {
    type: String,
    default: ''
  },
  requestType: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  }
}, {
  collection: 'tickets',
  timestamps: true // adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Ticket', ticketSchema);
