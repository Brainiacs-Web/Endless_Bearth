// routes/coupons.js

const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

/**
 * @route   GET /api/coupons
 * @desc    Retrieve a list of all coupons
 * @return  [ { code, type, amount, applicablePlans, expiresAt, createdAt, updatedAt, ... } ]
 */
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return res.json(coupons);
  } catch (err) {
    console.error('Error fetching all coupons:', err);
    return res.status(500).json({ message: 'Server error retrieving coupons.' });
  }
});

/**
 * @route   POST /api/coupons/create
 * @desc    Create a new coupon with configurable fields
 * @body    { code: String, type: 'percentage'|'fixed', amount: Number, applicablePlans: [String], expiresAt: Date|null }
 * @return  { success: Boolean, coupon: Object, message: String }
 */
router.post('/create', async (req, res) => {
  const { code, type, amount, applicablePlans = [], expiresAt = null } = req.body;

  // Basic validation
  if (!code || !type || typeof amount !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'Required fields missing or invalid (code, type, amount).'
    });
  }

  // Normalize inputs
  const normalizedCode = code.toUpperCase().trim();
  const normalizedType = type.toLowerCase().trim();
  const validTypes = ['percentage', 'fixed'];

  if (!validTypes.includes(normalizedType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid type. Must be one of: ${validTypes.join(', ')}.`
    });
  }

  try {
    // Check for existing coupon code
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Coupon code already exists.'
      });
    }

    // Build new coupon document
    const newCoupon = new Coupon({
      code: normalizedCode,
      type: normalizedType,
      amount,
      applicablePlans: Array.isArray(applicablePlans) ? applicablePlans : [],
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await newCoupon.save();

    return res.status(200).json({
      success: true,
      coupon: newCoupon,
      message: `Coupon "${newCoupon.code}" created successfully.`
    });
  } catch (err) {
    console.error('Error in /api/coupons/create:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating coupon.'
    });
  }
});

/**
 * @route   POST /api/coupons/validate
 * @desc    Validate a coupon code for a given plan and amount
 * @body    { couponCode: String, plan: String, amount: Number }
 * @return  { valid: Boolean, originalAmount: Number, discount: Number, discountedAmount: Number, message: String }
 */
router.post('/validate', async (req, res) => {
  const { couponCode, plan, amount } = req.body;

  if (!couponCode) {
    return res.status(400).json({
      valid: false,
      message: 'Coupon code is required.'
    });
  }

  try {
    const code = couponCode.toUpperCase().trim();
    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.status(404).json({
        valid: false,
        message: 'Invalid coupon code.'
      });
    }

    // 1) Expiry check
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({
        valid: false,
        message: 'Coupon has expired.'
      });
    }

    // 2) Plan applicability
    if (
      Array.isArray(coupon.applicablePlans) &&
      coupon.applicablePlans.length > 0 &&
      !coupon.applicablePlans.includes(plan)
    ) {
      return res.status(400).json({
        valid: false,
        message: 'Coupon not applicable to this plan.'
      });
    }

    // 3) Compute discount
    let discountValue = 0;
    if (coupon.type === 'percentage') {
      discountValue = Math.floor(amount * (coupon.amount / 100));
    } else if (coupon.type === 'fixed') {
      discountValue = coupon.amount;
    }

    // Never allow negative final price
    let finalAmount = amount - discountValue;
    if (finalAmount < 0) finalAmount = 0;

    return res.json({
      valid: true,
      originalAmount: amount,
      discount: discountValue,
      discountedAmount: finalAmount,
      message: 'Coupon applied successfully.'
    });
  } catch (err) {
    console.error('Error in /api/coupons/validate:', err);
    return res.status(500).json({
      valid: false,
      message: 'Server error validating coupon.'
    });
  }
});

module.exports = router;
