const loginForm = document.getElementById('loginForm');
const alertBox = document.getElementById('alert'); // ← INI YANG KURANG

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('https://srv1222479.hstgr.cloud/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      // 🔑 INI WAJIB
      sessionStorage.setItem('admin_logged_in', 'true');
      sessionStorage.setItem('just_logged_in', 'true');

      alertBox.style.display = 'block';
      alertBox.className = 'alert alert-success text-center mb-3 py-2';
      alertBox.textContent = data.message;

      window.location.replace('/dashboard');
    } else {
      alertBox.style.display = 'block';
      alertBox.className = 'alert alert-danger text-center mb-3 py-2';
      alertBox.textContent = data.message;
    }

  } catch (err) {
    console.error(err);
    alertBox.style.display = 'block';
    alertBox.className = 'alert alert-danger text-center mb-3 py-2';
    alertBox.textContent = 'Terjadi kesalahan server.';
  }
});

