// Admin Panel Search Functionality

// Global search state
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', function() {
  initAdminSearch();
  // Check for search query in URL
  checkUrlSearchQuery();
});

function initAdminSearch() {
  const searchForm = document.getElementById('adminSearchForm');
  const searchInput = document.getElementById('adminSearchInput');
  
  if (!searchForm || !searchInput) return;

  // Get current page
  const currentPage = getCurrentAdminPage();
  
  // Handle form submit
  searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    currentSearchQuery = query;
    performSearch(query, currentPage);
  });

  // Handle Enter key
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.value.trim();
      currentSearchQuery = query;
      performSearch(query, currentPage);
    }
  });
}

function checkUrlSearchQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('search');
  if (searchQuery) {
    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput) {
      searchInput.value = searchQuery;
      currentSearchQuery = searchQuery;
      const currentPage = getCurrentAdminPage();
      performSearch(searchQuery, currentPage);
    }
  }
}

function getCurrentAdminPage() {
  const path = window.location.pathname;
  if (path.includes('products.html')) return 'products';
  if (path.includes('users.html')) return 'users';
  if (path.includes('orders.html')) return 'orders';
  if (path.includes('index.html') || path.endsWith('/admin/') || path.endsWith('/admin')) return 'dashboard';
  return 'dashboard'; // default
}

function performSearch(query, currentPage) {
  if (!query) {
    // If empty, clear search and reload
    currentSearchQuery = '';
    // Restore original data
    if (currentPage === 'products' && typeof window !== 'undefined' && typeof window.originalProducts !== 'undefined') {
      if (typeof allProducts !== 'undefined') {
        allProducts = window.originalProducts;
        if (typeof currentPage !== 'undefined') currentPage = 1;
        if (typeof displayProducts === 'function') displayProducts();
      }
    } else if (currentPage === 'users' && typeof window !== 'undefined' && typeof window.originalUsers !== 'undefined') {
      if (typeof allUsers !== 'undefined') {
        allUsers = window.originalUsers;
        if (typeof currentPage !== 'undefined') currentPage = 1;
        if (typeof displayUsers === 'function') displayUsers();
      }
    } else if (currentPage === 'orders' && typeof window !== 'undefined' && typeof window.originalOrders !== 'undefined') {
      if (typeof allOrders !== 'undefined') {
        allOrders = window.originalOrders;
        if (typeof currentPage !== 'undefined') currentPage = 1;
        if (typeof displayOrders === 'function') displayOrders();
      }
    }
    // Clear URL param
    const url = new URL(window.location.href);
    url.searchParams.delete('search');
    window.history.pushState({}, '', url);
    return;
  }

  switch(currentPage) {
    case 'products':
      // Search products - filter on current page
      filterProducts(query);
      break;
    case 'users':
      // Search users - filter on current page
      filterUsers(query);
      break;
    case 'orders':
      // Search orders - filter on current page
      filterOrders(query);
      break;
    case 'dashboard':
    default:
      // Unified search - navigate to products page with search
      showUnifiedSearchResults(query);
      break;
  }
}

// Filter products on products page
function filterProducts(query) {
  if (typeof allProducts !== 'undefined' && Array.isArray(allProducts)) {
    const filtered = allProducts.filter(product => {
      const searchText = `${product.name || ''} ${product.category || ''} ${product.description || ''} ${product.price || ''} ${product.stock || ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
    
    // Store filtered products and reset pagination
    if (typeof window !== 'undefined') {
      window.filteredProducts = filtered;
      if (typeof currentPage !== 'undefined') {
        currentPage = 1;
      }
    }
    
    if (typeof displayProducts === 'function') {
      // Use filtered products
      const originalProducts = allProducts;
      allProducts = filtered;
      displayProducts();
      // Keep filtered for pagination
      allProducts = filtered;
    }
    
    // Update URL without reload
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('search', query);
    } else {
      url.searchParams.delete('search');
    }
    window.history.pushState({}, '', url);
  }
}

// Filter users on users page
function filterUsers(query) {
  if (typeof allUsers !== 'undefined' && Array.isArray(allUsers)) {
    const filtered = allUsers.filter(user => {
      const searchText = `${user.name || ''} ${user.email || ''} ${user.phone || ''} ${user.role || ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
    
    // Store filtered users and reset pagination
    if (typeof window !== 'undefined') {
      window.filteredUsers = filtered;
      if (typeof currentPage !== 'undefined') {
        currentPage = 1;
      }
    }
    
    if (typeof displayUsers === 'function') {
      // Use filtered users
      const originalUsers = allUsers;
      allUsers = filtered;
      displayUsers();
      // Keep filtered for pagination
      allUsers = filtered;
    }
    
    // Update URL without reload
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('search', query);
    } else {
      url.searchParams.delete('search');
    }
    window.history.pushState({}, '', url);
  }
}

// Filter orders on orders page
function filterOrders(query) {
  if (typeof allOrders !== 'undefined' && Array.isArray(allOrders)) {
    const filtered = allOrders.filter(order => {
      const user = order.userId || {};
      const items = order.items || [];
      const itemsText = items.map(item => {
        const product = item.productId || {};
        return product.name || '';
      }).join(' ');
      const searchText = `${user.name || ''} ${user.email || ''} ${itemsText}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
    
    // Store filtered orders and reset pagination
    if (typeof window !== 'undefined') {
      window.filteredOrders = filtered;
      if (typeof currentPage !== 'undefined') {
        currentPage = 1;
      }
    }
    
    if (typeof displayOrders === 'function') {
      // Use filtered orders
      const originalOrders = allOrders;
      allOrders = filtered;
      displayOrders();
      // Keep filtered for pagination
      allOrders = filtered;
    }
    
    // Update URL without reload
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('search', query);
    } else {
      url.searchParams.delete('search');
    }
    window.history.pushState({}, '', url);
  }
}

// Unified search for dashboard
function showUnifiedSearchResults(query) {
  // Navigate to products page with search query (most common search)
  // Or show a modal with results from all categories
  window.location.href = `products.html?search=${encodeURIComponent(query)}`;
}
