(() => {
  'use strict';

  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  let refreshedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshedForUpdate) return;
    refreshedForUpdate = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/customer-sw.js', { scope: '/' })
      .then(registration => registration.update())
      .catch(() => {
        // The customer site remains fully usable when offline support is unavailable.
      });
  }, { once: true });
})();

