import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { bookingWindow, DEFAULT_HOURS } = require('../kiosk/schedule.js');

assert.equal(bookingWindow('2026-10-02', 10 * 60 + 5), '10 AM–1 PM');
assert.equal(bookingWindow('2026-10-02', 12 * 60 + 59), '10 AM–1 PM');
assert.equal(bookingWindow('2026-10-02', 13 * 60), '1 PM–4 PM');
assert.equal(bookingWindow('2026-10-02', 19 * 60 + 30), '7 PM–8 PM');
assert.equal(bookingWindow('2026-10-03', 17 * 60 + 30), '4 PM–6 PM');
assert.equal(bookingWindow('2026-10-03', 18 * 60), null);
assert.equal(bookingWindow('2026-10-04', 12 * 60), null);
assert.equal(bookingWindow('2026-10-02', 9 * 60 + 59), null);
assert.equal(bookingWindow('2026-10-02', 20 * 60), null);
assert.equal(bookingWindow('2026-10-02', 10 * 60 + 15, {...DEFAULT_HOURS, fri:['11:00','15:00']}), null);
assert.equal(bookingWindow('2026-10-02', 12 * 60, {...DEFAULT_HOURS, fri:['11:00','15:00']}), '11 AM–2 PM');
console.log('PASS kiosk current-window selection across weekdays, Saturday, closed hours, and live-hour overrides.');
