# GotCracked Custom PC Research Contract

This document defines the server-to-server contract between the Supabase `custom-pc-build` Edge Function and the Cloudflare research service that will be deployed later.

## Current production state

- Public form: `pc-build.html`
- Public client: `pc-build.js`
- Authoritative request/lead storage: Supabase
- Supabase Edge Function: `custom-pc-build`
- Intended research provider: Cloudflare Workers AI + Browser Run
- Research endpoint env var in Supabase: `PC_BUILD_RESEARCH_URL`
- Shared bearer-token env var in Supabase: `PC_BUILD_RESEARCH_TOKEN`
- No automated estimate may be released unless server-side compatibility validation succeeds.

If the Cloudflare endpoint or its authentication is unavailable, the Supabase function returns `research_unavailable`, keeps `compatibility_status='pending'`, saves the customer request, and releases no automated estimate.

## Required research references

The Cloudflare service must use the following evidence layers:

1. **PCPartPicker** — secondary parts/compatibility cross-check. A successful check should return a `pcpartpicker.com` build URL when one can be produced. If PCPartPicker cannot be reached, report `unavailable`; never fabricate a successful check.
2. **Newegg Custom PC Builder** — interactive compatibility verification for the proposed core hardware. A successful automated estimate requires a stateful Newegg `/tools/custom-pc-builder/pl/ID-...` URL containing `tempPcbId` or a non-zero `diywishlist` value, plus exact Newegg product evidence for core parts.
3. **Manufacturer specifications** — final authority for CPU socket/chipset/BIOS support, memory type, motherboard/case form factor, GPU clearance, cooler/radiator fit, storage interfaces, PSU capacity/connectors, and required adapters.
4. **GotCracked server assertions** — Supabase independently checks critical compatibility facts before accepting the recommendation.

PCPartPicker and Newegg are aids. Manufacturer specifications and the server assertions control when evidence conflicts.

## Request body sent to Cloudflare

The Supabase function sends only the build survey and technical planning data, not the customer's name, email, or phone number.

```json
{
  "survey": {},
  "partBudgetCents": 155001,
  "currency": "USD",
  "market": "US",
  "references": [
    {
      "name": "PCPartPicker",
      "url": "https://pcpartpicker.com/",
      "role": "secondary compatibility and parts cross-check"
    },
    {
      "name": "Newegg Custom PC Builder",
      "url": "https://www.newegg.com/tools/custom-pc-builder",
      "role": "interactive compatibility verification and wattage evidence"
    },
    {
      "name": "Manufacturer specifications",
      "role": "final authority for sockets, memory, dimensions, BIOS, interfaces and power requirements"
    }
  ],
  "safeguards": {
    "noPurchases": true,
    "noCart": true,
    "noCheckout": true,
    "noSignIn": true,
    "requireCurrentPricing": true,
    "requireCompatibilityEvidence": true
  }
}
```

Authentication: `Authorization: Bearer <PC_BUILD_RESEARCH_TOKEN>`.

## Required Cloudflare response

The Worker should return JSON with either a top-level `recommendation` object or the recommendation object directly. It may include `model` or `research_model` for audit purposes.

The recommendation must contain:

```json
{
  "build_name": "string",
  "customer_summary": "string",
  "performance_summary": "string",
  "upgrade_summary": "string",
  "compatibility_summary": "string",
  "budget_note": "string",
  "budget_fit": true,
  "estimated_wattage": 500,
  "pcpartpicker_compatibility": {
    "status": "verified | unavailable",
    "build_url": "https://pcpartpicker.com/list/...",
    "notes": "string"
  },
  "newegg_compatibility": {
    "status": "verified | manual_review",
    "builder_url": "https://www.newegg.com/tools/custom-pc-builder/pl/ID-...?tempPcbId=...",
    "min_wattage_estimate": 500,
    "checked_categories": ["CPU", "CPU Cooler", "Motherboard", "Memory", "Storage", "GPU", "Case", "Power Supply"],
    "notes": "string",
    "manufacturer_crosscheck": "string"
  },
  "spec_checks": {
    "cpu_socket": "AM5",
    "motherboard_socket": "AM5",
    "memory_type": "DDR5",
    "motherboard_memory_type": "DDR5",
    "motherboard_form_factor": "ATX",
    "case_supported_form_factors": ["ATX", "Micro ATX", "Mini ITX"],
    "gpu_length_mm": 300,
    "case_gpu_clearance_mm": 360,
    "psu_watts": 750,
    "cooler_fit_verified": true,
    "storage_interface_verified": true,
    "psu_connectors_verified": true,
    "bios_support_verified": true
  },
  "parts": [
    {
      "category": "CPU",
      "name": "Exact model",
      "price_cents": 24999,
      "retailer": "Retailer name",
      "source_url": "https://retailer.example/product",
      "newegg_product_url": "https://www.newegg.com/...",
      "rationale": "Why this exact component fits the survey"
    }
  ]
}
```

Core categories are CPU, CPU Cooler, Motherboard, Memory, Storage, GPU when used, Case, and Power Supply. Windows/monitor/other parts are included only when applicable to the customer's survey.

## Server-side acceptance rules

Supabase will reject/hold the automated estimate when any required verification is missing. Current checks include:

- Newegg compatibility status must be `verified`.
- A stateful Newegg Builder URL is mandatory for an automatic estimate.
- PCPartPicker status must be either `verified` or explicitly `unavailable`; a claimed verified result requires a valid PCPartPicker URL.
- Required core part categories must be present.
- Each selected core category must be included in Newegg's checked categories.
- Core parts require exact Newegg product evidence.
- CPU and motherboard sockets must match.
- RAM type must match motherboard support.
- Motherboard form factor must be supported by the case.
- GPU length must fit within case clearance when a discrete GPU is used.
- PSU must have at least 100 W or 20% headroom over the verified minimum wattage, whichever is greater.
- Cooler fit, storage interface, PSU connectors, and BIOS support must all be verified.
- Every internal part must have a sane positive integer price and HTTPS price source.

A compatibility-validation failure becomes `manual_review`. A Cloudflare/network/provider failure becomes `research_unavailable`. These states must never be conflated.

## Customer data exposure

The customer response contains component names, explanations, the one combined build estimate, estimate validity, and compatibility summary. It does **not** expose GotCracked's internal per-part cost breakdown or internal sourcing records.

## Cloudflare deployment requirements for the later Work task

Use a dedicated Worker such as `gotcracked-pc-build-research` with:

- Workers AI binding, e.g. `AI`
- Browser Run binding, e.g. `BROWSER`
- A secret `PC_BUILD_RESEARCH_TOKEN`
- Structured logging/observability enabled
- A recent `compatibility_date`
- `nodejs_compat` when required by Browser Run/agent dependencies
- Server-side bearer-token validation before any browser or AI work
- Host allowlisting for retailer/manufacturer browsing
- No login, cart, checkout, ordering, or personal-information submission automation

After deployment, set the matching Supabase Edge Function secrets:

- `PC_BUILD_RESEARCH_URL=https://<worker-route>`
- `PC_BUILD_RESEARCH_TOKEN=<same strong random secret>`

Then run an end-to-end production test and verify: request creation → live research → PCPartPicker evidence → Newegg stateful Builder evidence → manufacturer checks → server assertions → estimate storage → Portal visibility → Discord notification. Remove test records afterward.
