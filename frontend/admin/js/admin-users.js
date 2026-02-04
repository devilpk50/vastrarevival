// Users Management

const API_BASE = '/api/admin';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

let allUsers = [];
let currentPage = 1;
const itemsPerPage = 5;
let totalPages = 1;

// Load all users
async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to load users');
    }

    const data = await response.json();
    
    if (data.ok && data.users) {
      allUsers = data.users;
      // Store original users for search filtering
      if (typeof window !== 'undefined') {
        window.originalUsers = data.users;
      }
      currentPage = 1;
      displayUsers();
    } else {
      document.getElementById('usersTableBody').innerHTML = 
        '<tr><td colspan="6" class="text-center text-danger">Failed to load users</td></tr>';
      updatePagination();
    }
  } catch (err) {
    console.error('Error loading users:', err);
    document.getElementById('usersTableBody').innerHTML = 
      '<tr><td colspan="6" class="text-center text-danger">Error: ' + err.message + '</td></tr>';
    updatePagination();
  }
}

// Display users in table with pagination
function displayUsers() {
  const tbody = document.getElementById('usersTableBody');
  
  if (allUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
    updatePagination();
    return;
  }

  // Calculate pagination
  totalPages = Math.ceil(allUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = allUsers.slice(startIndex, endIndex);

  tbody.innerHTML = paginatedUsers.map(user => {
    const userName = escapeHtml(user.name || 'N/A');
    const userEmail = escapeHtml(user.email || '');
    const userPhone = escapeHtml(user.phone || 'N/A');
    const userId = escapeJs(user._id);
    const userNameForDelete = escapeJs(user.name || 'N/A');
    
    return `
    <tr>
      <td>${userName}</td>
      <td>${userEmail}</td>
      <td>${userPhone}</td>
      <td>
        <select class="form-control form-control-sm" onchange="updateUserRole('${userId}', this.value)">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteUser('${userId}', '${userNameForDelete}')">
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

  if (allUsers.length === 0) {
    paginationContainer.innerHTML = '';
    return;
  }

  totalPages = Math.ceil(allUsers.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, allUsers.length);

  let paginationHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <span class="text-muted">Showing ${startItem} to ${endItem} of ${allUsers.length} users</span>
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
  displayUsers();
  // Scroll to top of table
  document.querySelector('.card-body').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Update user role
async function updateUserRole(userId, newRole) {
  if (!confirm(`Change user role to ${newRole}?`)) {
    loadUsers(); // Reload to reset dropdown
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${userId}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role: newRole })
    });

    const data = await response.json();
    
    if (data.ok) {
      alert('User role updated successfully!');
      await loadUsers();
    } else {
      alert('Failed to update role: ' + data.message);
      await loadUsers();
    }
  } catch (err) {
    alert('Error updating role: ' + err.message);
    await loadUsers();
  }
}

// Delete user
async function deleteUser(userId, userName) {
  if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();
    
    if (data.ok) {
      alert('User deleted successfully!');
      await loadUsers();
    } else {
      alert('Failed to delete user: ' + data.message);
    }
  } catch (err) {
    alert('Error deleting user: ' + err.message);
  }
}

// Refresh users
function refreshUsers() {
  loadUsers();
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

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
  window.location.href = '/login.html';
}

// Load users on page load
document.addEventListener('DOMContentLoaded', () => {
  const userName = localStorage.getItem('userName');
  if (userName) {
    const adminNameEl = document.getElementById('adminUserNameTopbar');
    if (adminNameEl) {
      adminNameEl.textContent = userName;
    }
  }
  loadUsers();
});
