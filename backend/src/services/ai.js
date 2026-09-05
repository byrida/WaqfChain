const { GoogleGenerativeAI } = require("@google/generative-ai");

// ─── Configuration ────────────────────────────────────────────────────────────────
// Note: the originally requested "gemini-1.5-flash" has been retired by Google
// (404), and "gemini-2.5-flash" is no longer available to new keys. Google's
// error message for this API key recommends "gemini-3.6-flash" — the current
// stable flash-tier model. Retries on 503 (high-demand spikes) with backoff
// are handled in callGemini.
const MODEL_NAME = "gemini-3.6-flash";
const RETRY_BASE_DELAY_MS = 3000;
const MAX_RETRIES = 3;

// Demo conversion rate — this is a sandbox flow, not a real exchange rate.
const PKR_PER_ETH = 350000;

function ethToPkr(eth) {
  return Math.round(parseFloat(eth) * PKR_PER_ETH);
}

let model = null;

/**
 * Lazily initialize the Gemini model so the API key is read from the
 * environment at call time (after dotenv has loaded).
 */
function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend/.env");
  }
  if (!model) {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
  }
  return model;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────────

/**
 * Builds a simple, focused prompt containing the asset data and its full
 * on-chain event history, asking for exactly two outputs: an impact report
 * and a compliance check.
 */
function buildPrompt(asset, events) {
  const eventLines = events
    .map((e) => {
      if (e.type === "AssetCreated") {
        return `- AssetCreated: name="${e.name}", category="${e.beneficiaryCategory}", funding goal=₨${ethToPkr(e.fundingGoalETH).toLocaleString()} (${e.timestamp || "unknown time"})`;
      }
      if (e.type === "DonationReceived") {
        return `- DonationReceived: ₨${ethToPkr(e.amountETH).toLocaleString()} from ${e.donor} (${e.timestamp || "unknown time"})`;
      }
      return `- FundsDisbursed: ₨${ethToPkr(e.amountETH).toLocaleString()} to ${e.to}, purpose="${e.purpose}" (${e.timestamp || "unknown time"})`;
    })
    .join("\n");

  return `You are an assistant for WaqfChain, a platform for tokenized Islamic endowment (Waqf) assets.

ASSET DATA:
- Name: ${asset.name}
- Description: ${asset.description || "(none)"}
- Beneficiary category: ${asset.beneficiaryCategory}
- Funding goal: ₨${ethToPkr(asset.fundingGoalETH).toLocaleString()}
- Total raised so far: ₨${ethToPkr(asset.totalDonatedETH).toLocaleString()}

ON-CHAIN EVENT HISTORY (chronological):
${eventLines || "(no events)"}

Produce exactly two outputs:

1. impactReport: a plain-language, donor-friendly summary of this asset's activity — total raised, how the funds have been used, and progress toward the funding goal. Keep it warm, simple, and 3-5 sentences. Use PKR (₨) for all monetary amounts.

2. A compliance check: flag anything unusual — a disbursement amount that seems too large relative to what has been raised, or a disbursement purpose that does not clearly match the asset's beneficiary category. If nothing is unusual, set complianceCheck to exactly "No issues found" and flags to an empty array. Otherwise, set complianceCheck to "Issues found" and give a short list of flags with plain-language reasons. Use PKR (₨) for all monetary amounts.

Respond ONLY with JSON in this exact shape:
{"impactReport": "...", "complianceCheck": "No issues found", "flags": ["..."]}`;
}

// ─── Report Generation ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Gemini generateContent, retrying up to MAX_RETRIES times on 503
 * (temporary high demand) with escalating backoff: 3s, 6s, 12s.
 */
async function callGemini(gemini, prompt) {
  const request = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  };

  for (let attempt = 0; ; attempt++) {
    try {
      return await gemini.generateContent(request);
    } catch (err) {
      const isOverloaded = err.message && err.message.includes("503");
      if (!isOverloaded || attempt >= MAX_RETRIES) {
        throw err;
      }
      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `[AI] Gemini returned 503 (high demand) — retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`
      );
      await sleep(delay);
    }
  }
}

/**
 * Sends the asset data + event history to Gemini and returns
 * { impactReport, complianceCheck, flags }.
 */
async function generateAssetReport(asset, events) {
  const gemini = getModel();
  const prompt = buildPrompt(asset, events);

  const result = await callGemini(gemini, prompt);

  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fallback: strip possible markdown fences around the JSON
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Gemini returned an unparseable response");
    }
    parsed = JSON.parse(match[0]);
  }

  const flags = Array.isArray(parsed.flags) ? parsed.flags : [];

  return {
    impactReport: parsed.impactReport || "",
    complianceCheck: parsed.complianceCheck || (flags.length > 0 ? "Issues found" : "No issues found"),
    flags,
  };
}

module.exports = { generateAssetReport };
