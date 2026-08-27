type Env = {
  AI: Ai;
  BROWSER: BrowserRun;
  PC_BUILD_RESEARCH_TOKEN: string;
};

type ResearchRequest = {
  survey?: Record<string, unknown>;
  partBudgetCents?: number;
  currency?: string;
  market?: string;
  references?: Array<{ name?: string; url?: string; role?: string }>;
  safeguards?: Record<string, boolean>;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const encode = (value: string) => new TextEncoder().encode(value);

async function secureEqual(a: string, b: string) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encode(a)),
    crypto.subtle.digest("SHA-256", encode(b)),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function validBearer(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function validateRequest(body: ResearchRequest) {
  if (!body || typeof body !== "object") return "Invalid request body.";
  if (!body.survey || typeof body.survey !== "object") return "Survey is required.";
  if (!Number.isInteger(body.partBudgetCents) || Number(body.partBudgetCents) < 40000) return "Invalid parts budget.";
  if (body.currency !== "USD" || body.market !== "US") return "Only US/USD research is supported.";
  if (body.safeguards?.noPurchases !== true || body.safeguards?.noCart !== true || body.safeguards?.noCheckout !== true || body.safeguards?.noSignIn !== true) {
    return "Required browsing safeguards are missing.";
  }
  return null;
}

async function probeReference(env: Env, url: string) {
  const response = await env.BROWSER.quickAction("content", {
    url,
    gotoOptions: { waitUntil: "domcontentloaded", timeout: 30000 },
  });
  const status = response.status;
  const browserMs = response.headers.get("x-browser-ms-used");
  // Bound the diagnostic read. This is only a reachability probe, not evidence of compatibility.
  const html = (await response.text()).slice(0, 2000);
  return { ok: response.ok, status, browserMs, hasContent: html.length > 100 };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "gotcracked-pc-build-research", aiBinding: Boolean(env.AI), browserBinding: Boolean(env.BROWSER) });
    }

    if (request.method !== "POST" || url.pathname !== "/research") return json({ error: "Not found." }, 404);
    if (!env.PC_BUILD_RESEARCH_TOKEN) return json({ error: "Research service is not configured." }, 503);

    const bearer = validBearer(request);
    if (!bearer || !(await secureEqual(bearer, env.PC_BUILD_RESEARCH_TOKEN))) return json({ error: "Unauthorized." }, 401);

    let body: ResearchRequest;
    try {
      body = await request.json<ResearchRequest>();
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }

    const requestError = validateRequest(body);
    if (requestError) return json({ error: requestError }, 400);

    const requestId = crypto.randomUUID();
    console.log(JSON.stringify({ event: "pc_research_started", requestId, partBudgetCents: body.partBudgetCents }));

    try {
      const [pcpartpicker, newegg] = await Promise.all([
        probeReference(env, "https://pcpartpicker.com/"),
        probeReference(env, "https://www.newegg.com/tools/custom-pc-builder"),
      ]);

      console.log(JSON.stringify({ event: "pc_research_reference_probe", requestId, pcpartpicker, newegg }));

      if (!newegg.ok || !newegg.hasContent) {
        return json({
          error: "Newegg Custom PC Builder is unavailable to Browser Run.",
          code: "research_unavailable",
          requestId,
          evidence: { pcpartpicker, newegg },
        }, 503);
      }

      /*
       * Deliberately fail closed until the deployed Browser Run session has passed
       * the live interactive-builder acceptance test. A landing-page fetch is NOT
       * compatibility evidence. Production must never release pricing from generic
       * page content, model knowledge, or invented builder state.
       *
       * The next deployment step replaces this gate with the Browser Run Playwright
       * flow that selects the exact proposed CPU/motherboard/RAM/storage/GPU/case/
       * PSU/cooler, captures a stateful Newegg Builder URL and wattage estimate,
       * checks PCPartPicker when available, and verifies manufacturer specifications.
       */
      return json({
        error: "Interactive compatibility verification is not enabled on this deployment.",
        code: "research_unavailable",
        requestId,
        evidence: { pcpartpicker, newegg },
      }, 503);
    } catch (error) {
      console.error(JSON.stringify({ event: "pc_research_failed", requestId, error: error instanceof Error ? error.message : String(error) }));
      return json({ error: "Research provider failed safely.", code: "research_unavailable", requestId }, 503);
    }
  },
} satisfies ExportedHandler<Env>;
