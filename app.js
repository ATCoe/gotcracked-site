(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
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
      showToast('Your request is now in the GotCracked repair queue.');
    } catch (error) {
      showToast(error.message || 'Unable to submit. Please contact the shop.');
    } finally { submit.disabled = false; submit.innerHTML = 'Request appointment <span>→</span>'; }
  });
  $('#new-request').addEventListener('click', () => {
    bookingForm.reset(); bookingForm.elements.formStartedAt.value = String(Date.now()); $('.form-success').classList.remove('active');
    $$('.form-step, .form-progress', bookingForm).forEach(element => element.style.display = ''); showStep(1);
  });

  const tracker = $('#tracker-dialog'), trackerForm = $('#tracker-form'), trackerResult = $('.tracker-result');
  const openTracker = () => { tracker.showModal(); document.body.classList.add('dialog-open'); setTimeout(() => $('[name="ticket"]', tracker).focus(), 50); };
  const resetTracker = () => { trackerForm.reset(); trackerForm.classList.remove('hidden'); trackerResult.classList.remove('active'); $('.tracker-error').textContent = ''; };
  $$('[data-open-tracker]').forEach(button => button.addEventListener('click', openTracker));
  $('[data-close-dialog]').addEventListener('click', () => tracker.close());
  tracker.addEventListener('close', () => { document.body.classList.remove('dialog-open'); resetTracker(); });
  tracker.addEventListener('click', event => { if (event.target === tracker) tracker.close(); });

  const TRACKING_STAGES = ['checked_in', 'in_diagnosis', 'awaiting_approval', 'waiting_on_parts', 'in_repair', 'ready_for_pickup', 'completed'];
  const LABELS = { checked_in: 'Checked in', in_diagnosis: 'In diagnosis', awaiting_approval: 'Awaiting approval', waiting_on_parts: 'Waiting on parts', in_repair: 'In repair', ready_for_pickup: 'Ready for pickup', completed: 'Completed', cancelled: 'Cancelled' };
  const renderTrackingStatus = repair => {
    const current = Math.max(0, TRACKING_STAGES.indexOf(repair.status));
    $('.status-pill').textContent = LABELS[repair.status] || repair.status;
    $('.tracker-device strong').textContent = [repair.device?.manufacturer, repair.device?.model].filter(Boolean).join(' ') || 'Device repair';
    $('.tracker-device small').textContent = `Last updated ${new Date(repair.updatedAt).toLocaleString()}`;
    $('.tracker-timeline').innerHTML = TRACKING_STAGES.map((stage, index) => `<li class="${index < current ? 'complete' : index === current ? 'current' : ''}">${LABELS[stage]}</li>`).join('');
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
