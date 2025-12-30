// ===============================
// GLOBAL AUTH (IDLE + LOGOUT + SESSION CHECK + BFCache)
// ===============================
const LOGOUT_URL = '/api/admin/logout';
const LOGIN_PAGE = '/login';
const IDLE_LIMIT = 30 * 60 * 1000; // 30 menit
let idleTimer;

// ===== IDLE LOGOUT =====
function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    try {
      await fetch(LOGOUT_URL, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.warn('Logout request failed', e);
    } finally {
      sessionStorage.removeItem('admin_logged_in');
      window.location.replace(`${LOGIN_PAGE}?reason=idle`);
    }
  }, IDLE_LIMIT);
}

// Pasang event listener untuk semua aktivitas user
['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
  document.addEventListener(evt, resetIdleTimer)
);
resetIdleTimer();

// ===== LOGOUT BUTTON =====
function setupLogoutButton() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      await fetch(LOGOUT_URL, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.warn('Logout request failed', e);
    } finally {
      sessionStorage.removeItem('admin_logged_in');
      window.location.replace(`${LOGIN_PAGE}?status=logout`);
    }
  });
}

// ===== SESSION CHECK =====
async function forceCheckSession() {
  try {
    const res = await fetch(
      'https://srv1222479.hstgr.cloud/api/admin/profile',
      { credentials: 'include' }
    );

    if (!res.ok) {
      window.location.href = '/login';
    }
  } catch (err) {
    console.error(err);
    window.location.href = '/login';
  }
}


// ===== BFCache & first load handling =====
window.addEventListener('pageshow', event => {
  const justLoggedIn = sessionStorage.getItem('just_logged_in');
  if (event.persisted || !sessionStorage.getItem('admin_logged_in')) {
    // kalau balik dari back cache atau belum login
    forceCheckSession();
  } else if (justLoggedIn) {
    // delay sebentar untuk menghindari race condition login → cek session
    setTimeout(() => {
      forceCheckSession();
      sessionStorage.removeItem('just_logged_in');
    }, 200); // 200ms delay cukup
  }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setupLogoutButton();
  const justLoggedIn = sessionStorage.getItem('just_logged_in');
  if (!justLoggedIn) forceCheckSession();
});



