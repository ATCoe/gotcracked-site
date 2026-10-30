(() => {
  'use strict';

  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  // New control applies to future requests. Keep this page and any customer
  // form inputs intact; the next navigation loads the current public shell.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/customer-sw.js', { scope: '/' })
      .then(registration => registration.update())
      .catch(() => {
        // The customer site remains usable when offline support is unavailable.
      });
  }, { once: true });
})();
