const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['basic', 'advanced'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  planStartDate: {
    type: Date,
    required: true
  },
  planEndDate: {
    type: Date,
    required: true
  },
  planStatus: {
    type: String,
    enum: ['Active', 'Not Active'],
    default: 'Active'
  },
  address: {
    line1: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
