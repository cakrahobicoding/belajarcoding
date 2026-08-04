/* ============================================================
   comments.js — kolom Tanya Jawab (butuh login untuk isi)
   ============================================================ */

function qaAvatarStyle(user) {
  if (!user) return 'background:var(--accent-primary)';
  return user.pfp
    ? `background-image:url('${KM.escapeHtml(user.pfp)}')`
    : `background:${user.theme || 'var(--accent-primary)'}`;
}

function renderQA() {
  const list = document.getElementById('qa-list');
  const locked = document.getElementById('qa-locked');
  const composer = document.getElementById('qa-composer');
  if (!list) return;

  const me = KM.currentUser();
  const users = KM.getUsers();

  if (me) {
    locked.style.display = 'none';
    composer.style.display = 'flex';
  } else {
    locked.style.display = 'block';
    composer.style.display = 'none';
  }

  const comments = KM.getComments().slice().sort((a, b) => b.date - a.date);

  if (comments.length === 0) {
    list.innerHTML = `<div class="empty-state">Belum ada pertanyaan. Jadilah yang pertama bertanya, Sensei! ≧﹏≦</div>`;
    return;
  }

  list.innerHTML = comments.map(c => {
    const author = users[c.author];
    const repliesHtml = (c.replies || []).map(r => {
      const ru = users[r.author];
      return `
        <div class="qa-item" style="border-top:none;padding:0;">
          <div class="qa-item-head">
            <span class="qa-avatar" style="width:28px;height:28px;font-size:0.7rem;${qaAvatarStyle(ru)}">${ru && ru.pfp ? '' : KM.initials(r.author)}</span>
            <div class="qa-meta">
              <span class="qa-name">${KM.escapeHtml(r.author)} ${ru && ru.isAdmin ? '<span class="badge-admin">ADMIN</span>' : ''}</span>
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
          <span class="qa-avatar" style="${qaAvatarStyle(author)}">${author && author.pfp ? '' : KM.initials(c.author)}</span>
          <div class="qa-meta">
            <span class="qa-name">${KM.escapeHtml(c.author)} ${author && author.isAdmin ? '<span class="badge-admin">ADMIN</span>' : ''}</span>
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
            <textarea placeholder="Tulis jawaban kamu..."></textarea>
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
}

document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('qa-list');
  const submitBtn = document.getElementById('qa-submit');
  const input = document.getElementById('qa-input');
  if (!list) return;

  renderQA();

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const me = KM.currentUser();
      if (!me) return;
      const text = input.value.trim();
      if (!text) return;
      const comments = KM.getComments();
      comments.push({
        id: 'q' + Date.now(),
        author: me.username,
        text,
        date: Date.now(),
        replies: [],
      });
      KM.saveComments(comments);
      input.value = '';
      renderQA();
    });
  }

  list.addEventListener('click', (e) => {
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
      const me = KM.currentUser();
      if (!me) return;
      const id = sendBtn.dataset.id;
      const form = document.getElementById(`reply-form-${id}`);
      const textarea = form.querySelector('textarea');
      const text = textarea.value.trim();
      if (!text) return;
      const comments = KM.getComments();
      const target = comments.find(c => c.id === id);
      if (target) {
        target.replies = target.replies || [];
        target.replies.push({ author: me.username, text, date: Date.now() });
        KM.saveComments(comments);
        renderQA();
      }
    }
  });
});
