const loginForm = document.getElementById('loginForm');
const alertBox = document.getElementById('alert');

loginForm.setAttribute('autocomplete','off');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('http://72.60.78.25:5002/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  
      body: JSON.stringify({ username, password })
    });

    let data;
    try { data = await res.json(); } 
    catch { 
      alertBox.style.display = 'block';
      alertBox.className = 'alert alert-danger text-center mb-3 py-2';
      alertBox.textContent = 'Gagal terhubung ke server.';
      return; 
    }

    if (data.success) {
      alertBox.style.display = 'block';
      alertBox.className = 'alert alert-success text-center mb-3 py-2';
      alertBox.textContent = data.message;
      window.location.replace('/dashboard'); // ganti href -> replace
    } else {
      alertBox.style.display = 'block';
      alertBox.className = 'alert alert-danger text-center mb-3 py-2';
      alertBox.textContent = data.message;

      // bersihkan input agar tidak nempel
      document.getElementById('username').value = '';
      document.getElementById('password').value = '';
    }

  } catch (err) {
    console.error(err);
    alertBox.style.display = 'block';
    alertBox.className = 'alert alert-danger text-center mb-3 py-2';
    alertBox.textContent = 'Terjadi kesalahan server.';
  }

  setTimeout(() => { alertBox.style.display = 'none'; }, 3000);
});

