(() => {
  'use strict';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const safePublicUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '#'; } catch { return '#'; } };
  const localDateISO = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const formatUpdatedAt = value => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'recently'; };
  const formatHour = value => { const [hour,minute] = String(value || '').split(':').map(Number); if (!Number.isFinite(hour)) return ''; const date = new Date(2000,0,1,hour,minute||0); return date.toLocaleTimeString([], { hour:'numeric', minute:minute ? '2-digit' : undefined }); };
  const storeHoursMarkup = hours => {
    if (!hours || typeof hours !== 'object') return '';
    const rows = [['mon','Monday'],['tue','Tuesday'],['wed','Wednesday'],['thu','Thursday'],['fri','Friday'],['sat','Saturday'],['sun','Sunday']];
    return rows.map(([key,label]) => {
      const range = hours[key];
      const value = Array.isArray(range) && range.length >= 2 ? `${formatHour(range[0])}–${formatHour(range[1])}` : 'Closed';
      return `<div><span>${label}</span><strong>${escapeHTML(value)}</strong></div>`;
    }).join('');
  };

  const PLANNED_OPENING_DATE = '2026-10-01';
  const PLANNED_OPENING_LABEL = 'October 1, 2026';
  const openingBanner = $('.announcement') || (() => {
    const banner = document.createElement('div');
    banner.className = 'announcement';
    const skip = $('.skip-link');
    if (skip) skip.insertAdjacentElement('afterend', banner);
    else document.body.prepend(banner);
    return banner;
  })();
  openingBanner.innerHTML = `<span class="pulse"></span><strong>Opening soon:</strong>&nbsp; GotCracked is not open yet. Our current planned opening date is ${PLANNED_OPENING_LABEL}.`;
  openingBanner.setAttribute('role', 'status');
  document.documentElement.dataset.gcPreopening = 'true';

  const toast = $('.toast');
  const showToast = message => {
    if (!toast) return;
    toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 3500);
  };

  const headerLogo = $('.brand img');
  const setLogoState = ready => {
    document.documentElement.classList.remove('logo-ready', 'logo-missing');
    document.documentElement.classList.add(ready ? 'logo-ready' : 'logo-missing');
  };
  if (headerLogo?.complete) setLogoState(headerLogo.naturalWidth > 0);
  else { headerLogo?.addEventListener('load', () => setLogoState(true)); headerLogo?.addEventListener('error', () => setLogoState(false)); }

  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  (async () => {
    const grid = $('#social-media-grid'), links = $('#social-media-links');
    if (!grid) return;
    try {
      const { data, error } = await window.supabaseClient.functions.invoke('public-media', { method: 'GET' });
      if (error) throw error;
      const posts = data?.posts || [];
      grid.innerHTML = posts.length ? posts.slice(0, 6).map(post => `<a class="media-card" href="${safePublicUrl(post.public_url)}" target="_blank" rel="noopener"><div class="media-thumb">${post.thumbnail_url ? `<img src="${safePublicUrl(post.thumbnail_url)}" alt="" loading="lazy" decoding="async">` : `<span>${post.platform === 'youtube' ? '▶' : '♪'}</span>`}</div><div><small>${escapeHTML(post.platform)}</small><h3>${escapeHTML(post.title || 'Watch on ' + post.platform)}</h3></div></a>`).join('') : '<article class="media-placeholder">New repair videos are coming soon. Follow GotCracked for tips and behind-the-scenes repairs.</article>';
      if (links) links.innerHTML = [['YouTube',data?.settings?.youtube_channel_url],['TikTok',data?.settings?.tiktok_profile_url]].filter(([,url]) => safePublicUrl(url) !== '#').map(([label,url]) => `<a href="${safePublicUrl(url)}" target="_blank" rel="noopener">Follow on ${label} →</a>`).join('');
      const hours = $('#store-hours');
      const hoursMarkup = storeHoursMarkup(data?.settings?.store_hours);
      if (hours && hoursMarkup) hours.innerHTML = hoursMarkup;
      document.documentElement.dataset.gcMailInAvailable = data?.settings?.accepts_mail_in_repairs === false ? 'false' : 'true';
    } catch { grid.innerHTML = '<article class="media-placeholder">Visit our social channels for the latest GotCracked repairs and tips.</article>'; }
  })();

  const dateInput = $('[name="date"]');
  if (dateInput) dateInput.min = [localDateISO(new Date()), PLANNED_OPENING_DATE].sort().pop();

  const menu = $('.menu-button'), nav = $('#site-nav');
  function setMenu(open) {
    if (!menu || !nav) return;
    const shouldOpen = Boolean(open) && window.matchMedia('(max-width: 980px)').matches;
    nav.classList.toggle('open', shouldOpen);
    menu.setAttribute('aria-expanded', String(shouldOpen));
    menu.setAttribute('aria-label', shouldOpen ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-open', shouldOpen);
  }
  menu?.addEventListener('click', () => setMenu(!nav?.classList.contains('open')));
  $$('#site-nav a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
  document.addEventListener('click', event => { if (nav?.classList.contains('open') && event.target instanceof Element && !event.target.closest('.site-header')) setMenu(false); });
  window.addEventListener('resize', () => { if (!window.matchMedia('(max-width: 980px)').matches) setMenu(false); });

  const revealItems = $$('.reveal');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(element => element.classList.add('visible'));
    document.documentElement.classList.add('gc-motion-reduced');
  } else {
    document.documentElement.classList.add('gc-motion-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    revealItems.forEach(element => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight * .94 && bounds.bottom > 0) element.classList.add('visible');
      else observer.observe(element);
    });
  }

  $$('.accordion details').forEach(detail => detail.addEventListener('toggle', () => { if (detail.open) $$('.accordion details').filter(item => item !== detail).forEach(item => { item.open = false; }); }));

  const bookingForm = $('#booking-form');
  if (bookingForm) {
    bookingForm.elements.formStartedAt.value = String(Date.now());
    const serviceMode = bookingForm.elements.serviceMode;
    const walkInFields = $('[data-walk-in-fields]', bookingForm), mailInFields = $('[data-mail-in-fields]', bookingForm);
    const updateServiceMode = () => {
      const mailIn = serviceMode.value === 'mail_in';
      if (walkInFields) walkInFields.hidden = mailIn;
      if (mailInFields) mailInFields.hidden = !mailIn;
      ['date','time'].forEach(name => { if (bookingForm.elements[name]) bookingForm.elements[name].required = !mailIn; });
      ['address1','city','state','postalCode'].forEach(name => { if (bookingForm.elements[name]) bookingForm.elements[name].required = mailIn; });
      const title = $('#step-three-title'); if (title) title.textContent = mailIn ? 'Where should we return it?' : 'When works best?';
      const label = $('[data-submit-label]'); if (label) label.textContent = mailIn ? 'Request mail-in approval' : 'Request appointment';
    };
    const requestParams = new URLSearchParams(window.location.search);
    if (requestParams.get('mode') === 'mail_in') serviceMode.value = 'mail_in';
    const requestedService = requestParams.get('service');
    if (requestedService && bookingForm.elements.issue) bookingForm.elements.issue.value = requestedService;
    serviceMode?.addEventListener('change', updateServiceMode); updateServiceMode();

    let currentStep = 1;
    const showStep = step => {
      currentStep = Math.min(3, Math.max(1, step));
      $$('.form-step', bookingForm).forEach(element => element.classList.toggle('active', Number(element.dataset.step) === currentStep));
      $$('.form-progress span', bookingForm).forEach((element, index) => element.classList.toggle('active', index < currentStep));
      $(`.form-step[data-step="${currentStep}"]`, bookingForm)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
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
      if (!valid) { const invalid = $(`[data-step="${step}"] .invalid`, bookingForm); invalid?.focus({ preventScroll: true }); invalid?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return valid;
    };
    $$('.form-next').forEach(button => button.addEventListener('click', () => { if (validateStep(currentStep)) showStep(currentStep + 1); }));
    $$('.button-back').forEach(button => button.addEventListener('click', () => showStep(currentStep - 1)));
    bookingForm.addEventListener('submit', async event => {
      event.preventDefault(); if (!validateStep(3)) return;
      const submit = bookingForm.querySelector('[type="submit"]'); if (!submit) return;
      const submitError = $('.request-submit-error', bookingForm);
      if (submitError) submitError.textContent = '';
      submit.disabled = true; submit.textContent = 'Sending request…';
      try {
        if (!window.supabaseClient?.functions) throw new Error('The request service is temporarily unavailable. Please try again.');
        const payload = Object.fromEntries(new FormData(bookingForm));
        const { data, error } = await window.supabaseClient.functions.invoke('public-intake', { body: payload });
        if (error || !data?.reference) throw new Error(data?.error || error?.message || 'Unable to send request.');
        const requestNumber = $('#request-number'); if (requestNumber) requestNumber.textContent = data.reference;
        $$('.form-step, .form-progress', bookingForm).forEach(element => { element.style.display = 'none'; });
        $('.form-success', bookingForm)?.classList.add('active');
        showToast(serviceMode.value === 'mail_in' ? 'Your mail-in request is awaiting approval. Do not ship yet.' : 'Your request is now in the GotCracked repair queue.');
      } catch (error) { const message = error?.message || 'Unable to submit. Please contact the shop.'; if (submitError) submitError.textContent = message; showToast(message); }
      finally { submit.disabled = false; submit.innerHTML = `<span data-submit-label>${serviceMode.value === 'mail_in' ? 'Request mail-in approval' : 'Request appointment'}</span> <span>→</span>`; }
    });
    $('#new-request')?.addEventListener('click', () => { bookingForm.reset(); bookingForm.elements.formStartedAt.value = String(Date.now()); updateServiceMode(); $('.form-success')?.classList.remove('active'); $$('.form-step, .form-progress', bookingForm).forEach(element => { element.style.display = ''; }); showStep(1); });
  }

  const appointmentForm = $('#appointment-form');
  if (appointmentForm) {
    appointmentForm.elements.formStartedAt.value = String(Date.now());
    appointmentForm.addEventListener('submit', async event => {
      event.preventDefault();
      const button = appointmentForm.querySelector('[type="submit"]'), errorOutput = $('.request-submit-error', appointmentForm);
      if (!appointmentForm.checkValidity()) { appointmentForm.reportValidity(); return; }
      button.disabled = true; button.textContent = 'Sending request…'; if (errorOutput) errorOutput.textContent = '';
      try {
        const fields = Object.fromEntries(new FormData(appointmentForm));
        const names = String(fields.name || '').trim().split(/\s+/), lastName = names.length > 1 ? names.pop() : 'Customer';
        const payload = { companyWebsite:fields.companyWebsite, formStartedAt:fields.formStartedAt, serviceMode:'walk_in', deviceType:'Other device', model:fields.device || 'Device not specified', issue:fields.service, firstName:names.join(' ') || fields.name, lastName, email:fields.email, phone:fields.phone, preferredContact:fields.preferredContact, timing:fields.timing, date:fields.date, time:fields.time, consent:fields.consent };
        const { data, error } = await window.supabaseClient.functions.invoke('public-intake', { body:payload });
        if (error || !data?.reference) throw new Error(data?.error || error?.message || 'Unable to request the appointment.');
        $('#appointment-reference').textContent = data.reference;
        const guidance = $('#appointment-guidance');
        if (guidance) {
          guidance.textContent = data.timingGuidance || 'Your requested window is recorded, but it is not held until the GotCracked team confirms it.';
          guidance.hidden = false;
        }
        $('.form-step', appointmentForm).style.display = 'none'; $('.form-success', appointmentForm).classList.add('active');
      } catch (error) { if (errorOutput) errorOutput.textContent = error.message || 'Unable to request the appointment.'; }
      finally { button.disabled = false; button.textContent = 'Request appointment →'; }
    });
  }

  const tracker = $('#tracker-dialog'), trackerForm = $('#tracker-form'), trackerResult = $('.tracker-result');
  const resetTracker = () => { trackerForm?.reset(); trackerForm?.classList.remove('hidden'); trackerResult?.classList.remove('active'); const error = $('.tracker-error'); if (error) error.textContent = ''; };
  const openTracker = () => { setMenu(false); window.location.href = 'account.html'; };
  $$('[data-open-tracker]').forEach(button => button.addEventListener('click', openTracker));
  $('[data-close-dialog]')?.addEventListener('click', () => tracker?.close());
  tracker?.addEventListener('close', () => { document.body.classList.remove('dialog-open'); resetTracker(); });
  tracker?.addEventListener('click', event => { if (event.target === tracker) tracker.close(); });

  const TRACKING_STAGES = ['awaiting_repair','diagnostic_in_progress','repair_in_progress','quality_inspection','repaired','sale_complete'];
  const LABELS = { checked_in:'Checked in',in_diagnosis:'In diagnosis',awaiting_approval:'Awaiting approval',waiting_on_parts:'Waiting on parts',in_repair:'In repair',ready_for_pickup:'Ready for pickup',completed:'Sale complete',awaiting_repair:'Awaiting repair',need_to_order_parts:'Need to order parts',awaiting_parts:'Awaiting parts',diagnostic_in_progress:'Diagnostic in progress',repair_in_progress:'Repair in progress',quality_inspection:'Quality inspection',awaiting_callback:'Awaiting callback',repaired:'Repaired – ready for pickup',sale_complete:'Sale complete',abandoned:'Abandoned',unrepairable:'Unrepairable',customer_declined:'Customer declined',cancelled:'Cancelled' };
  const SHIPPING_LABELS = { awaiting_inbound:'Awaiting your inbound package',inbound_in_transit:'Inbound package in transit',received:'Package received at GotCracked',return_label_ready:'Return label prepared',outbound_in_transit:'Repaired device is on the way',delivered:'Return package delivered',shipping_issue:'Shipping needs attention' };
  const trackingUrl = (carrier, tracking) => { const encoded = encodeURIComponent(tracking || ''); if (/ups/i.test(carrier || '')) return `https://www.ups.com/track?tracknum=${encoded}`; if (/fedex/i.test(carrier || '')) return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`; return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`; };
  const renderTrackingStatus = repair => {
    const fallbackStage = { checked_in:0,in_diagnosis:1,awaiting_approval:1,waiting_on_parts:1,in_repair:2,ready_for_pickup:4,need_to_order_parts:1,awaiting_parts:1,awaiting_callback:1,abandoned:4,unrepairable:0,customer_declined:0,cancelled:0 };
    const current = TRACKING_STAGES.includes(repair.status) ? TRACKING_STAGES.indexOf(repair.status) : (fallbackStage[repair.status] ?? 0);
    const statusPill = $('.status-pill'); if (statusPill) statusPill.textContent = LABELS[repair.status] || repair.status || 'Repair update';
    const deviceName = $('.tracker-device strong'); if (deviceName) deviceName.textContent = [repair.device?.manufacturer, repair.device?.model].filter(Boolean).join(' ') || 'Device repair';
    const updated = $('.tracker-device small'); if (updated) updated.textContent = `Last updated ${formatUpdatedAt(repair.updatedAt)}`;
    const timeline = $('.tracker-timeline'); if (timeline) timeline.innerHTML = TRACKING_STAGES.map((stage,index) => `<li class="${index < current ? 'complete' : index === current ? 'current' : ''}">${LABELS[stage]}</li>`).join('');
    const shipping = $('.tracker-shipping');
    if (shipping) {
      if (repair.intakeMethod === 'mail_in') {
        const label = SHIPPING_LABELS[repair.shippingStatus] || 'Mail-in repair'; const carrier = escapeHTML(repair.outboundCarrier || 'Carrier pending'); const tracking = escapeHTML(repair.outboundTracking || 'Tracking pending');
        shipping.innerHTML = `<strong>${escapeHTML(label)}</strong><span>${carrier} · ${tracking}</span>${repair.outboundTracking ? `<a href="${trackingUrl(repair.outboundCarrier, repair.outboundTracking)}" target="_blank" rel="noopener">Track return package ↗</a>` : ''}`; shipping.hidden = false;
      } else { shipping.hidden = true; shipping.innerHTML = ''; }
    }
    const note = $('.tracker-demo-note'); if (note) { note.textContent = repair.publicNotes || 'For questions about this repair, contact the GotCracked shop.'; note.style.display = ''; }
  };
  trackerForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const ticket = $('[name="ticket"]', tracker)?.value.trim() || '', phone = $('[name="trackerPhone"]', tracker)?.value.trim() || '', button = trackerForm.querySelector('[type="submit"]'), errorText = $('.tracker-error');
    if (!ticket || phone.replace(/\D/g, '').length < 7) { if (errorText) errorText.textContent = 'Enter a ticket number and valid phone number.'; return; }
    button.disabled = true; button.textContent = 'Finding repair…'; if (errorText) errorText.textContent = '';
    try { const { data, error } = await window.supabaseClient.functions.invoke('track-repair', { body: { ticket, phone } }); if (error || !data?.ticket) throw new Error(data?.error || 'We could not match that ticket and phone number.'); const trackedTicket = $('#tracked-ticket'); if (trackedTicket) trackedTicket.textContent = data.ticket; renderTrackingStatus(data); trackerForm.classList.add('hidden'); trackerResult?.classList.add('active'); }
    catch (error) { if (errorText) errorText.textContent = error?.message || 'Unable to find that repair.'; }
    finally { button.disabled = false; button.innerHTML = 'Find my repair →'; }
  });
  $('#track-another')?.addEventListener('click', resetTracker);
})();

