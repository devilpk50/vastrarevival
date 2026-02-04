const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');

// Get cart for user
router.get('/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate('items.productId');
    if (!cart) {
      return res.json({ ok: true, cart: { items: [] } });
    }
    res.json({ ok: true, cart });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Add item to cart
router.post('/:userId/add', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ ok: false, message: 'productId and quantity required' });
    }
    let cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      cart = new Cart({ userId: req.params.userId, items: [{ productId, quantity }] });
    } else {
      const existing = cart.items.find(i => i.productId.toString() === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        cart.items.push({ productId, quantity });
      }
    }
    cart.updatedAt = new Date();
    await cart.save();
    const populatedCart = await Cart.findById(cart._id).populate('items.productId');
    res.json({ ok: true, cart: populatedCart });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update item quantity in cart
router.put('/:userId/update/:productId', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ ok: false, message: 'Valid quantity required' });
    }
    const cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      return res.status(404).json({ ok: false, message: 'Cart not found' });
    }
    const item = cart.items.find(i => i.productId.toString() === req.params.productId);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Item not found in cart' });
    }
    item.quantity = quantity;
    cart.updatedAt = new Date();
    await cart.save();
    const updatedCart = await Cart.findById(cart._id).populate('items.productId');
    res.json({ ok: true, cart: updatedCart });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Remove item from cart
router.delete('/:userId/remove/:productId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      return res.status(404).json({ ok: false, message: 'Cart not found' });
    }
    cart.items = cart.items.filter(i => i.productId.toString() !== req.params.productId);
    cart.updatedAt = new Date();
    await cart.save();
    const updatedCart = await Cart.findById(cart._id).populate('items.productId');
    res.json({ ok: true, cart: updatedCart });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
