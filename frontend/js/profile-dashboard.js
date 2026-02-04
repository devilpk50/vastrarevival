document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  if (!userId || !token) {
    // Not logged in - show message in profile area
    document.getElementById('tabProfile').innerHTML = '<p class="text-muted">Please login to view dashboard.</p>';
    return;
  }

  // Wire nav
  document.querySelectorAll('#dashboardNav .nav-link').forEach(a => {
    a.addEventListener('click', (e) => {
      document.querySelectorAll('#dashboardNav .nav-link').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      showTab(a.dataset.tab);
    });
  });

  // Edit / Save profile
  const editBtn = document.getElementById('editProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  editBtn.addEventListener('click', () => {
    setEditable(true);
    const addr = document.getElementById('profileAddress');
    if (addr) {
      addr.focus();
      addr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  saveBtn.addEventListener('click', async () => {
    await updateUserProfile();
    setEditable(false);
    await refreshStatsAndOrders();
  });

  document.getElementById('logoutBtnProfile').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    window.location.href = '/index.html';
  });

  // Load profile & orders
  await loadUserProfile(); // from profile.js
  await refreshStatsAndOrders();

  // Make address fields editable by default (so users can update address quickly)
  try {
    const addr = document.getElementById('profileAddress');
    const city = document.getElementById('profileCity');
    const zip = document.getElementById('profileZip');
    const saveBtn = document.getElementById('saveProfileBtn');
    if (addr) addr.disabled = false;
    if (city) city.disabled = false;
    if (zip) zip.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
  } catch (e) {
    // ignore if elements aren't present yet
  }

  // Helper functions
  function showTab(tab) {
    ['profile','orders'].forEach(t => {
      const el = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
      if (!el) return;
      el.style.display = (t === tab) ? 'block' : 'none';
    });
  }

  function setEditable(enabled) {
    document.getElementById('profileName').disabled = !enabled;
    document.getElementById('profileEmail').disabled = !enabled;
    document.getElementById('profilePhone').disabled = !enabled;
    document.getElementById('profileAddress').disabled = !enabled;
    document.getElementById('profileCity').disabled = !enabled;
    document.getElementById('profileZip').disabled = !enabled;
    saveBtn.disabled = !enabled;
  }

  async function refreshStatsAndOrders() {
    // Update sidebar name/email
    const name = document.getElementById('profileName').value || localStorage.getItem('userName') || 'User';
    const email = document.getElementById('profileEmail').value || '';
    document.getElementById('sidebarName').innerText = name;
    document.getElementById('sidebarEmail').innerText = email;

    // Orders
    const orders = await window.getProfileOrders();
    const orderCount = orders.length;
    const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
    document.getElementById('statOrders').innerText = orderCount;
    document.getElementById('statSpent').innerText = '₹ ' + totalSpent;

    // Render orders in Orders tab using existing renderer (profile-orders already renders on load)
    if (orders.length > 0) {
      document.getElementById('ordersLoading').style.display = 'none';
      document.getElementById('orderHistory').style.display = 'block';
      document.getElementById('noOrders').style.display = 'none';
      // Re-render via existing function by calling loadOrders (function local to profile-orders.js), but if not available, silently render using existing cached data
      if (typeof loadOrders === 'function') {
        // loadOrders is defined inside profile-orders.js - calling it will re-render
        try { await loadOrders(); } catch (e) { /* ignore */ }
      } else if (window.profileOrders) {
        // fallback rendering (simple)
        const historyEl = document.getElementById('orderHistory');
        historyEl.innerHTML = '';
        window.profileOrders.forEach(o => {
          const div = document.createElement('div');
          div.className = 'order-card';
          div.innerHTML = `<div class="order-meta"><strong>Order #${o._id}</strong> <div class="text-muted small">${new Date(o.createdAt).toLocaleString()}</div></div><div>Total: ₹ ${o.total}</div>`;
          historyEl.appendChild(div);
        });
      }
    } else {
      document.getElementById('ordersLoading').style.display = 'none';
      document.getElementById('orderHistory').style.display = 'none';
      document.getElementById('noOrders').style.display = 'block';
    }
  }

});