// routes/questions.js (or wherever your API routes are)
const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

// Route to get distinct chapters by exam and subject
router.get('/chapters', async (req, res) => {
  const { exam, subject } = req.query;
  if (!exam || !subject) {
    return res.status(400).json({ error: 'Missing exam or subject parameter' });
  }

  try {
    // Find distinct chapters that match exam and subject
    const chapters = await Question.distinct('chapter', { exam, subject });
    res.json(chapters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route to get questions filtered by exam, subject, and chapter
router.get('/', async (req, res) => {
  const { exam, subject, chapter } = req.query;
  if (!exam || !subject || !chapter) {
    return res.status(400).json({ error: 'Missing query parameters' });
  }

  try {
    const questions = await Question.find({ exam, subject, chapter });
    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
