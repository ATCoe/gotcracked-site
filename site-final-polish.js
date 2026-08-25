(() => {
  'use strict';

  const VERSION = '20260825-final-polish3';
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
          <div class="guide-heading reveal">
            <div>
              <p class="eyebrow"><span></span>Common repair symptoms</p>
              <h2>Know the warning signs.<br>We’ll handle the diagnosis.</h2>
            </div>
            <p>These are the issues customers bring us most often. You do not need to diagnose the device yourself—tell us what changed and we’ll take it from there.</p>
          </div>

          <div class="guide-visual reveal">
            <div class="guide-visual-image"><img src="assets/repair-bench.webp?v=${VERSION}" alt="Precision electronics repair bench" loading="lazy" decoding="async"></div>
            <div class="guide-visual-copy">
              <p class="eyebrow"><span></span>Professional diagnostics</p>
              <h3>Start with the symptom, not a guess.</h3>
              <p>Screen damage, charging problems, heat, battery issues, and no-power faults can have more than one cause. We document the symptoms, inspect the device, and confirm the repair path before billable work begins.</p>
            </div>
          </div>

          <div class="issue-grid">
            <article class="issue-card reveal">
              <img src="assets/phone-screen-repair.webp?v=${VERSION}" alt="Phone screen repair on a blue-lit electronics workbench" loading="lazy" decoding="async">
              <div class="issue-card-body">
                <p class="issue-kicker">Phones & tablets</p>
                <h3>Cracked glass, display damage, or touch problems</h3>
                <p class="issue-summary">A phone can still light up even when the glass, OLED/LCD panel, touch layer, or frame has been damaged.</p>
                <details><summary>When to bring it in</summary><p>Black spots, colored lines, flickering, dead touch areas, sharp glass, or a spreading crack are all good reasons to have the device inspected before the damage gets worse.</p></details>
              </div>
            </article>

            <article class="issue-card reveal">
              <img src="assets/issue-battery-health.svg?v=${VERSION}" alt="Battery health illustration" loading="lazy" decoding="async">
              <div class="issue-card-body">
                <p class="issue-kicker">Battery & power</p>
                <h3>Fast drain, shutdowns, heat, or swelling</h3>
                <p class="issue-summary">Battery wear can show up as short runtime, sudden shutdowns, slow charging, unusual heat, or physical swelling.</p>
                <details><summary>Important safety note</summary><p>If the screen or enclosure is lifting, the battery looks swollen, or the device becomes unusually hot, stop using and charging it and bring it in for evaluation. Do not press, puncture, or compress a swollen battery.</p></details>
              </div>
            </article>

            <article class="issue-card reveal">
              <img src="assets/laptop-service.webp?v=${VERSION}" alt="Laptop cooling system being professionally serviced" loading="lazy" decoding="async">
              <div class="issue-card-body">
                <p class="issue-kicker">Laptops & computers</p>
                <h3>Overheating, loud fans, crashes, or slow performance</h3>
                <p class="issue-summary">Dust restriction, fan problems, thermal issues, storage trouble, or software load can create very similar symptoms.</p>
                <details><summary>When service makes sense</summary><p>If the computer is getting hotter than normal, shutting down under load, making mechanical fan noise, or slowing dramatically, we can inspect the cooling system and overall system health.</p></details>
              </div>
            </article>

            <article class="issue-card reveal">
              <img src="assets/issue-console-hdmi.svg?v=${VERSION}" alt="Game console HDMI port illustration" loading="lazy" decoding="async">
              <div class="issue-card-body">
                <p class="issue-kicker">Game consoles</p>
                <h3>No display, intermittent video, or HDMI damage</h3>
                <p class="issue-summary">A damaged HDMI port can cause no picture, flickering, dropouts, or a connection that only works when the cable is held a certain way.</p>
                <details><summary>Before you bring it in</summary><p>Trying one known-good HDMI cable and another display input is reasonable. If the port is loose, bent, or intermittent, do not force the cable—bring the console in for inspection.</p></details>
              </div>
            </article>
          </div>

          <div class="campus-guide reveal">
            <div class="campus-copy">
              <p class="eyebrow"><span></span>Blacksburg & campus life</p>
              <h3>When your device is also your class, work, and social life.</h3>
              <p>Downtime matters. Tell us about class deadlines, travel dates, remote-work needs, or other timing constraints so we can give you realistic options before the repair begins.</p>
            </div>
            <div class="campus-tips">
              <div class="campus-tip"><strong>Back up when possible</strong><span>If the device still works, save important files before service whenever you can.</span></div>
              <div class="campus-tip"><strong>Bring related accessories</strong><span>For charging or power problems, the charger or cable can help us reproduce the issue.</span></div>
              <div class="campus-tip"><strong>Liquid exposure</strong><span>Power the device down and avoid repeatedly testing or charging it before inspection.</span></div>
              <div class="campus-tip"><strong>We diagnose first</strong><span>Symptoms can overlap. We confirm what failed before recommending paid repair work.</span></div>
            </div>
          </div>
          <p class="repair-guide-note">General customer guidance only. Actual repair needs, parts, pricing, and turnaround are confirmed after inspection.</p>
        </div>
      </section>`;
  }

  function installRepairGuide() {
    if (document.getElementById('repair-guide')) return;
    const services = document.getElementById('services');
    if (!services) return;
    services.insertAdjacentHTML('afterend', repairGuideMarkup());
  }

  const extraFaqs = [
    ['My screen is cracked but still works. Do I need to repair it?', 'A working image does not mean every layer of the display is undamaged. Cracks can spread, sharp glass can become a safety issue, and touch or image problems may appear later. If you see black spots, lines, flickering, dead touch areas, or exposed glass, have it inspected.'],
    ['What should I do if my device will not charge?', 'Bring the device and, when practical, the charger or cable you normally use. Charging failures can come from the cable, power adapter, charging port, battery, or internal power circuitry, so we confirm the cause before recommending a repair.'],
    ['What should I do if the battery looks swollen?', 'Stop using and charging the device. Do not press the screen back down, puncture the battery, or expose it to heat. Bring the device in for safe evaluation as soon as practical.'],
    ['What should I do after liquid exposure?', 'Power the device down and avoid repeatedly turning it on or charging it. Rice does not remove conductive residue or corrosion inside the device. Early professional inspection gives us the best chance to assess the damage before it progresses.'],
    ['Do I need an appointment?', 'Not always. Walk-ins are welcome, and appointments are useful when you want to reserve a time window. For mail-in service, submit a request and wait for approval before shipping your device.']
  ];

  function installBasicFaqs() {
    const accordion = document.querySelector('#faq .accordion');
    if (!accordion || accordion.dataset.gcExpandedFaqs === 'true') return;
    accordion.dataset.gcExpandedFaqs = 'true';
    for (const [question, answer] of extraFaqs) {
      if ([...accordion.querySelectorAll('summary')].some(summary => summary.textContent?.includes(question))) continue;
      const details = document.createElement('details');
      details.innerHTML = `<summary>${question}<span>+</span></summary><p>${answer}</p>`;
      accordion.appendChild(details);
    }
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
      if (!tracking && axis !== 'x') return;
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

  function init() {
    installFullLogo();
    installRepairGuide();
    installBasicFaqs();
    installGestureRail();
    document.documentElement.dataset.gcSitePolish = VERSION;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
