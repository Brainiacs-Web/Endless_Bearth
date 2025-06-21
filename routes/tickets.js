// backend/routes/tickets.js

const express     = require('express');
const router      = express.Router();
const verifyToken = require('../middleware/auth'); // your JWT middleware
const Ticket      = require('../models/Ticket');

/**
 * POST /api/tickets
 * Creates a new support ticket.
 * Request body must include:
 *   { ticketId, userId, userName, userEmail, userPhone, requestType, subject, message, status }
 * Requires: Authorization: Bearer <token>
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      ticketId,
      userId,
      userName,
      userEmail,
      userPhone = '',
      requestType,
      subject,
      message,
      status = 'pending'
    } = req.body;

    // Basic validation (all fields except userPhone are required)
    if (
      !ticketId?.trim() ||
      !userId?.trim()   ||
      !userName?.trim() ||
      !userEmail?.trim()||
      !requestType?.trim() ||
      !subject?.trim()  ||
      !message?.trim()
    ) {
      return res.status(400).json({ message: 'All fields except userPhone are required.' });
    }

    // Enforce that the token’s userID matches the posted userId
    // (Assumes verifyToken sets req.user.id to the user’s Mongo _id, but we stored user.userID in currentUserData.id.)
    // If you want to strictly verify identity, you must check using email or Mongo _id.
    // For now, we assume that any valid token implies the same user. Alternatively, compare req.user.email === userEmail, etc.

    // Create & save the ticket
    const newTicket = new Ticket({
      ticketId,
      userId,
      userName,
      userEmail,
      userPhone,
      requestType,
      subject,
      message,
      status
    });

    const saved = await newTicket.save();
    return res.status(201).json({ ticket: saved });
  } catch (err) {
    console.error('Error in POST /api/tickets:', err);
    if (err.code === 11000 && err.keyValue?.ticketId) {
      return res.status(400).json({ message: 'Ticket ID already exists. Please try again.' });
    }
    return res.status(500).json({ message: 'Server error while creating ticket.' });
  }
});

/**
 * GET /api/tickets/user/:userId
 * Retrieves all tickets for a given userID (string).
 * Requires: Authorization: Bearer <token>
 */
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'userId param is required.' });
    }

    // Retrieve tickets sorted by newest first
    const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 });
    return res.json({ tickets });
  } catch (err) {
    console.error('Error in GET /api/tickets/user/:userId:', err);
    return res.status(500).json({ message: 'Server error while fetching tickets.' });
  }
});

module.exports = router;
