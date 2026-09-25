(() => {
  'use strict';

  const config = window.GOTCRACKED_KIOSK_CONFIG || {};
  const debugMode = new URLSearchParams(window.location.search).has('debug');
  const steps = ['mode', 'customer', 'device', 'details', 'done'];
  const serviceOptions = [
    ['Screen repair', 'Cracked glass, display, or touch issues', '▧'],
    ['Battery replacement', 'Short battery life or swelling', '◒'],
    ['Charge port cleaning', 'Clear lint and debris safely', '⌁'],
    ['Diagnostics', 'Not sure what is wrong?', '⌕'],
    ['Computer tune-up', 'Slow, noisy, or unstable computer', '⌘'],
    ['Data recovery', 'Help retrieving important files', '◫']
  ];
  const deviceOptions = ['iPhone / phone', 'iPad / tablet', 'Mac / laptop', 'PC / desktop', 'Game console', 'Other device'];

  const state = {
    step: 'mode', mode: '', name: '', phone: '', email: '', device: '', service: '', notes: '', consent: false,
    appointment: '', receipt: null, systemState: 'ready', handoffReturnStep: 'mode'
  };

  const $ = (selector) => document.querySelector(selector);
  const screenView = $('#screenView');
  const liveRegion = $('#liveRegion');
  const dialog = $('#staffDialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const demoMode = new URLSearchParams(window.location.search).get('demo') === '1';

  function announce(message) {
    liveRegion.textContent = '';
    window.setTimeout(() => { liveRegion.textContent = message; }, 20);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function icon(name) {
    const icons = {
      calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v3M19 4v3M4 9h16M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>',
      walk: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.4"/><path d="m9 22 1.2-7 1.8-2 2.3 2.3 1.1 6.7M10.3 13 7 10.5 5 14M11.7 13l3.5-3.2 3.2 2.1"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M14 6l6 6-6 6"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5"/></svg>',
      shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.4c0 4.7-3.1 7.8-8 9.6-4.9-1.8-8-4.9-8-9.6V6z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/></svg>',
      back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6"/></svg>',
      phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5 9 3l2 5-2.2 1.6a14 14 0 0 0 5.1 5.1l1.6-2.2 5 2-.5 2.5a3 3 0 0 1-3.3 2.4C10 18.5 5.5 14 4.6 6.8A3 3 0 0 1 6.5 3.5Z"/></svg>'
    };
    return icons[name] || '';
  }

  function updateProgress() {
    document.querySelectorAll('[data-progress]').forEach((item) => {
      const index = steps.indexOf(item.dataset.progress);
      const current = steps.indexOf(state.step);
      item.classList.toggle('is-current', item.dataset.progress === state.step);
      item.classList.toggle('is-complete', index < current);
    });
  }

  function setHeading(kicker, title) {
    $('#stepKicker').textContent = kicker;
    $('#screenTitle').textContent = title;
  }

  function focusMain() {
    updateProgress();
    $('#kiosk-main').focus({ preventScroll: true });
    const first = screenView.querySelector('button, input, textarea, select');
    if (first) window.setTimeout(() => first.focus(), reducedMotion.matches ? 0 : 120);
  }

  function renderMode() {
    setHeading('STEP 1 OF 4', 'How can we help today?');
    screenView.innerHTML = `
      <p class="screen-intro">Choose the option that best matches your visit. You can always ask a team member for help.</p>
      <div class="choice-grid mode-grid">
        <button class="choice-card" type="button" data-mode="appointment">
          <span class="choice-icon">${icon('calendar')}</span><span class="choice-copy"><strong>I have an appointment</strong><small>Check in for a scheduled repair or drop-off.</small></span><span class="choice-arrow">${icon('arrow')}</span>
        </button>
        <button class="choice-card" type="button" data-mode="walk-in">
          <span class="choice-icon">${icon('walk')}</span><span class="choice-copy"><strong>I’m walking in</strong><small>Tell us what you need and we’ll add you to the queue.</small></span><span class="choice-arrow">${icon('arrow')}</span>
        </button>
      </div>
      <div class="assurance-strip"><span class="assurance-icon">${icon('shield')}</span><span><strong>Your information stays private.</strong> We only use it to manage this repair.</span></div>`;
    screenView.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
      state.mode = button.dataset.mode;
      state.step = 'customer';
      announce(state.mode === 'appointment' ? 'Appointment selected.' : 'Walk-in selected.');
      render();
    }));
  }

  function renderCustomer() {
    setHeading('STEP 2 OF 4', 'Tell us who you are');
    screenView.innerHTML = `
      <p class="screen-intro">We’ll use this to connect you with your repair and contact you when it’s ready.</p>
      <form class="kiosk-form" id="customerForm" novalidate>
        <div class="form-grid">
          <label class="field"><span>Full name <b aria-hidden="true">*</b></span><input name="name" autocomplete="name" required placeholder="e.g. Alex Morgan" value="${escapeHtml(state.name)}" /></label>
          <label class="field"><span>Mobile number <b aria-hidden="true">*</b></span><input name="phone" autocomplete="tel" inputmode="tel" required placeholder="e.g. (540) 555-0123" value="${escapeHtml(state.phone)}" /></label>
          <label class="field"><span>Email <b aria-hidden="true">*</b></span><input name="email" autocomplete="email" inputmode="email" type="email" required placeholder="e.g. alex@example.com" value="${escapeHtml(state.email)}" /></label>
        </div>
        ${state.mode === 'appointment' ? '<label class="field"><span>Appointment reference <small>(optional)</small></span><input name="appointment" autocomplete="off" placeholder="e.g. GC-1042" value="' + escapeHtml(state.appointment) + '" /></label>' : ''}
        <div class="form-note"><span class="note-dot" aria-hidden="true"></span><span>A confirmation will appear on screen. Please keep your phone nearby for updates.</span></div>
        <div class="form-actions"><button class="button button-secondary" type="button" data-back>${icon('back')} Back</button><button class="button button-primary" type="submit">Continue ${icon('arrow')}</button></div>
      </form>`;
    $('#customerForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.name = String(form.get('name') || '').trim(); state.phone = String(form.get('phone') || '').trim(); state.email = String(form.get('email') || '').trim(); state.appointment = String(form.get('appointment') || '').trim();
      if (!state.name || !state.phone || !state.email || !/^\S+@\S+\.\S+$/.test(state.email)) return showInlineError('Add your name, mobile number, and a valid email address.');
      state.step = 'device'; announce('Details saved.'); render();
    });
    bindBack();
  }

  function renderDevice() {
    setHeading('STEP 3 OF 4', 'What are we working on?');
    screenView.innerHTML = `
      <p class="screen-intro">Pick a device, then choose the service that feels closest. We’ll confirm the details together.</p>
      <form class="kiosk-form" id="deviceForm" novalidate>
        <fieldset class="option-fieldset"><legend>Device <b aria-hidden="true">*</b></legend><div class="pill-grid">${deviceOptions.map((item) => `<button class="pill-option${state.device === item ? ' selected' : ''}" type="button" data-device="${escapeHtml(item)}" aria-pressed="${state.device === item}">${escapeHtml(item)}</button>`).join('')}</div></fieldset>
        <fieldset class="option-fieldset"><legend>Service <b aria-hidden="true">*</b></legend><div class="service-grid">${serviceOptions.map(([title, copy, glyph]) => `<button class="service-option${state.service === title ? ' selected' : ''}" type="button" data-service="${escapeHtml(title)}" aria-pressed="${state.service === title}"><span class="service-glyph" aria-hidden="true">${glyph}</span><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(copy)}</small></span></button>`).join('')}</div></fieldset>
        <div class="form-actions"><button class="button button-secondary" type="button" data-back>${icon('back')} Back</button><button class="button button-primary" type="submit">Continue ${icon('arrow')}</button></div>
      </form>`;
    screenView.querySelectorAll('[data-device]').forEach((button) => button.addEventListener('click', () => { state.device = button.dataset.device; selectOption(button, '[data-device]'); }));
    screenView.querySelectorAll('[data-service]').forEach((button) => button.addEventListener('click', () => { state.service = button.dataset.service; selectOption(button, '[data-service]'); }));
    $('#deviceForm').addEventListener('submit', (event) => { event.preventDefault(); if (!state.device || !state.service) return showInlineError('Choose a device and a service to continue.'); state.step = 'details'; announce('Device and service saved.'); render(); });
    bindBack();
  }

  function selectOption(selected, selector) {
    screenView.querySelectorAll(selector).forEach((button) => { const isSelected = button === selected; button.classList.toggle('selected', isSelected); button.setAttribute('aria-pressed', String(isSelected)); });
  }

  function renderDetails() {
    setHeading('STEP 4 OF 4', 'A couple of final details');
    screenView.innerHTML = `
      <p class="screen-intro">Add anything that will help our technicians understand the issue before they take a closer look.</p>
      <form class="kiosk-form" id="detailsForm" novalidate>
        <label class="field"><span>What’s happening? <small>(optional)</small></span><textarea name="notes" rows="4" placeholder="Tell us what you noticed…">${escapeHtml(state.notes)}</textarea></label>
        <label class="consent-row"><input type="checkbox" name="consent" ${state.consent ? 'checked' : ''} required /><span class="custom-check" aria-hidden="true">${icon('check')}</span><span>I agree to GotCracked using these details to manage my repair. <b aria-hidden="true">*</b></span></label>
        <details class="privacy-details"><summary>Read the privacy notice</summary><p>We use your contact details to identify this repair, provide service updates, and help our team assist you. Access is limited to repair operations. Ask a team member if you need your information corrected or removed.</p></details>
        <div class="review-card"><span class="review-check">${icon('check')}</span><div><strong>${escapeHtml(state.service)}</strong><span>${escapeHtml(state.device)} · ${state.mode === 'appointment' ? 'Appointment' : 'Walk-in'}</span></div><button type="button" class="text-button" data-edit-device>Edit</button></div>
        <div class="form-actions"><button class="button button-secondary" type="button" data-back>${icon('back')} Back</button><button class="button button-primary" type="submit">Check me in ${icon('arrow')}</button></div>
      </form>`;
    $('#detailsForm').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); state.notes = String(form.get('notes') || '').trim(); state.consent = form.get('consent') === 'on'; if (!state.consent) return showInlineError('Please agree to the privacy notice before checking in.'); submitCheckIn(); });
    screenView.querySelector('[data-edit-device]').addEventListener('click', () => { state.step = 'device'; render(); });
    bindBack();
  }

  function renderDone() {
    setHeading('CHECK-IN COMPLETE', 'You’re in the queue');
    const receipt = state.receipt || { reference: 'GC-DEMO', eta: 'Staff will confirm' };
    screenView.innerHTML = `
      <div class="confirmation" role="status"><div class="success-orbit"><span>${icon('check')}</span></div><p class="confirmation-lead">Thanks, ${escapeHtml(state.name.split(' ')[0] || 'there')}.</p><p class="screen-intro">${receipt.demo ? 'Demo confirmation only. No request was sent.' : 'We’ve sent your request to the Blacksburg service desk. Keep this receipt for updates.'}</p>
        <div class="receipt-card"><div class="receipt-top"><span>QUEUE RECEIPT</span><strong>${escapeHtml(receipt.reference)}</strong></div><div class="receipt-main"><div><small>Repair</small><strong>${escapeHtml(state.service)}</strong></div><div><small>Next step</small><strong>${escapeHtml(receipt.eta)}</strong></div></div><div class="receipt-meta"><span>${escapeHtml(state.device)}</span><span>${state.mode === 'appointment' ? 'Appointment check-in' : 'Walk-in check-in'}</span></div></div>
        <div class="status-steps"><div class="status-step done"><span>${icon('check')}</span><span>Request received</span></div><div class="status-step current"><span>2</span><span>Technician review</span></div><div class="status-step"><span>3</span><span>Repair update</span></div></div>
        <div class="confirmation-actions"><button class="button button-primary" type="button" data-return>Return to start</button><button class="button button-secondary" type="button" data-staff>Talk to staff</button></div>
      </div>`;
    screenView.querySelector('[data-return]').addEventListener('click', reset); screenView.querySelector('[data-staff]').addEventListener('click', () => dialog.showModal());
  }

  function renderHandoff() {
    setHeading('STAFF ASSISTANCE', 'A team member is helping');
    screenView.innerHTML = `<div class="handoff-screen"><div class="handoff-icon">${icon('phone')}</div><h3>Review this check-in together.</h3><p class="screen-intro">Confirm the customer and repair details, then continue. Add any private staff notes in Portal after the request is received.</p><div class="handoff-summary"><div><small>Customer</small><strong>${escapeHtml(state.name || 'Not entered yet')}</strong><span>${state.phone ? escapeHtml(state.phone) + ' · ' + escapeHtml(state.email) : 'Details will appear after entry.'}</span></div><div><small>Repair</small><strong>${escapeHtml(state.service || 'Not selected yet')}</strong><span>${escapeHtml(state.device || 'Choose a device during check-in.')}</span></div></div><div class="form-actions"><button class="button button-secondary" type="button" data-back>Back to check-in</button><button class="button button-primary" type="button" data-continue>Continue with staff ${icon('arrow')}</button></div></div>`;
    const returnToCheckIn = () => { state.step = state.handoffReturnStep || 'mode'; announce('Continue the check-in with staff.'); render(); };
    screenView.querySelector('[data-continue]').addEventListener('click', returnToCheckIn);
    screenView.querySelector('[data-back]').addEventListener('click', returnToCheckIn);
  }

  function render() {
    if (state.step === 'mode') renderMode(); else if (state.step === 'customer') renderCustomer(); else if (state.step === 'device') renderDevice(); else if (state.step === 'details') renderDetails(); else if (state.step === 'done') renderDone(); else if (state.step === 'handoff') renderHandoff();
    updateProgress();
    if (state.step !== 'mode') focusMain();
  }

  function bindBack() {
    const back = screenView.querySelector('[data-back]');
    if (back) back.addEventListener('click', () => { const index = steps.indexOf(state.step); state.step = steps[Math.max(0, index - 1)]; render(); });
  }

  function showInlineError(message) {
    let error = screenView.querySelector('.inline-error');
    if (!error) { error = document.createElement('div'); error.className = 'inline-error'; error.setAttribute('role', 'alert'); screenView.prepend(error); }
    error.textContent = message; announce(message); error.focus();
  }

  function setConnection(label, kind) { const el = $('#connectionState'); el.textContent = label; el.dataset.state = kind || 'ready'; }

  function localParts() {
    const values = new Intl.DateTimeFormat('en-US', { timeZone: config.timezone || 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    return Object.fromEntries(values.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  }

  async function currentStoreHours() {
    const fallback = window.GOTCRACKED_KIOSK_SCHEDULE.DEFAULT_HOURS;
    let timeoutHandle;
    try {
      const response = await Promise.race([
        window.supabaseClient.functions.invoke('public-media', { method: 'GET' }),
        new Promise(resolve => { timeoutHandle = window.setTimeout(() => resolve(null), 2500); })
      ]);
      if (!response) return fallback;
      const { data, error } = response;
      if (!error && data?.settings?.store_hours && typeof data.settings.store_hours === 'object') return data.settings.store_hours;
    } catch (error) {
      console.warn('Kiosk could not load live shop hours; using published default hours.', error);
    } finally {
      window.clearTimeout(timeoutHandle);
    }
    return fallback;
  }

  async function intakePayload() {
    const names = state.name.split(/\s+/).filter(Boolean);
    const firstName = names.shift() || 'Customer';
    const lastName = names.join(' ') || 'Customer';
    const parts = localParts();
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const clockMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    const time = window.GOTCRACKED_KIOSK_SCHEDULE.bookingWindow(date, clockMinutes, await currentStoreHours());
    if (!time) {
      const error = new Error('The shop is currently closed for check-ins. Please ask a team member for help or request a future visit.');
      error.name = 'KioskWindowError';
      throw error;
    }
    const issue = [state.service, state.notes ? `Customer notes: ${state.notes}` : '', state.appointment ? `Appointment reference: ${state.appointment}` : ''].filter(Boolean).join('\n\n');
    return {
      companyWebsite: '', formStartedAt: String(Date.now() - 3000), clientRequestId: state.clientRequestId || (state.clientRequestId = crypto.randomUUID()), serviceMode: 'walk_in',
      deviceType: state.device, model: state.device, issue, firstName, lastName,
      phone: state.phone, email: state.email, preferredContact: 'Call', timing: 'Submitted from the self-service check-in kiosk.',
      date, time, consent: 'on', source: 'gotcracked-kiosk'
    };
  }

  async function createCheckIn() {
    if (demoMode) { await new Promise((resolve) => window.setTimeout(resolve, 700)); return { reference: `GC-DEMO-${Math.floor(1000 + Math.random() * 8999)}`, eta: 'Staff will confirm', demo: true }; }
    if (!window.supabaseClient?.functions) throw new Error('The kiosk connection is not configured. Please ask a team member for help.');
    const body = await intakePayload();
    const timeoutMs = Math.max(1000, Math.min(30000, Number(config.requestTimeoutMs) || 9000));
    let timeoutHandle;
    const timeout = new Promise((_, reject) => {
      timeoutHandle = window.setTimeout(() => { const error = new Error('Check-in timed out.'); error.name = 'AbortError'; reject(error); }, timeoutMs);
    });
    let response;
    try { response = await Promise.race([window.supabaseClient.functions.invoke(config.intakeFunction || 'public-intake', { body }), timeout]); }
    finally { window.clearTimeout(timeoutHandle); }
    const { data, error } = response;
    if (error || !data?.reference) throw new Error(data?.error || error?.message || 'Unable to send this check-in.');
    return { reference: data.reference, eta: data.timingGuidance || 'Staff will confirm' };
  }

  async function submitCheckIn() {
    state.systemState = 'loading'; setConnection('Saving check-in…', 'loading'); renderLoading();
    try { state.receipt = await createCheckIn(); state.systemState = 'ready'; setConnection(state.receipt.demo ? 'Demo ready' : 'Connected', 'ready'); state.step = 'done'; announce(state.receipt.demo ? 'Demo check-in complete. No request was sent.' : 'Check-in complete. Your queue receipt is ready.'); render(); }
    catch (error) { state.systemState = error && error.name === 'AbortError' ? 'timeout' : 'error'; setConnection(state.systemState === 'timeout' ? 'Connection timed out' : 'Action needed', state.systemState); renderSystemState(state.systemState, error?.name === 'KioskWindowError' ? error.message : ''); }
  }

  function renderLoading() { setHeading('SAVING CHECK-IN', 'One moment, please'); screenView.innerHTML = `<div class="system-state"><div class="loader-ring" aria-hidden="true"></div><h3>Sending your details securely…</h3><p class="screen-intro">Please keep this screen open. This usually takes a few seconds.</p></div>`; }

  function renderSystemState(kind, message = '') { const timeout = kind === 'timeout'; setHeading(timeout ? 'CONNECTION TIMEOUT' : 'WE HIT A SNAG', timeout ? 'The connection is taking too long' : 'Your check-in was not sent'); screenView.innerHTML = `<div class="system-state error-state"><div class="state-symbol">${timeout ? '↻' : '!'}</div><h3>${timeout ? 'Nothing was lost.' : 'Let’s try that again.'}</h3><p class="screen-intro">${escapeHtml(message || (timeout ? 'The service desk did not respond in time. Check your connection or ask a team member to help.' : 'We couldn’t reach the service desk. Your details are still on this screen.'))}</p><div class="state-actions"><button class="button button-primary" type="button" data-retry>Try again</button><button class="button button-secondary" type="button" data-staff>Get staff assistance</button></div></div>`; screenView.querySelector('[data-retry]').addEventListener('click', submitCheckIn); screenView.querySelector('[data-staff]').addEventListener('click', () => dialog.showModal()); announce(timeout ? 'Connection timed out. Nothing was lost.' : 'The check-in could not be sent.'); focusMain(); }

  function reset() { Object.assign(state, { step: 'mode', mode: '', name: '', phone: '', email: '', device: '', service: '', notes: '', consent: false, appointment: '', receipt: null, systemState: 'ready', handoffReturnStep: 'mode' }); setConnection(demoMode ? 'Demo ready' : 'Ready to check in', 'ready'); render(); announce('Check-in restarted.'); }

  function updateClock() { $('#currentTime').textContent = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date()); }

  $('#staffButton').addEventListener('click', () => dialog.showModal());
  $('#closeStaffButton').addEventListener('click', () => dialog.close());
  $('#resetButton').addEventListener('click', () => { dialog.close(); reset(); });
  $('#handoffButton').addEventListener('click', () => { dialog.close(); state.handoffReturnStep = state.step; state.step = 'handoff'; render(); announce('Staff assistance started.'); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && dialog.open) dialog.close(); });
  if (debugMode) { $('#debugActions').hidden = false; $('#debugActions').querySelectorAll('[data-preview-state]').forEach((button) => button.addEventListener('click', () => { dialog.close(); state.step = 'details'; render(); window.setTimeout(() => renderSystemState(button.dataset.previewState), 0); })); }
  document.querySelector('.brand').addEventListener('click', (event) => { event.preventDefault(); if (state.step !== 'mode') reset(); });
  reducedMotion.addEventListener?.('change', () => document.documentElement.dataset.reducedMotion = String(reducedMotion.matches));
  document.documentElement.dataset.reducedMotion = String(reducedMotion.matches);
  setConnection(demoMode ? 'Demo ready' : (window.supabaseClient?.functions ? 'Ready to check in' : 'Connection needed'), window.supabaseClient?.functions || demoMode ? 'ready' : 'error');
  updateClock(); window.setInterval(updateClock, 30000); render();
})();

