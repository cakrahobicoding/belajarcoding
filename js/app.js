/* ============================================================
   KodeMulai — app.js
   Inti aplikasi: manajemen "database" via localStorage.

   ⚠️ PENTING (baca README):
   Ini murni demo sisi-klien (client-side only). Semua data
   (akun, password, komentar) tersimpan di localStorage browser
   MASING-MASING pengguna — TIDAK ada server / database asli,
   jadi data TIDAK sinkron antar perangkat/pengguna lain.
   Untuk versi production yang layak dipakai publik di Vercel,
   ini wajib diganti dengan backend asli (lihat README.md).
   ============================================================ */

const KM = (() => {
  const USERS_KEY = 'km_users';
  const SESSION_KEY = 'km_session';
  const COMMENTS_KEY = 'km_comments';
  const UPMATERI_KEY = 'km_up_materi';

  const THEME_PRESETS = [
    { name: 'Periwinkle', value: '#7c9eff' },
    { name: 'Coral',      value: '#ff8a5c' },
    { name: 'Sky',        value: '#5ac8fa' },
    { name: 'Amber',      value: '#f4d35e' },
    { name: 'Mint',       value: '#6fcf97' },
    { name: 'Lavender',   value: '#a78bfa' },
    { name: 'Rose',       value: '#ff6b9d' },
  ];

  // Hash string sederhana (BUKAN kriptografi aman — hanya demo, jangan pakai di production)
  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return 'h' + Math.abs(h).toString(36) + str.length;
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function seed() {
    const users = getUsers();
    if (!users['ran']) {
      users['ran'] = {
        username: 'ran',
        passwordHash: simpleHash('ransukacoding'),
        isAdmin: true,
        bio: 'Admin & pembuat KodeMulai. Jaga sopan santun di kolom Q&A ya~ 🍵',
        banner: '',
        pfp: '',
        theme: '#f4d35e',
        joined: Date.now(),
      };
      saveUsers(users);
    }
  }

  function register(username, password) {
    username = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return { ok: false, msg: 'Username 3-20 karakter, hanya huruf/angka/underscore ya, Sensei!' };
    }
    if (password.length < 6) {
      return { ok: false, msg: 'Password minimal 6 karakter, Baka! Jangan asal-asalan.' };
    }
    const users = getUsers();
    if (users[username]) {
      return { ok: false, msg: 'Username itu sudah dipakai. Coba yang lain~' };
    }
    users[username] = {
      username,
      passwordHash: simpleHash(password),
      isAdmin: false,
      bio: '',
      banner: '',
      pfp: '',
      theme: '#7c9eff',
      joined: Date.now(),
    };
    saveUsers(users);
    return { ok: true };
  }

  function login(username, password) {
    username = username.trim().toLowerCase();
    const users = getUsers();
    const u = users[username];
    if (!u || u.passwordHash !== simpleHash(password)) {
      return { ok: false, msg: 'Username atau password salah. Coba lagi, Sensei!' };
    }
    localStorage.setItem(SESSION_KEY, username);
    return { ok: true };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    location.href = 'index.html';
  }

  function currentUser() {
    const uname = localStorage.getItem(SESSION_KEY);
    if (!uname) return null;
    const users = getUsers();
    return users[uname] || null;
  }

  function updateCurrentUser(patch) {
    const uname = localStorage.getItem(SESSION_KEY);
    if (!uname) return;
    const users = getUsers();
    users[uname] = { ...users[uname], ...patch };
    saveUsers(users);
  }

  function getComments() {
    return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
  }
  function saveComments(list) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(list));
  }

  function getUpMateri() {
    return JSON.parse(localStorage.getItem(UPMATERI_KEY) || '[]');
  }
  function saveUpMateri(list) {
    localStorage.setItem(UPMATERI_KEY, JSON.stringify(list));
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'baru saja';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} hari lalu`;
    return new Date(ts).toLocaleDateString('id-ID');
  }

  function applyTheme(hex) {
    if (!hex) return;
    document.documentElement.style.setProperty('--user-accent', hex);
  }

  function initials(name) {
    return (name || '?').slice(0, 2).toUpperCase();
  }

  function renderNavbar(active) {
    const root = document.getElementById('navbar-root');
    if (!root) return;
    const user = currentUser();

    const links = [
      { href: 'index.html', label: 'Belajar', key: 'belajar' },
      { href: 'index.html#qa', label: 'Tanya Jawab', key: 'qa' },
    ];

    const linksHtml = links.map(l =>
      `<a href="${l.href}" style="${active === l.key ? 'color:var(--text)' : ''}">${l.label}</a>`
    ).join('');

    let ctaHtml;
    if (user) {
      const avatarStyle = user.pfp
        ? `background-image:url('${escapeHtml(user.pfp)}')`
        : `background:${user.theme || 'var(--accent-primary)'}`;
      ctaHtml = `
        <a href="profile.html" class="btn btn-ghost btn-sm" style="display:flex;align-items:center;gap:8px;">
          <span class="qa-avatar" style="width:22px;height:22px;font-size:0.6rem;${avatarStyle}">${user.pfp ? '' : initials(user.username)}</span>
          ${escapeHtml(user.username)}
          ${user.isAdmin ? '<span class="admin-badge-nav">ADMIN</span>' : ''}
        </a>
        <button class="btn btn-ghost btn-sm" id="btn-logout">Keluar</button>
      `;
    } else {
      ctaHtml = `
        <a href="login.html" class="btn btn-ghost btn-sm">Masuk</a>
        <a href="register.html" class="btn btn-primary btn-sm">Buat Akun</a>
      `;
    }

    root.innerHTML = `
      <div class="navbar">
        <div class="navbar-inner">
          <a href="index.html" class="brand">
            <span class="brand-badge">&lt;/&gt;</span> KodeMulai
          </a>
          <nav class="nav-links">${linksHtml}</nav>
          <div class="nav-cta">${ctaHtml}</div>
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  return {
    THEME_PRESETS, seed, register, login, logout, currentUser, updateCurrentUser,
    getComments, saveComments, getUpMateri, saveUpMateri,
    escapeHtml, timeAgo, applyTheme, initials, renderNavbar, getUsers,
  };
})();

// Seed admin account + apply saved theme on every page load
KM.seed();
(() => {
  const u = KM.currentUser();
  if (u && u.theme) KM.applyTheme(u.theme);
})();
