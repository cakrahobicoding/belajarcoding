/* ============================================================
   profile.js — render profil, tab, kustomisasi, up materi
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  KM.renderNavbar('');

  const me = KM.currentUser();
  if (!me) {
    document.getElementById('not-logged-in').style.display = 'block';
    return;
  }
  document.getElementById('profile-root').style.display = 'block';

  renderProfileHeader();
  renderThemeSwatches();
  renderUpMateriList();
  fillSettingsForm();

  // ---- Tabs ----
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-up-materi').style.display = 'none';
      document.getElementById('tab-pengaturan').style.display = 'none';
      document.getElementById('tab-' + tab.dataset.tab).style.display = 'block';
    });
  });

  // ---- Save profile ----
  document.getElementById('btn-save-profile').addEventListener('click', () => {
    const pfp = document.getElementById('input-pfp').value.trim();
    const banner = document.getElementById('input-banner').value.trim();
    const bio = document.getElementById('input-bio').value.trim();
    KM.updateCurrentUser({ pfp, banner, bio });
    KM.renderNavbar('');
    renderProfileHeader();
    alert('Profil tersimpan~ ehehe (☆/＞u＜/）');
  });

  document.getElementById('btn-logout-2').addEventListener('click', KM.logout);

  // ---- Up materi ----
  document.getElementById('btn-up-materi').addEventListener('click', () => {
    const title = document.getElementById('up-title').value.trim();
    const content = document.getElementById('up-content').value.trim();
    if (!title || !content) return;
    const list = KM.getUpMateri();
    list.push({
      id: 'm' + Date.now(),
      author: me.username,
      title,
      content,
      date: Date.now(),
    });
    KM.saveUpMateri(list);
    document.getElementById('up-title').value = '';
    document.getElementById('up-content').value = '';
    renderUpMateriList();
  });
});

function renderProfileHeader() {
  const me = KM.currentUser();
  const banner = document.getElementById('profile-banner');
  const pfp = document.getElementById('profile-pfp');

  KM.applyTheme(me.theme || '#7c9eff');

  if (me.banner) {
    banner.style.backgroundImage = `url('${me.banner}')`;
  } else {
    banner.style.backgroundImage = 'none';
  }

  if (me.pfp) {
    pfp.style.backgroundImage = `url('${me.pfp}')`;
    pfp.textContent = '';
  } else {
    pfp.style.backgroundImage = 'none';
    pfp.textContent = KM.initials(me.username);
  }

  document.getElementById('profile-name').childNodes[0].nodeValue = me.username + ' ';
  document.getElementById('profile-handle').textContent = '@' + me.username;
  document.getElementById('profile-bio').textContent = me.bio || 'Belum ada bio. Yuk isi di tab Pengaturan~';
  document.getElementById('profile-admin-badge').style.display = me.isAdmin ? 'inline-block' : 'none';
}

function renderThemeSwatches() {
  const me = KM.currentUser();
  const wrap = document.getElementById('theme-swatches');
  wrap.innerHTML = KM.THEME_PRESETS.map(t => `
    <div class="swatch ${me.theme === t.value ? 'active' : ''}" style="background:${t.value}" data-color="${t.value}" title="${t.name}"></div>
  `).join('');

  wrap.addEventListener('click', (e) => {
    const sw = e.target.closest('.swatch');
    if (!sw) return;
    KM.updateCurrentUser({ theme: sw.dataset.color });
    KM.applyTheme(sw.dataset.color);
    renderThemeSwatches();
    renderProfileHeader();
    KM.renderNavbar('');
  });
}

function fillSettingsForm() {
  const me = KM.currentUser();
  document.getElementById('input-pfp').value = me.pfp || '';
  document.getElementById('input-banner').value = me.banner || '';
  document.getElementById('input-bio').value = me.bio || '';
}

function renderUpMateriList() {
  const me = KM.currentUser();
  const list = KM.getUpMateri().filter(m => m.author === me.username).sort((a, b) => b.date - a.date);
  const wrap = document.getElementById('up-materi-list');

  if (list.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Belum ada materi yang kamu upload. Coba tulis satu di atas~ ≧﹏≦</div>`;
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
