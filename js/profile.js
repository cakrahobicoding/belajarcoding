/* ============================================================
   profile.js — render profil, tab, kustomisasi, up materi.
   Sekarang baca/tulis ke Firestore, jadi profil kamu bisa
   dilihat siapapun lewat link profile.html?user=USERNAME.
   ============================================================ */

let viewedUser = null;
let isOwner = false;

async function initProfilePage() {
  await KM.boot('');

  const me = KM.currentUser();
  const params = new URLSearchParams(location.search);
  const targetUsername = params.get('user');

  if (!targetUsername && !me) {
    document.getElementById('not-logged-in').style.display = 'block';
    return;
  }

  if (targetUsername) {
    viewedUser = await KM.getUserByName(targetUsername);
    if (!viewedUser) {
      document.getElementById('not-logged-in').innerHTML =
        `<p style="color:var(--text-dim);margin-bottom:16px;">Wah, user "${KM.escapeHtml(targetUsername)}" nggak ketemu, Sensei. Salah ketik mungkin? 😅</p>`;
      document.getElementById('not-logged-in').style.display = 'block';
      return;
    }
    isOwner = !!me && me.username === viewedUser.username;
  } else {
    viewedUser = me;
    isOwner = true;
  }

  document.getElementById('profile-root').style.display = 'block';
  KM.applyTheme(viewedUser.theme || '#7c9eff');

  renderProfileHeader();
  renderTabs();
  renderUpMateriList();
  renderActivity();
  if (isOwner) {
    renderThemeSwatches();
    fillSettingsForm();
  } else if (me) {
    const btn = document.getElementById('btn-message-user');
    btn.style.display = 'inline-flex';
    btn.href = `chat.html?user=${encodeURIComponent(viewedUser.username)}`;
  }
  wireEvents();
}

function renderTabs() {
  if (!isOwner) {
    const settingsTab = document.querySelector('[data-tab="pengaturan"]');
    if (settingsTab) settingsTab.style.display = 'none';
    const composer = document.getElementById('up-materi-composer');
    if (composer) composer.style.display = 'none';
  }
}

function renderProfileHeader() {
  const u = viewedUser;
  const banner = document.getElementById('profile-banner');
  const pfp = document.getElementById('profile-pfp');

  banner.style.backgroundImage = u.banner ? `url('${u.banner}')` : 'none';

  if (u.pfp) {
    pfp.style.backgroundImage = `url('${u.pfp}')`;
    pfp.textContent = '';
  } else {
    pfp.style.backgroundImage = 'none';
    pfp.textContent = KM.initials(u.username);
  }

  document.getElementById('profile-name').childNodes[0].nodeValue = u.username + ' ';
  document.getElementById('profile-handle').textContent = '@' + u.username;
  document.getElementById('profile-bio').textContent = u.bio || (isOwner ? 'Belum ada bio. Yuk isi di tab Pengaturan~' : 'Belum ada bio.');
  document.getElementById('profile-admin-badge').style.display = u.isAdmin ? 'inline-block' : 'none';
}

function renderThemeSwatches() {
  const wrap = document.getElementById('theme-swatches');
  if (!wrap) return;
  wrap.innerHTML = KM.THEME_PRESETS.map(t => `
    <div class="swatch ${viewedUser.theme === t.value ? 'active' : ''}" style="background:${t.value}" data-color="${t.value}" title="${t.name}"></div>
  `).join('');

  wrap.addEventListener('click', async (e) => {
    const sw = e.target.closest('.swatch');
    if (!sw) return;
    await KM.updateCurrentUser({ theme: sw.dataset.color });
    viewedUser.theme = sw.dataset.color;
    KM.applyTheme(sw.dataset.color);
    renderThemeSwatches();
    renderProfileHeader();
    KM.renderNavbar('');
  });
}

function fillSettingsForm() {
  document.getElementById('input-bio').value = viewedUser.bio || '';
  const previewPfp = document.getElementById('preview-pfp');
  const previewBanner = document.getElementById('preview-banner');
  if (previewPfp) previewPfp.style.backgroundImage = viewedUser.pfp ? `url('${viewedUser.pfp}')` : 'none';
  if (previewBanner) previewBanner.style.backgroundImage = viewedUser.banner ? `url('${viewedUser.banner}')` : 'none';
}

async function handleImageUpload(fileInput, field, previewEl) {
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('Format harus PNG atau JPG ya, Sensei!');
      fileInput.value = '';
      return;
    }
    try {
      const url = await KM.uploadFile(file);
      await KM.updateCurrentUser({ [field]: url });
      viewedUser = KM.currentUser();
      if (previewEl) previewEl.style.backgroundImage = `url('${url}')`;
      renderProfileHeader();
      KM.renderNavbar('');
    } catch (e) {
      alert(`Gagal upload: ${e.message}`);
    }
    fileInput.value = '';
  });
}

async function renderUpMateriList() {
  const wrap = document.getElementById('up-materi-list');
  wrap.innerHTML = `<div class="empty-state">Memuat materi... 🍵</div>`;
  const list = await KM.getUpMateriByAuthor(viewedUser.username);

  if (list.length === 0) {
    wrap.innerHTML = `<div class="empty-state">${isOwner ? 'Belum ada materi yang kamu upload. Coba tulis satu di atas~ ≧﹏≦' : 'Belum ada materi yang di-upload user ini.'}</div>`;
    return;
  }

  wrap.innerHTML = list.map(m => `
    <div class="up-materi-item">
      <h5>${KM.escapeHtml(m.title)}</h5>
      <p>${KM.escapeHtml(m.content)}</p>
      <div class="qa-time" style="margin-top:8px;">${KM.timeAgo(m.date)}</div>
    </div>
  `).join('');
}

async function renderActivity() {
  const wrap = document.getElementById('aktivitas-list');
  if (!wrap) return;
  wrap.innerHTML = `<div class="empty-state">Memuat aktivitas... 🍵</div>`;

  await new Promise(resolve => {
    const unsub = KM.listenComments(async (comments) => {
      unsub();
      const asked = comments.filter(c => c.author === viewedUser.username);
      const answered = [];
      comments.forEach(c => {
        (c.replies || []).forEach(r => {
          if (r.author === viewedUser.username) answered.push({ question: c.text, ...r });
        });
      });

      if (asked.length === 0 && answered.length === 0) {
        wrap.innerHTML = `<div class="empty-state">Belum ada aktivitas Tanya Jawab.</div>`;
        resolve();
        return;
      }

      const askedHtml = asked.map(c => `
        <div class="up-materi-item">
          <div class="tag" style="margin-bottom:6px;">🤔 Bertanya</div>
          <p>${KM.escapeHtml(c.text)}</p>
          <div class="qa-time" style="margin-top:8px;">${KM.timeAgo(c.date)}</div>
        </div>
      `).join('');

      const answeredHtml = answered.map(r => `
        <div class="up-materi-item">
          <div class="tag" style="margin-bottom:6px;">💬 Menjawab pertanyaan: "${KM.escapeHtml(r.question.slice(0, 60))}${r.question.length > 60 ? '…' : ''}"</div>
          <p>${KM.escapeHtml(r.text)}</p>
          <div class="qa-time" style="margin-top:8px;">${KM.timeAgo(r.date)}</div>
        </div>
      `).join('');

      wrap.innerHTML = askedHtml + answeredHtml;
      resolve();
    });
  });
}

function wireEvents() {
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.style.display === 'none') return;
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
      const panel = document.getElementById('tab-' + tab.dataset.tab);
      if (panel) panel.style.display = 'block';
    });
  });

  if (!isOwner) return;

  const saveBtn = document.getElementById('btn-save-profile');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const bio = document.getElementById('input-bio').value.trim();
      saveBtn.disabled = true;
      await KM.updateCurrentUser({ bio });
      viewedUser = KM.currentUser();
      renderProfileHeader();
      saveBtn.disabled = false;
      alert('Bio tersimpan~ ehehe (☆/＞u＜/）');
    });
  }

  handleImageUpload(document.getElementById('input-pfp-file'), 'pfp', document.getElementById('preview-pfp'));
  handleImageUpload(document.getElementById('input-banner-file'), 'banner', document.getElementById('preview-banner'));

  const logoutBtn = document.getElementById('btn-logout-2');
  if (logoutBtn) logoutBtn.addEventListener('click', KM.logout);

  const upBtn = document.getElementById('btn-up-materi');
  if (upBtn) {
    upBtn.addEventListener('click', async () => {
      const title = document.getElementById('up-title').value.trim();
      const content = document.getElementById('up-content').value.trim();
      if (!title || !content) return;
      upBtn.disabled = true;
      await KM.addUpMateri(viewedUser.username, title, content);
      document.getElementById('up-title').value = '';
      document.getElementById('up-content').value = '';
      await renderUpMateriList();
      upBtn.disabled = false;
    });
  }
}

document.addEventListener('DOMContentLoaded', initProfilePage);
