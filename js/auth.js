// ===============================
// GLOBAL AUTH (FIXED VERSION)
// ===============================
const BASE_URL = 'https://srv1222479.hstgr.cloud';
const LOGOUT_URL = `${BASE_URL}/api/admin/logout`;
const PROFILE_URL = `${BASE_URL}/api/admin/profile`;
const LOGIN_PAGE = '/login';

const IDLE_LIMIT = 30 * 60 * 1000; // 30 menit
let idleTimer;

// ===== IDLE LOGOUT =====
function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    try {
      await fetch(LOGOUT_URL, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Logout request failed', e);
    } finally {
      sessionStorage.clear();
      window.location.replace(`${LOGIN_PAGE}?reason=idle`);
    }
  }, IDLE_LIMIT);
}

['click','mousemove','keydown','scroll','touchstart'].forEach(evt =>
  document.addEventListener(evt, resetIdleTimer)
);
resetIdleTimer();

// ===== LOGOUT BUTTON =====
function setupLogoutButton() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      await fetch(LOGOUT_URL, {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      sessionStorage.clear();
      window.location.replace(`${LOGIN_PAGE}?status=logout`);
    }
  });
}

// ===== SESSION CHECK (AMAN) =====
async function forceCheckSession() {
  try {
    const res = await fetch(
      'https://srv1222479.hstgr.cloud/api/admin/profile',
      { credentials: 'include' }
    );

    if (res.status === 401) {
      sessionStorage.removeItem('admin_logged_in');
      window.location.replace('/login?reason=session_expired');
    }
  } catch (err) {
    sessionStorage.removeItem('admin_logged_in');
    window.location.replace('/login?reason=error');
  }
}

// ===== BFCache HANDLING =====
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    forceCheckSession();
  }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setupLogoutButton();
  forceCheckSession();
});

