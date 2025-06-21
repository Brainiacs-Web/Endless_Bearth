// backend/routes/contacts.js

const express = require('express');
const Contact = require('../models/Contact'); // ← ensure models/Contact.js exists

const router  = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contacts
//   • Body: { name, email, phone, subject, message }
//   • Validates presence of all fields and saves in "contacts" collection.
//   • Returns { message: 'Contact saved' } on success.
// ──────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  // 1) Basic validation
  if (
    !name?.trim() ||
    !email?.trim() ||
    !phone?.trim() ||
    !subject?.trim() ||
    !message?.trim()
  ) {
    return res.status(400).json({ message: 'All contact fields are required.' });
  }

  try {
    // 2) Create & save the new contact
    const newContact = new Contact({
      name:    name.trim(),
      email:   email.toLowerCase().trim(),
      phone:   phone.trim(),
      subject: subject.trim(),
      message: message.trim()
    });
    await newContact.save();

    res.json({ message: 'Contact saved' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
