const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticate);
router.use(isAdmin);

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalCarts = await Cart.countDocuments();
    
    // Get recent users (limit to 2)
    const recentUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(2);
    
    // Get low stock products (limit to 2)
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
      .sort({ stock: 1 })
      .limit(2);
    
    res.json({
      ok: true,
      stats: {
        totalUsers,
        totalProducts,
        totalCarts,
        lowStockCount: lowStockProducts.length
      },
      recentUsers,
      lowStockProducts
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get single user
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ ok: false, message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    res.json({ ok: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get all products (admin view with more details)
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ ok: true, products });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get single product (admin)
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ ok: false, message: 'Product not found' });
    res.json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Approve a pending product listing (admin)
router.put('/products/:id/approve', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ ok: false, message: 'Product not found' });

    product.status = 'approved';
    product.approvedAt = new Date();

    // If admin wants to adjust stock on approval
    if (req.body && Number.isFinite(Number(req.body.stock))) {
      product.stock = Number(req.body.stock);
    }

    await product.save();
    res.json({ ok: true, message: 'Product approved', product });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get all orders (admin view)
router.get('/orders', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.json({ ok: true, orders });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Confirm an order (change status to 'confirmed')
router.put('/orders/:id/confirm', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });

    // Only allow confirming from pending
    if (order.status !== 'pending') {
      return res.status(400).json({ ok: false, message: 'Only pending orders can be confirmed' });
    }

    order.status = 'confirmed';
    order.updatedAt = new Date();
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('items.productId');

    res.json({ ok: true, message: 'Order confirmed', order: populated });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
