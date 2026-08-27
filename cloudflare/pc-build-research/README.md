# GotCracked PC Build Research Worker

Dedicated Cloudflare Worker for the GotCracked custom PC builder research pipeline.

## Safety invariant

This Worker must never return an automated build estimate unless all of the following are verified with current evidence:

1. PCPartPicker is checked as a secondary compatibility reference when reachable.
2. Newegg Custom PC Builder is used interactively for the exact core configuration and returns a stateful builder URL plus wattage evidence.
3. Manufacturer specifications confirm sockets, memory generation, BIOS support, physical clearances, storage interfaces, cooling fit, PSU connectors and power requirements.
4. Supabase server-side assertions accept the returned evidence.

The committed Worker currently performs authenticated Browser Run reachability probes and deliberately returns `research_unavailable` instead of guessing. That fail-closed gate must remain until the interactive Browser Run acceptance test passes in the Cloudflare account.

## Cloudflare resources

`wrangler.jsonc` declares:

- Workers AI binding: `AI`
- Browser Run binding: `BROWSER`
- Observability enabled
- Worker name: `gotcracked-pc-build-research`

Set the shared secret only through Wrangler/Cloudflare Secrets:

```sh
npx wrangler secret put PC_BUILD_RESEARCH_TOKEN
```

Never commit the token.

## Validate and deploy

```sh
npm install
npx wrangler types
npm run check
npm run deploy
```

Then verify:

```sh
curl https://<worker>.workers.dev/health
```

Expected health response includes `ok: true`, `aiBinding: true`, and `browserBinding: true`.

The protected endpoint is `POST /research` and requires `Authorization: Bearer <PC_BUILD_RESEARCH_TOKEN>`.

## Supabase wiring

After the Worker deployment has passed its interactive compatibility acceptance test, set the Supabase Edge Function secrets:

- `PC_BUILD_RESEARCH_URL=https://<worker>.workers.dev/research`
- `PC_BUILD_RESEARCH_TOKEN=<same secret>`

Do not wire Supabase to a Worker deployment that still contains the fail-closed interactive-verification gate; production will correctly return `research_unavailable` until that gate is replaced by a verified Browser Run flow.

See the repository root `PC_BUILD_RESEARCH_CONTRACT.md` for the full request/response and evidence contract.
