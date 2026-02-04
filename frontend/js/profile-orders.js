document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    // Not logged in - hide order section and show a message
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('noOrders').style.display = 'block';
    document.getElementById('noOrders').innerText = 'Please login to see your order history.';
    return;
  }

  loadOrders(userId);
});

async function loadOrders(userId) {
  const loadingEl = document.getElementById('ordersLoading');
  const historyEl = document.getElementById('orderHistory');
  const noOrdersEl = document.getElementById('noOrders');

  try {
    const res = await fetch(`/api/orders/${userId}`);
    const data = await res.json();
    loadingEl.style.display = 'none';

    if (!data.ok) {
      noOrdersEl.style.display = 'block';
      noOrdersEl.innerText = '';
      return;
    }

    const orders = data.orders || [];
    if (orders.length === 0) {
      noOrdersEl.style.display = 'block';
      return;
    }

    historyEl.style.display = 'block';
    historyEl.innerHTML = '';

    orders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-card';

      const date = new Date(order.createdAt).toLocaleString();

      const statusClass = (s) => {
        switch (s) {
          case 'pending': return 'badge-pending';
          case 'confirmed': return 'badge-confirmed';
          case 'shipped': return 'badge-shipped';
          case 'delivered': return 'badge-delivered';
          case 'cancelled': return 'badge-cancelled';
          default: return 'badge-pending';
        }
      };

      const itemsHtml = order.items.map(i => {
        const p = i.productId || {};
        const name = p.name || 'Item';
        return `<div class="d-flex justify-content-between small"><div>${name} <span class="text-muted">x ${i.quantity}</span></div><div>₹ ${i.price}</div></div>`;
      }).join('');

      card.innerHTML = `
        <div class="order-meta mb-2">
          <div>
            <strong>Order #${order._id}</strong>
            <div class="text-muted small">${date}</div>
          </div>
          <div>
            <span class="badge-status ${statusClass(order.status)}">${order.status}</span>
          </div>
        </div>
        <div class="order-items">
          ${itemsHtml}
        </div>
        <div class="d-flex justify-content-between mt-3 small">
          <div>Subtotal: ₹ ${order.subtotal}</div>
          <div>Total: <strong>₹ ${order.total}</strong></div>
        </div>
      `;

      historyEl.appendChild(card);
    });

    // Expose orders for other dashboard code
    window.profileOrders = orders;

  } catch (err) {
    console.error('Failed to load orders', err);
    loadingEl.style.display = 'none';
    document.getElementById('noOrders').style.display = 'block';
    document.getElementById('noOrders').innerText = 'Failed to load orders.';
  }
}

// Utility for other scripts to fetch (or return cached) orders
window.getProfileOrders = async function() {
  const userId = localStorage.getItem('userId');
  if (!userId) return [];
  if (window.profileOrders) return window.profileOrders;
  try {
    const res = await fetch(`/api/orders/${userId}`);
    const data = await res.json();
    if (data.ok) {
      window.profileOrders = data.orders || [];
      return window.profileOrders;
    }
    return [];
  } catch (e) {
    console.error('getProfileOrders error', e);
    return [];
  }
};