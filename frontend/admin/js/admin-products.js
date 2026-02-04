// Products Management

const API_BASE = '/api/admin';
const PRODUCTS_API = '/api/products';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

let allProducts = [];
let currentPage = 1;
const itemsPerPage = 5;
let totalPages = 1;

// Load all products
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to load products');
    }

    const data = await response.json();
    
    if (data.ok && data.products) {
      allProducts = data.products;
      // Store original products for search filtering
      if (typeof window !== 'undefined') {
        window.originalProducts = data.products;
      }
      currentPage = 1;
      displayProducts();
    } else {
      document.getElementById('productsTableBody').innerHTML = 
        '<tr><td colspan="7" class="text-center text-danger">Failed to load products</td></tr>';
      updatePagination();
    }
  } catch (err) {
    console.error('Error loading products:', err);
    document.getElementById('productsTableBody').innerHTML = 
      '<tr><td colspan="7" class="text-center text-danger">Error: ' + err.message + '</td></tr>';
    updatePagination();
  }
}

// Display products in table with pagination
function displayProducts() {
  const tbody = document.getElementById('productsTableBody');
  
  if (allProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No products found</td></tr>';
    updatePagination();
    return;
  }

  // Calculate pagination
  totalPages = Math.ceil(allProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = allProducts.slice(startIndex, endIndex);

  tbody.innerHTML = paginatedProducts.map(product => {
    const status = product.status || 'approved';
    const statusBadge = status === 'approved' 
      ? '<span class="badge badge-success">Approved</span>'
      : status === 'pending'
      ? '<span class="badge badge-warning">Pending</span>'
      : '<span class="badge badge-danger">Rejected</span>';
    
    const sellerInfo = product.sellerName 
      ? `<small class="d-block text-muted">Seller: ${escapeHtml(product.sellerName)}</small>`
      : '';
    
    const approveBtn = status === 'pending'
      ? `<button class="btn btn-success btn-sm mb-1" onclick="approveProduct('${product._id}', '${escapeJs(product.name)}')">
           <i class="fas fa-check"></i> Approve
         </button>`
      : '';
    
    return `
    <tr>
      <td>
        <img src="${product.image || 'https://via.placeholder.com/50'}" 
             alt="${product.name}" 
             style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
      </td>
      <td>
        ${escapeHtml(product.name)}
        ${sellerInfo}
      </td>
      <td>${product.category || 'N/A'}</td>
      <td>₹ ${product.price}</td>
      <td>
        <span class="badge ${product.stock < 10 ? 'badge-warning' : 'badge-success'}">
          ${product.stock}
        </span>
      </td>
      <td>${statusBadge}</td>
      <td>
        ${approveBtn}
        <button class="btn btn-primary btn-sm ${approveBtn ? '' : 'mb-1'}" onclick="editProduct('${product._id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}', '${escapeJs(product.name)}')">
          <i class="fas fa-trash"></i> Delete
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

  if (allProducts.length === 0) {
    paginationContainer.innerHTML = '';
    return;
  }

  totalPages = Math.ceil(allProducts.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, allProducts.length);

  let paginationHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <span class="text-muted">Showing ${startItem} to ${endItem} of ${allProducts.length} products</span>
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
  displayProducts();
  // Scroll to top of table
  document.querySelector('.card-body').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Show add product modal
function showAddProductModal() {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  // Reset image preview
  resetAdminImagePreview();
  $('#productModal').modal('show');
}

// Trigger file upload
function triggerAdminUpload() {
  document.getElementById('adminImageUpload').click();
}

// Reset image preview
function resetAdminImagePreview() {
  const previewImg = document.getElementById('adminPreviewImg');
  const uploadText = document.getElementById('adminUploadText');
  const imageUpload = document.getElementById('adminImageUpload');
  
  if (previewImg) {
    previewImg.src = '';
    previewImg.classList.add('d-none');
  }
  if (uploadText) {
    uploadText.style.display = '';
  }
  if (imageUpload) {
    imageUpload.value = '';
  }
}

// Initialize image upload functionality
document.addEventListener('DOMContentLoaded', function() {
  const imageUpload = document.getElementById('adminImageUpload');
  if (imageUpload) {
    imageUpload.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          alert('Image size must be less than 5MB');
          this.value = '';
          return;
        }
        
        const reader = new FileReader();
        reader.onload = () => {
          const previewImg = document.getElementById('adminPreviewImg');
          const uploadText = document.getElementById('adminUploadText');
          if (previewImg && uploadText) {
            previewImg.src = reader.result;
            previewImg.classList.remove('d-none');
            uploadText.style.display = 'none';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

// Edit product
async function editProduct(productId) {
  try {
    const response = await fetch(`${API_BASE}/products/${productId}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    
    if (data.ok && data.product) {
      const p = data.product;
      document.getElementById('productModalTitle').textContent = 'Edit Product';
      document.getElementById('productId').value = p._id;
      document.getElementById('productName').value = p.name || '';
      document.getElementById('productDescription').value = p.description || '';
      document.getElementById('productPrice').value = p.price || '';
      document.getElementById('productCategory').value = p.category || 'Unisex';
      document.getElementById('productStock').value = p.stock || 0;
      
      // Set image preview
      const previewImg = document.getElementById('adminPreviewImg');
      const uploadText = document.getElementById('adminUploadText');
      
      if (p.image) {
        if (previewImg && uploadText) {
          previewImg.src = p.image;
          previewImg.classList.remove('d-none');
          uploadText.style.display = 'none';
        }
      } else {
        // Reset image preview if no image
        resetAdminImagePreview();
      }
      
      $('#productModal').modal('show');
    } else {
      alert('Failed to load product details');
    }
  } catch (err) {
    alert('Error loading product: ' + err.message);
  }
}

// Save product (create or update)
async function saveProduct() {
  const productId = document.getElementById('productId').value;
  const imageUpload = document.getElementById('adminImageUpload');
  const previewImg = document.getElementById('adminPreviewImg');
  
  // Get image - prioritize uploaded file, then existing preview (from edit), then default
  let imageData = 'https://dummyimage.com/300x350/ccc/000';
  
  if (imageUpload && imageUpload.files && imageUpload.files[0]) {
    // File uploaded - convert to base64
    const file = imageUpload.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      imageData = reader.result;
      await submitProductData(productId, imageData);
    };
    reader.readAsDataURL(file);
    return; // Will continue in reader.onload callback
  } else if (previewImg && previewImg.src && !previewImg.classList.contains('d-none')) {
    // Existing preview (from edit) - use existing image
    imageData = previewImg.src;
  }
  
  await submitProductData(productId, imageData);
}

// Submit product data
async function submitProductData(productId, imageData) {
  const productData = {
    name: document.getElementById('productName').value,
    description: document.getElementById('productDescription').value,
    price: parseFloat(document.getElementById('productPrice').value),
    category: document.getElementById('productCategory').value,
    stock: parseInt(document.getElementById('productStock').value) || 0,
    image: imageData
  };

  if (!productData.name || !productData.price) {
    alert('Name and Price are required!');
    return;
  }

  try {
    const url = productId ? `${PRODUCTS_API}/${productId}` : PRODUCTS_API;
    const method = productId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });

    const data = await response.json();
    
    if (data.ok) {
      alert('Product saved successfully!');
      $('#productModal').modal('hide');
      resetAdminImagePreview();
      await loadProducts();
    } else {
      alert('Failed to save product: ' + data.message);
    }
  } catch (err) {
    alert('Error saving product: ' + err.message);
  }
}

// Delete product
async function deleteProduct(productId, productName) {
  if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`${PRODUCTS_API}/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();
    
    if (data.ok) {
      alert('Product deleted successfully!');
      await loadProducts();
    } else {
      alert('Failed to delete product: ' + data.message);
    }
  } catch (err) {
    alert('Error deleting product: ' + err.message);
  }
}

// Approve pending product
async function approveProduct(productId, productName) {
  if (!confirm(`Approve "${productName}"? This will make it visible to all users.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/products/${productId}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });

    const data = await response.json();
    
    if (data.ok) {
      alert('Product approved successfully!');
      await loadProducts();
    } else {
      alert('Failed to approve product: ' + data.message);
    }
  } catch (err) {
    alert('Error approving product: ' + err.message);
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

// Refresh products
function refreshProducts() {
  loadProducts();
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
  window.location.href = '/login.html';
}

// Load products on page load
document.addEventListener('DOMContentLoaded', () => {
  const userName = localStorage.getItem('userName');
  if (userName) {
    const adminNameEl = document.getElementById('adminUserNameTopbar');
    if (adminNameEl) {
      adminNameEl.textContent = userName;
    }
  }
  loadProducts();
});
