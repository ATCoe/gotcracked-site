(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[char]);
  const safePublicUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '#'; } catch { return '#'; } };
  const SOCIAL_PLATFORMS = [
    { label:'YouTube', key:'youtube_channel_url', hosts:['youtube.com','youtu.be'], icon:'assets/social/youtube-official.png' },
    { label:'TikTok', key:'tiktok_profile_url', hosts:['tiktok.com'], icon:'assets/social/tiktok-official.png' },
    { label:'Instagram', key:'instagram_profile_url', hosts:['instagram.com'], icon:'assets/social/instagram-official.svg' },
    { label:'Facebook', key:'facebook_profile_url', hosts:['facebook.com','fb.com'], icon:'assets/social/facebook-official.png' }
  ];
  const safePlatformUrl = (value, hosts) => {
    const safe = safePublicUrl(value);
    if (safe === '#') return '#';
    const host = new URL(safe).hostname.toLowerCase().replace(/^www\./,'');
    return hosts.some(allowed => host === allowed || host.endsWith('.' + allowed)) ? safe : '#';
  };
  const socialMarkup = settings => SOCIAL_PLATFORMS.map(platform => ({...platform,url:safePlatformUrl(settings?.[platform.key],platform.hosts)})).filter(platform => platform.url !== '#').map(platform => `<a class="social-profile-button" href="${platform.url}" target="_blank" rel="noopener noreferrer"><span class="social-profile-icon"><img src="${platform.icon}" alt="" loading="lazy" decoding="async"></span><span>${platform.label}</span><span aria-hidden="true">↗</span></a>`).join('');
  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();
  const menu = $('.menu-button'), nav = $('#site-nav');
  const setMenu = open => {
    if (!menu || !nav) return;
    const show = Boolean(open) && window.matchMedia('(max-width: 980px)').matches;
    nav.classList.toggle('open',show);
    menu.setAttribute('aria-expanded',String(show));
    document.body.classList.toggle('nav-open',show);
  };
  menu?.addEventListener('click',()=>setMenu(!nav?.classList.contains('open')));
  $$('#site-nav a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setMenu(false);});

  function renderSponsor(settings) {
    const section = $('#learn-sponsor'), host = $('#learn-sponsor-content');
    if (!section || !host || settings?.site_sponsor_active !== true) return;
    const name = String(settings.site_sponsor_name || '').trim();
    const url = safePublicUrl(settings.site_sponsor_url);
    if (!name || url === '#') return;
    const logo = safePublicUrl(settings.site_sponsor_logo_url);
    const blurb = String(settings.site_sponsor_blurb || '').trim();
    host.innerHTML = `${logo !== '#' ? `<img src="${escapeHTML(logo)}" alt="${escapeHTML(name)} logo" loading="lazy" referrerpolicy="no-referrer">` : ''}<div class="learn-sponsor-copy"><strong>${escapeHTML(name)}</strong>${blurb ? `<p>${escapeHTML(blurb)}</p>` : ''}<a href="${escapeHTML(url)}" target="_blank" rel="sponsored noopener noreferrer">Visit sponsor →</a></div>`;
    section.hidden = false;
  }
  (async () => {
    const media = $('#learn-media-grid');
    try {
      if (!window.supabaseClient?.functions) throw new Error('Public media unavailable');
      const {data,error} = await window.supabaseClient.functions.invoke('public-media',{method:'GET'});
      if (error) throw error;
      const settings = data?.settings || {};
      const buttons = socialMarkup(settings);
      for (const host of [$('#learn-social-links'),$('#learn-footer-social')]) {
        if (!host) continue;
        host.innerHTML = buttons;
        host.hidden = !buttons;
      }
      renderSponsor(settings);
      const posts = Array.isArray(data?.posts) ? data.posts.slice(0,6) : [];
      if (media) media.innerHTML = posts.length ? posts.map(post => {
        const href = safePublicUrl(post.public_url);
        const image = safePublicUrl(post.thumbnail_url);
        return `<a class="media-card" href="${href}" target="_blank" rel="noopener noreferrer"><div class="media-thumb">${image !== '#' ? `<img src="${escapeHTML(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}</div><div><small>${escapeHTML(post.platform || 'GotCracked')}</small><h3>${escapeHTML(post.title || 'Watch this repair')}</h3></div></a>`;
      }).join('') : '<article class="media-placeholder">New GotCracked repair videos will appear here as they are published.</article>';
    } catch {
      if (media) media.innerHTML = '<article class="media-placeholder">Repair videos are coming soon. Check back after launch.</article>';
    }
  })();
})();
