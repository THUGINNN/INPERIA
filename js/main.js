// main.js - global UI handlers, animated background, menu toggle, copy IP, discord invite fetch
(() => {
  // Menu toggle (three-dot)
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.body.classList.toggle('side-open');
    });
  }

  // Discord invite buttons: try to get from /api/config or fallback to static
  async function initDiscordButtons() {
    const buttons = document.querySelectorAll('#discord-invite, #hero-discord, .btn-discord');
    let invite = '#';
    try {
      const resp = await fetch('/api/config/discord');
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.inviteUrl) invite = data.inviteUrl;
      }
    } catch (e) {
      // ignore - fallback
    }
    buttons.forEach(b => {
      b.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (invite === '#') {
          // open a small modal or notify user to go to Discord
          alert('Discord հրավեր դեռ կարգավորված չէ։');
        } else {
          window.location.href = invite;
        }
      });
    });
  }
  initDiscordButtons();

  // Copy IP for server cards (delegation)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-ip');
    if (!btn) return;
    const ip = btn.dataset.ip;
    navigator.clipboard.writeText(ip || '').then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = original, 1400);
    }).catch(() => alert('Clipboard not available'));
  });

  // Simple animated canvas background (particles)
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w = canvas.width = innerWidth;
    let h = canvas.height = innerHeight;
    window.addEventListener('resize', () => {
      w = canvas.width = innerWidth;
      h = canvas.height = innerHeight;
    });

    const particles = [];
    const PARTICLE_COUNT = Math.floor((w*h)/80000) + 20;

    function rand(min, max){ return Math.random()*(max-min)+min; }

    for (let i=0;i<PARTICLE_COUNT;i++){
      particles.push({
        x: rand(0,w),
        y: rand(0,h),
        vx: rand(-0.2,0.2),
        vy: rand(-0.2,0.2),
        r: rand(0.6,2.2),
        alpha: rand(0.05,0.25)
      });
    }

    function draw() {
      ctx.clearRect(0,0,w,h);
      // subtle gradient
      const g = ctx.createLinearGradient(0,0,w,h);
      g.addColorStop(0, 'rgba(17,17,17,0.7)');
      g.addColorStop(1, 'rgba(10,10,10,0.7)');
      ctx.fillStyle = g;
      ctx.fillRect(0,0,w,h);

      // draw particles
      for (const p of particles){
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.fillStyle = `rgba(0,210,255, ${p.alpha})`; // diamond / cyan accent
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // small helpers
  window.uiNotify = (msg, type='info') => {
    // lightweight toast fallback
    console.log(`[${type}] ${msg}`);
    alert(msg);
  };

})();
