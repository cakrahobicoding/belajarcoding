/* ============================================================
   chat.js — DM (pesan langsung), realtime via polling.
   Composer pesan sengaja dipisah dari area bubble yang di-poll,
   jadi ketikan yang sedang berjalan tidak pernah ke-reset
   (pelajaran dari bug yang sama di Q&A).
   ============================================================ */

let usersMap = {};
let activePartner = null;
let stopPolling = null;
let conversations = [];

function chatAvatarStyle(user) {
  if (!user) return 'background:var(--user-accent)';
  return user.pfp
    ? `background-image:url('${KM.escapeHtml(user.pfp)}')`
    : `background:${user.theme || 'var(--user-accent)'}`;
}

async function boot() {
  await KM.boot('chat');
  const me = KM.currentUser();
  if (!me) {
    document.getElementById('not-logged-in').style.display = 'block';
    return;
  }
  document.getElementById('chat-root').style.display = 'block';

  // wallpaper milik user sendiri, dipasang di jendela chat
  const win = document.getElementById('chat-window');
  if (me.wallpaper) win.style.backgroundImage = `url('${me.wallpaper}')`;

  usersMap = await KM.getUsersMap();
  await refreshConversationList();

  const params = new URLSearchParams(location.search);
  const targetUser = params.get('user');
  if (targetUser) {
    await openChat(targetUser.toLowerCase());
  } else if (conversations.length > 0) {
    await openChat(conversations[0].username);
  }

  wireComposer();
  wireWallpaper();
  wireNewChat();
}

async function refreshConversationList() {
  conversations = await KM.getDmConversations();
  const wrap = document.getElementById('chat-list-items');

  if (conversations.length === 0) {
    wrap.innerHTML = `<div class="empty-state" style="padding:24px 16px;">Belum ada percakapan. Mulai chat baru di atas~</div>`;
    return;
  }

  wrap.innerHTML = conversations.map(c => {
    const u = usersMap[c.username];
    return `
      <div class="chat-list-item ${activePartner === c.username ? 'active' : ''}" data-user="${c.username}">
        <span class="qa-avatar" style="width:38px;height:38px;font-size:0.8rem;${chatAvatarStyle(u)}">${u && u.pfp ? '' : KM.initials(c.username)}</span>
        <div style="overflow:hidden;">
          <div class="cl-name">${KM.escapeHtml(c.username)}</div>
          <div class="cl-preview">${KM.escapeHtml(c.lastText)}</div>
        </div>
      </div>
    `;
  }).join('');

  wrap.querySelectorAll('.chat-list-item').forEach(el => {
    el.addEventListener('click', () => openChat(el.dataset.user));
  });
}

async function openChat(username) {
  username = username.toLowerCase();
  const me = KM.currentUser();
  if (username === me.username) {
    alert('Nggak bisa chat sama diri sendiri, Baka! 😤');
    return;
  }

  let partnerUser = usersMap[username];
  if (!partnerUser) {
    partnerUser = await KM.getUserByName(username);
    if (!partnerUser) {
      alert(`User "${username}" nggak ketemu, Sensei.`);
      return;
    }
    usersMap[username] = partnerUser;
  }

  activePartner = username;
  history.replaceState(null, '', `chat.html?user=${encodeURIComponent(username)}`);

  document.getElementById('chat-empty').style.display = 'none';
  document.getElementById('chat-active').style.display = 'flex';
  document.getElementById('cw-name').textContent = partnerUser.username;
  const cwAvatar = document.getElementById('cw-avatar');
  cwAvatar.style.cssText += chatAvatarStyle(partnerUser);
  cwAvatar.textContent = partnerUser.pfp ? '' : KM.initials(partnerUser.username);

  document.querySelectorAll('.chat-list-item').forEach(el => {
    el.classList.toggle('active', el.dataset.user === username);
  });

  if (stopPolling) stopPolling();
  stopPolling = pollMessages(username);
}

function pollMessages(username, intervalMs = 3000) {
  let stopped = false;
  let lastCount = -1;

  async function tick() {
    if (stopped) return;
    try {
      const messages = await KM.getDmMessages(username);
      // Cuma render ulang kalau jumlah pesan berubah, biar nggak
      // ganggu kalau lagi scroll baca chat lama
      if (messages.length !== lastCount) {
        renderMessages(messages);
        lastCount = messages.length;
      }
    } catch (e) { /* diamkan, coba lagi nanti */ }
    if (!stopped) setTimeout(tick, intervalMs);
  }
  tick();
  return () => { stopped = true; };
}

function renderMessages(messages) {
  const me = KM.currentUser();
  const wrap = document.getElementById('chat-messages');
  const wasAtBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 40;

  if (messages.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Belum ada pesan. Sapa duluan, Sensei~ 🍡</div>`;
    return;
  }

  wrap.innerHTML = messages.map(m => {
    const mine = m.sender === me.username;
    const time = new Date(m.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="chat-bubble ${mine ? 'mine' : ''}">
        ${KM.escapeHtml(m.text)}
        <span class="cb-time">${time}</span>
      </div>
    `;
  }).join('');

  if (wasAtBottom) wrap.scrollTop = wrap.scrollHeight;
}

function wireComposer() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  async function send() {
    const text = input.value.trim();
    if (!text || !activePartner) return;
    sendBtn.disabled = true;
    try {
      await KM.sendDm(activePartner, text);
      input.value = '';
      const messages = await KM.getDmMessages(activePartner);
      renderMessages(messages);
      document.getElementById('chat-messages').scrollTop = 999999;
      refreshConversationList();
    } catch (e) {
      alert('Gagal mengirim pesan, coba lagi ya~ (' + e.message + ')');
    }
    sendBtn.disabled = false;
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
}

function wireNewChat() {
  const input = document.getElementById('chat-new-input');
  const btn = document.getElementById('chat-new-btn');

  async function go() {
    const username = input.value.trim().toLowerCase();
    if (!username) return;
    await openChat(username);
    input.value = '';
  }

  btn.addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

function wireWallpaper() {
  const fileInput = document.getElementById('wallpaper-input');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('Wallpaper harus format PNG atau JPG ya, Sensei!');
      return;
    }
    try {
      const url = await KM.uploadFile(file);
      await KM.updateCurrentUser({ wallpaper: url });
      document.getElementById('chat-window').style.backgroundImage = `url('${url}')`;
    } catch (e) {
      alert('Gagal upload wallpaper: ' + e.message);
    }
    fileInput.value = '';
  });
}

boot();
