// chat.js - Socket.IO chat client with rate-limit anti-spam and typing indicator
(() => {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('messageInput');
  const messagesEl = document.getElementById('messages');
  const usersEl = document.getElementById('users');
  const onlineCount = document.getElementById('onlineCount');

  if (!form || !input) return;

  // rate limit: maxMessages per windowMs
  const maxMessages = 5;
  const windowMs = 10 * 1000; // 10 seconds
  let messageTimestamps = [];

  // muted state
  let mutedUntil = 0;

  // connect socket.io
  const socket = io({ withCredentials: true });

  socket.on('connect', () => {
    appendSys('Connected to chat');
  });

  socket.on('disconnect', () => {
    appendSys('Disconnected from chat');
  });

  socket.on('chat:message', (data) => {
    appendMessage(data);
  });

  socket.on('chat:users', (list) => {
    renderUsers(list);
  });

  socket.on('chat:typing', (user) => {
    showTyping(user);
  });

  socket.on('chat:muted', (payload) => {
    // server-side mute
    mutedUntil = Date.now() + (payload.ms || 60*1000);
    appendSys(`Դուք ժամանակավորապես muted եք մինչև ${new Date(mutedUntil).toLocaleTimeString()}`);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (Date.now() < mutedUntil) {
      appendSys('Դուք ժամանակավորապես muted եք։');
      return;
    }

    const text = input.value.trim();
    if (!text) return;

    // client-side rate limiting
    const now = Date.now();
    messageTimestamps = messageTimestamps.filter(ts => now - ts < windowMs);
    if (messageTimestamps.length >= maxMessages) {
      // temporary mute for client side (server should enforce too)
      mutedUntil = now + 30 * 1000; // 30s
      appendSys('Շատ արագ եք գրում՝ կխուսափեք spam-ից: դուք muted եք 30 վայրկյան։');
      return;
    }
    messageTimestamps.push(now);

    socket.emit('chat:message', { message: text }, (ack) => {
      if (ack && ack.error) {
        appendSys('Message failed: ' + ack.error);
      } else {
        input.value = '';
      }
    });
  });

  input.addEventListener('input', () => {
    socket.emit('chat:typing');
  });

  function appendMessage(data) {
    const div = document.createElement('div');
    div.className = 'msg';
    const time = new Date(data.created_at || Date.now()).toLocaleTimeString();
    div.innerHTML = `<span class="meta">${escapeHtml(data.username || 'Anon')} • ${time}</span><div class="text">${escapeHtml(data.message)}</div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendSys(text) {
    const div = document.createElement('div');
    div.className = 'sys';
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderUsers(list) {
    onlineCount && (onlineCount.textContent = 'Online: ' + (list.length || 0));
    if (!usersEl) return;
    usersEl.innerHTML = '';
    list.forEach(u => {
      const li = document.createElement('li');
      li.textContent = u.username || ('#' + u.id);
      usersEl.appendChild(li);
    });
  }

  let typingTimeout;
  function showTyping(user) {
    // simple visual (could be a small indicator)
    appendSys(`${user} գրում է...`);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {}, 2000);
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"'`]/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;",'`':'&#96;'})[m]); }

})();
