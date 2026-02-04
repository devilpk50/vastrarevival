const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  image: { type: String },
  category: { type: String },
  stock: { type: Number, default: 0 },
  // Approval workflow (user-submitted listings start as pending)
  status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved', index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sellerName: { type: String },
  condition: { type: String },
  approvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Product', productSchema);
