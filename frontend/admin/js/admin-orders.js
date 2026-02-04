// Orders Management

const API_BASE = '/api/admin';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

let allOrders = [];
let currentPage = 1;
const itemsPerPage = 5;
let totalPages = 1;

// Load all orders
async function loadOrders() {
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to load orders');
    }

    const data = await response.json();
    
    if (data.ok && data.orders) {
      allOrders = data.orders;
      // Store original orders for search filtering
      if (typeof window !== 'undefined') {
        window.originalOrders = data.orders;
      }
      currentPage = 1;
      displayOrders();
    } else {
      document.getElementById('ordersTableBody').innerHTML = 
        '<tr><td colspan="6" class="text-center text-danger">Failed to load orders</td></tr>';
      updatePagination();
    }
  } catch (err) {
    console.error('Error loading orders:', err);
    document.getElementById('ordersTableBody').innerHTML = 
      '<tr><td colspan="5" class="text-center text-danger">Error: ' + err.message + '</td></tr>';
    updatePagination();
  }
}

// Display orders in table with pagination
function displayOrders() {
  const tbody = document.getElementById('ordersTableBody');
  
  if (allOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No orders found</td></tr>';
    updatePagination();
    return;
  }

  // Calculate pagination
  totalPages = Math.ceil(allOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = allOrders.slice(startIndex, endIndex);

  tbody.innerHTML = paginatedOrders.map(order => {
    const user = order.userId || {};
    const items = order.items || [];
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const itemsList = items.map(item => {
      const product = item.productId || {};
      return `${escapeHtml(product.name || 'Unknown')} (Qty: ${item.quantity})`;
    }).join(', ');

    const statusBadge = (order.status === 'pending') ? '<span class="badge bg-warning">Pending</span>' : (order.status === 'confirmed' ? '<span class="badge bg-success">Confirmed</span>' : `<span class="badge bg-secondary">${escapeHtml(order.status)}</span>`);
    const confirmBtn = order.status === 'pending' ? `<button class="btn btn-sm btn-success me-2" onclick="confirmOrder('${escapeJs(order._id)}')">Confirm</button>` : '';

    return `
      <tr>
        <td>
          <div>${escapeHtml(user.name || 'Unknown User')}</div>
          <small class="text-muted">${escapeHtml(user.email || 'N/A')}</small>
        </td>
        <td>
          <small>${itemsList || 'No items'}</small>
        </td>
        <td>
          <span class="badge badge-primary">${totalItems}</span>
        </td>
        <td>${new Date(order.createdAt).toLocaleString()}</td>
        <td>${statusBadge}</td>
        <td>
          ${confirmBtn}
          <button class="btn btn-info btn-sm" onclick="viewOrderDetails('${escapeJs(order._id)}')">
            <i class="fas fa-eye"></i> View
          </button>
        </td>
      </tr>
    `;
  }).join('');

  updatePagination();
}

// Update pagination controls
function updatePagination() {
  const paginationContainer = document.getElementById('paginationContainer');
  if (!paginationContainer) return;

  if (allOrders.length === 0) {
    paginationContainer.innerHTML = '';
    return;
  }

  totalPages = Math.ceil(allOrders.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, allOrders.length);

  let paginationHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <span class="text-muted">Showing ${startItem} to ${endItem} of ${allOrders.length} orders</span>
      </div>
      <nav>
        <ul class="pagination mb-0">
  `;

  // Previous button
  paginationHTML += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">Previous</a>
    </li>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      paginationHTML += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
        </li>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      paginationHTML += `
        <li class="page-item disabled">
          <a class="page-link" href="#">...</a>
        </li>
      `;
    }
  }

  // Next button
  paginationHTML += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">Next</a>
    </li>
  `;

  paginationHTML += `
        </ul>
      </nav>
    </div>
  `;

  paginationContainer.innerHTML = paginationHTML;
}

// Navigate to specific page
function goToPage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  displayOrders();
  // Scroll to top of table
  document.querySelector('.card-body').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// View order details (show modal with items and shipping address)
function viewOrderDetails(orderId) {
  try {
    const order = allOrders.find(o => String(o._id) === String(orderId));
    if (!order) {
      alert('Order not found in current list');
      return;
    }

    const user = order.userId || {};
    document.getElementById('od_user').textContent = user.name || 'Unknown';
    document.getElementById('od_email').textContent = user.email || '';
    document.getElementById('od_created').textContent = new Date(order.createdAt).toLocaleString();
    document.getElementById('od_status').innerHTML = (order.status === 'pending') ? '<span class="badge bg-warning">Pending</span>' : (order.status === 'confirmed' ? '<span class="badge bg-success">Confirmed</span>' : `<span class="badge bg-secondary">${order.status}</span>`);

    // Shipping address
    const ship = order.shippingAddress || order.shipping || {};
    const addrParts = [];
    if (ship.name) addrParts.push('<strong>' + escapeHtml(ship.name) + '</strong>');
    if (ship.phone) addrParts.push('Phone: ' + escapeHtml(ship.phone));
    if (ship.address) addrParts.push(escapeHtml(ship.address));
    if (ship.city) addrParts.push(escapeHtml(ship.city));
    if (ship.zip) addrParts.push('Zip: ' + escapeHtml(ship.zip));
    document.getElementById('od_address').innerHTML = addrParts.join(' &middot; ');

    // Items
    const tbody = document.getElementById('od_items');
    tbody.innerHTML = '';
    const items = order.items || [];
    let subtotal = 0;
    for (const it of items) {
      const prod = it.productId || {};
      const price = Number(it.price || prod.price || 0);
      const qty = Number(it.quantity || 0);
      const row = `<tr>
        <td>${escapeHtml(prod.name || 'Unknown')}</td>
        <td>${qty}</td>
        <td>₹ ${price.toFixed(2)}</td>
        <td>₹ ${(price * qty).toFixed(2)}</td>
      </tr>`;
      tbody.insertAdjacentHTML('beforeend', row);
      subtotal += price * qty;
    }

    document.getElementById('od_subtotal').textContent = '₹ ' + (order.subtotal || subtotal).toFixed(2);
    document.getElementById('od_delivery').textContent = '₹ ' + (order.delivery || 0).toFixed(2);
    document.getElementById('od_total').textContent = '₹ ' + (order.total || (subtotal + (order.delivery || 0))).toFixed(2);

    const confirmBtn = document.getElementById('od_confirm_btn');
    if (order.status === 'pending') {
      confirmBtn.style.display = 'inline-block';
      confirmBtn.onclick = async () => {
        if (!confirm('Confirm this order?')) return;
        try {
          const response = await fetch(`/api/admin/orders/${order._id}/confirm`, { method: 'PUT', headers: getAuthHeaders() });
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error((data && data.message) ? data.message : 'Failed to confirm');
          }
          alert('Order confirmed');
          $('#orderDetailsModal').modal('hide');
          refreshOrders();
        } catch (err) {
          console.error('Confirm error:', err);
          alert('Error: ' + err.message);
        }
      };
    } else {
      confirmBtn.style.display = 'none';
      confirmBtn.onclick = null;
    }

    // Show modal
    $('#orderDetailsModal').modal('show');
  } catch (err) {
    console.error('View order error:', err);
    alert('Failed to show order details');
  }
}

// Helper functions for escaping HTML/JS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

// Confirm order (admin)
async function confirmOrder(orderId) {
  if (!confirm('Confirm this order?')) return;
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/confirm`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error((data && data.message) ? data.message : 'Failed to confirm order');
    }
    alert('Order confirmed');
    refreshOrders();
  } catch (err) {
    console.error('Error confirming order:', err);
    alert('Error: ' + err.message);
  }
}

// Refresh orders
function refreshOrders() {
  loadOrders();
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
  window.location.href = '/login.html';
}

// Load orders on page load
document.addEventListener('DOMContentLoaded', () => {
  const userName = localStorage.getItem('userName');
  if (userName) {
    const adminNameEl = document.getElementById('adminUserNameTopbar');
    if (adminNameEl) {
      adminNameEl.textContent = userName;
    }
  }
  loadOrders();
});
