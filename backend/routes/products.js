const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticate, isAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function tryGetUserFromAuthHeader(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.headers.authorization;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    return user || null;
  } catch {
    return null;
  }
}

// Get all products
router.get('/', async (req, res) => {
  try {
    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        ok: false, 
        message: 'Database connection unavailable. Please try again later.',
        products: [] 
      });
    }

    // Public catalog should only show approved products
    // Treat older products (missing status) as approved
    // Use aggregation pipeline to support allowDiskUse for large datasets
    const products = await Product.aggregate([
      {
        $match: {
          $or: [{ status: 'approved' }, { status: { $exists: false } }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 100 // Limit results to prevent memory issues
      }
    ], { allowDiskUse: true });
    
    // Ensure products is an array
    const productsArray = Array.isArray(products) ? products : [];
    
    console.log(`[GET /api/products] Returning ${productsArray.length} products`);
    
    res.json({ ok: true, products: productsArray });
  } catch (err) {
    console.error('[GET /api/products] Error:', err);
    
    // Check if it's a connection error
    if (err.message && (err.message.includes('ETIMEDOUT') || err.message.includes('connection'))) {
      return res.status(503).json({ 
        ok: false, 
        message: 'Database connection unavailable. Please try again later.',
        products: [] 
      });
    }
    
    res.status(500).json({ ok: false, message: err.message, products: [] });
  }
});

// Create product listing from user (requires login, goes to admin approval)
router.post('/sell', authenticate, async (req, res) => {
  try {
    const { name, description, price, image, category, condition, stock } = req.body;
    if (!name || !price) {
      return res.status(400).json({ ok: false, message: 'Name and price required' });
    }
    
    // Validate stock - must be a positive integer
    const stockValue = stock ? parseInt(stock) : 1;
    if (isNaN(stockValue) || stockValue < 1) {
      return res.status(400).json({ ok: false, message: 'Stock must be a positive number' });
    }

    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        ok: false, 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    const product = new Product({
      name,
      description,
      price,
      image,
      category,
      condition,
      stock: stockValue,
      status: 'pending',
      sellerId: req.user._id,
      sellerName: req.user.name
    });
    await product.save();

    res.json({
      ok: true,
      message: 'Listing submitted for admin approval',
      productId: product._id
    });
  } catch (err) {
    console.error('Error creating product:', err);
    // Always return JSON, even on error
    const errorMessage = err.message || 'Failed to create product listing';
    return res.status(500).json({ ok: false, message: errorMessage });
  }
});

// Get user's sell items (accepted/pending)
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Verify that the user is requesting their own products
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }
    
    // Use req.user._id directly (it's already an ObjectId from authentication)
    // Also try querying with string version for compatibility
    const sellerIdObjectId = req.user._id;
    
    // Get products where sellerId matches and status is accepted or pending
    // Try both ObjectId and string comparison
    const products = await Product.find({
      $or: [
        { sellerId: sellerIdObjectId },
        { sellerId: sellerIdObjectId.toString() }
      ],
      status: { $in: ['approved', 'pending'] }
    }).sort({ createdAt: -1 });
    
    res.json({ ok: true, products });
  } catch (err) {
    console.error('Error fetching user products:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        ok: false, 
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    const productId = req.params.id;
    console.log(`[GET /api/products/${productId}] Fetching product`);
    
    const product = await Product.findById(productId);
    if (!product) {
      console.log(`[GET /api/products/${productId}] Product not found`);
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }

    const status = product.status || 'approved';
    // Hide non-approved products from public, allow admin with token
    if (status !== 'approved') {
      const user = await tryGetUserFromAuthHeader(req);
      if (!user || user.role !== 'admin') {
        return res.status(404).json({ ok: false, message: 'Product not found' });
      }
    }
    
    console.log(`[GET /api/products/${productId}] Returning product: ${product.name}`);
    res.json({ ok: true, product });
  } catch (err) {
    console.error(`[GET /api/products/${req.params.id}] Error:`, err);
    
    // Check if it's a connection error
    if (err.message && (err.message.includes('ETIMEDOUT') || err.message.includes('connection'))) {
      return res.status(503).json({ 
        ok: false, 
        message: 'Database connection unavailable. Please try again later.'
      });
    }
    
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Create product (admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body;
    if (!name || !price) {
      return res.status(400).json({ ok: false, message: 'Name and price required' });
    }
    const product = new Product({ name, description, price, image, category, stock, status: 'approved', approvedAt: new Date() });
    await product.save();
    res.json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update product (admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, price, image, category, stock },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }
    res.json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }
    res.json({ ok: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Seed sample products (for development only - admin only)
router.post('/seed/samples', authenticate, isAdmin, async (req, res) => {
  try {
    const sampleProducts = [
      {
        name: 'Kurta Set',
        description: 'Beautiful traditional kurta set for men',
        price: 899,
        category: 'Men',
        stock: 10,
        image: 'https://dummyimage.com/300x350/ccc/000'
      },
      {
        name: 'Saree',
        description: 'Elegant cotton saree with traditional design',
        price: 1299,
        category: 'Women',
        stock: 8,
        image: 'https://dummyimage.com/300x350/bbb/000'
      },
      {
        name: 'Jacket',
        description: 'Stylish denim jacket for casual wear',
        price: 1599,
        category: 'Unisex',
        stock: 15,
        image: 'https://dummyimage.com/300x350/aaa/000'
      },
      {
        name: 'Shirt',
        description: 'Classic cotton shirt for everyday wear',
        price: 699,
        category: 'Men',
        stock: 20,
        image: 'https://dummyimage.com/300x350/999/000'
      },
      {
        name: 'Dress',
        description: 'Beautiful printed dress for women',
        price: 1199,
        category: 'Women',
        stock: 12,
        image: 'https://dummyimage.com/300x350/888/000'
      },
      {
        name: 'T-Shirt',
        description: 'Comfortable cotton t-shirt',
        price: 499,
        category: 'Unisex',
        stock: 30,
        image: 'https://dummyimage.com/300x350/777/000'
      }
    ];

    // Clear existing products
    await Product.deleteMany({});

    // Insert sample products
    const created = await Product.insertMany(sampleProducts);
    res.json({ ok: true, message: `${created.length} products created`, products: created });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
