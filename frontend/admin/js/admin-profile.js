// Admin Profile Management

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Load admin profile on page load
async function loadAdminProfile() {
  try {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    
    if (!userId || !token) {
      window.location.href = '/login.html';
      return;
    }

    const response = await fetch(`/api/auth/user/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.ok && data.user) {
      // Populate form fields
      document.getElementById('profileName').value = data.user.name || '';
      document.getElementById('profileEmail').value = data.user.email || '';
      document.getElementById('profilePhone').value = data.user.phone || '';
      document.getElementById('profileAddress').value = data.user.address || '';
      document.getElementById('profileCity').value = data.user.city || '';
      document.getElementById('profileZip').value = data.user.zip || '';
      document.getElementById('profileRole').value = data.user.role === 'admin' ? 'Administrator' : 'User';

      // Update summary card
      document.getElementById('profileNameDisplay').textContent = data.user.name || 'Admin User';
      document.getElementById('profileEmailDisplay').textContent = data.user.email || 'admin@example.com';
      
      const roleBadge = document.getElementById('profileRoleBadge');
      if (data.user.role === 'admin') {
        roleBadge.textContent = 'Administrator';
        roleBadge.className = 'badge badge-success badge-lg';
      } else {
        roleBadge.textContent = 'User';
        roleBadge.className = 'badge badge-secondary badge-lg';
      }

      // Format and display member since date
      if (data.user.createdAt) {
        const createdDate = new Date(data.user.createdAt);
        const formattedDate = createdDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        document.getElementById('memberSince').textContent = formattedDate;
      }
    } else {
      showError('Failed to load profile: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    showError('Error loading profile: ' + err.message);
  }
}

// Update admin profile
async function updateAdminProfile() {
  try {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    
    if (!userId || !token) {
      showError('Please login to update profile');
      return;
    }

    const phone = document.getElementById('profilePhone').value.trim();
    const address = document.getElementById('profileAddress').value.trim();
    const city = document.getElementById('profileCity').value.trim();
    const zip = document.getElementById('profileZip').value.trim();

    const response = await fetch(`/api/auth/user/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        phone,
        address,
        city,
        zip
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.ok) {
      showSuccess('Profile updated successfully!');
      // Reload profile to show updated data
      setTimeout(() => {
        loadAdminProfile();
      }, 1000);
    } else {
      showError('Failed to update profile: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error updating profile:', err);
    showError('Error updating profile: ' + err.message);
  }
}

// Show success message
function showSuccess(message) {
  const successMsg = document.getElementById('successMsg');
  const errorMsg = document.getElementById('errorMsg');
  
  errorMsg.style.display = 'none';
  successMsg.textContent = message;
  successMsg.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 5000);
}

// Show error message
function showError(message) {
  const successMsg = document.getElementById('successMsg');
  const errorMsg = document.getElementById('errorMsg');
  
  successMsg.style.display = 'none';
  errorMsg.textContent = message;
  errorMsg.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    errorMsg.style.display = 'none';
  }, 5000);
}

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
  loadAdminProfile();

  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await updateAdminProfile();
    });
  }
});
