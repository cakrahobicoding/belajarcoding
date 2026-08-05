const KM = (() => {
  const TOKEN_KEY = 'km_token';

  const THEME_PRESETS = [
    { name: 'Periwinkle', value: '#7c9eff' },
    { name: 'Coral',      value: '#ff8a5c' },
    { name: 'Sky',        value: '#5ac8fa' },
    { name: 'Amber',      value: '#f4d35e' },
    { name: 'Mint',       value: '#6fcf97' },
    { name: 'Lavender',   value: '#a78bfa' },
    { name: 'Rose',       value: '#ff6b9d' },
  ];

  let cachedUser = null;

  async function api(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch (e) {
      throw new Error('Nggak bisa menghubungi server. Cek API_BASE di js/api-config.js dan pastikan backend-nya jalan~');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request gagal (${res.status})`);
    return data;
  }

  async function register(username, password, turnstileToken) {
    try {
      await api('/api/register', { method: 'POST', body: JSON.stringify({ username, password, turnstileToken }) });
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  async function login(username, password, turnstileToken) {
    try {
      const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password, turnstileToken }) });
      localStorage.setItem(TOKEN_KEY, data.token);
      cachedUser = data.user;
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  async function logout() {
    try { await api('/api/logout', { method: 'POST' }); } catch (e) { /* abaikan */ }
    localStorage.removeItem(TOKEN_KEY);
    location.href = 'index.html';
  }

  async function refreshCurrentUser() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { cachedUser = null; return null; }
    try {
      const data = await api('/api/me');
      cachedUser = data.user;
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY);
      cachedUser = null;
    }
    return cachedUser;
  }

  function currentUser() {
    return cachedUser;
  }

  async function getUserByName(username) {
    try {
      const data = await api(`/api/users/${encodeURIComponent(username.toLowerCase())}`);
      return data.user;
    } catch (e) {
      return null;
    }
  }

  async function getUsersMap() {
    const data = await api('/api/users');
    return data.users;
  }

  async function updateCurrentUser(patch) {
    const data = await api('/api/users/me', { method: 'PATCH', body: JSON.stringify(patch) });
    cachedUser = data.user;
  }

  // ---------- Komentar (Q&A) ----------
  // Tidak ada websocket di sini (biar backend tetap simpel) — dipoll tiap
  // beberapa detik biar tetap kelihatan "hampir realtime" ke semua user.
  function listenComments(callback, intervalMs = 4000) {
    let stopped = false;
    async function tick() {
      if (stopped) return;
      try {
        const data = await api('/api/comments');
        callback(data.comments);
      } catch (e) { /* diamkan, coba lagi di tick berikutnya */ }
      if (!stopped) setTimeout(tick, intervalMs);
    }
    tick();
    return () => { stopped = true; };
  }

  async function fetchCommentsOnce() {
    const data = await api('/api/comments');
    return data.comments;
  }

  async function addComment(author, text) {
    await api('/api/comments', { method: 'POST', body: JSON.stringify({ text }) });
  }

  async function addReply(commentId, reply) {
    await api(`/api/comments/${encodeURIComponent(commentId)}/replies`, {
      method: 'POST', body: JSON.stringify({ text: reply.text }),
    });
  }

  // ---------- Up Materi ----------
  async function getUpMateriByAuthor(username) {
    const data = await api(`/api/up-materi?author=${encodeURIComponent(username)}`);
    return data.upMateri;
  }

  async function addUpMateri(author, title, content) {
    await api('/api/up-materi', { method: 'POST', body: JSON.stringify({ title, content }) });
  }

  async function uploadFile(file) {
    const token = localStorage.getItem(TOKEN_KEY);
    const formData = new FormData();
    formData.append('file', file);
    let res;
    try {
      res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    } catch (e) {
      throw new Error('Nggak bisa menghubungi server buat upload file.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload gagal.');
    return data.url;
  }

  // ---------- DM (Pesan Langsung) ----------
  async function getDmConversations() {
    const data = await api('/api/dm/conversations');
    return data.conversations;
  }

  async function getDmMessages(username) {
    const data = await api(`/api/dm/${encodeURIComponent(username)}`);
    return data.messages;
  }

  async function sendDm(username, text) {
    await api(`/api/dm/${encodeURIComponent(username)}`, { method: 'POST', body: JSON.stringify({ text }) });
  }

  // ---------- Util ----------
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
      { href: 'index.html', label: 'Home', key: 'home' },
      { href: 'dashboard.html', label: 'Dashboard', key: 'dashboard', authOnly: true },
      { href: 'chat.html', label: 'Chat', key: 'chat', authOnly: true },
    ];

    const linksHtml = links
      .filter(l => !l.authOnly || user)
      .map(l => `<a href="${l.href}" class="${active === l.key ? 'active' : ''}">${l.label}</a>`)
      .join('');

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

  // Dipanggil sekali di tiap halaman sebelum render apapun.
  async function boot(activeNav) {
    await refreshCurrentUser();
    renderNavbar(activeNav);
    const u = currentUser();
    if (u && u.theme) applyTheme(u.theme);
  }

  return {
    THEME_PRESETS, boot, register, login, logout, refreshCurrentUser, currentUser, updateCurrentUser,
    getUserByName, getUsersMap, uploadFile,
    listenComments, fetchCommentsOnce, addComment, addReply,
    getUpMateriByAuthor, addUpMateri,
    getDmConversations, getDmMessages, sendDm,
    escapeHtml, timeAgo, applyTheme, initials, renderNavbar,
  };
})();
