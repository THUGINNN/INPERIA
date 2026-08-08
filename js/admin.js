// admin.js - basic admin panel actions: fetch users, search, ban/mute, servers management
(() => {
  const usersTableBody = document.querySelector('#usersTable tbody');
  const searchInput = document.getElementById('userSearch');
  const addServerBtn = document.getElementById('addServerBtn');
  const serversList = document.getElementById('serversList');

  async function fetchUsers() {
    try {
      const resp = await fetch('/api/admin/users', { credentials: 'include' });
      if (!resp.ok) throw new Error('Unauthorized or error');
      const json = await resp.json();
      renderUsers(json.users || []);
    } catch (e) {
      console.error(e);
      alert('Չեք կարող տեսնել օգտվողները։ Եթե չունեք թույլտվություն՝ դուրս եկեք։');
    }
  }

  function renderUsers(users) {
    usersTableBody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${u.id}</td><td>${escapeHtml(u.username)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td>
        <td>
          <button class="btn small ban" data-id="${u.id}">Ban</button>
          <button class="btn small unban" data-id="${u.id}">Unban</button>
          <button class="btn small mute" data-id="${u.id}">Mute</button>
        </td>`;
      usersTableBody.appendChild(tr);
    });
  }

  // event delegation for user actions
  usersTableBody && usersTableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('ban')) {
      if (!confirm('Արդյո՞ք ցանկանում եք ban անել այս user-ը։')) return;
      await adminAction('/api/admin/ban', { userId: id });
      fetchUsers();
    } else if (btn.classList.contains('unban')) {
      await adminAction('/api/admin/unban', { userId: id });
      fetchUsers();
    } else if (btn.classList.contains('mute')) {
      const until = prompt('Մուտքագրեք muted ժամեր (օրինակ 1 նյութ):', '1');
      await adminAction('/api/admin/mute', { userId: id, hours: Number(until) || 1 });
      fetchUsers();
    }
  });

  async function adminAction(url, body) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await resp.json().catch(()=>({}));
      if (!resp.ok) alert(j.error || 'Admin action failed');
    } catch (e) {
      alert('Սերվերի կապի սխալ');
    }
  }

  // search
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      const rows = Array.from(usersTableBody.querySelectorAll('tr'));
      rows.forEach(row => {
        const txt = row.textContent.toLowerCase();
        row.style.display = txt.includes(q) ? '' : 'none';
      });
    });
  }

  // Add server
  if (addServerBtn) {
    addServerBtn.addEventListener('click', async () => {
      const name = prompt('Server Name:');
      if (!name) return;
      const ip = prompt('Server IP:');
      const desc = prompt('Description:');
      try {
        const resp = await fetch('/api/admin/servers', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, ip, description: desc })
        });
        if (resp.ok) {
          alert('Server-added');
          loadServers();
        } else {
          alert('Server creation failed.');
        }
      } catch (e) {
        alert('Սերվերի կապի խնդիր');
      }
    });
  }

  async function loadServers() {
    if (!serversList) return;
    try {
      const resp = await fetch('/api/servers', { credentials: 'include' });
      const j = await resp.json();
      serversList.innerHTML = '';
      (j.servers || []).forEach(s => {
        const el = document.createElement('div');
        el.className = 'server-item';
        el.innerHTML = `<strong>${escapeHtml(s.name)}</strong> <span>${escapeHtml(s.ip)}</span>
          <div><button class="btn small edit" data-id="${s.id}">Edit</button><button class="btn small del" data-id="${s.id}">Delete</button></div>`;
        serversList.appendChild(el);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // helper
  function escapeHtml(s){ return String(s||'').replace(/[&<>"'`]/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;",'`':'&#96;'})[m]); }

  // init
  document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    loadServers();
  });

})();
