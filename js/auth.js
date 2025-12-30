// ===============================
// GLOBAL AUTH (DEV SAFE VERSION)
// ===============================
const BASE_URL = 'https://srv1222479.hstgr.cloud';
const LOGOUT_URL = `${BASE_URL}/api/admin/logout`;
const PROFILE_URL = `${BASE_URL}/api/admin/profile`;
const LOGIN_PAGE = '/login';

const IDLE_LIMIT = 30 * 60 * 1000; // 30 menit
let idleTimer;

// ===== IDLE LOGOUT (INI BOLEH LOGOUT) =====
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

// reset timer tiap ada aktivitas
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
    } catch (e) {
      console.warn(e);
    } finally {
      sessionStorage.clear();
      window.location.replace(`${LOGIN_PAGE}?status=logout`);
    }
  });
}

// ===== SESSION CHECK (DEV MODE: JANGAN AUTO REDIRECT) =====
async function forceCheckSession() {
  try {
    const res = await fetch(PROFILE_URL, {
      credentials: 'include'
    });

    if (res.status === 401) {
      // ⚠️ DEV MODE:
      // kemungkinan backend restart / python app.py
      console.warn('Session invalid (server restart / dev mode)');
      return; // ⛔ JANGAN redirect
    }

  } catch (err) {
    console.warn('Session check failed (server down?)', err);
    return; // ⛔ JANGAN redirect
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
