(() => {
  'use strict';

  const VERSION = '20260825-final-polish2';
  const MOBILE_QUERY = '(max-width:650px)';
  const mobile = window.matchMedia(MOBILE_QUERY);

  function installFullLogo() {
    const brand = document.querySelector('.site-header .brand');
    const image = brand?.querySelector('img');
    if (!brand || !image) return;
    brand.classList.add('gc-full-logo');
    image.src = `assets/gotcracked-portal-logo.png?v=${VERSION}`;
    image.alt = 'GotCracked';
  }

  function repairGuideMarkup() {
    return `
      <section class="section repair-guide" id="repair-guide">
        <div class="container">
          <div class="guide-heading">
            <div>
              <p class="eyebrow"><span></span>Know what the symptoms mean</p>
              <h2>Common problems.<br>Clear next steps.</h2>
            </div>
            <p>You do not need to diagnose the device yourself. These guides explain the warning signs we see most often and what you can safely do before a technician takes a look.</p>
          </div>

          <div class="guide-visual">
            <div class="guide-visual-image"><img src="assets/repair-bench.webp?v=${VERSION}" alt="Electronics repair workbench" loading="lazy" decoding="async"></div>
            <div class="guide-visual-copy">
              <p class="eyebrow"><span></span>Start with the symptom</p>
              <h3>Good diagnostics begin before the first screw comes out.</h3>
              <p>Tell us <strong>what changed, when it started, and what happened immediately before it failed.</strong> That history can save diagnostic time and helps us avoid replacing parts that are not actually the problem.</p>
            </div>
          </div>

          <div class="issue-grid">
            <article class="issue-card">
              <img src="assets/issue-cracked-screen.svg?v=${VERSION}" alt="Illustration of a cracked phone screen" loading="lazy" decoding="async">
              <div class="issue-card-body">
                <p class="issue-kicker">Phones & tablets</p>
                <h3>Cracked or unresponsive display</h3>
                <p class="issue-summary">A damaged display can still show an image while the touch layer, OLED/LCD panel, or internal connector is failing.</p>
                <details><summary>What to do next</summary><ul><li>Stop pressing hard on broken glass.</li><li>Back up the device if touch still works.</li><li>Keep it dry and avoid flexing the frame.</li></ul></details>
              </div>
            </article>

            <article class="issue-card">
              <img src="assets/issue-battery-health.svg?v=${VERSION}" alt="Illustration of a device battery health problem" loading="lazy" decoding="async">
              <div class="issue-card-body">
                <p class="issue-kicker">Battery & power</p>
                <h3>Fast drain, shutdowns, or swelling</h3>
                <p class="issue-summary">A worn battery may cause poor runtime, sudden shutdowns, heat, charging problems, or physical swelling.</p>
                <details><summary>What to do next</summary><ul><li>If the battery is swollen, stop using and charging the device.</li><li>Do not puncture or compress the battery.</li><li>Bring the device in for a safe evaluation.</li></ul></details>
              </div>
            </article>

            <article class="issue-card">
              <img src="assets/issue-laptop-thermal.svg?v=${VERSION}" alt="Illustration of a laptop overheating problem" loading="lazy" decoding="async">
              <div class="issue-card-body">
                <p class="issue-kicker">Computers</p>
                <h3>Overheating, loud fans, or slow performance</h3>
                <p class="issue-summary">Dust buildup, blocked airflow, degraded thermal material, failing fans, or software load can all produce similar symptoms.</p>
                <details><summary>What to do next</summary><ul><li>Use the computer on a hard, open surface.</li><li>Do not block intake or exhaust vents.</li><li>Shut it down if you smell heat or hear mechanical fan noise.</li></ul></details>
              </div>
            </article>

            <article class="issue-card">
              <img src="assets/issue-console-hdmi.svg?v=${VERSION}" alt="Illustration of a game console HDMI port problem" loading="lazy" decoding="async">
              <div class="issue-card-body">
                <p class="issue-kicker">Game consoles</p>
                <h3>No video or damaged HDMI port</h3>
                <p class="issue-summary">A loose cable is easy to rule out, but bent pins, damaged ports, board-level faults, and video circuitry require closer inspection.</p>
                <details><summary>What to do next</summary><ul><li>Test one known-good cable and display.</li><li>Do not force a cable into a damaged port.</li><li>Bring the console and power cable if the fault is intermittent.</li></ul></details>
              </div>
            </article>
          </div>

          <div class="campus-guide">
            <div class="campus-copy">
              <p class="eyebrow"><span></span>Blacksburg & campus life</p>
              <h3>When your device is also your class, work, and social life.</h3>
              <p>We know downtime matters. Tell us if you have a class deadline, travel date, remote-work need, or other timing constraint so we can give you the clearest realistic options.</p>
            </div>
            <div class="campus-tips">
              <div class="campus-tip"><strong>Back up first</strong><span>If the device still works, save important files before repair whenever possible.</span></div>
              <div class="campus-tip"><strong>Bring the right charger</strong><span>For power or charging issues, the charger can be part of the diagnosis.</span></div>
              <div class="campus-tip"><strong>Skip the rice</strong><span>For liquid exposure, power the device down. Rice does not remove internal contamination.</span></div>
              <div class="campus-tip"><strong>Do not keep testing damage</strong><span>Repeated power cycles can make some liquid, battery, or board faults worse.</span></div>
            </div>
          </div>
          <p class="repair-guide-note">These are general safety and troubleshooting guidelines, not a remote diagnosis. Actual repair needs are confirmed after inspection.</p>
        </div>
      </section>`;
  }

  function installRepairGuide() {
    if (document.getElementById('repair-guide')) return;
    const services = document.getElementById('services');
    if (!services) return;
    services.insertAdjacentHTML('afterend', repairGuideMarkup());
  }

  function installRailHint(rail) {
    if (rail.nextElementSibling?.classList.contains('gc-rail-hint')) return;
    const hint = document.createElement('div');
    hint.className = 'gc-rail-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = '<span>↔</span> Swipe sideways for more services';
    rail.insertAdjacentElement('afterend', hint);
  }

  function nearestCard(rail) {
    const cards = [...rail.children].filter(node => node instanceof HTMLElement && node.classList.contains('service-card'));
    if (!cards.length) return;
    const left = rail.scrollLeft;
    let nearest = cards[0];
    let distance = Math.abs(cards[0].offsetLeft - left);
    for (const card of cards.slice(1)) {
      const nextDistance = Math.abs(card.offsetLeft - left);
      if (nextDistance < distance) { nearest = card; distance = nextDistance; }
    }
    rail.scrollTo({ left: nearest.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function installGestureRail() {
    const rail = document.querySelector('#services .service-grid');
    if (!rail || rail.dataset.gcGestureReady === 'true') return;
    rail.dataset.gcGestureReady = 'true';
    rail.classList.add('gc-gesture-rail');
    installRailHint(rail);

    let tracking = false;
    let axis = null;
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let pointerId = null;
    let dragged = false;

    const reset = () => {
      if (!tracking) return;
      tracking = false;
      axis = null;
      pointerId = null;
      rail.classList.remove('gc-dragging');
      if (dragged && mobile.matches) nearestCard(rail);
      setTimeout(() => { dragged = false; }, 0);
    };

    rail.addEventListener('pointerdown', event => {
      if (!mobile.matches) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      tracking = true;
      axis = null;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScroll = rail.scrollLeft;
      dragged = false;
    }, { passive:true });

    rail.addEventListener('pointermove', event => {
      if (!tracking || event.pointerId !== pointerId || !mobile.matches) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);

      if (!axis && Math.max(ax, ay) >= 7) {
        if (ay > ax * 1.08) {
          axis = 'y';
          tracking = false;
          return;
        }
        if (ax > ay * 1.08) {
          axis = 'x';
          dragged = true;
          rail.classList.add('gc-dragging');
          try { rail.setPointerCapture(event.pointerId); } catch {}
        }
      }

      if (axis === 'x') {
        event.preventDefault();
        rail.scrollLeft = startScroll - dx;
      }
    }, { passive:false });

    rail.addEventListener('pointerup', reset);
    rail.addEventListener('pointercancel', reset);
    rail.addEventListener('lostpointercapture', reset);
    rail.addEventListener('click', event => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  function tagUsefulFaqs() {
    document.querySelectorAll('#faq details').forEach(detail => {
      const text = detail.querySelector('summary')?.textContent?.toLowerCase() || '';
      if (text.includes('devices do you repair') || text.includes('recover my data')) detail.dataset.guideFaq = 'true';
    });
  }

  function init() {
    installFullLogo();
    installRepairGuide();
    installGestureRail();
    tagUsefulFaqs();
    document.documentElement.dataset.gcSitePolish = VERSION;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
