const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { authenticate } = require('../middleware/auth');

// Phone helpers (normalize local Nepali 10-digit numbers to +977)
function normalizePhone(p) {
  if (!p) return null;
  let n = p.toString().replace(/[\s\-()]/g, '');
  if (/^\d{10}$/.test(n)) {
    n = '+977' + n.replace(/^0+/, '');
  }
  return n;
}
function isValidE164(p) {
  return !!p && /^\+\d{10,15}$/.test(p);
} 

// Create order from cart
router.post('/:userId/create', async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || 
        !shippingAddress.address || !shippingAddress.city || !shippingAddress.zip) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Shipping address with all fields (name, phone, address, city, zip) is required' 
      });
    }

    // Get user's cart
    const cart = await Cart.findOne({ userId: req.params.userId }).populate('items.productId');
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ ok: false, message: 'Cart is empty' });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = cart.items.map(item => {
      const product = item.productId;
      if (!product) {
        throw new Error('Product not found');
      }
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      return {
        productId: product._id,
        quantity: item.quantity,
        price: product.price
      };
    });

    const delivery = 50;
    const total = subtotal + delivery;

    // Create order
    const order = new Order({
      userId: req.params.userId,
      items: orderItems,
      subtotal,
      delivery,
      total,
      paymentMethod: 'cash_on_delivery',
      status: 'pending',
      shippingAddress
    });

    await order.save();

    // Clear cart after order creation
    cart.items = [];
    cart.updatedAt = new Date();
    await cart.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('items.productId');

    res.json({ ok: true, order: populatedOrder });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get user's orders
router.get('/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.json({ ok: true, orders });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get single order
router.get('/:userId/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      userId: req.params.userId 
    })
      .populate('items.productId')
      .populate('userId', 'name email');
    
    if (!order) {
      return res.status(404).json({ ok: false, message: 'Order not found' });
    }
    
    res.json({ ok: true, order });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Send WhatsApp confirmation (uses Twilio if configured). Requires authentication.
router.post('/:userId/:orderId/whatsapp', authenticate, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    const order = await Order.findOne({ _id: req.params.orderId, userId: req.params.userId })
      .populate('items.productId')
      .populate('userId', 'name email');

    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });

    // Prefer the user's registered phone; fallback to shipping address phone
    let phone = req.user?.phone || order.shippingAddress?.phone;
    if (!phone) return res.status(400).json({ ok:false, message: 'No phone number available to send WhatsApp confirmation' });

    const phoneNormalized = normalizePhone(phone);
    if (!isValidE164(phoneNormalized)) return res.status(400).json({ ok:false, message: 'Phone number is not in a valid international format (expected E.164). Please update your phone number in profile.' });
    phone = phoneNormalized;

    const itemsText = order.items.map(i => `${i.quantity} x ${i.productId.name} @ ₹${i.price}`).join('\n');
    const msg = `Order Confirmation\nOrder ID: ${order._id}\nTotal: ₹${order.total}\n\nItems:\n${itemsText}\n\nShipping to: ${order.shippingAddress.name}, ${order.shippingAddress.address}, ${order.shippingAddress.city} ${order.shippingAddress.zip}\nPhone: ${phone}\n\nThank you for your order!`;

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (sid && token && from) {
      try {
        const twilio = require('twilio')(sid, token);
        const resp = await twilio.messages.create({
          from: `whatsapp:${from}`,
          to: `whatsapp:${phone}`,
          body: msg
        });
        return res.json({ ok: true, sent: true, sid: resp.sid });
      } catch (err) {
        return res.status(500).json({ ok: false, message: 'Failed to send via Twilio: ' + err.message });
      }
    }

    // Not configured - return prepared message for client-side click-to-chat fallback
    res.status(501).json({ ok: false, message: 'Server-side WhatsApp not configured', whatsappText: msg });
  } catch (err) {
    res.status(500).json({ ok:false, message: err.message });
  }
});

module.exports = router;
