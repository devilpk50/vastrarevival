document.addEventListener("DOMContentLoaded", function () {
  // Hide Sign in button only on signup page
  const signinBtn =
    document.querySelector('.signin-btn') ||           // class
    document.querySelector('#signupin') ||             // id
    document.querySelector('a[href*="signin"]');        // link

  if (signinBtn) {
    signinBtn.style.display = 'none';
  }

  // Real-time phone validation feedback
  const phoneInput = document.getElementById('phone');
  const phoneHelp = document.getElementById('phoneHelp');
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      const raw = this.value.replace(/[\s\-()]/g, '');
      const local10 = /^\d{10}$/.test(raw);
      const ok = /^\+\d{10,15}$/.test(raw) || local10;
      if (phoneHelp) {
        phoneHelp.style.color = ok ? 'green' : '';
        if (local10) {
          phoneHelp.textContent = `Phone looks good — will be saved as +977${raw.replace(/^0+/, '')}`;
        } else {
          phoneHelp.textContent = ok ? 'Phone looks good' : 'Format: 10 digits (e.g., 9876543210) or +countrycode (e.g., +9779876543210)';
        }
      }
      this.classList.toggle('is-invalid', !ok && raw.length > 0);
    });
  }
});

document.getElementById("signupForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const phone = document.getElementById("phone").value.trim();
  const name = document.getElementById("name")?.value.trim() || email.split('@')[0];
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.textContent = "";

  // Email validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    errorMsg.textContent = "Please enter a valid email address.";
    return;
  }

  // Password length
  if (password.length < 6) {
    errorMsg.textContent = "Password must be at least 6 characters long.";
    return;
  }

  // Password match
  if (password !== confirmPassword) {
    errorMsg.textContent = "Passwords do not match.";
    return;
  }

  // Phone number validation: accept +countrycode digits (E.164) or 10-digit local numbers (auto-prefix +977)
  function normalizePhone(p) {
    if (!p) return p;
    let n = p.toString().replace(/[\s\-()]/g, '');
    // If user entered 10 digits, assume Nepal and prefix +977
    if (/^\d{10}$/.test(n)) {
      n = '+977' + n.replace(/^0+/, '');
    }
    return n;
  }
  const phoneNormalized = normalizePhone(phone);
  const e164Pattern = /^\+\d{10,15}$/;
  if (!e164Pattern.test(phoneNormalized)) {
    errorMsg.textContent = "Phone must be 10 digits (e.g., 9876543210) or include country code (e.g., +9779876543210).";
    return;
  }

  // Send to backend
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone: phoneNormalized })
    });
    const data = await response.json();
    if (!data.ok) {
      errorMsg.textContent = data.message || 'Registration failed';
      return;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('userName', name);
    localStorage.setItem('userRole', data.role || 'user');
    
    // Redirect admin users to admin panel
    if (data.role === 'admin') {
      alert("Registration successful! Redirecting to admin panel...");
      window.location.href = '/admin/index.html';
    } else {
      alert("Registration successful!");
      window.location.href = '/index.html';
    }
  } catch (err) {
    errorMsg.textContent = 'Registration error: ' + err.message;
  }
});
