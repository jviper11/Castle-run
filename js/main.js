function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ═══════════════════════════════════════════════════════════════════
// INIT TITLE PARTICLES
// ═══════════════════════════════════════════════════════════════════

(function initTitleParticles() {
  try {
    hideLoader();
    const container = document.getElementById('title-particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'title-particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (6 + Math.random() * 8) + 's';
      p.style.animationDelay = (Math.random() * 8) + 's';
      p.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
      container.appendChild(p);
    }
  } catch(e) { console.log('particle error:', e); }
})();

try {
  function setVH() {
    try {
      const h = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
      document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
    } catch(e) {
      document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
    }
  }
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', function(){ setTimeout(setVH, 150); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVH);
  }
  document.addEventListener('DOMContentLoaded', setVH);
  setTimeout(setVH, 300);
} catch(e) { console.log('VH error:', e); }
