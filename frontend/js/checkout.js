const userId = localStorage.getItem('userId');

// Phone helpers: normalize 10-digit Nepali numbers to +977
function normalizePhone(p) {
  if (!p) return p;
  let n = p.toString().replace(/[\s\-()]/g, '');
  if (/^\d{10}$/.test(n)) {
    n = '+977' + n.replace(/^0+/, '');
  }
  return n;
}

// Load cart on page load
document.addEventListener('DOMContentLoaded', async () => {
  if (!userId) {
    alert('Please login first');
    window.location.href = '/login.html';
    return;
  }

  const phoneInput = document.getElementById('phone');
  const phoneHelp = document.getElementById('phoneHelp');

  // Auto-fill profile fields if available
  async function getUserProfile() {
    try {
      const resp = await fetch(`/api/auth/user/${userId}`);
      const data = await resp.json();
      if (data.ok && data.user) {
        const u = data.user;
        if (u.name) document.getElementById('name').value = u.name;
        if (u.phone && phoneInput) {
          phoneInput.value = u.phone;
          if (phoneHelp) { phoneHelp.textContent = `Auto-filled from profile: ${u.phone}`; phoneHelp.style.color = 'green'; }
        }
        if (u.address) document.getElementById('address').value = u.address;
        if (u.city) document.getElementById('city').value = u.city;
        if (u.zip) document.getElementById('zip').value = u.zip;
      }
    } catch (err) {
      console.warn('Failed to auto-fill profile:', err);
    }
  }

  await getUserProfile();
  await loadCartForCheckout();

  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      const raw = this.value.replace(/[\s\-()]/g, '');
      const local10 = /^\d{10}$/.test(raw);
      const ok = /^\+\d{10,15}$/.test(raw) || local10;
      if (phoneHelp) {
        if (local10) phoneHelp.textContent = `Will be saved as +977${raw.replace(/^0+/, '')}`;
        else phoneHelp.textContent = ok ? 'Phone looks good' : 'Enter 10-digit Nepali number or include +977 country code';
        phoneHelp.style.color = ok ? 'green' : '';
      }
      this.classList.toggle('is-invalid', !ok && raw.length > 0);
    });
  }
});

function selectPayment(method) {
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');
  document.getElementById(method).checked = true;
}

async function loadCartForCheckout() {
  try {
    const response = await fetch(`/api/cart/${userId}`);
    const data = await response.json();
    if (!data.ok) {
      alert('Failed to load cart: ' + data.message);
      window.location.href = '/cart.html';
      return;
    }

    const items = data.cart.items || [];
    if (items.length === 0) {
      alert('Your cart is empty');
      window.location.href = '/cart.html';
      return;
    }

    displayOrderSummary(items);
  } catch (err) {
    console.error('Error loading cart:', err);
    alert('Error loading cart: ' + err.message);
    window.location.href = '/cart.html';
  }
}

function displayOrderSummary(items) {
  const container = document.getElementById('orderItems');
  let subtotal = 0;

  container.innerHTML = items.map(item => {
    const product = item.productId;
    if (!product || !product._id) {
      return '';
    }
    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="order-summary-item">
        <div>
          <strong>${product.name}</strong>
          <br>
          <small class="text-muted">Qty: ${item.quantity} × ₹${product.price}</small>
        </div>
        <span>₹ ${itemTotal}</span>
      </div>
    `;
  }).join('');

  const delivery = 50;
  const total = subtotal + delivery;

  document.getElementById('checkoutSubtotal').textContent = `₹ ${subtotal}`;
  document.getElementById('checkoutDelivery').textContent = `₹ ${delivery}`;
  document.getElementById('checkoutTotal').textContent = `₹ ${total}`;
}

async function placeOrder() {
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  const city = document.getElementById('city').value.trim();
  const zip = document.getElementById('zip').value.trim();

  // Validation
  if (!name || !phone || !address || !city || !zip) {
    alert('Please fill in all shipping address fields');
    return;
  }

  // Phone validation and normalization (auto-prefix +977 for 10-digit numbers)
  const phoneNormalized = normalizePhone(phone);
  const e164Pattern = /^\+\d{10,15}$/;
  if (!e164Pattern.test(phoneNormalized)) {
    alert('Please enter a valid phone number (10-digit Nepali number will be saved as +977...)');
    return;
  }

  const shippingAddress = { name, phone: phoneNormalized, address, city, zip };

  // Disable button to prevent double submission
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Placing Order...';

  try {
    const response = await fetch(`/api/orders/${userId}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingAddress })
    });

    const data = await response.json();

    if (!data.ok) {
      alert('Failed to place order: ' + data.message);
      btn.disabled = false;
      btn.textContent = 'Place Order';
      return;
    }

    // Order placed successfully
    const orderId = data.order._id;

    const proceedWhatsapp = confirm('Order placed successfully! Would you like to send a WhatsApp confirmation now?');
    if (proceedWhatsapp) {
      try {
        const token = localStorage.getItem('token');
        let resp;
        try {
          resp = await fetch(`/api/orders/${userId}/${orderId}/whatsapp`, {
            method: 'POST',
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
          });
        } catch (networkErr) {
          console.error('Network error when calling WhatsApp endpoint:', networkErr);
          alert('Network error sending WhatsApp confirmation: ' + networkErr.message);
          throw networkErr;
        }

        // Safely read response body as text then try JSON.parse (avoids 'body stream already read' errors)
        let result;
        let raw = '';
        try {
          raw = await resp.text();
        } catch (readErr) {
          console.warn('Failed to read WhatsApp response body:', readErr);
        }
        try {
          result = raw ? JSON.parse(raw) : { ok: resp.ok };
        } catch (parseErr) {
          console.warn('WhatsApp response not JSON, raw:', raw);
          result = { ok: resp.ok, message: raw, raw };
        }

        if (resp.ok && result.sent) {
          alert('WhatsApp confirmation sent!');
        } else if (resp.status === 501 && result.whatsappText) {
          // fallback: open WhatsApp web/mobile with prefilled message
          const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(result.whatsappText)}`;
          window.open(waUrl, '_blank');
        } else if (!resp.ok && result.message) {
          alert('Could not send WhatsApp confirmation: ' + result.message);
        } else {
          alert('Could not send WhatsApp confirmation: unknown error' + (result.raw ? '\n' + result.raw : ''));
        }
      } catch (err) {
        console.error('WhatsApp send error:', err);
        alert('Error sending WhatsApp confirmation: ' + err.message);
      }
    } else {
      alert('Order placed successfully! Order ID: ' + orderId);
    }

    window.location.href = '/index.html';
  } catch (err) {
    console.error('Error placing order:', err);
    alert('Error placing order: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}
