// routes/payment.js

const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const moment = require('moment');

router.get('/status/:userId', async (req, res) => {
  try {
    const payment = await Payment.findOne({ userId: req.params.userId }).sort({ createdAt: -1 });

    if (!payment) {
      return res.json({ active: false });
    }

    const now = new Date();
    const daysLeft = Math.ceil((payment.planEndDate - now) / (1000 * 60 * 60 * 24));

    res.json({
      active: payment.planStatus === 'Active',
      plan: payment.plan,
      daysLeft,
      features: payment.plan === 'basic' ? ['Access to course materials', 'Email support'] : ['All basic features', '1-on-1 mentorship', 'Premium resources'],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
