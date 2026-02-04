// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  if (!token || !userId) {
    alert('Please login to view your sell items');
    window.location.href = '/login.html';
    return;
  }

  loadUserProducts();
  setupFilters();
});

let allProducts = [];
let currentFilter = 'all';

async function loadUserProducts() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  
  if (!userId || !token) {
    window.location.href = '/login.html';
    return;
  }

  const loadingMessage = document.getElementById('loadingMessage');
  const productsContainer = document.getElementById('productsContainer');
  const emptyMessage = document.getElementById('emptyMessage');

  try {
    loadingMessage.style.display = 'block';
    productsContainer.style.display = 'none';
    emptyMessage.style.display = 'none';

    const response = await fetch(`/api/products/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error(`Server returned ${response.status}: ${response.statusText}. Please check your authentication and try again.`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    loadingMessage.style.display = 'none';

    if (data.ok && data.products) {
      allProducts = data.products;
      
      if (allProducts.length === 0) {
        emptyMessage.style.display = 'block';
      } else {
        productsContainer.style.display = 'flex';
        displayProducts(allProducts);
      }
    } else {
      throw new Error('Invalid response format');
    }
  } catch (err) {
    loadingMessage.style.display = 'none';
    console.error('Error loading products:', err);
    productsContainer.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Error loading your items: ${err.message}
        </div>
      </div>
    `;
    productsContainer.style.display = 'flex';
  }
}

function setupFilters() {
  const filterButtons = document.querySelectorAll('[data-filter]');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Update active state
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Update filter
      currentFilter = this.getAttribute('data-filter');
      
      // Filter and display products
      const filtered = currentFilter === 'all' 
        ? allProducts 
        : allProducts.filter(p => p.status === currentFilter);
      
      displayProducts(filtered);
    });
  });
}

function displayProducts(products) {
  const container = document.getElementById('productsContainer');
  
  if (!container) {
    console.error('Products container not found');
    return;
  }
  
  container.innerHTML = '';
  
  if (products.length === 0) {
    const filterText = currentFilter === 'all' ? '' : ` with status "${currentFilter}"`;
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No items found${filterText}.
        </div>
      </div>
    `;
    return;
  }

  products.forEach(product => {
    const status = product.status || 'pending';
    const statusClass = `status-${status}`;
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    const productCard = document.createElement('div');
    productCard.className = 'col-sm-6 col-md-4 col-lg-3';
    productCard.innerHTML = `
      <div class="product-card card h-100 shadow-sm">
        <img src="${product.image || 'https://dummyimage.com/300x350/ccc/000'}" 
             alt="${escapeHtml(product.name)}" 
             class="card-img-top" 
             style="height: 250px; object-fit: cover;">
        <div class="card-body d-flex flex-column">
          <h6 class="card-title">${escapeHtml(product.name)}</h6>
          <p class="text-muted small mb-2">${escapeHtml(product.description || 'No description')}</p>
          <p class="price fw-bold mb-2">₹ ${product.price}</p>
          <div class="mb-2">
            <span class="status-badge ${statusClass}">
              <i class="bi ${status === 'approved' ? 'bi-check-circle' : status === 'pending' ? 'bi-clock' : 'bi-x-circle'} me-1"></i>
              ${statusText}
            </span>
          </div>
          ${product.category ? `<p class="text-muted small mb-2"><i class="bi bi-tag me-1"></i>${escapeHtml(product.category)}</p>` : ''}
          <p class="text-muted small mb-2">
            <i class="bi bi-box-seam me-1"></i>Stock: <strong>${product.stock || 0}</strong>
          </p>
          <div class="mt-auto">
            <button type="button" class="btn btn-sm btn-outline-dark w-100 view-detail-btn" data-product-id="${product._id}">View Details</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(productCard);
  });
  
  // Add event listeners to view detail buttons
  setupViewDetailButtons();
}

function setupViewDetailButtons() {
  const viewDetailButtons = document.querySelectorAll('.view-detail-btn');
  viewDetailButtons.forEach(button => {
    button.addEventListener('click', function() {
      const productId = this.getAttribute('data-product-id');
      const product = allProducts.find(p => p._id === productId);
      if (product) {
        showProductDetail(product);
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showProductDetail(product) {
  // Get modal elements
  const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
  const modalImage = document.getElementById('modalProductImage');
  const modalName = document.getElementById('modalProductName');
  const modalPrice = document.getElementById('modalProductPrice');
  const modalDescription = document.getElementById('modalProductDescription');
  const modalCategory = document.getElementById('modalProductCategory');
  const modalStatus = document.getElementById('modalProductStatus');
  const modalStock = document.getElementById('modalProductStock');
  
  // Populate modal with product data
  modalImage.src = product.image || 'https://dummyimage.com/300x350/ccc/000';
  modalImage.alt = escapeHtml(product.name);
  modalName.textContent = product.name || 'Unnamed Product';
  modalPrice.textContent = product.price || '0';
  modalDescription.textContent = product.description || 'No description available';
  modalCategory.textContent = product.category || 'Not specified';
  
  // Set stock display
  const stock = product.stock || 0;
  if (stock > 0) {
    modalStock.innerHTML = `<span class="badge bg-success"><i class="bi bi-box-seam me-1"></i>${stock} available</span>`;
  } else {
    modalStock.innerHTML = `<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Out of Stock</span>`;
  }
  
  // Set status badge
  const status = product.status || 'pending';
  const statusClass = `status-${status}`;
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  modalStatus.className = `status-badge ${statusClass}`;
  modalStatus.innerHTML = `<i class="bi ${status === 'approved' ? 'bi-check-circle' : status === 'pending' ? 'bi-clock' : 'bi-x-circle'} me-1"></i>${statusText}`;
  
  // Show modal
  modal.show();
}
