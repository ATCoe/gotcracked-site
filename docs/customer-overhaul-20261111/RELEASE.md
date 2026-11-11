# Customer Website Overhaul — November 11, 2026

Original dark blue/charcoal layout and copy; original GotCracked logo retained. Twenty-one public pages plus the private account route share navigation and footer. The homepage uses original GotCracked exterior repair artwork. Service illustrations depict recognizable exterior devices, without invented internal construction; provenance is in ASSET_PROVENANCE.md.

## Forms and Workflow

- Estimate requests remain quotes, with no preferred appointment date or time saved.
- Appointments require an explicit request and staff confirmation.
- Student pickup collects school, meeting spot, availability, accessories and transport consent. Staff confirm coverage and timing individually; no campus affiliation or guaranteed collection is claimed.
- Device evaluation authorization captures explicit assent, typed name or drawn strokes, exact terms/version/hash and server receipt time. It authorizes evaluation, not unpriced repair work, and is not a blanket liability waiver.
- New private records are linked to the lead, with location/operator/permission checks inherited from Portal leads. Transport events are separate from repair state. Staff see them in the existing lead workspace.
- Twilio remains off. No marketing opt-in is bundled. Private account authentication and estimate approvals retain their existing implementation.

## Verification

All existing Node behavioral suites passed before changes; all 15 suites pass after the redesign. Architecture, local links and image hashes pass. A separate backend test runs the actual Edge Function handler with a fake database and zero outbound requests, covering quotes, pickup, authorization, duplicate submission, invalid consent, invalid intent and origin rejection.

Local preview intentionally substitutes a simulated transport. PREVIEW-ONLY confirmations do not create records or send messages. Run `node scripts/preview-server.mjs` and open http://localhost:4173/.

## Release Order and Rollback

1. Apply the additive Portal migration `20261111160000_customer_pickup_authorization.sql`.
2. Deploy public-intake with its three relative helper modules, preserving verify_jwt=false and existing secrets.
3. Deploy the Portal lead-record extension.
4. Merge the customer-site branch into main for Cloudflare Pages.
5. Verify deployed asset/version and the new routes without creating customer submissions.

Rollback: restore the previous customer-site commit 1aded70a1fe3c4dc04e18664c896a471737a10bf and the previous public-intake bundle from Portal main before the integration. Keep the additive private tables to retain any records already received. Existing RPC create_public_intake_records is unchanged. Do not drop signature or pickup records during rollback.


## Visual Regression Correction — November 11

The first release reintroduced repeated catalogue photos and white image panels, reversing an earlier deliberate repair-art design choice. The correction restores the original cracked-phone hero and supporting repair art, introduces three original exterior SVG service illustrations, and uses dark blue compositions across the homepage and service pages. Student, visit, about, warranty, learning and PC pages regain relevant supporting artwork. CSS and public cache versions are advanced together. Existing intake behavior is preserved.

Validation: architecture, internal links, pickup/authorization contracts, accessibility/offline and PWA checks pass. Desktop homepage and category graphics, service details and supporting pages are visually reviewed. Narrow 320px and 390px previews include a working navigation menu, no broken images and no horizontal overflow at 320px.
