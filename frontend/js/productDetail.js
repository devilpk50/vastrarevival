let currentProduct = null;

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (productId) {
    loadProductDetail(productId);
  } else {
    document.querySelector('.product-container').innerHTML = '<p>Product not found</p>';
  }
});

async function loadProductDetail(productId) {
  const container = document.querySelector('.product-container');
  
  if (!container) {
    console.error('Product container not found!');
    return;
  }

  try {
    console.log('[loadProductDetail] Fetching product:', productId);
    const response = await fetch(`/api/products/${productId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[loadProductDetail] Response:', data);

    if (data.ok && data.product) {
      currentProduct = data.product;
      displayProductDetail(data.product);
      loadRelatedProducts(data.product);
    } else {
      container.innerHTML = '<div class="alert alert-warning"><p>Product not found</p></div>';
    }
  } catch (err) {
    console.error('Error loading product:', err);
    if (container) {
      container.innerHTML = `<div class="alert alert-danger"><p>Error loading product: ${err.message}</p></div>`;
    }
  }
}

function displayProductDetail(product) {
  console.log('[displayProductDetail] Displaying product:', product);
  
  const imageEl = document.getElementById('productImage');
  const nameEl = document.getElementById('productName');
  const categoryEl = document.getElementById('productCategory');
  const priceEl = document.getElementById('productPrice');
  const descEl = document.getElementById('productDescription');
  const stockEl = document.getElementById('productStock');
  
  if (!imageEl || !nameEl || !categoryEl || !priceEl || !descEl || !stockEl) {
    console.error('[displayProductDetail] Required elements not found!');
    return;
  }
  
  imageEl.src = product.image || 'https://dummyimage.com/450x550/cfcfcf/000000';
  nameEl.textContent = product.name || 'Product';
  categoryEl.textContent = product.category || 'N/A';
  priceEl.textContent = '₹ ' + (product.price || '0');
  descEl.textContent = product.description || 'No description available';
  
  const stock = Number(product.stock) || 0;
  if (stock > 0) {
    stockEl.innerHTML = `<span class="badge bg-success">${stock} available</span>`;
  } else {
    stockEl.innerHTML = '<span class="badge bg-danger">Out of Stock</span>';
  }
}

function addProductToCart() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  if (!token || !userId) {
    alert('Please login first to add items to cart');
    window.location.href = '/login.html';
    return;
  }

  if (!currentProduct) {
    alert('Product not loaded');
    return;
  }

  const quantity = parseInt(document.getElementById('quantityInput').value) || 1;

  addToCartAPI(userId, currentProduct._id, quantity);
}

async function addToCartAPI(userId, productId, quantity) {
  try {
    const response = await fetch(`/api/cart/${userId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity })
    });

    const data = await response.json();

    if (data.ok) {
      alert(`${quantity} item(s) added to cart!`);
      updateCartCount();
    } else {
      alert('Failed to add item: ' + data.message);
    }
  } catch (err) {
    console.error('Error adding to cart:', err);
    alert('Error adding to cart: ' + err.message);
  }
}

function buyNow() {
  alert('Buy Now feature coming soon!');
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

// Load related products from the same category
async function loadRelatedProducts(currentProduct) {
  try {
    const response = await fetch('/api/products');
    const data = await response.json();

    if (data.ok && data.products) {
      // Filter products by same category, exclude current product, and limit to 4
      const relatedProducts = data.products
        .filter(product => 
          product._id !== currentProduct._id && 
          product.category === currentProduct.category &&
          (product.status === 'approved' || !product.status) // Only show approved products
        )
        .slice(0, 4); // Limit to 4 products

      displayRelatedProducts(relatedProducts);
    }
  } catch (err) {
    console.error('Error loading related products:', err);
    // Hide the section on error
    const section = document.getElementById('relatedProductsSection');
    if (section) {
      section.style.display = 'none';
    }
  }
}

// Display related products
function displayRelatedProducts(products) {
  const container = document.getElementById('relatedProductsContainer');
  const section = document.getElementById('relatedProductsSection');
  
  if (!container || !section) return;

  if (products.length === 0) {
    // Hide the entire section if no related products
    section.style.display = 'none';
    return;
  }

  // Show the section and display products
  section.style.display = 'block';
  container.innerHTML = products.map(product => {
    const stock = product.stock || 0;
    const stockBadge = stock > 0 
      ? `<span class="badge bg-success">In Stock</span>`
      : `<span class="badge bg-danger">Out of Stock</span>`;
    
    return `
      <div class="col-md-3">
        <div class="related-card" style="cursor: pointer;" onclick="window.location.href='product.html?id=${product._id}'">
          <img src="${product.image || 'https://dummyimage.com/300x350/ccc/000'}" 
               alt="${escapeHtml(product.name)}" 
               class="related-img"
               style="width: 100%;">
          <h6>${escapeHtml(product.name)}</h6>
          <p>₹ ${product.price || 0}</p>
          ${stockBadge}
        </div>
      </div>
    `;
  }).join('');
}

// Helper function to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
