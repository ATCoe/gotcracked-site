(() => {
  'use strict';

  const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
  const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const DEFAULT_HOURS = {mon:['10:00','20:00'],tue:['10:00','20:00'],wed:['10:00','20:00'],thu:['10:00','20:00'],fri:['10:00','20:00'],sat:['10:00','18:00'],sun:null};
  let storeHours = DEFAULT_HOURS;

  const minutes = value => {
    const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(String(value || ''));
    if (!match) return NaN;
    const [hour, minute] = match[0].split(':').map(Number);
    return hour * 60 + minute;
  };
  const dayFor = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : { key:DAY_KEYS[date.getUTCDay()], label:DAY_LABELS[date.getUTCDay()] };
  };
  const timeValue = value => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
  const formatHour = value => { const total=minutes(value); if(!Number.isFinite(total))return ''; const hour=Math.floor(total/60),minute=total%60; return `${hour%12||12}${minute?`:${String(minute).padStart(2,'0')}`:''} ${hour<12?'AM':'PM'}`; };
  const windowsFor = range => {
    if(!Array.isArray(range)||range.length!==2)return [];
    const open=minutes(range[0]),close=minutes(range[1]);
    if(!Number.isFinite(open)||!Number.isFinite(close)||close<=open)return [];
    const windows=[];
    for(let start=open;start<close;start+=180){const end=Math.min(start+180,close),label=`${formatHour(timeValue(start))}–${formatHour(timeValue(end))}`;windows.push({value:label,label});}
    return windows;
  };
  const hoursMarkup = hours => [['mon','Monday'],['tue','Tuesday'],['wed','Wednesday'],['thu','Thursday'],['fri','Friday'],['sat','Saturday'],['sun','Sunday']].map(([key,label])=>{const range=hours?.[key];const windows=windowsFor(range);const value=windows.length?`${formatHour(range[0])}–${formatHour(range[1])}`:'Closed';return `<div><span>${label}</span><strong>${value}</strong></div>`;}).join('');

  function renderFooterHours(){document.querySelectorAll('#store-hours').forEach(node=>{node.innerHTML=hoursMarkup(storeHours);});}

  function setOptions(select,windows,message='Choose a window'){
    const previous=select.value;
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=message;
    const options=windows.map(window=>{const option=document.createElement('option');option.value=window.value;option.textContent=window.label;return option;});
    select.replaceChildren(placeholder,...options);
    select.value=windows.some(window=>window.value===previous)?previous:'';
  }

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
    const windows=windowsFor(range);
    const note = noteFor(time);
    if (!selectedDay) {
      setOptions(time,[],'Choose a day first');
      date.setCustomValidity('');
      time.disabled = true;
      time.setCustomValidity('');
      note.textContent = 'Choose a day to see every available window for current store hours.';
    } else if (!windows.length) {
      const message = `GotCracked is closed on ${selectedDay.label}. Choose another day.`;
      setOptions(time,[],'Closed that day');
      date.setCustomValidity(message);
      time.disabled = true;
      time.setCustomValidity('');
      note.textContent = message;
    } else {
      setOptions(time,windows);
      date.setCustomValidity('');
      time.disabled = false;
      time.setCustomValidity('');
      note.textContent = `${selectedDay.label} store hours: ${formatHour(range[0])}–${formatHour(range[1])}. Choose any available window.`;
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
    renderFooterHours();
    try {
      if (!window.supabaseClient?.functions) return;
      const { data, error } = await window.supabaseClient.functions.invoke('public-media',{method:'GET'});
      if (error) throw error;
      if (data?.settings?.store_hours && typeof data.settings.store_hours === 'object') storeHours = data.settings.store_hours;
    } catch (error) {
      console.warn('Using default GotCracked store hours because live hours could not be loaded.',error);
    }
    renderFooterHours();
    wireForms();
    document.querySelectorAll('#booking-form,#appointment-form').forEach(updateForm);
  }

  const start=()=>{void loadHours();setTimeout(renderFooterHours,0);};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
