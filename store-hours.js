(() => {
  'use strict';

  const WINDOWS = {
    'Morning (9 AM–12 PM)': ['09:00','12:00'],
    'Afternoon (12–4 PM)': ['12:00','16:00'],
    'Late afternoon (4–6 PM)': ['16:00','18:00']
  };
  const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
  const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const DEFAULT_HOURS = {mon:['09:00','18:00'],tue:['09:00','18:00'],wed:['09:00','18:00'],thu:['09:00','18:00'],fri:['09:00','18:00'],sat:['10:00','16:00'],sun:null};
  let storeHours = DEFAULT_HOURS;

  const minutes = value => {
    const [hour, minute] = String(value || '').split(':').map(Number);
    return Number.isFinite(hour) ? hour * 60 + (Number.isFinite(minute) ? minute : 0) : NaN;
  };
  const dayFor = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : { key:DAY_KEYS[date.getUTCDay()], label:DAY_LABELS[date.getUTCDay()] };
  };
  const overlaps = (storeRange, windowRange) => {
    if (!Array.isArray(storeRange) || !windowRange) return false;
    return Math.max(minutes(storeRange[0]),minutes(windowRange[0])) < Math.min(minutes(storeRange[1]),minutes(windowRange[1]));
  };

  function noteFor(select) {
    let note = select.parentElement?.querySelector('[data-store-hours-note]');
    if (note) return note;
    note = document.createElement('small');
    note.dataset.storeHoursNote = 'true';
    note.className = 'form-helper';
    select.insertAdjacentElement('afterend',note);
    return note;
  }

  function updateForm(form) {
    const date = form.elements.date;
    const time = form.elements.time;
    if (!date || !time) return;
    const selectedDay = dayFor(date.value);
    const range = selectedDay ? storeHours?.[selectedDay.key] : null;
    let available = 0;
    [...time.options].forEach(option => {
      if (!option.value) { option.disabled = false; return; }
      const enabled = selectedDay ? overlaps(range,WINDOWS[option.value]) : true;
      option.disabled = !enabled;
      if (enabled) available += 1;
    });
    if (time.selectedOptions[0]?.disabled) time.value = '';
    const note = noteFor(time);
    if (!selectedDay) {
      time.disabled = false;
      time.setCustomValidity('');
      note.textContent = 'Appointment windows update automatically from current store hours.';
    } else if (!Array.isArray(range) || !available) {
      time.value = '';
      time.disabled = true;
      time.setCustomValidity(`GotCracked is closed on ${selectedDay.label}. Choose another day.`);
      note.textContent = `GotCracked is closed on ${selectedDay.label}. Choose another day.`;
    } else {
      time.disabled = false;
      time.setCustomValidity('');
      const open = range[0].replace(/^0/,'');
      const close = range[1].replace(/^0/,'');
      note.textContent = `${selectedDay.label} store hours: ${open}–${close}. Unavailable windows are disabled.`;
    }
  }

  function wireForms() {
    document.querySelectorAll('#booking-form,#appointment-form').forEach(form => {
      const date = form.elements.date;
      if (!date || date.dataset.storeHoursWired) return;
      date.dataset.storeHoursWired = 'true';
      date.addEventListener('change',()=>updateForm(form));
      form.elements.time?.addEventListener('change',()=>updateForm(form));
      updateForm(form);
    });
  }

  async function loadHours() {
    wireForms();
    try {
      if (!window.supabaseClient?.functions) return;
      const { data, error } = await window.supabaseClient.functions.invoke('public-media',{method:'GET'});
      if (error) throw error;
      if (data?.settings?.store_hours && typeof data.settings.store_hours === 'object') storeHours = data.settings.store_hours;
    } catch (error) {
      console.warn('Using default GotCracked store hours because live hours could not be loaded.',error);
    }
    wireForms();
    document.querySelectorAll('#booking-form,#appointment-form').forEach(updateForm);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',loadHours,{once:true});
  else loadHours();
})();
