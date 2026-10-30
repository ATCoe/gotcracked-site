# Customer Site Recovery Audit — October 30, 2026

## Reviewed Baseline

GitHub `ATCoe/gotcracked-site` main remains `9aca1012a859a57266cd05dcd568423e415bff34`. The current reviewed 102-file release and local source have no character/content drift. Twelve local files differ only in CRLF/LF encoding; none were treated as unpublished changes.

Fresh laptop public GET checks covered all fifteen deployed document routes: eight canonical customer routes, the real 404, five Poly help routes and the kiosk. Normal routes returned200; the nonexistent route returned404. Canonical customer URLs were correct. `/api/customer-account` GET returned405/AllowPOST. The booking URL `https://gotcracked.co/appointment` returned200. These checks do not establish Google's live Schedule configuration.

## Concrete Candidate Fixes

1. **Customer account lifecycle/privacy.** Existing delayed estimate decisions, checkout responses and payment-return polling could start a new refresh or navigate after sign-out. A fresh sign-in flow could also accept an old initial profile response. The candidate immediately hides private records, binds responses to the active view/auth request, blocks new account requests while closing, and ignores obsolete refresh/navigation results. Previously sent responses that may set the HttpOnly cookie settle before the final logout request; the same ordering isolates a fresh lookup from an old migration response. No automatic financial retry is added.
2. **Reachable sign-out recovery.** The old Retry Sign-Out button was inside the hidden dashboard after failure. The same existing control is moved outside both hidden auth/dashboard sections and keeps the existing button styles. A failed sign-out leaves records hidden and the retry visible. Slow outstanding requests remain truthfully Signing Out; completion is not fabricated.
3. **Mobile form preservation.** The old PWA module forcibly reloaded on initial service-worker claiming or a later control change. That could discard a partly completed repair, appointment or PC form. Registration/update remains, while automatic reload is removed. No customer input is stored to a new cache or storage location.
4. **Existing presentation/metadata defects.** Poly help title/headings/menu labels now use Title Case;404 uses Custom PCs; the self-service kiosk receives noindex,follow; Learn's network-failure fallback no longer incorrectly says to check after launch.

The original logo and all eleven artwork/texture files remain byte-for-byte unchanged. No CSS/layout redesign or image regeneration is included.

## Exact Merge Contract

`reviewed-overlay.json` is authoritative: eighteen runtime files, each with its baseline SHA256, candidate SHA256/Git blob SHA and exact candidate path. `runtime/` contains only those changed assets. Six additional source files are the changed/new regression tests and CI update.

Copy the runtime entries into current source only after confirming the baseline/current remote again. Add the six source entries to Git, but not to the public runtime package. Build production from the previously reviewed runtime plus these eighteen assets. Do not deploy this candidate directory, its QA tree or the entire source checkout.

All nine customer HTML documents have the new PWA query. The account and Learn script references have new queries. The private account route remains network-only under the unchanged service worker; no SW caching-policy change is required for these fixes.

## Verification

`verification.json` records fifteen successful groups: eleven relevant Node suites, exact original URL-target/anchor preservation across all fifteen HTML documents, and three syntax checks. Real fetch/socket/listener transports were disabled for the source suite.

- Sixteen actual-module account lifecycle scenarios pass, including lost sign-out recovery, late success/409/401, duplicate/obsolete OTP work, initial-profile identity switching, stale checkout navigation, payment-return polling and cookie-response ordering. The preserved baseline fails the privacy regression.
- Fourteen actual-module PWA checks pass; the original module fails because it reloads once on control change.
- Existing store-hour, request, contrast/private-offline, PC/flow, server logout, chat/navigation, estimate, OTP and truthful PC-copy suites pass.
- The original Python internal-link test was not run locally because only Windows Store aliases were available. Exact unchanged URL targets/original IDs were checked instead, and CI retains the existing Python test. The changed cache query assertion was updated without removing any behavioral assertions.

No real lead, message, sign-in code, account mutation, checkout, payment, refund, stock action or production/Git-ref change was performed by this audit.

## Remaining Visual Dependency

The available Browser skill was read and associated browser tools were actively searched. No supported Browser js/CUA tool is exposed in this session; the only browser-named tool belongs to an unrelated Floot preview. No shell Playwright/CDP or alternate browser-control path was used.

Actual latest-production desktop/mobile rendering, image composition, menu/focus behavior and the moved account control still need the authorized browser surface restored. Source/HTTP results do not mean Austin accepted the full design. Google listing/account work remains with the separate listings chat.

Coordinator-owned production verification after publishing should confirm all reviewed asset bytes and the existing account GET405 contract. When browser access returns, check the nine customer routes at desktop/mobile widths, account Sign Out/Retry placement and a partly completed form surviving service-worker control changes. Do not submit real customer forms or financial tests merely to clear acceptance.
