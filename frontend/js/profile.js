document.addEventListener("DOMContentLoaded", function () {
  // Small delay to ensure all elements are rendered
  setTimeout(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    console.log('Token:', token);
    console.log('UserId:', userId);

    if (!token || !userId) {
      alert("Please login first!");
      window.location.href = '/login.html';
      return;
    }

    // Load user profile data
    loadUserProfile();

    // Handle form submission
    document.getElementById('profileForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      updateUserProfile();
    });
  }, 100);
});

async function loadUserProfile() {
  try {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    console.log('Loading profile for userId:', userId);
    console.log('Token:', token);

    const response = await fetch(`/api/auth/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    // Check if response is HTML (error case)
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Profile response:', data);

    if (data.ok && data.user) {
      // Populate form fields
      console.log('User data from API:', data.user);
      const user = data.user;
      document.getElementById('profileName').value = user.name || '';
      document.getElementById('profileEmail').value = user.email || '';
      document.getElementById('profilePhone').value = user.phone || '';
      document.getElementById('profileAddress').value = user.address || '';
      document.getElementById('profileCity').value = user.city || '';
      document.getElementById('profileZip').value = user.zip || '';

      // Store commonly used values locally for UI elsewhere
      if (user.name) localStorage.setItem('userName', user.name);
      if (user.phone) localStorage.setItem('userPhone', user.phone);

      // Profile avatar: keep dummy unless user has uploaded one
      const avatarEl = document.getElementById('profileAvatar');
      if (avatarEl) {
        avatarEl.src = user.avatar || avatarEl.getAttribute('data-default') || avatarEl.src;
        avatarEl.onerror = function () { avatarEl.src = avatarEl.getAttribute('data-default'); };
      }
    } else {
      console.error('Failed to load profile:', data.message);
      alert('Failed to load profile: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    alert('Error loading profile: ' + err.message);
  }
}

async function updateUserProfile() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  
  const address = document.getElementById('profileAddress').value.trim();
  const city = document.getElementById('profileCity').value.trim();
  const zip = document.getElementById('profileZip').value.trim();
  const phone = document.getElementById('profilePhone') ? document.getElementById('profilePhone').value.trim() : '';

  const successMsg = document.getElementById('successMsg');
  const errorMsg = document.getElementById('errorMsg');

  if (successMsg) successMsg.style.display = 'none';
  if (errorMsg) errorMsg.style.display = 'none';

  try {
    const response = await fetch(`/api/auth/user/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ phone, address, city, zip })
    });

    const data = await response.json();

    if (data.ok && data.user) {
      // Update form fields from returned user object to reflect saved values
      const user = data.user;
      document.getElementById('profileName').value = user.name || '';
      document.getElementById('profileEmail').value = user.email || '';
      if (document.getElementById('profilePhone')) document.getElementById('profilePhone').value = user.phone || '';
      document.getElementById('profileAddress').value = user.address || '';
      document.getElementById('profileCity').value = user.city || '';
      document.getElementById('profileZip').value = user.zip || '';

      // Persist some values locally for other parts of the app
      if (user.name) localStorage.setItem('userName', user.name);
      if (user.phone) localStorage.setItem('userPhone', user.phone);

      if (successMsg) {
        successMsg.textContent = 'Profile updated successfully!';
        successMsg.style.display = 'block';
      }
      if (errorMsg) errorMsg.style.display = 'none';
      return true;
    } else {
      if (errorMsg) {
        errorMsg.textContent = data.message || 'Failed to update profile';
        errorMsg.style.display = 'block';
      }
      if (successMsg) successMsg.style.display = 'none';
      return false;
    }
  } catch (err) {
    errorMsg.textContent = 'Error updating profile: ' + err.message;
    errorMsg.style.display = 'block';
    return false;
  }
}
