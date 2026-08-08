// THUGINNN IMPERIA SITE/js/ads.js
(async () => {
  const adsList = document.getElementById('adsList');
  const adsActions = document.getElementById('adsActions');

  async function loadAds() {
    try {
      const resp = await fetch('/api/ads');
      const j = await resp.json();
      renderAds(j.ads || []);
    } catch (e) {
      console.error(e);
      adsList.innerHTML = '<div class="card">Չհաջողվեց բեռնել գովազդները։</div>';
    }
  }

  function renderAds(ads) {
    adsList.innerHTML = '';
    if (!ads.length) {
      adsList.innerHTML = '<div class="card muted">Գովազդներ չկան։</div>';
      return;
    }
    ads.forEach(a => {
      const div = document.createElement('div');
      div.className = 'rule-card';
      div.innerHTML = `<h3>${escapeHtml(a.title)}</h3>
        <p class="muted">${escapeHtml(a.description || '')}</p>
        <p>${a.link1 ? `<a href="${escapeAttr(a.link1)}" target="_blank" rel="noopener">Link 1</a>` : ''} ${a.link2 ? ` | <a href="${escapeAttr(a.link2)}" target="_blank" rel="noopener">Link 2</a>` : ''}</p>
        <small class="muted">Պահված՝ ${new Date(a.created_at).toLocaleString()}</small>`;
      adsList.appendChild(div);
    });
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"'`]/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;",'`':'&#96;'})[m]); }
  function escapeAttr(s){ return s ? s.replace(/"/g, '&quot;') : ''; }

  // show create button only if current user is OWNER
  async function checkOwnerAndInit() {
    try {
      const resp = await fetch('/api/user/profile', { credentials: 'include' });
      if (!resp.ok) return;
      const user = await resp.json();
      if (user.role === 'OWNER') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = 'ՍՏԵՂԾԵԼ ՆՈՐ ԳՈՎԱԶԴ';
        btn.addEventListener('click', createAdModal);
        adsActions.appendChild(btn);
      }
    } catch (e) {
      // not logged in or no access
    }
  }

  async function createAdModal() {
    const title = prompt('Գովազդի անունը:');
    if (!title) return;
    const description = prompt('Նկարագրությունը (կարճ):') || '';
    const link1 = prompt('Կայք link 1 (https://...):') || '';
    const link2 = prompt('Կայք link 2 (օպցիոնալ):') || '';

    try {
      const resp = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, description, link1, link2 })
      });
      if (resp.ok) {
        alert('Գովազդը հաջողությամբ ստեղծվեց։');
        loadAds();
      } else {
        const j = await resp.json().catch(()=>({}));
        alert(j.error || 'Սխալ՝ ոչ հաջողվեց։');
      }
    } catch (e) {
      alert('Սերվերի հետ կապի խնդիր։');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadAds();
    checkOwnerAndInit();
  });
})();
