document.addEventListener("DOMContentLoaded", function () {
  // Hide Sign in button only on login page
  const signinBtn =
    document.querySelector('.signin-btn') ||           // class
    document.querySelector('#signupin') ||             // id
    document.querySelector('a[href*="signin"]');        // link

  if (signinBtn) {
    signinBtn.style.display = 'none';
  }
});

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.textContent = "";

  // Email validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    errorMsg.textContent = "Please enter a valid email address.";
    return;
  }

  // Password validation
  if (password.length < 6) {
    errorMsg.textContent = "Password must be at least 6 characters long.";
    return;
  }

  // Send to backend
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!data.ok) {
      errorMsg.textContent = data.message || 'Login failed';
      return;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('userName', data.name || email.split('@')[0]);
    localStorage.setItem('userRole', data.role || 'user');
    
    // Redirect admin users to admin panel
    if (data.role === 'admin') {
      alert("Login successful! Redirecting to admin panel...");
      window.location.href = '/admin/index.html';
    } else {
      alert("Login successful!");
      window.location.href = '/index.html';
    }
  } catch (err) {
    errorMsg.textContent = 'Login error: ' + err.message;
  }
});
