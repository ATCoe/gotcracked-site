/* Match the public booking windows and reject kiosk check-ins outside shop hours. */
(function (root) {
  'use strict';
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DEFAULT_HOURS = {mon:['10:00','20:00'],tue:['10:00','20:00'],wed:['10:00','20:00'],thu:['10:00','20:00'],fri:['10:00','20:00'],sat:['10:00','18:00'],sun:null};
  const minutes = value => {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''))) return NaN;
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  };
  const hourLabel = value => {
    const hour = Math.floor(value / 60), minute = value % 60;
    return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${hour < 12 ? 'AM' : 'PM'}`;
  };
  function bookingWindow(date, clockMinutes, hours = DEFAULT_HOURS) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return null;
    const day = new Date(`${date}T12:00:00Z`);
    if (Number.isNaN(day.getTime()) || !Number.isFinite(clockMinutes)) return null;
    const range = hours?.[DAYS[day.getUTCDay()]];
    if (!Array.isArray(range) || range.length !== 2) return null;
    const open = minutes(range[0]), close = minutes(range[1]);
    if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open || clockMinutes < open || clockMinutes >= close) return null;
    for (let start = open; start < close; start += 180) {
      const end = Math.min(start + 180, close);
      if (clockMinutes >= start && clockMinutes < end) return `${hourLabel(start)}–${hourLabel(end)}`;
    }
    return null;
  }
  const api = { DEFAULT_HOURS, bookingWindow };
  root.GOTCRACKED_KIOSK_SCHEDULE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
