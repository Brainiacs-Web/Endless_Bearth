// models/Coupon.js

const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    // If type === 'percentage', this is % off (e.g. 10 → 10%).
    // If type === 'fixed', this is a fixed-rupee discount (e.g. 100 → ₹100 off).
  },
  applicablePlans: {
    type: [String],
    default: []
    // Example: ['basic', 'advanced']. If empty array, assume coupon applies to all plans.
  },
  expiresAt: {
    type: Date,
    default: null
    // If null or missing → no expiry. Otherwise, coupon is invalid after this date.
  }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);
