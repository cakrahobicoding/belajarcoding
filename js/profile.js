/* ============================================================
   profile.js — render profil (milik sendiri ATAU orang lain),
   tab aktivitas (pertanyaan & jawaban), kustomisasi, up materi
   ============================================================ */

let VIEW_USERNAME = null;
let IS_OWNER = false;

document.addEventListener('DOMContentLoaded', () => {
  KM.renderNavbar('');

  const me = KM.currentUser();
  const params = new URLSearchParams(location.search);
  const paramUser = (params.get('user') || '').trim().toLowerCase();

  VIEW_USERNAME = paramUser || (me ? me.username : null);

  if (!VIEW_USERNAME) {
    // Tidak ada target profil & belum login sama sekali
    document.getElementById('not-logged-in').style.display = 'block';
    return;
  }

  const users = KM.getUsers();
  const viewedUser = users[VIEW_USERNAME];

  if (!viewedUser) {
    const nl = document.getElementById('not-logged-in');
    nl.innerHTML = `<p style="color:var(--text-dim);margin-bottom:16px;">Profil "@${KM.escapeHtml(VIEW_USERNAME)}" nggak ketemu, Sensei. Salah ketik username kali ya~ (눈‸눈)</p><a href="index.html" class="btn btn-primary">Kembali ke Beranda</a>`;
    nl.style.display = 'block';
    return;
  }

  IS_OWNER = !!me && me.username === VIEW_USERNAME;
  document.getElementById('profile-root').style.display = 'block';

  // Sembunyikan tab & komponen khusus pemilik profil kalau ini bukan profil sendiri
  document.getElementById('tab-btn-pengaturan').style.display = IS_OWNER ? 'block' : 'none';
  document.getElementById('up-materi-composer').style.display = IS_OWNER ? 'flex' : 'none';

  renderProfileHeader(viewedUser);
  renderAktivitas(VIEW_USERNAME);
  renderUpMateriList(VIEW_USERNAME);

  if (IS_OWNER) {
    renderThemeSwatches();
    fillSettingsForm();

    document.getElementById('btn-save-profile').addEventListener('click', () => {
      const pfp = document.getElementById('input-pfp').value.trim();
      const banner = document.getElementById('input-banner').value.trim();
      const bio = document.getElementById('input-bio').value.trim();
      KM.updateCurrentUser({ pfp, banner, bio });
      KM.renderNavbar('');
      renderProfileHeader(KM.currentUser());
      alert('Profil tersimpan~ ehehe (☆/＞u＜/）');
    });

    document.getElementById('btn-logout-2').addEventListener('click', KM.logout);

    document.getElementById('btn-up-materi').addEventListener('click', () => {
      const title = document.getElementById('up-title').value.trim();
      const content = document.getElementById('up-content').value.trim();
      if (!title || !content) return;
      const list = KM.getUpMateri();
      list.push({
        id: 'm' + Date.now(),
        author: VIEW_USERNAME,
        title,
        content,
        date: Date.now(),
      });
      KM.saveUpMateri(list);
      document.getElementById('up-title').value = '';
      document.getElementById('up-content').value = '';
      renderUpMateriList(VIEW_USERNAME);
    });
  }

  // ---- Tabs ----
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.style.display === 'none') return;
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-aktivitas').style.display = 'none';
      document.getElementById('tab-up-materi').style.display = 'none';
      document.getElementById('tab-pengaturan').style.display = 'none';
      document.getElementById('tab-' + tab.dataset.tab).style.display = 'block';
    });
  });
});

function renderProfileHeader(user) {
  const banner = document.getElementById('profile-banner');
  const pfp = document.getElementById('profile-pfp');

  KM.applyTheme(user.theme || '#7c9eff');

  banner.style.backgroundImage = user.banner ? `url('${user.banner}')` : 'none';

  if (user.pfp) {
    pfp.style.backgroundImage = `url('${user.pfp}')`;
    pfp.textContent = '';
  } else {
    pfp.style.backgroundImage = 'none';
    pfp.textContent = KM.initials(user.username);
  }

  document.getElementById('profile-name').childNodes[0].nodeValue = user.username + ' ';
  document.getElementById('profile-handle').textContent = '@' + user.username;
  document.getElementById('profile-bio').textContent = user.bio || (IS_OWNER ? 'Belum ada bio. Yuk isi di tab Pengaturan~' : 'Belum ada bio.');
  document.getElementById('profile-admin-badge').style.display = user.isAdmin ? 'inline-block' : 'none';
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
    renderProfileHeader(KM.currentUser());
    KM.renderNavbar('');
  });
}

function fillSettingsForm() {
  const me = KM.currentUser();
  document.getElementById('input-pfp').value = me.pfp || '';
  document.getElementById('input-banner').value = me.banner || '';
  document.getElementById('input-bio').value = me.bio || '';
}

function renderUpMateriList(username) {
  const list = KM.getUpMateri().filter(m => m.author === username).sort((a, b) => b.date - a.date);
  const wrap = document.getElementById('up-materi-list');

  if (list.length === 0) {
    wrap.innerHTML = `<div class="empty-state">${IS_OWNER ? 'Belum ada materi yang kamu upload. Coba tulis satu di atas~ ≧﹏≦' : 'Belum ada materi yang di-upload user ini.'}</div>`;
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

/* ---- Tab Aktivitas: pertanyaan yang dia buat + jawaban yang dia kasih ---- */
function renderAktivitas(username) {
  const wrap = document.getElementById('aktivitas-list');
  const comments = KM.getComments();

  const items = [];

  comments.forEach(c => {
    if (c.author === username) {
      items.push({ type: 'tanya', date: c.date, text: c.text, replyCount: (c.replies || []).length });
    }
    (c.replies || []).forEach(r => {
      if (r.author === username) {
        items.push({ type: 'jawab', date: r.date, text: r.text, questionText: c.text });
      }
    });
  });

  items.sort((a, b) => b.date - a.date);

  if (items.length === 0) {
    wrap.innerHTML = `<div class="empty-state">${IS_OWNER ? 'Kamu belum tanya atau jawab apa-apa di Q&A. Yuk mulai! ≧﹏≦' : 'User ini belum tanya atau jawab apa-apa di Q&A.'}</div>`;
    return;
  }

  wrap.innerHTML = items.map(it => {
    if (it.type === 'tanya') {
      return `
        <div class="qa-item">
          <div class="qa-item-head">
            <span class="eyebrow" style="margin:0;">🤔 BERTANYA</span>
          </div>
          <div class="qa-text">${KM.escapeHtml(it.text)}</div>
          <div class="qa-actions"><span>${it.replyCount} balasan</span><span>${KM.timeAgo(it.date)}</span></div>
        </div>
      `;
    }
    return `
      <div class="qa-item">
        <div class="qa-item-head">
          <span class="eyebrow" style="margin:0;color:var(--success);">✔ MENJAWAB</span>
        </div>
        <p style="color:var(--text-faint);font-size:0.82rem;margin-bottom:4px;">atas pertanyaan: "${KM.escapeHtml(it.questionText.slice(0, 80))}${it.questionText.length > 80 ? '…' : ''}"</p>
        <div class="qa-text">${KM.escapeHtml(it.text)}</div>
        <div class="qa-actions"><span>${KM.timeAgo(it.date)}</span></div>
      </div>
    `;
  }).join('');
}
