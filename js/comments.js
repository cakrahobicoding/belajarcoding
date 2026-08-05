/* ============================================================
   comments.js — kolom Tanya Jawab, realtime via Firestore.
   Semua pengguna (siapapun yang buka halaman ini) langsung
   lihat pertanyaan & jawaban baru tanpa perlu refresh.
   ============================================================ */

let qaUsersMap = {};

function qaAvatarStyle(user) {
  if (!user) return 'background:var(--accent-primary)';
  return user.pfp
    ? `background-image:url('${KM.escapeHtml(user.pfp)}')`
    : `background:${user.theme || 'var(--accent-primary)'}`;
}

function renderQAList(comments) {
  const list = document.getElementById('qa-list');
  if (!list) return;

  // Simpan dulu form balasan yang lagi dibuka + teks yang lagi diketik,
  // biar nggak ke-reset tiap kali polling data baru tiap 4 detik.
  const openForm = list.querySelector('.qa-reply-form.open');
  let preservedId = null;
  let preservedText = '';
  if (openForm) {
    preservedId = openForm.id.replace('reply-form-', '');
    const ta = openForm.querySelector('textarea');
    if (ta) preservedText = ta.value;
  }

  if (comments.length === 0) {
    list.innerHTML = `<div class="empty-state">Belum ada pertanyaan. Jadilah yang pertama bertanya, Sensei! ≧﹏≦</div>`;
    return;
  }

  const me = KM.currentUser();

  list.innerHTML = comments.map(c => {
    const author = qaUsersMap[c.author];
    const repliesHtml = (c.replies || []).map(r => {
      const ru = qaUsersMap[r.author];
      return `
        <div class="qa-item" style="border-top:none;padding:0;">
          <div class="qa-item-head">
            <a href="profile.html?user=${encodeURIComponent(r.author)}" class="qa-avatar" style="width:28px;height:28px;font-size:0.7rem;${qaAvatarStyle(ru)}">${ru && ru.pfp ? '' : KM.initials(r.author)}</a>
            <div class="qa-meta">
              <span class="qa-name"><a href="profile.html?user=${encodeURIComponent(r.author)}" class="qa-name-link">${KM.escapeHtml(r.author)}</a> ${ru && ru.isAdmin ? '<span class="badge-admin">ADMIN</span>' : ''}</span>
              <span class="qa-time">${KM.timeAgo(r.date)}</span>
            </div>
          </div>
          <div class="qa-text">${KM.escapeHtml(r.text)}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="qa-item" data-id="${c.id}">
        <div class="qa-item-head">
          <a href="profile.html?user=${encodeURIComponent(c.author)}" class="qa-avatar" style="${qaAvatarStyle(author)}">${author && author.pfp ? '' : KM.initials(c.author)}</a>
          <div class="qa-meta">
            <span class="qa-name"><a href="profile.html?user=${encodeURIComponent(c.author)}" class="qa-name-link">${KM.escapeHtml(c.author)}</a> ${author && author.isAdmin ? '<span class="badge-admin">ADMIN</span>' : ''}</span>
            <span class="qa-time">${KM.timeAgo(c.date)}</span>
          </div>
        </div>
        <div class="qa-text">${KM.escapeHtml(c.text)}</div>
        <div class="qa-actions">
          ${me ? `<button class="btn-reply" data-id="${c.id}">Balas</button>` : ''}
          ${c.replies && c.replies.length ? `<span>${c.replies.length} balasan</span>` : ''}
        </div>
        ${me ? `
          <div class="qa-reply-form" id="reply-form-${c.id}">
            <div class="qa-posting-as">
              <a href="profile.html?user=${encodeURIComponent(me.username)}" class="qa-avatar" style="${qaAvatarStyle(me)}">${me.pfp ? '' : KM.initials(me.username)}</a>
              Menjawab sebagai <b>${KM.escapeHtml(me.username)}</b>${me.isAdmin ? ' <span class="badge-admin">ADMIN</span>' : ''}
            </div>
            <textarea placeholder="Tulis jawaban kamu...">${preservedId === c.id ? KM.escapeHtml(preservedText) : ''}</textarea>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary btn-sm btn-send-reply" data-id="${c.id}">Kirim Jawaban</button>
              <button class="btn btn-ghost btn-sm btn-cancel-reply" data-id="${c.id}">Batal</button>
            </div>
          </div>
        ` : ''}
        <div class="qa-replies">${repliesHtml}</div>
      </div>
    `;
  }).join('');

  // Buka lagi form balasan yang tadi lagi diisi, dan fokuskan kursor di akhir teks
  if (preservedId) {
    const form = document.getElementById(`reply-form-${preservedId}`);
    if (form) {
      form.classList.add('open');
      const ta = form.querySelector('textarea');
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }
  }
}

async function initQA() {
  const list = document.getElementById('qa-list');
  const locked = document.getElementById('qa-locked');
  const composer = document.getElementById('qa-composer');
  const postingAs = document.getElementById('qa-posting-as');
  const submitBtn = document.getElementById('qa-submit');
  const input = document.getElementById('qa-input');
  if (!list) return;

  const me = KM.currentUser();

  if (me) {
    locked.style.display = 'none';
    composer.style.display = 'flex';
    postingAs.innerHTML = `
      <a href="profile.html?user=${encodeURIComponent(me.username)}" class="qa-avatar" style="${qaAvatarStyle(me)}">${me.pfp ? '' : KM.initials(me.username)}</a>
      Bertanya sebagai <b>${KM.escapeHtml(me.username)}</b>${me.isAdmin ? ' <span class="badge-admin">ADMIN</span>' : ''}
    `;
  } else {
    locked.style.display = 'block';
    composer.style.display = 'none';
  }

  // Ambil daftar user dulu (buat avatar/nama), lalu pasang listener realtime komentar
  qaUsersMap = await KM.getUsersMap();
  list.innerHTML = `<div class="empty-state">Memuat pertanyaan... 🍵</div>`;
  KM.listenComments(renderQAList);

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const currentMe = KM.currentUser();
      if (!currentMe) return;
      const text = input.value.trim();
      if (!text) return;
      submitBtn.disabled = true;
      try {
        await KM.addComment(currentMe.username, text);
        input.value = '';
      } catch (e) {
        alert('Gagal mengirim pertanyaan, coba lagi ya~ (' + e.message + ')');
      }
      submitBtn.disabled = false;
    });
  }

  list.addEventListener('click', async (e) => {
    const replyBtn = e.target.closest('.btn-reply');
    const sendBtn = e.target.closest('.btn-send-reply');
    const cancelBtn = e.target.closest('.btn-cancel-reply');

    if (replyBtn) {
      const form = document.getElementById(`reply-form-${replyBtn.dataset.id}`);
      if (form) form.classList.toggle('open');
    }

    if (cancelBtn) {
      const form = document.getElementById(`reply-form-${cancelBtn.dataset.id}`);
      if (form) form.classList.remove('open');
    }

    if (sendBtn) {
      const currentMe = KM.currentUser();
      if (!currentMe) return;
      const id = sendBtn.dataset.id;
      const form = document.getElementById(`reply-form-${id}`);
      const textarea = form.querySelector('textarea');
      const text = textarea.value.trim();
      if (!text) return;
      sendBtn.disabled = true;
      try {
        await KM.addReply(id, { author: currentMe.username, text, date: Date.now() });
        textarea.value = '';
        form.classList.remove('open');
      } catch (err) {
        alert('Gagal mengirim jawaban, coba lagi ya~ (' + err.message + ')');
      }
      sendBtn.disabled = false;
    }
  });
}
