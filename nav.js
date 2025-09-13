(function () {
  const mount = document.getElementById('site-nav') || document.body;
  fetch('nav.html', { cache: 'no-cache' })
    .then(r => r.text())
    .then(html => {
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      const nav = wrap.firstElementChild;
      // podświetlenie aktywnej strony
      const here = location.pathname.split('/').pop() || 'index.html';
      nav.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href === here) a.style.outline = '2px solid #4cc9f0';
      });
      mount.prepend(nav);
    })
    .catch(() => {});
})();
