// Fetch and display all products + support navbar search (?q=...)
let allProducts = [];
let currentQuery = '';
let currentPage = 1;
const productsPerPage = 8; // 2 rows × 4 columns on large screens

document.addEventListener("DOMContentLoaded", function () {
  currentQuery = getQueryFromUrl();
  currentPage = getPageFromUrl();
  loadProducts();
});

// Handle browser back/forward navigation
window.addEventListener('popstate', function () {
  currentQuery = getQueryFromUrl();
  currentPage = getPageFromUrl();
  renderFilteredProducts();
});

window.addEventListener('navbarSearch', (e) => {
  currentQuery = (e?.detail?.q || '').trim();
  currentPage = 1; // Reset to first page on new search
  updateUrl(1);
  renderFilteredProducts();
});

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    const data = await response.json();
    console.log('Products response:', data);
    
    if (data.ok && data.products) {
      allProducts = data.products;
      renderFilteredProducts();
    } else {
      console.error('Failed to load products:', data.message);
      document.getElementById('productsContainer').innerHTML = '<p>Failed to load products</p>';
    }
  } catch (err) {
    console.error('Error loading products:', err.message);
    document.getElementById('productsContainer').innerHTML = '<p>Error loading products</p>';
  }
}

function getQueryFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('q') || '').trim();
  } catch (_) {
    return '';
  }
}

function getPageFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const page = parseInt(params.get('page')) || 1;
    return page > 0 ? page : 1;
  } catch (_) {
    return 1;
  }
}

function updateUrl(page) {
  const params = new URLSearchParams(window.location.search);
  if (page > 1) {
    params.set('page', page);
  } else {
    params.delete('page');
  }
  window.history.pushState({}, '', '?' + params.toString());
}

function renderFilteredProducts() {
  const q = (currentQuery || '').toLowerCase();
  const filtered = q
    ? allProducts.filter((p) => {
        const hay = `${p?.name || ''} ${p?.category || ''} ${p?.description || ''}`.toLowerCase();
        return hay.includes(q);
      })
    : allProducts;

  displayProducts(filtered);
  updatePagination(filtered.length);
}

function displayProducts(products) {
  const container = document.getElementById('productsContainer');
  
  if (!container) {
    console.error('Products container not found');
    return;
  }
  
  container.innerHTML = '';
  
  if (products.length === 0) {
    container.innerHTML = currentQuery
      ? `<p class="col-12">No products found for "<strong>${escapeHtml(currentQuery)}</strong>"</p>`
      : '<p class="col-12">No products available</p>';
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(products.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = products.slice(startIndex, endIndex);

  // If current page is out of bounds, reset to page 1
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = 1;
    updateUrl(1);
    displayProducts(products);
    return;
  }

  paginatedProducts.forEach(product => {
    const stock = product.stock || 0;
    const stockDisplay = stock > 0 
      ? `<small class="text-muted d-block mb-2"><i class="bi bi-box-seam me-1"></i>Stock: ${stock}</small>`
      : `<small class="text-danger d-block mb-2"><i class="bi bi-x-circle me-1"></i>Out of Stock</small>`;
    const isOutOfStock = stock === 0;
    
    const productCard = document.createElement('div');
    productCard.className = 'col-sm-6 col-md-4 col-lg-3';
    productCard.innerHTML = `
      <div class="product-card">
        <img src="${product.image || 'https://dummyimage.com/300x350/ccc/000'}" alt="${product.name}" style="height: 250px; object-fit: cover;">
        <div class="product-info">
          <h6>${product.name}</h6>
          <p class="price">₹ ${product.price}</p>
          ${stockDisplay}
          <div class="product-actions">
            <a href="product.html?id=${product._id}" class="btn btn-sm btn-outline-dark">View</a>
            <button class="btn btn-sm btn-dark" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart('${product._id}', '${product.name}', ${product.price})">Add to Cart</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(productCard);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function addToCart(productId, productName, price) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  if (!token || !userId) {
    alert('Please login first to add items to cart');
    window.location.href = '/login.html';
    return;
  }

  try {
    const response = await fetch(`/api/cart/${userId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 })
    });

    const data = await response.json();

    if (data.ok) {
      alert('Item added to cart!');
      updateCartCount();
    } else {
      alert('Failed to add item: ' + data.message);
    }
  } catch (err) {
    console.error('Error adding to cart:', err);
    alert('Error adding to cart: ' + err.message);
  }
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

// Update pagination controls
function updatePagination(totalProducts) {
  const paginationContainer = document.getElementById('paginationContainer');
  if (!paginationContainer) return;

  const totalPages = Math.ceil(totalProducts / productsPerPage);
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let paginationHTML = '';

  // Previous button
  paginationHTML += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </a>
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
      <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>
  `;

  paginationContainer.innerHTML = paginationHTML;
}

// Navigate to specific page
function goToPage(page) {
  const q = (currentQuery || '').toLowerCase();
  const filtered = q
    ? allProducts.filter((p) => {
        const hay = `${p?.name || ''} ${p?.category || ''} ${p?.description || ''}`.toLowerCase();
        return hay.includes(q);
      })
    : allProducts;
  
  const totalPages = Math.ceil(filtered.length / productsPerPage);
  
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  updateUrl(page);
  renderFilteredProducts();
  
  // Scroll to top of products section
  document.querySelector('.container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
