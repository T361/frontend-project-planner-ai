import "server-only";

/**
 * Server-only LLM configuration. Importing `server-only` guarantees this module
 * (and the API key) can never be bundled into client code.
 *
 * Provider choice: Groq's OpenAI-compatible endpoint running Llama 3.3 70B.
 * Rationale (see README): very low latency + low cost makes lazy, per-node
 * generation cheap, and the OpenAI-compatible shape keeps us provider-portable.
 */
export const LLM = {
  provider: process.env.LLM_PROVIDER ?? "groq",
  baseUrl: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
  apiKey: process.env.LLM_API_KEY ?? "",
  model: process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
};

/** Approx USD per 1M tokens for cost estimation in the usage dashboard. */
export const PRICING: Record<string, { input: number; output: number }> = {
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  default: { input: 0.59, output: 0.79 },
};

export function estimateCost(model: string, inT: number, outT: number): number {
  const p = PRICING[model] ?? PRICING.default;
  return (inT / 1_000_000) * p.input + (outT / 1_000_000) * p.output;
}

export function isLLMConfigured() {
  return Boolean(LLM.apiKey);
}
