(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const toast = $('.toast');
  const showToast = message => { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 3000); };

  const headerLogo = $('.brand img');
  const setLogoState = ready => document.documentElement.classList.add(ready ? 'logo-ready' : 'logo-missing');
  if (headerLogo?.complete) setLogoState(headerLogo.naturalWidth > 0);
  else { headerLogo?.addEventListener('load', () => setLogoState(true)); headerLogo?.addEventListener('error', () => setLogoState(false)); }

  $('#year').textContent = new Date().getFullYear();
  const dateInput = $('[name="date"]');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().slice(0, 10);

  const menu = $('.menu-button');
  const nav = $('#site-nav');
  menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', open); });
  $$('#site-nav a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }));

  const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }), { threshold: .12 });
  $$('.reveal').forEach(el => observer.observe(el));

  $$('details').forEach(detail => detail.addEventListener('toggle', () => { if (detail.open) $$('details').filter(d => d !== detail).forEach(d => d.open = false); }));

  const bookingForm = $('#booking-form');
  let currentStep = 1;
  const showStep = step => {
    currentStep = step;
    $$('.form-step', bookingForm).forEach(el => el.classList.toggle('active', Number(el.dataset.step) === step));
    $$('.form-progress span', bookingForm).forEach((el, i) => el.classList.toggle('active', i < step));
    bookingForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const validateStep = step => {
    let valid = true;
    const fields = $$(`[data-step="${step}"] [required]`, bookingForm);
    fields.forEach(field => {
      const ok = field.type === 'checkbox' ? field.checked : field.checkValidity();
      field.classList.toggle('invalid', !ok);
      const error = field.closest('label')?.querySelector('.field-error') || (field.name === 'consent' ? $('.consent-error') : null);
      if (error) error.textContent = ok ? '' : (field.type === 'email' ? 'Enter a valid email address.' : 'This field is required.');
      if (!ok) valid = false;
    });
    return valid;
  };
  $$('.form-next').forEach(btn => btn.addEventListener('click', () => { if (validateStep(currentStep)) showStep(currentStep + 1); }));
  $$('.button-back').forEach(btn => btn.addEventListener('click', () => showStep(currentStep - 1)));
  $$('[data-book-service]').forEach(btn => btn.addEventListener('click', () => { $('[name="issue"]').value = btn.dataset.bookService; $('#book').scrollIntoView({ behavior: 'smooth' }); }));
  bookingForm.addEventListener('submit', e => {
    e.preventDefault(); if (!validateStep(3)) return;
    const data = Object.fromEntries(new FormData(bookingForm));
    const id = `GCR-${String(Date.now()).slice(-6)}`;
    const requests = JSON.parse(localStorage.getItem('gc-public-requests') || '[]');
    requests.push({ ...data, id, createdAt: new Date().toISOString() });
    localStorage.setItem('gc-public-requests', JSON.stringify(requests));
    $('#request-number').textContent = id;
    $$('.form-step, .form-progress', bookingForm).forEach(el => el.style.display = 'none');
    $('.form-success', bookingForm).classList.add('active');
    showToast('Your repair request has been saved.');
  });
  $('#new-request').addEventListener('click', () => { bookingForm.reset(); $('.form-success').classList.remove('active'); $$('.form-step, .form-progress', bookingForm).forEach(el => el.style.display = ''); showStep(1); });

  const tracker = $('#tracker-dialog');
  const trackerForm = $('#tracker-form');
  const trackerResult = $('.tracker-result');
  const openTracker = () => { tracker.showModal(); document.body.classList.add('dialog-open'); setTimeout(() => $('[name="ticket"]', tracker).focus(), 50); };
  const resetTracker = () => { trackerForm.reset(); trackerForm.classList.remove('hidden'); trackerResult.classList.remove('active'); $('.tracker-error').textContent = ''; };
  $$('[data-open-tracker]').forEach(btn => btn.addEventListener('click', openTracker));
  $('[data-close-dialog]').addEventListener('click', () => tracker.close());
  tracker.addEventListener('close', () => { document.body.classList.remove('dialog-open'); resetTracker(); });
  tracker.addEventListener('click', e => { if (e.target === tracker) tracker.close(); });
  const TRACKING_STAGES = ['Checked in', 'In diagnosis', 'Awaiting approval', 'Waiting on parts', 'In repair', 'Ready for pickup', 'Completed'];
  const renderTrackingStatus = request => {
    const status = request.status || 'Checked in';
    $('.status-pill').textContent = status;
    $('.tracker-device strong').textContent = `${request.deviceType || 'Device'} · ${request.model || 'Repair request'}`;
    const updated = request.updatedAt ? new Date(request.updatedAt).toLocaleString() : 'Recently';
    $('.tracker-device small').textContent = `Last updated ${updated}`;
    const current = Math.max(0, TRACKING_STAGES.indexOf(status));
    $('.tracker-timeline').innerHTML = TRACKING_STAGES.map((stage, index) => `<li class="${index < current ? 'complete' : index === current ? 'current' : ''}">${stage}</li>`).join('');
    $('.tracker-demo-note').style.display = 'none';
  };
  trackerForm.addEventListener('submit', e => {
    e.preventDefault();
    const ticket = $('[name="ticket"]', tracker).value.trim().toUpperCase();
    const phone = $('[name="trackerPhone"]', tracker).value.replace(/\D/g, '');
    if (!ticket || phone.length < 7) { $('.tracker-error').textContent = 'Enter a ticket number and valid phone number.'; return; }
    const requests = JSON.parse(localStorage.getItem('gc-public-requests') || '[]');
    const request = requests.find(item => item.id?.toUpperCase() === ticket && String(item.phone || '').replace(/\D/g, '') === phone);
    if (!request) { $('.tracker-error').textContent = 'We could not match that ticket and phone number.'; return; }
    $('#tracked-ticket').textContent = ticket; renderTrackingStatus(request);
    trackerForm.classList.add('hidden'); trackerResult.classList.add('active');
  });
  $('#track-another').addEventListener('click', resetTracker);
})();
