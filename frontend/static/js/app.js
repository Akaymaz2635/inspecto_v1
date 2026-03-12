import { register, start, navigate } from './router.js';
import { dashboardPage }       from './pages/dashboard.js';
import { inspectionsPage }     from './pages/inspections.js';
import { inspectionFormPage }  from './pages/inspection-form.js';
import { inspectionDetailPage } from './pages/inspection-detail.js';
import { settingsPage }        from './pages/settings.js';

// ── Routes ─────────────────────────────────────────────────
register('/', dashboardPage);
register('/inspections', inspectionsPage);
register('/inspections/new', () => inspectionFormPage(null));
register('/inspections/:id/edit', ({ id }) => inspectionFormPage(Number(id)));
register('/inspections/:id', ({ id }) => inspectionDetailPage(Number(id)));
register('/settings', settingsPage);

// ── Active nav highlighting ─────────────────────────────────
function updateNav() {
  const hash = location.hash.slice(1) || '/';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const route = link.dataset.route;
    let active = false;
    if (route === 'dashboard')    active = hash === '/' || hash === '';
    if (route === 'inspections')  active = hash.startsWith('/inspections');
    if (route === 'settings')     active = hash.startsWith('/settings');
    link.classList.toggle('active', active);
  });
}
window.addEventListener('hashchange', updateNav);
updateNav();

// ── Global Toast ────────────────────────────────────────────
window.toast = function (msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('hiding');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    // Fallback
    setTimeout(() => el.remove(), 400);
  }, 3000);
};

// ── Global Modal ────────────────────────────────────────────
window.modal = {
  _onClose: null,
  open(html, { wide = false, onClose = null } = {}) {
    const overlay   = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    container.className = 'modal-container' + (wide ? ' modal-camera' : '');
    container.innerHTML = html;
    overlay.classList.remove('hidden');
    this._onClose = onClose;

    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) this.close();
    };
    // Close on Escape
    this._escHandler = (e) => { if (e.key === 'Escape') this.close(); };
    window.addEventListener('keydown', this._escHandler);
  },
  close() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    overlay.onclick = null;
    if (this._escHandler) {
      window.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
    if (this._onClose) {
      this._onClose();
      this._onClose = null;
    }
  },
};

// ── Global navigate helper (pages can call window.navigate) ─
window.navigate = navigate;

// ── Açık muayene göstergesi ─────────────────────────────────
async function refreshOpenBadge() {
  try {
    const { api } = await import('./api.js');
    const list = await api.inspections.list({ status: 'open' });
    const el   = document.getElementById('open-insp-indicator');
    const txt  = document.getElementById('open-insp-text');
    if (!el || !txt) return;
    if (list.length === 0) {
      el.classList.add('hidden');
    } else {
      txt.textContent = `${list.length} Açık Muayene`;
      el.classList.remove('hidden');
    }
  } catch { /* sessizce geç */ }
}
window.addEventListener('hashchange', refreshOpenBadge);
refreshOpenBadge();

// ── Tablet Mode ─────────────────────────────────────────────
function applyTabletMode(enabled) {
  document.body.classList.toggle('tablet-mode', enabled);
  if (!enabled) document.body.classList.remove('sidebar-expanded');
  const btn  = document.getElementById('tablet-toggle-btn');
  if (!btn) return;
  btn.querySelector('.tablet-toggle-icon').textContent = enabled ? '🖥' : '📱';
  btn.querySelector('.tablet-toggle-label').textContent = enabled ? 'Masaüstü Modu' : 'Tablet Modu';
}

(function initTabletMode() {
  const saved = localStorage.getItem('tabletMode');
  // Auto-detect touch device on first visit; Surface Pro in tablet mode reports maxTouchPoints > 0
  const autoTouch = navigator.maxTouchPoints > 0;
  const enabled = saved !== null ? saved === '1' : autoTouch;
  applyTabletMode(enabled);
})();

document.getElementById('tablet-toggle-btn').addEventListener('click', () => {
  const enabled = document.body.classList.toggle('tablet-mode');
  localStorage.setItem('tabletMode', enabled ? '1' : '0');
  applyTabletMode(enabled);
});

// Sidebar expand / collapse (tablet mode)
document.getElementById('sidebar-hamburger').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-expanded');
});

document.getElementById('sidebar-overlay').addEventListener('click', () => {
  document.body.classList.remove('sidebar-expanded');
});

// Close expanded sidebar when navigating
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.body.classList.remove('sidebar-expanded');
  });
});

// ── Start router ────────────────────────────────────────────
start();
