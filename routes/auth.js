// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const router = express.Router();

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: Generate a random 9-character uppercase-alphanumeric string,
// prefix with "Edu-", and ensure uniqueness in the database.
async function generateUniqueUserID() {
  const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  while (true) {
    let randomPart = '';
    for (let i = 0; i < 9; i++) {
      randomPart += ALPHANUM.charAt(Math.floor(Math.random() * ALPHANUM.length));
    }
    const candidate = 'Edu-' + randomPart;

    // Check uniqueness
    const existing = await User.findOne({ userID: candidate });
    if (!existing) return candidate;
  }
}

// Helper: Generate JWT with user ID payload
function generateToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

// Regular Email Registration
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, studentClass, exam, state } = req.body;

    // Validate required fields
    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !password ||
      !studentClass ||
      !exam ||
      !state?.trim()
    ) {
      return res.status(400).json({ message: 'All fields (including phone & state) are required.' });
    }

    // Normalize inputs
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();

    // Check if email or phone exists already
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(400).json({ message: 'Email already registered; please log in instead.' });
      }
      if (existingUser.phone === normalizedPhone) {
        return res.status(400).json({ message: 'Phone number already registered; please log in instead.' });
      }
    }

    // Generate unique userID
    const userID = await generateUniqueUserID();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      userID,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      studentClass,
      exam,
      state: state.trim(),
      googleSignIn: false,
      isProfileComplete: true
    });

    await newUser.save();

    // Issue JWT
    const token = generateToken(newUser._id);

    res.json({
      token,
      user: {
        userID: newUser.userID,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        studentClass: newUser.studentClass,
        exam: newUser.exam,
        state: newUser.state
      }
    });
  } catch (err) {
    console.error('Registration error:', err);

    // Handle duplicate-key error 11000 for unique fields
    if (err.code === 11000) {
      if (err.keyValue?.email) {
        return res.status(400).json({ message: 'Email already registered; please log in instead.' });
      }
      if (err.keyValue?.userID) {
        return res.status(500).json({ message: 'Could not generate a unique userID; please try again.' });
      }
    }

    // TEMPORARY: return the real error message for debugging
    return res.status(500).json({ message: err.message || 'Unknown server error' });
  }
});

// Regular Email Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    // Check if user signed up with Google
    if (user.googleSignIn && !user.password) {
      return res.status(400).json({ 
        message: 'This account was created with Google. Please use Google Sign-In.' 
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    // Generate JWT
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        userID: user.userID,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        studentClass: user.studentClass,
        exam: user.exam,
        state: user.state
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Google Sign-In
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [{ email: normalizedEmail }, { googleId }] 
    });

    if (user) {
      // User exists - login
      const token = generateToken(user._id);

      return res.json({
        token,
        user: {
          userID: user.userID,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone || null,
          studentClass: user.studentClass,
          exam: user.exam,
          state: user.state,
          isProfileComplete: user.isProfileComplete
        },
        needsProfileCompletion: !user.isProfileComplete
      });
    } else {
      // New user - create account but mark as incomplete
      const userID = await generateUniqueUserID();

      user = new User({
        userID,
        fullName: name,
        email: normalizedEmail,
        googleId,
        photoURL: picture,
        googleSignIn: true,
        isProfileComplete: false,
        // Required fields will be filled in profile completion
        studentClass: '11th', // Temporary default
        exam: 'JEE', // Temporary default
        state: 'Maharashtra' // Temporary default
      });

      await user.save();

      const token = generateToken(user._id);

      return res.status(201).json({
        token,
        user: {
          userID: user.userID,
          fullName: user.fullName,
          email: user.email,
          isProfileComplete: user.isProfileComplete
        },
        needsProfileCompletion: true
      });
    }

  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ message: 'Google sign-in failed' });
  }
});

// Complete Google User Profile
router.post('/complete-profile', async (req, res) => {
  try {
    const { token, studentClass, exam, state, phone } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if phone number is already taken (if provided)
    if (phone?.trim()) {
      const normalizedPhone = phone.trim();
      const existingPhone = await User.findOne({ 
        phone: normalizedPhone, 
        _id: { $ne: user._id } 
      });
      if (existingPhone) {
        return res.status(400).json({ message: 'Phone number already registered; please use another one.' });
      }
      user.phone = normalizedPhone;
    }

    // Update profile
    user.studentClass = studentClass;
    user.exam = exam;
    user.state = state.trim();
    user.isProfileComplete = true;
    user.updatedAt = new Date();

    await user.save();

    res.json({
      user: {
        userID: user.userID,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        studentClass: user.studentClass,
        exam: user.exam,
        state: user.state,
        isProfileComplete: user.isProfileComplete
      }
    });

  } catch (error) {
    console.error('Profile completion error:', error);
    res.status(500).json({ message: 'Failed to complete profile' });
  }
});

// Middleware for authentication
const authenticateToken = require('../middleware/auth');

// GET /api/auth/user
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (req.user.id !== userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'All fields required.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user is Google user without password
    if (user.googleSignIn && !user.password) {
      return res.status(400).json({ message: 'Cannot change password for Google accounts' });
    }

    // Check old password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password too short' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.updatedAt = Date.now();
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change-password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;