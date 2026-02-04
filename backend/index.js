// require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { connectDB } = require('./db/connection');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS – allow frontend (static files or different origin)
app.use(cors({ origin: true, credentials: true }));
// Increase body parser limit to handle base64 images (10MB limit)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes (must come before static file serving)
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// Health check (must come before catch-all routes)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Vastra Revival API' });
});

// Serve uploaded product images
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Serve frontend static files from project frontend/ so pages and API share same origin
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// Catch-all route for non-API paths (SPA fallback)
app.get('*', (req, res, next) => {
  // Don't serve static files for API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ ok: false, message: 'API endpoint not found' });
  }
  const filePath = path.join(frontendDir, req.path === '/' ? 'index.html' : req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      // File not found, return index.html for SPA
      res.sendFile(path.join(frontendDir, 'index.html'), (err2) => {
        if (err2) res.status(404).json({ ok: false, message: 'Not found' });
      });
    }
  });
});

// Error handling middleware (must be last, after all routes)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle payload too large error specifically
  if (err.type === 'entity.too.large' || err.message.includes('too large')) {
    return res.status(413).json({
      ok: false,
      message: 'Image file is too large. Please use an image smaller than 5MB.'
    });
  }
  
  // If it's an API route, return JSON
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({
      ok: false,
      message: err.message || 'Internal server error'
    });
  }
  
  // For non-API routes, you could render an error page or return JSON
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Internal server error'
  });
});

// Start server after DB connection (if provided)
const start = async () => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
  try {
    await connectDB(process.env.MONGODB_URI);
  } catch (err) {
    console.warn('Continuing without MongoDB connection.');
  }
};

start();
