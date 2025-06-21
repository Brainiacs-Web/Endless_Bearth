// backend/models/User.js 
 
const mongoose = require('mongoose'); 
 
const userSchema = new mongoose.Schema({ 
  userID: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  }, 
  fullName: { 
    type: String, 
    required: true, 
    trim: true 
  }, 
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  }, 
  phone: { 
    type: String, 
    required: function() {
      return !this.googleSignIn; // Phone required only for non-Google sign-ins
    },
    unique: true, 
    trim: true,
    sparse: true // Allows null values for unique index
  }, 
  password: { 
    type: String, 
    required: function() {
      return !this.googleSignIn; // Password required only for non-Google sign-ins
    }
  }, 
  studentClass: { 
    type: String, 
    enum: ['11th', '12th', 'Dropper'], 
    required: true 
  }, 
  exam: { 
    type: String, 
    enum: ['JEE', 'NEET'], 
    required: true 
  }, 
  state: { 
    type: String, 
    required: true, 
    trim: true 
  }, 
  photoURL: { 
    type: String, 
    default: null 
  }, 
  dateOfBirth: { 
    type: String, // or Date if you prefer 
    default: '' 
  }, 
  bio: { 
    type: String, 
    default: '' 
  }, 
  school: { 
    type: String, 
    default: '' 
  }, 
  examTarget: { 
    type: String, // e.g. 'neet' or 'jee' 
    default: '' 
  }, 
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }, 
  googleSignIn: { 
    type: Boolean, 
    default: false 
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values for unique index
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  } 
}, { collection: 'User Data' }); 

// Pre-save middleware to set profile completion status
userSchema.pre('save', function(next) {
  if (this.studentClass && this.exam && this.state) {
    this.isProfileComplete = true;
  }
  next();
});
 
module.exports = mongoose.model('User', userSchema);