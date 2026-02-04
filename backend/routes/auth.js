const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

// Ensure avatars upload directory exists
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

// Multer storage for avatars
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, safe);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Phone helpers
function normalizePhone(p) {
  if (!p) return p;
  let n = p.toString().replace(/[\s\-()]/g, '');
  if (/^\d{10}$/.test(n)) {
    // assume Nepal local number and prefix +977
    n = '+977' + n.replace(/^0+/, '');
  }
  return n;
}
function isValidPhone(p) {
  if (!p) return false;
  const n = normalizePhone(p);
  return (/^\+\d{10,15}$/.test(n));
} 

// Test endpoint to verify database connection (DISABLED FOR PRODUCTION)
// router.get('/test', async (req, res) => {
//   try {
//     const users = await User.find().select('-password');
//     console.log('All users in database:', users);
//     res.json({ ok: true, message: 'Database connection OK', userCount: users.length, users });
//   } catch (err) {
//     console.error('Database error:', err);
//     res.status(500).json({ ok: false, message: 'Database error: ' + err.message });
//   }
// });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: 'Missing required fields' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'Email already registered' });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ ok: false, message: 'Invalid phone number format' });
    }
    const user = new User({ name, email, password, phone: phone ? normalizePhone(phone) : undefined });
    await user.save();
    // console.log('User registered with ID:', user._id);
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, userId: user._id, role: user.role });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Email and password required' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ ok: false, message: 'Invalid email or password' });
    }
    // console.log('User logged in with ID:', user._id);
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, userId: user._id, name: user.name, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get User Profile
router.get('/user/:id', async (req, res) => {
  try {
    // console.log('Getting user profile for ID:', req.params.id);
    const user = await User.findById(req.params.id).select('-password');
    // console.log('Found user:', user);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    res.json({ ok: true, user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update User Profile
router.put('/user/:id', async (req, res) => {
  try {
    const { phone, address, city, zip } = req.body;
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ ok: false, message: 'Invalid phone number format' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { phone: phone ? normalizePhone(phone) : undefined, address, city, zip },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    res.json({ ok: true, message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Upload / Update Avatar
router.post('/user/:id/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    // Quick debug logging to help diagnose uploads. Remove or reduce in production.
    console.log('Avatar upload attempt for user:', req.params.id, 'authPresent:', !!req.headers.authorization, 'contentType:', req.headers['content-type']);
    // Ensure the authenticated user matches the target user
    if (!req.user || req.user._id.toString() !== req.params.id) {
      console.warn('Avatar upload forbidden: authenticated user', req.user && req.user._id, 'does not match param', req.params.id);
      return res.status(403).json({ ok: false, message: 'Forbidden: cannot update another user\'s avatar' });
    }

    if (!req.file) return res.status(400).json({ ok: false, message: 'No file uploaded' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    // Delete previous avatar file if it exists and stored under uploads/avatars
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const prevPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(prevPath)) {
        try { fs.unlinkSync(prevPath); } catch (e) { /* ignore */ }
      }
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarPath;
    await user.save();

    const userSafe = user.toObject();
    delete userSafe.password;

    res.json({ ok: true, message: 'Avatar uploaded', user: userSafe });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
