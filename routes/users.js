// backend/routes/users.js

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const bcrypt  = require('bcryptjs');
const path    = require('path');

const authenticateToken = require('../middleware/auth');
const User             = require('../models/User');
const LoginHistory     = require('../models/LoginHistory');

// ──────────────────────────────────────────────────────────────────────────────
// [NEW] 0) GET USER BY ID: GET /api/users/:id
//       → Retrieves fullName, phone, dateOfBirth (for paymentportal.html)
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('fullName phone dateOfBirth');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('GET /users/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 1) UPDATE PROFILE: PUT /api/users/:id
//    → fullName, email, phone, dateOfBirth, bio, school, examTarget
// ──────────────────────────────────────────────────────────────────────────────
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updates = {
      fullName:    req.body.fullName,
      email:       req.body.email,
      phone:       req.body.phone,
      dateOfBirth: req.body.dateOfBirth || '',
      bio:         req.body.bio || '',
      school:      req.body.school || '',
      examTarget:  req.body.examTarget || '',
      updatedAt:   Date.now()
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: updatedUser });
  } catch (err) {
    console.error('PUT /users/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Multer Disk Storage Configuration (save to backend/public/uploads/)
// ──────────────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // __dirname = backend/routes
    // go up one to backend/, then into public/uploads
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    // e.g. <userId>-<timestamp>.<ext>
    const ext = path.extname(file.originalname);
    const filename = `${req.params.id}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});
const upload = multer({ storage });

// ──────────────────────────────────────────────────────────────────────────────
// 2) UPLOAD PROFILE PICTURE: POST /api/users/:id/photo
//    → Saves file under public/uploads/, then stores public URL in User.photoURL
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  '/:id/photo',
  authenticateToken,
  upload.single('photo'),
  async (req, res) => {
    try {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Multer saved the file to /backend/public/uploads/<filename>
      const publicUrl = `/uploads/${req.file.filename}`;

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { photoURL: publicUrl, updatedAt: Date.now() },
        { new: true, select: '-password' }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ photoURL: updatedUser.photoURL });
    } catch (err) {
      console.error('POST /users/:id/photo error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// 3) REMOVE PROFILE PICTURE: DELETE /api/users/:id/photo
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id/photo', authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Optionally: delete the actual file from public/uploads/<filename>
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $unset: { photoURL: '' }, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Photo removed' });
  } catch (err) {
    console.error('DELETE /users/:id/photo error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 4) RECORD LOGIN/LOGOUT: POST /api/users/:id/login-history
// ──────────────────────────────────────────────────────────────────────────────
router.post('/:id/login-history', authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { action, timestamp, location, device, userAgent } = req.body;
    const record = new LoginHistory({
      user:      req.params.id,
      action,
      timestamp,
      location,
      device,
      userAgent
    });
    await record.save();
    res.json({ message: 'History recorded' });
  } catch (err) {
    console.error('POST /users/:id/login-history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 5) GET LOGIN HISTORY: GET /api/users/:id/login-history
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:id/login-history', authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const history = await LoginHistory
      .find({ user: req.params.id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json({ history });
  } catch (err) {
    console.error('GET /users/:id/login-history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 6) DELETE ACCOUNT: DELETE /api/users/:id
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // 1) Delete all login-history records
    await LoginHistory.deleteMany({ user: req.params.id });

    // 2) Optionally delete actual file from public/uploads/<filename>

    // 3) Delete the user document
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User and associated data deleted' });
  } catch (err) {
    console.error('DELETE /users/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
