// Admin Authentication Check
// This file should be included in all admin pages

async function checkAdminAuth() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');

  // If no token or userId, redirect to login
  if (!token || !userId) {
    alert('Please login to access admin panel');
    window.location.href = '/login.html';
    return false;
  }

  // If role is not admin, check with backend
  if (userRole !== 'admin') {
    try {
      const response = await fetch(`/api/auth/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.ok && data.user && data.user.role === 'admin') {
        // Update role in localStorage
        localStorage.setItem('userRole', 'admin');
        return true;
      } else {
        alert('Access denied. Admin privileges required.');
        window.location.href = '/index.html';
        return false;
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      alert('Error verifying admin access');
      window.location.href = '/login.html';
      return false;
    }
  }

  return true;
}

// Check admin auth on page load
document.addEventListener('DOMContentLoaded', async () => {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) {
    // Redirect will happen in checkAdminAuth
    return;
  }
  
  // If admin, you can initialize admin-specific functionality here
  console.log('Admin access granted');
});
