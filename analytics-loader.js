(() => {
  'use strict';

  const SETTINGS_URL = 'https://uvpmmbioerejeyybfntb.supabase.co/functions/v1/public-media';
  const ID_PATTERN = /^G-[A-Z0-9]+$/;

  const doNotTrack = () =>
    navigator.doNotTrack === '1' ||
    window.doNotTrack === '1' ||
    navigator.msDoNotTrack === '1';

  async function loadMeasurementId() {
    const response = await fetch(SETTINGS_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Public settings returned ${response.status}.`);
    const data = await response.json();
    const id = String(data?.settings?.google_analytics_measurement_id || '').trim().toUpperCase();
    return ID_PATTERN.test(id) ? id : null;
  }

  function startAnalytics(measurementId) {
    if (window.__gotCrackedGa4Loaded) return;
    window.__gotCrackedGa4Loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.dataset.gcAnalytics = 'ga4';
    document.head.appendChild(script);
  }

  async function init() {
    if (doNotTrack()) {
      document.documentElement.dataset.gcAnalytics = 'do-not-track';
      return;
    }
    try {
      const measurementId = await loadMeasurementId();
      if (!measurementId) {
        document.documentElement.dataset.gcAnalytics = 'not-configured';
        return;
      }
      document.documentElement.dataset.gcAnalytics = 'enabled';
      startAnalytics(measurementId);
    } catch (error) {
      document.documentElement.dataset.gcAnalytics = 'unavailable';
      console.warn('GotCracked analytics did not initialize:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
