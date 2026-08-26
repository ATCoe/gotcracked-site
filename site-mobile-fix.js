(() => {
  'use strict';

  if (window.GotCrackedMobileSiteFix) return;

  const rail = document.querySelector('#services .service-grid');
  const guide = document.getElementById('repair-guide');

  function restoreDynamicReveals(root = guide) {
    if (!root) return;
    const items = [...root.querySelectorAll('.reveal:not(.visible)')];
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(item => item.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: .08, rootMargin: '120px 0px' });

    items.forEach(item => {
      item.dataset.gcDynamicRevealReady = 'true';
      observer.observe(item);
    });
  }

  function restoreNativeServiceGestures() {
    if (!rail) return;

    /* site-final-polish installs a target-level pointer handler. Intercept the
       initial pointerdown during capture without cancelling the browser default,
       so native horizontal/vertical gesture arbitration remains in control. */
    document.addEventListener('pointerdown', event => {
      if (!(event.target instanceof Element) || !event.target.closest('#services .service-grid')) return;
      event.stopPropagation();
    }, true);

    rail.style.touchAction = 'auto';
    rail.style.scrollSnapType = 'x proximity';
    rail.style.webkitOverflowScrolling = 'touch';
    rail.dataset.gcNativeGesture = 'true';
  }

  restoreDynamicReveals();
  restoreNativeServiceGestures();

  window.GotCrackedMobileSiteFix = {
    version: '20260826-mobile1',
    refreshReveals: restoreDynamicReveals
  };
})();
