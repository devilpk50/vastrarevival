// Home page products grid (loads same products admin adds)

document.addEventListener('DOMContentLoaded', () => {
  loadHomeProducts();
});

async function loadHomeProducts() {
  const grid = document.getElementById('homeProductsGrid');
  const statusEl = document.getElementById('homeProductsStatus');

  if (!grid) {
    console.error('[loadHomeProducts] Grid element not found!');
    return;
  }

  try {
    console.log('[loadHomeProducts] Fetching products...');
    const res = await fetch('/api/products');
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[loadHomeProducts] HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('[loadHomeProducts] Response:', data);

    if (!data?.ok) {
      throw new Error(data?.message || 'Failed to load products');
    }

    if (!Array.isArray(data.products)) {
      console.error('[loadHomeProducts] Products is not an array:', data.products);
      throw new Error('Invalid products data format');
    }

    console.log(`[loadHomeProducts] Received ${data.products.length} products`);

    // Hide loading status before rendering
    if (statusEl) {
      statusEl.style.display = 'none';
    }

    renderHomeProducts(data.products);
  } catch (err) {
    console.error('Error loading home products:', err);
    // Hide loading status and show error
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Failed to load products: ' + err.message;
      statusEl.classList.add('text-danger');
      statusEl.classList.remove('text-muted');
    }
    // Clear grid
    grid.innerHTML = '';
  }
}

function renderHomeProducts(products) {
  const grid = document.getElementById('homeProductsGrid');
  const statusEl = document.getElementById('homeProductsStatus');
  
  if (!grid) {
    console.error('[renderHomeProducts] Grid element not found!');
    return;
  }

  console.log(`[renderHomeProducts] Rendering ${products.length} products`);

  // Hide loading status if it exists
  if (statusEl) {
    statusEl.style.display = 'none';
  }

  // Clear previous content
  grid.innerHTML = '';

  if (products.length === 0) {
    console.log('[renderHomeProducts] No products to display');
    grid.innerHTML = `
      <div class="col-12 text-center text-muted py-5">
        No products available yet.
      </div>
    `;
    return;
  }

  // Show only the latest 4 products
  const latestProducts = products.slice(0, 4);

  latestProducts.forEach((product) => {
    const image = product.image || 'https://dummyimage.com/450x300/dee2e6/6c757d.jpg';
    const name = escapeHtml(product.name || 'Product');
    const category = escapeHtml(product.category || 'Unisex');
    const price = Number(product.price || 0);
    const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null;
    const id = product._id;

    // Only show "Out" badge when stock is zero. 'Low' badge removed per request.
    const badgeHtml = stock === 0
      ? `<div class="badge bg-danger text-white position-absolute" style="top: 0.5rem; right: 0.5rem">Out</div>`
      : '';

    const col = document.createElement('div');
    col.className = 'col mb-5';
    col.innerHTML = `
      <div class="card h-100 position-relative">
        ${badgeHtml}
        <img
          class="card-img-top"
          src="${image}"
          alt="${name}"
          style="height: 260px; object-fit: cover;"
        />
        <div class="card-body p-4">
          <div class="text-center">
            <h5 class="fw-bolder mb-1">${name}</h5>
            <div class="small text-muted mb-2">${category}</div>
            <div>₹ ${formatMoney(price)}</div>
          </div>
        </div>
        <div class="card-footer p-4 pt-0 border-top-0 bg-transparent">
          <div class="text-center d-flex gap-2 justify-content-center flex-wrap">
            <a class="btn btn-outline-dark mt-auto" href="product.html?id=${encodeURIComponent(id)}">View</a>
            <button class="btn btn-dark mt-auto" type="button"
              ${stock === 0 ? 'disabled' : ''}
              onclick="homeAddToCart('${escapeJs(String(id))}')"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>
    `;

    grid.appendChild(col);
  });

  // Show "More" button if there are more than 4 products
  const moreButton = document.getElementById('moreProductsButton');
  if (moreButton && products.length > 4) {
    moreButton.style.display = 'block';
  } else if (moreButton) {
    moreButton.style.display = 'none';
  }
}

async function homeAddToCart(productId) {
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
      // `updateCartCount` is defined globally in `js/scripts.js`
      if (typeof updateCartCount === 'function') updateCartCount();
    } else {
      alert('Failed to add item: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error adding to cart:', err);
    alert('Error adding to cart: ' + err.message);
  }
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Minimal escaping helpers for HTML/JS-in-HTML use
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeJs(str) {
  // For embedding into single-quoted onclick attribute
  return String(str).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

