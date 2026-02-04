document.addEventListener('DOMContentLoaded', () => {
  const changeBtn = document.createElement('button');
  changeBtn.id = 'changeAvatarBtn';
  changeBtn.className = 'btn btn-sm btn-outline-dark mt-2';
  changeBtn.innerText = 'Change Avatar';

  const avatarEl = document.getElementById('profileAvatar');
  if (!avatarEl) return;

  // Insert button after avatar
  avatarEl.parentNode.insertBefore(changeBtn, avatarEl.nextSibling);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  input.id = 'avatarFileInput';
  document.body.appendChild(input);

  const originalSrc = avatarEl.src;

  // Ensure user is logged in before allowing file selection
  changeBtn.addEventListener('click', () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
      alert('Please login to upload an avatar');
      window.location.href = '/login.html';
      return;
    }
    input.click();
  });

  input.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    const msgId = 'avatarUploadMsg';
    let msgEl = document.getElementById(msgId);
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.id = msgId;
      msgEl.className = 'small mt-2';
      changeBtn.parentNode.insertBefore(msgEl, changeBtn.nextSibling);
    }
    msgEl.textContent = '';

    if (!file) return;

    // Quick client-side size/type check
    if (!file.type.startsWith('image/')) {
      msgEl.textContent = 'Please select an image file';
      msgEl.style.color = 'red';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      msgEl.textContent = 'Please select an image smaller than 5MB';
      msgEl.style.color = 'red';
      return;
    }

    // Show a preview while uploading
    const reader = new FileReader();
    reader.onload = () => {
      avatarEl.src = reader.result;
    };
    reader.readAsDataURL(file);

    // Upload
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    if (!userId || !token) {
      msgEl.textContent = 'Please login to upload an avatar';
      msgEl.style.color = 'red';
      avatarEl.src = originalSrc;
      return;
    }

    const form = new FormData();
    form.append('avatar', file);

    try {
      changeBtn.disabled = true;
      changeBtn.innerText = 'Uploading...';
      msgEl.textContent = 'Uploading...';
      msgEl.style.color = 'black';

      const base = window.API_BASE || '';
      const res = await fetch(`${base}/api/auth/user/${userId}/avatar`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: form
      });

      let data = null;
      try { data = await res.json(); } catch (e) { /* non-json response */ }

      changeBtn.disabled = false;
      changeBtn.innerText = 'Change Avatar';

      if (!res.ok) {
        const serverMsg = (data && data.message) ? data.message : `Status ${res.status}`;
        msgEl.textContent = 'Upload failed: ' + serverMsg;
        msgEl.style.color = 'red';
        avatarEl.src = originalSrc;
        console.error('Avatar upload failed', res.status, data);
        return;
      }

      if (!data || !data.ok) {
        const serverMsg = (data && data.message) ? data.message : 'Unknown error';
        msgEl.textContent = 'Upload failed: ' + serverMsg;
        msgEl.style.color = 'red';
        avatarEl.src = originalSrc;
        return;
      }

      // Update stored avatar and UI
      const user = data.user;
      avatarEl.src = user.avatar || avatarEl.getAttribute('data-default');
      if (user.name) localStorage.setItem('userName', user.name);
      msgEl.textContent = 'Avatar updated successfully';
      msgEl.style.color = 'green';
    } catch (err) {
      console.error('Avatar upload error', err);
      msgEl.textContent = 'Avatar upload failed (network error)';
      msgEl.style.color = 'red';
      avatarEl.src = originalSrc;
      changeBtn.disabled = false;
      changeBtn.innerText = 'Change Avatar';
    }
  });
});