const userId = localStorage.getItem('userId');

// Load cart on page load
document.addEventListener('DOMContentLoaded', async () => {
  if (!userId) {
    alert('Please login first');
    window.location.href = '/login.html';
    return;
  }
  await loadCart();
});

async function loadCart() {
  try {
    const response = await fetch(`/api/cart/${userId}`);
    const data = await response.json();
    if (!data.ok) {
      console.error('Failed to load cart:', data.message);
      return;
    }
    displayCart(data.cart.items || []);
  } catch (err) {
    console.error('Error loading cart:', err.message);
  }
}

function displayCart(items) {
  const container = document.querySelector('.cart-items');
  if (!container) {
    console.error('Cart items container not found');
    return;
  }
  
  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<p class="text-center py-5">Your cart is empty</p>';
    updateTotal();
    updateCartCount();
    // Disable checkout and WhatsApp buttons if cart is empty
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Cart is Empty';
    }
    const whatsappBtn = document.getElementById('whatsappCheckoutBtn');
    if (whatsappBtn) {
      whatsappBtn.disabled = true;
    }
    return;
  }
  
  // Enable checkout and WhatsApp buttons
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Proceed to Checkout';
  }
  const whatsappBtn = document.getElementById('whatsappCheckoutBtn');
  if (whatsappBtn) {
    whatsappBtn.disabled = false;
  }
  
  items.forEach(item => {
    const product = item.productId;
    // Skip if product is not populated or doesn't exist
    if (!product || !product._id) {
      console.warn('Product not found for cart item:', item);
      return;
    }
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.dataset.productId = product._id;
    div.innerHTML = `
      <img src="${product.image || '/assets/placeholder.png'}" alt="${product.name}" />
      <div class="item-details">
        <h6>${product.name}</h6>
        <p class="price">₹ ${product.price}</p>
        <div class="quantity">
          <button onclick="changeQty(this, -1)">−</button>
          <span>${item.quantity}</span>
          <button onclick="changeQty(this, 1)">+</button>
        </div>
      </div>
      <button class="remove-btn" onclick="removeItem(this)">
        <i class="bi bi-trash"></i>
      </button>
    `;
    container.appendChild(div);
  });
  updateTotal();
  updateCartCount();
}

async function changeQty(btn, change) {
  const cartItem = btn.closest('.cart-item');
  const productId = cartItem.dataset.productId;
  const qtySpan = btn.parentElement.querySelector("span");
  let qty = parseInt(qtySpan.innerText) + change;
  
  if (qty < 1) {
    // If quantity becomes 0, remove the item
    await removeItem(btn.closest('.cart-item').querySelector('.remove-btn'));
    return;
  }
  
  try {
    const response = await fetch(`/api/cart/${userId}/update/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: qty })
    });
    
    const data = await response.json();
    if (!data.ok) {
      alert('Failed to update quantity: ' + data.message);
      // Reload cart to get correct state
      await loadCart();
      return;
    }
    
    // Update UI
    qtySpan.innerText = qty;
    updateTotal();
    updateCartCount();
  } catch (err) {
    console.error('Error updating quantity:', err);
    alert('Error updating quantity: ' + err.message);
    // Reload cart to get correct state
    await loadCart();
  }
}

async function removeItem(btn) {
  const cartItem = btn.closest('.cart-item');
  const productId = cartItem.dataset.productId;
  
  if (!confirm('Are you sure you want to remove this item from your cart?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/cart/${userId}/remove/${productId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!data.ok) {
      alert('Failed to remove item: ' + data.message);
      return;
    }
    // Reload cart to ensure UI is in sync
    await loadCart();
  } catch (err) {
    console.error('Error removing item:', err);
    alert('Error: ' + err.message);
  }
}

function proceedToCheckout() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    alert('Please login first');
    window.location.href = '/login.html';
    return;
  }
  window.location.href = '/checkout.html';
}

function updateCartCount() {
  const userId = localStorage.getItem('userId');
  if (!userId) return;

  fetch(`/api/cart/${userId}`)
    .then(res => res.json())
    .then(data => {
      if (data.ok && data.cart) {
        const count = data.cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const cartCountEl = document.getElementById('cartCount');
        if (cartCountEl) {
          cartCountEl.textContent = count;
        }
      }
    })
    .catch(err => console.error('Error updating cart count:', err));
}

function updateTotal() {
  let subtotal = 0;

  document.querySelectorAll(".cart-item").forEach(item => {
    const priceText = item.querySelector(".price").innerText.replace("₹", "").replace("$", "");
    const price = parseFloat(priceText);
    const qty = parseInt(item.querySelector(".quantity span").innerText);
    subtotal += price * qty;
  });

  const totalElem = document.getElementById("total");
  const subtotalElem = document.getElementById("subtotal");
  if (subtotalElem) subtotalElem.innerText = "₹ " + subtotal;
  if (totalElem) totalElem.innerText = "₹ " + (subtotal + 50);
}

// Build a WhatsApp message from the cart and open chat with store number
async function sendOrderViaWhatsApp() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    alert('Please login first');
    window.location.href = '/login.html';
    return;
  }

  try {
    const res = await fetch(`/api/cart/${userId}`);
    const data = await res.json();
    if (!data.ok) {
      alert('Failed to load cart: ' + data.message);
      return;
    }

    const items = data.cart.items || [];
    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    // Build message lines
    const lines = [];
    lines.push('Order from Vastra Revival');
    lines.push('');

    items.forEach((item) => {
      const p = item.productId || {};
      const name = p.name || 'Item';
      const qty = item.quantity || 1;
      const price = Number(p.price || 0);
      const subtotal = price * qty;
      lines.push(`${name} x${qty} - ₹${price} (subtotal ₹${subtotal})`);
    });

    const subtotal = items.reduce((s, i) => s + ((i.productId?.price || 0) * i.quantity), 0);
    const delivery = 50;
    const total = subtotal + delivery;

    lines.push('');
    lines.push(`Subtotal: ₹${subtotal}`);
    lines.push(`Delivery: ₹${delivery}`);
    lines.push(`Total: ₹${total}`);

    const customerName = localStorage.getItem('userName');
    const customerPhone = localStorage.getItem('userPhone');
    if (customerName) lines.push('');
    if (customerName) lines.push(`Customer: ${customerName}`);
    if (customerPhone) lines.push(`Contact: ${customerPhone}`);

    lines.push('');
    lines.push('Please confirm availability and payment instructions.');

    const text = encodeURIComponent(lines.join('\n'));

    // Use store WhatsApp number (no leading +)
    const waNumber = '9779824821370';
    const waUrl = `https://wa.me/${waNumber}?text=${text}`;

    window.open(waUrl, '_blank');
  } catch (err) {
    console.error('WhatsApp checkout error:', err);
    alert('Could not initiate WhatsApp checkout.');
  }
}
