// verification.js - handles the verification page (token in query) and shows result
(() => {
  async function doVerify() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const messageEl = document.getElementById('message');
    const actionEl = document.getElementById('action');
    if (!token) {
      if (messageEl) messageEl.textContent = 'Խնդրում ենք բացել հաստատման նամակում եղած link-ը։';
      return;
    }
    try {
      const resp = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { method: 'POST', credentials: 'include' });
      const json = await resp.json();
      if (resp.ok && json.ok) {
        if (messageEl) messageEl.textContent = 'Շնորհակալություն, ձեր էլ․ փոստը հաստատվեց։';
        if (actionEl) actionEl.style.display = 'block';
      } else {
        if (messageEl) messageEl.textContent = json.error || 'Հաստատման սխալ։';
      }
    } catch (e) {
      if (messageEl) messageEl.textContent = 'Սերվերի հետ կապի խնդիր։';
    }
  }
  document.addEventListener('DOMContentLoaded', doVerify);
})();
