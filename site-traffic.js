(() => {
  'use strict';

  if (window.__gotCrackedLiveTrafficLoaded) return;
  window.__gotCrackedLiveTrafficLoaded = true;

  const ENDPOINT = 'https://uvpmmbioerejeyybfntb.supabase.co/functions/v1/site-traffic';
  const SESSION_KEY = 'gc-site-traffic-session-v1';
  const HEARTBEAT_MS = 30000;

  const doNotTrack = () =>
    navigator.doNotTrack === '1' ||
    window.doNotTrack === '1' ||
    navigator.msDoNotTrack === '1';

  function sessionId() {
    try {
      let value = sessionStorage.getItem(SESSION_KEY);
      if (!value) {
        value = crypto.randomUUID?.() || `gc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`;
        sessionStorage.setItem(SESSION_KEY, value);
      }
      return value;
    } catch {
      return crypto.randomUUID?.() || `gc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`;
    }
  }

  function osFamily() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/CrOS/i.test(ua)) return 'chromeos';
    if (/Windows/i.test(ua)) return 'windows';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
    if (/Linux/i.test(ua)) return 'linux';
    return 'other';
  }

  function browserFamily() {
    const ua = navigator.userAgent || '';
    if (/Edg\//i.test(ua)) return 'edge';
    if (/Firefox\//i.test(ua)) return 'firefox';
    if (/CriOS\//i.test(ua) || /Chrome\//i.test(ua)) return 'chrome';
    if (/Safari\//i.test(ua) && !/Chrome|CriOS|Edg\//i.test(ua)) return 'safari';
    return 'other';
  }

  function deviceClass() {
    const ua = navigator.userAgent || '';
    if (/iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
    if (navigator.userAgentData?.mobile || /iPhone|iPod|Android.*Mobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function externalReferrerHost() {
    if (!document.referrer) return null;
    try {
      const ref = new URL(document.referrer);
      if (ref.hostname.replace(/^www\./,'') === location.hostname.replace(/^www\./,'')) return null;
      return ref.hostname.slice(0,180);
    } catch { return null; }
  }

  function campaign() {
    const params = new URLSearchParams(location.search);
    return {
      utm_source: (params.get('utm_source') || '').slice(0,120) || null,
      utm_medium: (params.get('utm_medium') || '').slice(0,120) || null,
      utm_campaign: (params.get('utm_campaign') || '').slice(0,160) || null
    };
  }

  function payload(eventType) {
    return {
      session_id: sessionId(),
      event_type: eventType,
      path: location.pathname.slice(0,300) || '/',
      referrer_host: externalReferrerHost(),
      ...campaign(),
      device_class: deviceClass(),
      os_family: osFamily(),
      browser_family: browserFamily(),
      viewport_width: Math.max(0, Math.round(window.innerWidth || 0)),
      viewport_height: Math.max(0, Math.round(window.innerHeight || 0))
    };
  }

  function send(eventType) {
    if (doNotTrack() || document.visibilityState === 'prerender') return;
    const body = JSON.stringify(payload(eventType));
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type':'text/plain;charset=UTF-8' },
      body,
      credentials: 'omit',
      cache: 'no-store',
      keepalive: true,
      referrerPolicy: 'strict-origin-when-cross-origin'
    }).catch(() => {});
  }

  if (doNotTrack()) {
    document.documentElement.dataset.gcLiveTraffic = 'do-not-track';
    return;
  }

  document.documentElement.dataset.gcLiveTraffic = 'enabled';
  send('page_view');

  let timer = setInterval(() => {
    if (document.visibilityState === 'visible') send('heartbeat');
  }, HEARTBEAT_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') send('heartbeat');
  });

  window.addEventListener('pagehide', () => {
    if (timer) clearInterval(timer);
    timer = null;
  }, { once:true });
})();
