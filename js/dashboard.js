// dashboard.js - fetch user profile & tickets, logout
(() => {
  async function fetchProfile() {
    try {
      const resp = await fetch('/api/user/profile', { credentials: 'include' });
      if (!resp.ok) {
        // redirect to login if unauthorized
        if (resp.status === 401) return window.location.href = 'login.html';
        throw new Error('Նամակ сервերից');
      }
      const data = await resp.json();
      // populate UI
      document.getElementById('displayName').textContent = data.username || '--';
      document.getElementById('realName').textContent = `${data.first_name || ''} ${data.last_name || ''}`;
      document.getElementById('minecraftName').textContent = data.minecraft || '--';
      document.getElementById('email').textContent = data.email || '--';
      document.getElementById('emailVerified').textContent = data.email_verified ? 'Այո' : 'Ոչ';
      document.getElementById('discordVerified').textContent = data.discord_verified ? 'Այո' : 'Ոչ';
      document.getElementById('sixCode').textContent = data.verification_code || '000000';
      document.getElementById('createdAt').textContent = data.created_at || '--';
      document.getElementById('ticketCount').textContent = data.ticketCount || 0;
      // avatar
      const avatar = document.getElementById('avatar');
      if (avatar && data.username) avatar.textContent = data.username.charAt(0).toUpperCase();
    } catch (e) {
      console.error(e);
    }
  }

  // logout
  const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = 'index.html';
    });
  }

  // load on page ready
  document.addEventListener('DOMContentLoaded', fetchProfile);
})();
