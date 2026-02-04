// Admin Dashboard - Fetch and display real statistics

const API_BASE = '/api/admin';
let dashboardData = null;

// Get auth token
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Fetch dashboard statistics
async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        alert('Access denied. Please login as admin.');
        window.location.href = '/login.html';
        return;
      }
      throw new Error('Failed to load dashboard data');
    }

    const data = await response.json();
    
    if (data.ok) {
      dashboardData = data;
      updateDashboardCards(data.stats);
      updateRecentUsers(data.recentUsers);
      updateLowStockProducts(data.lowStockProducts);
    } else {
      console.error('Dashboard error:', data.message);
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
    alert('Error loading dashboard: ' + err.message);
  }
}

// Update dashboard stat cards
function updateDashboardCards(stats) {
  // Total Users
  const totalUsersEl = document.getElementById('totalUsers');
  if (totalUsersEl) {
    totalUsersEl.textContent = stats.totalUsers || 0;
  }

  // Total Products
  const totalProductsEl = document.getElementById('totalProducts');
  if (totalProductsEl) {
    totalProductsEl.textContent = stats.totalProducts || 0;
  }

  // Total Orders/Carts
  const totalOrdersEl = document.getElementById('totalOrders');
  if (totalOrdersEl) {
    totalOrdersEl.textContent = stats.totalCarts || 0;
  }

  // Low Stock Products
  const lowStockEl = document.getElementById('lowStockCount');
  if (lowStockEl) {
    lowStockEl.textContent = stats.lowStockCount || 0;
  }
}

// Update recent users section (show only 2)
function updateRecentUsers(users) {
  const container = document.getElementById('recentUsersList');
  if (!container || !users) return;

  if (users.length === 0) {
    container.innerHTML = '<p class="text-muted">No recent users</p>';
    return;
  }

  // Limit to 2 users
  const displayUsers = users.slice(0, 2);

  container.innerHTML = displayUsers.map(user => `
    <div class="d-flex align-items-center mb-3">
      <div class="mr-3">
        <div class="rounded-circle bg-primary d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
          <i class="fas fa-user text-white"></i>
        </div>
      </div>
      <div class="flex-grow-1">
        <div class="small font-weight-bold">${escapeHtml(user.name || 'Unknown')}</div>
        <div class="small text-muted">${escapeHtml(user.email)}</div>
      </div>
      <div class="small text-muted">
        ${new Date(user.createdAt).toLocaleDateString()}
      </div>
    </div>
  `).join('');
}

// Update low stock products section (show only 2)
function updateLowStockProducts(products) {
  const container = document.getElementById('lowStockProductsList');
  if (!container || !products) return;

  if (products.length === 0) {
    container.innerHTML = '<p class="text-success">All products are well stocked!</p>';
    return;
  }

  // Limit to 2 products
  const displayProducts = products.slice(0, 2);

  container.innerHTML = displayProducts.map(product => `
    <div class="d-flex align-items-center justify-content-between mb-2 p-2 border-left-danger">
      <div>
        <div class="font-weight-bold">${escapeHtml(product.name || 'Unknown')}</div>
        <div class="small text-muted">Stock: ${product.stock || 0}</div>
      </div>
      <span class="badge badge-danger">Low Stock</span>
    </div>
  `).join('');
}

// Helper function for escaping HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
  
  // Refresh dashboard every 30 seconds
  setInterval(loadDashboardStats, 30000);
});
