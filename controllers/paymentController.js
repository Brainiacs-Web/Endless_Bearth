const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createOrder = async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}`
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ error: 'Order creation failed' });
  }
};

exports.verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    plan,
    amount,
    address
  } = req.body;

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  const planStart = new Date();
  const planEnd = new Date(planStart);
  if (plan === 'basic') {
    planEnd.setMonth(planEnd.getMonth() + 1);
  } else if (plan === 'advanced') {
    planEnd.setFullYear(planEnd.getFullYear() + 1);
  }

  // Update the user’s premium fields
  await User.findByIdAndUpdate(userId, {
    premiumStatus: 'active',
    premiumPlan: plan,
    planStart: planStart,
    planEnd: planEnd
  });

  // Save payment record
  await Payment.create({
    userId,
    plan,
    amount,
    planStartDate: planStart,
    planEndDate: planEnd,
    planStatus: 'Active',
    address
  });

  res.json({ success: true, message: 'Payment verified and saved.' });
};
