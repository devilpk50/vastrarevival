/*!
* Start Bootstrap - Shop Homepage v5.0.6 (https://startbootstrap.com/template/shop-homepage)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-shop-homepage/blob/master/LICENSE)
*/

// Configurable API base for cross-origin/local dev.
// By default use same-origin (empty string), override with localStorage 'apiBase' if needed:
// localStorage.setItem('apiBase', 'http://localhost:8001')
window.API_BASE = window.API_BASE || localStorage.getItem('apiBase') || '';

// Load Header Component
if (document.getElementById('header')) {
  fetch('components/header.html')
      .then(response => response.text())
      .then(data => {
          document.getElementById('header').innerHTML = data;
          // Update header based on auth status
          updateAuthStatus();
          // Init navbar search
          initNavbarSearch();
          // Load cart count
          updateCartCount();
      })
      .catch(error => console.log('Error loading header:', error));
}

if (document.getElementById('social')) {
  fetch('components/social.html')
      .then(response => response.text())
      .then(data => document.getElementById('social').innerHTML = data)
      .catch(error => console.log('Error loading social:', error));
}

// Load Footer Component
if (document.getElementById('footer')) {
  fetch('components/footer.html')
      .then(response => response.text())
      .then(data => {
          document.getElementById('footer').innerHTML = data;
          // Set footer year if element exists
          const footerYearEl = document.getElementById('footerYear');
          if (footerYearEl) {
              footerYearEl.textContent = new Date().getFullYear();
          }
      })
      .catch(error => console.log('Error loading footer:', error));
}

// Update header based on authentication status
function updateAuthStatus() {
  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName') || 'User';
  const userRole = localStorage.getItem('userRole') || 'user';
  
  const signInBtn = document.getElementById('signInBtn');
  const userDropdown = document.getElementById('userDropdown');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminLink = document.getElementById('adminLink');
  const cartBtn = document.getElementById('cartBtn');
  const sellNavLink = document.getElementById('sellNavLink');
  
  if (token && signInBtn && userDropdown) {
    // User is logged in - show dropdown, hide Sign In button, show cart button
    signInBtn.style.display = 'none';
    userDropdown.style.display = 'block';
    userNameDisplay.textContent = userName;
    
    // Show cart button when logged in
    if (cartBtn) {
      cartBtn.style.display = 'inline-block';
    }

    // Show Sell nav link when logged in
    if (sellNavLink) {
      sellNavLink.style.display = 'inline-block';
    }
    
    // Show admin link if user is admin
    if (adminLink && userRole === 'admin') {
      adminLink.style.display = 'block';
    } else if (adminLink) {
      adminLink.style.display = 'none';
    }
    
    // Handle logout
    logoutBtn.onclick = function(e) {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      window.location.href = '/index.html';
    };
  } else if (signInBtn && userDropdown) {
    // User is not logged in - show Sign In button, hide dropdown, hide cart button
    signInBtn.style.display = 'block';
    userDropdown.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
    
    // Hide cart button when not logged in
    if (cartBtn) {
      cartBtn.style.display = 'none';
    }

    // Hide Sell nav link when not logged in
    if (sellNavLink) {
      sellNavLink.style.display = 'none';
    }
  }
}

function showUserMenu() {
  // This function is no longer needed
}

function updateCartCount() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) {
      cartCountEl.textContent = '0';
    }
    return;
  }

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

function initNavbarSearch() {
  const form = document.getElementById('navbarSearchForm');
  const input = document.getElementById('navbarSearchInput');
  if (!form || !input) return;

  // Pre-fill from URL (?q=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim();
    if (q) input.value = q;
  } catch (_) {
    // ignore
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = (input.value || '').trim();

    const onProductsPage = /(^|\/)products\.html$/i.test(window.location.pathname);

    if (onProductsPage) {
      // Update URL + notify products page to filter without reload
      const url = new URL(window.location.href);
      if (q) url.searchParams.set('q', q);
      else url.searchParams.delete('q');
      window.history.replaceState({}, '', url.toString());
      window.dispatchEvent(new CustomEvent('navbarSearch', { detail: { q } }));
      return;
    }

    // Navigate to products page with query
    const target = q ? `/products.html?q=${encodeURIComponent(q)}` : '/products.html';
    window.location.href = target;
  });
}