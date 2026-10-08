# Customer site production audit — October 8, 2026

## Revision and release state

- Repository: [ATCoe/gotcracked-site](https://github.com/ATCoe/gotcracked-site)
- Audited production source: `7a2ff3c16184ae4d7c770e17f5e65c85d5c09686` (September 30).
- Initial audit candidate: `36b574f6ec02cb962aedaf188d9e226c424831e5`.
- Final tested code candidate: `b8b44603bb728a939359afaa29e4185018429ea0`.
- Branch: `audit/production-audit-20261008`.
- Existing candidate preview: https://ee48eaa9.gotcracked-site.pages.dev/
- No production promotion was performed by this audit workstream.

Six edited public JavaScript files were compared against the live site and matched the production source before editing. The final 22 changed/new files were aligned to the GitHub candidate payload bytes before the final local test run. This document is a documentation-only follow-up; it does not change that tested code candidate.

## Changes prepared

- Replaced the obsolete “not open yet” announcement with the established upstairs directions.
- Restyled customer chat for the dark site, corrected mobile inset sizing, and improved field readability.
- Coalesced public settings reads; bounded chat polling and handled close, visibility, session, restoration, and failure states.
- Kept canonical customer-account routes network-only; corrected offline shell selection and asset handling when cache storage fails.
- Used canonical runtime links, added kiosk noindex metadata and social-link accessible names, and aligned the analytics content security policy.
- Simplified repair and PC request copy while retaining verification and approval boundaries. Updated asset versions.

Existing page structure, business pricing, backend settings, and transaction behavior were preserved.

## Directly observed production coverage

A bounded HTTP crawl verified all seven sitemap URLs and `/account` returned 200, with unique titles/descriptions and self-canonical URLs. The account page carried noindex. An unknown route returned 404. Robots and sitemap files were read.

Live Chrome checks included:

- Mobile homepage at 390 × 844; navigation opening and closing.
- All 13 FAQ disclosures, including exclusive expansion.
- Chat opening, minimizing, and revealing human follow-up fields, without sending.
- Track Your Repair navigation to `/account` and the empty secure-code form guard.
- Phone repair prefill, required-field validation, and the three repair-request steps.
- Sunday closure validation; Saturday 10 AM–6 PM and weekday 10 AM–8 PM appointment windows.
- Appointment required-field guard.
- All four PC planner steps, the non-gaming branch, defaults, and a color selection.

The old chat panel extended three pixels beyond the left mobile viewport edge. The candidate addresses this sizing defect; candidate rendering still requires verification.

## Automated validation

All seven Node test scripts passed on the final candidate bytes:

1. `scripts/test-public-runtime.mjs` — settings coalescing/recovery; chat concurrency, close/visibility and rate-limit behavior; private route and offline/cache-failure behavior.
2. `scripts/test-store-hours.mjs` — live hours and appointment windows.
3. `scripts/test-customer-estimate-decisions.mjs` — ten mocked estimate/decision safety scenarios.
4. `scripts/test-customer-account-otp-ux.mjs` — three mocked code-delivery guidance scenarios; zero real messages.
5. `scripts/test-marlon-browser-audit.mjs`.
6. `scripts/test-pc-build-truthful-copy.mjs`.
7. `scripts/test-kiosk-window.mjs`.

All tracked JavaScript/MJS files passed Node syntax checks. Internal file and anchor targets passed across 15 HTML pages; brace checks passed for 16 CSS files; Git whitespace checks passed.

Python was unavailable on the test machine. A Node equivalent checked local links/anchors; the repository's Python link checker and embedded Python architecture gate were not executed locally. These checks are not a claim that every CI job or browser transaction passed.

## Usage implications

The homepage's three independent public-media consumers now share one request and a one-minute in-page cache. Chat polling changed from approximately one request every 4.5 seconds to 12–60 seconds while open and visible, with 30–120-second failure backoff and no overlapping poll requests. These are client-side frequency reductions, not measured billing savings. Existing site-traffic telemetry was not changed because its backend live-visitor timing contract was outside this patch.

## Blocked and unexecuted coverage

Browser security denied opening the candidate preview, reporting that permission had been declined and explicitly prohibiting alternate-browser, indirect, or raw-protocol workarounds. No retry or workaround was attempted.

Consequently, the revised dark chat, mobile sizing, candidate announcement, and copy have not received preview visual signoff. Mail-in final-address rendering, complete Learn/kiosk/phone interactions, and full authenticated customer workflows remain outside direct UI verification.

No real chat message, OTP, repair request, appointment, PC request, estimate approval, payment, or customer communication was submitted. Mocked tests cover selected boundaries but do not establish production delivery or transaction success.

**Signoff status: candidate prepared and locally validated; exhaustive production execution and candidate visual signoff remain incomplete.**
