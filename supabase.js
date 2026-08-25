const SUPABASE_URL = 'https://uvpmmbioerejeyybfntb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CmcUD2ze8lhj4HvlMfoYiQ_DGG_xabb';
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Public-site polish layer. Keep this loader small so the brand swap happens
// immediately, then load the richer repair-guide and mobile gesture behavior.
(() => {
  const version = '20260825-final-polish2';
  const brand = document.querySelector('.site-header .brand');
  const logo = brand?.querySelector('img');
  if (brand && logo) {
    brand.classList.add('gc-full-logo');
    logo.src = `assets/gotcracked-portal-logo.png?v=${version}`;
    logo.alt = 'GotCracked';
  }

  if (!document.querySelector('link[data-gc-repair-guide]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `repair-guide.css?v=${version}`;
    link.dataset.gcRepairGuide = 'true';
    document.head.appendChild(link);
  }

  if (!document.querySelector('script[data-gc-site-final-polish]')) {
    const script = document.createElement('script');
    script.src = `site-final-polish.js?v=${version}`;
    script.async = false;
    script.dataset.gcSiteFinalPolish = 'true';
    document.body.appendChild(script);
  }
})();
