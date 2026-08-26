const SUPABASE_URL = 'https://uvpmmbioerejeyybfntb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CmcUD2ze8lhj4HvlMfoYiQ_DGG_xabb';
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Public-site polish layer. The repair-guide bundle is still loaded separately,
// but the mobile QA patch runs only after the guide/polish DOM has initialized.
(() => {
  const version = '20260826-mobile1';
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

  if (!document.querySelector('link[data-gc-mobile-site-fix]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `site-mobile-fix.css?v=${version}`;
    link.dataset.gcMobileSiteFix = 'true';
    document.head.appendChild(link);
  }

  const loadMobileFix = () => {
    if (document.querySelector('script[data-gc-mobile-site-fix]')) return;
    const fix = document.createElement('script');
    fix.src = `site-mobile-fix.js?v=${version}`;
    fix.async = false;
    fix.dataset.gcMobileSiteFix = 'true';
    document.body.appendChild(fix);
  };

  if (!document.querySelector('script[data-gc-site-final-polish]')) {
    const script = document.createElement('script');
    script.src = `site-final-polish.js?v=${version}`;
    script.async = false;
    script.dataset.gcSiteFinalPolish = 'true';
    script.addEventListener('load', loadMobileFix, { once:true });
    document.body.appendChild(script);
  } else {
    loadMobileFix();
  }
})();
