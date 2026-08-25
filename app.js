(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const safePublicUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '#'; } catch { return '#'; } };
  const toast = $('.toast');
  const showToast = message => {
    toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 3500);
  };

  const headerLogo = $('.brand img');
  const setLogoState = ready => document.documentElement.classList.add(ready ? 'logo-ready' : 'logo-missing');
  if (headerLogo?.complete) setLogoState(headerLogo.naturalWidth > 0);
  else { headerLogo?.addEventListener('load', () => setLogoState(true)); headerLogo?.addEventListener('error', () => setLogoState(false)); }

  $('#year').textContent = new Date().getFullYear();
  (async () => {
    const grid = $('#social-media-grid'), links = $('#social-media-links');
    if (!grid) return;
    try {
      const { data, error } = await window.supabaseClient.functions.invoke('public-media', { method: 'GET' });
      if (error) throw error;
      const posts = data?.posts || [];
      grid.innerHTML = posts.length ? posts.slice(0, 6).map(post => `<a class="media-card" href="${safePublicUrl(post.public_url)}" target="_blank" rel="noopener"><div class="media-thumb">${post.thumbnail_url ? `<img src="${safePublicUrl(post.thumbnail_url)}" alt="" loading="lazy">` : `<span>${post.platform === 'youtube' ? '▶' : '♪'}</span>`}</div><div><small>${escapeHTML(post.platform)}</small><h3>${escapeHTML(post.title || 'Watch on ' + post.platform)}</h3></div></a>`).join('') : '<article class="media-placeholder">New repair videos are coming soon. Follow GotCracked for tips and behind-the-scenes repairs.</article>';
      links.innerHTML = [['YouTube',data?.settings?.youtube_channel_url],['TikTok',data?.settings?.tiktok_profile_url]].filter(([,url]) => safePublicUrl(url) !== '#').map(([label,url]) => `<a href="${safePublicUrl(url)}" target="_blank" rel="noopener">Follow on ${label} →</a>`).join('');
    } catch { grid.innerHTML = '<article class="media-placeholder">Visit our social channels for the latest GotCracked repairs and tips.</article>'; }
  })();
  const dateInput = $('[name="date"]');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().slice(0, 10);

  const menu = $('.menu-button'), nav = $('#site-nav');
  menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', open); });
  $$('#site-nav a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }));

  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  $$('.reveal').forEach(element => observer.observe(element));
  $$('.accordion details').forEach(detail => detail.addEventListener('toggle', () => { if (detail.open) $$('.accordion details').filter(item => item !== detail).forEach(item => item.open = false); }));

  const bookingForm = $('#booking-form');
  bookingForm.elements.formStartedAt.value = String(Date.now());
  const serviceMode = bookingForm.elements.serviceMode;
  const walkInFields = $('[data-walk-in-fields]', bookingForm);
  const mailInFields = $('[data-mail-in-fields]', bookingForm);
  const updateServiceMode = () => {
    const mailIn = serviceMode.value === 'mail_in';
    walkInFields.hidden = mailIn;
    mailInFields.hidden = !mailIn;
    ['date', 'time'].forEach(name => { bookingForm.elements[name].required = !mailIn; });
    ['address1', 'city', 'state', 'postalCode'].forEach(name => { bookingForm.elements[name].required = mailIn; });
    $('#step-three-title').textContent = mailIn ? 'Where should we return it?' : 'When works best?';
    $('[data-submit-label]').textContent = mailIn ? 'Request mail-in approval' : 'Request appointment';
  };
  serviceMode.addEventListener('change', updateServiceMode);
  updateServiceMode();
  let currentStep = 1;
  const showStep = step => {
    currentStep = step;
    $$('.form-step', bookingForm).forEach(element => element.classList.toggle('active', Number(element.dataset.step) === step));
    $$('.form-progress span', bookingForm).forEach((element, index) => element.classList.toggle('active', index < step));
    bookingForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const validateStep = step => {
    let valid = true;
    $$(`[data-step="${step}"] [required]`, bookingForm).forEach(field => {
      const ok = field.type === 'checkbox' ? field.checked : field.checkValidity();
      field.classList.toggle('invalid', !ok);
      const error = field.closest('label')?.querySelector('.field-error') || (field.name === 'consent' ? $('.consent-error') : null);
      if (error) error.textContent = ok ? '' : (field.type === 'email' ? 'Enter a valid email address.' : 'This field is required.');
      if (!ok) valid = false;
    });
    return valid;
  };
  $$('.form-next').forEach(button => button.addEventListener('click', () => { if (validateStep(currentStep)) showStep(currentStep + 1); }));
  $$('.button-back').forEach(button => button.addEventListener('click', () => showStep(currentStep - 1)));
  $$('[data-book-service]').forEach(button => button.addEventListener('click', () => { $('[name="issue"]').value = button.dataset.bookService; $('#book').scrollIntoView({ behavior: 'smooth' }); }));
  $$('[data-start-mail-in]').forEach(button => button.addEventListener('click', () => { serviceMode.value = 'mail_in'; updateServiceMode(); }));

  bookingForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateStep(3)) return;
    const submit = bookingForm.querySelector('[type="submit"]');
    submit.disabled = true; submit.textContent = 'Sending request…';
    try {
      const payload = Object.fromEntries(new FormData(bookingForm));
      const { data, error } = await window.supabaseClient.functions.invoke('public-intake', { body: payload });
      if (error || !data?.reference) throw new Error(data?.error || error?.message || 'Unable to send request.');
      $('#request-number').textContent = data.reference;
      $$('.form-step, .form-progress', bookingForm).forEach(element => element.style.display = 'none');
      $('.form-success', bookingForm).classList.add('active');
      showToast(serviceMode.value === 'mail_in' ? 'Your mail-in request is awaiting approval. Do not ship yet.' : 'Your request is now in the GotCracked repair queue.');
    } catch (error) {
      showToast(error.message || 'Unable to submit. Please contact the shop.');
    } finally { submit.disabled = false; submit.innerHTML = `<span data-submit-label>${serviceMode.value === 'mail_in' ? 'Request mail-in approval' : 'Request appointment'}</span> <span>→</span>`; }
  });
  $('#new-request').addEventListener('click', () => {
    bookingForm.reset(); bookingForm.elements.formStartedAt.value = String(Date.now()); updateServiceMode(); $('.form-success').classList.remove('active');
    $$('.form-step, .form-progress', bookingForm).forEach(element => element.style.display = ''); showStep(1);
  });

  const tracker = $('#tracker-dialog'), trackerForm = $('#tracker-form'), trackerResult = $('.tracker-result');
  const openTracker = () => { tracker.showModal(); document.body.classList.add('dialog-open'); setTimeout(() => $('[name="ticket"]', tracker).focus(), 50); };
  const resetTracker = () => { trackerForm.reset(); trackerForm.classList.remove('hidden'); trackerResult.classList.remove('active'); $('.tracker-error').textContent = ''; };
  $$('[data-open-tracker]').forEach(button => button.addEventListener('click', openTracker));
  $('[data-close-dialog]').addEventListener('click', () => tracker.close());
  tracker.addEventListener('close', () => { document.body.classList.remove('dialog-open'); resetTracker(); });
  tracker.addEventListener('click', event => { if (event.target === tracker) tracker.close(); });

  const TRACKING_STAGES = ['awaiting_repair', 'diagnostic_in_progress', 'repair_in_progress', 'quality_inspection', 'repaired', 'sale_complete'];
  const LABELS = { checked_in: 'Checked in', in_diagnosis: 'In diagnosis', awaiting_approval: 'Awaiting approval', waiting_on_parts: 'Waiting on parts', in_repair: 'In repair', ready_for_pickup: 'Ready for pickup', completed: 'Sale complete', awaiting_repair: 'Awaiting repair', need_to_order_parts: 'Need to order parts', awaiting_parts: 'Awaiting parts', diagnostic_in_progress: 'Diagnostic in progress', repair_in_progress: 'Repair in progress', quality_inspection: 'Quality inspection', awaiting_callback: 'Awaiting callback', repaired: 'Repaired – ready for pickup', sale_complete: 'Sale complete', abandoned: 'Abandoned', unrepairable: 'Unrepairable', customer_declined: 'Customer declined', cancelled: 'Cancelled' };
  const SHIPPING_LABELS = { awaiting_inbound: 'Awaiting your inbound package', inbound_in_transit: 'Inbound package in transit', received: 'Package received at GotCracked', return_label_ready: 'Return label prepared', outbound_in_transit: 'Repaired device is on the way', delivered: 'Return package delivered', shipping_issue: 'Shipping needs attention' };
  const trackingUrl = (carrier, tracking) => {
    const encoded = encodeURIComponent(tracking || '');
    if (/ups/i.test(carrier || '')) return `https://www.ups.com/track?tracknum=${encoded}`;
    if (/fedex/i.test(carrier || '')) return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
  };
  const renderTrackingStatus = repair => {
    const fallbackStage = { checked_in:0, in_diagnosis:1, awaiting_approval:1, waiting_on_parts:1, in_repair:2, ready_for_pickup:4, need_to_order_parts:1, awaiting_parts:1, awaiting_callback:1, abandoned:4, unrepairable:0, customer_declined:0, cancelled:0 };
    const current = TRACKING_STAGES.includes(repair.status) ? TRACKING_STAGES.indexOf(repair.status) : (fallbackStage[repair.status] ?? 0);
    $('.status-pill').textContent = LABELS[repair.status] || repair.status;
    $('.tracker-device strong').textContent = [repair.device?.manufacturer, repair.device?.model].filter(Boolean).join(' ') || 'Device repair';
    $('.tracker-device small').textContent = `Last updated ${new Date(repair.updatedAt).toLocaleString()}`;
    $('.tracker-timeline').innerHTML = TRACKING_STAGES.map((stage, index) => `<li class="${index < current ? 'complete' : index === current ? 'current' : ''}">${LABELS[stage]}</li>`).join('');
    const shipping = $('.tracker-shipping');
    if (repair.intakeMethod === 'mail_in') {
      const label = SHIPPING_LABELS[repair.shippingStatus] || 'Mail-in repair';
      const carrier = escapeHTML(repair.outboundCarrier || 'Carrier pending');
      const tracking = escapeHTML(repair.outboundTracking || 'Tracking pending');
      shipping.innerHTML = `<strong>${escapeHTML(label)}</strong><span>${carrier} · ${tracking}</span>${repair.outboundTracking ? `<a href="${trackingUrl(repair.outboundCarrier, repair.outboundTracking)}" target="_blank" rel="noopener">Track return package ↗</a>` : ''}`;
      shipping.hidden = false;
    } else { shipping.hidden = true; shipping.innerHTML = ''; }
    $('.tracker-demo-note').textContent = repair.publicNotes || 'For questions about this repair, contact the GotCracked shop.';
    $('.tracker-demo-note').style.display = '';
  };
  trackerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const ticket = $('[name="ticket"]', tracker).value.trim();
    const phone = $('[name="trackerPhone"]', tracker).value.trim();
    const button = trackerForm.querySelector('[type="submit"]');
    if (!ticket || phone.replace(/\D/g, '').length < 7) { $('.tracker-error').textContent = 'Enter a ticket number and valid phone number.'; return; }
    button.disabled = true; button.textContent = 'Finding repair…'; $('.tracker-error').textContent = '';
    try {
      const { data, error } = await window.supabaseClient.functions.invoke('track-repair', { body: { ticket, phone } });
      if (error || !data?.ticket) throw new Error(data?.error || 'We could not match that ticket and phone number.');
      $('#tracked-ticket').textContent = data.ticket; renderTrackingStatus(data);
      trackerForm.classList.add('hidden'); trackerResult.classList.add('active');
    } catch (error) { $('.tracker-error').textContent = error.message; }
    finally { button.disabled = false; button.innerHTML = 'Find my repair →'; }
  });
  $('#track-another').addEventListener('click', resetTracker);
})();
