// tickets.js - ticket category buttons and API call to create ticket (backend will trigger Discord creation)
(() => {
  const catButtons = document.querySelectorAll('.cat-btn');
  const statusEl = document.getElementById('ticketStatus');

  if (!catButtons) return;

  catButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const cat = btn.dataset.cat;
      const title = prompt('Նշեք ձեր հարցի շառավիղը (կարճ)') || `${cat} request`;
      const desc = prompt('Նշեք խնդրի մանրամասները') || '';
      statusEl.textContent = 'Ստեղծվում է ticket...';
      try {
        const resp = await fetch('/api/tickets/create', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: cat, title, description: desc })
        });
        const resjson = await resp.json().catch(()=>({}));
        if (resp.ok) {
          statusEl.textContent = 'Ձեր ticket-ը հաջողությամբ ստեղծվեց։ Սեղմեք Discord-ում՝ դիտելու համար։';
          alert('Ticket ստեղծվեց՝ ստուգեք Discord ալիքը։');
        } else {
          statusEl.textContent = resjson.error || 'Ticket ստեղծման սխալ։';
          alert(resjson.error || 'Ticket ստեղծման սխալ։');
        }
      } catch (e) {
        statusEl.textContent = 'Սերվերի կապի սխալ։';
      }
    });
  });
})();
