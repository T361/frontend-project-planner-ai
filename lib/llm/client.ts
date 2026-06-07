import "server-only";
import { z } from "zod";
import { LLM, estimateCost } from "./config";

export type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

export type LLMUsage = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
  latencyMs: number;
};

export type LLMResult = { text: string; usage: LLMUsage };

class LLMError extends Error {
  constructor(
    message: string,
    public usage: LLMUsage,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Single chat-completion call against the OpenAI-compatible endpoint.
 * - JSON mode on (response_format json_object)
 * - up to `retries` attempts on network / 5xx / 429 with backoff
 * - always returns usage (even on the failing call) so we can log cost
 */
export async function callLLM(
  messages: LLMMessage[],
  opts: { temperature?: number; maxTokens?: number; retries?: number } = {},
): Promise<LLMResult> {
  const { temperature = 0.4, maxTokens = 4096, retries = 2 } = opts;
  const started = Date.now();
  let lastErr = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${LLM.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${LLM.apiKey}`,
        },
        body: JSON.stringify({
          model: LLM.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        lastErr = `HTTP ${res.status}: ${body.slice(0, 300)}`;
        // Retry transient errors only.
        if (res.status === 429 || res.status >= 500) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        throw new Error(lastErr);
      }

      const json = await res.json();
      const text: string = json.choices?.[0]?.message?.content ?? "";
      const inputTokens: number = json.usage?.prompt_tokens ?? 0;
      const outputTokens: number = json.usage?.completion_tokens ?? 0;

      return {
        text,
        usage: {
          provider: LLM.provider,
          model: LLM.model,
          inputTokens,
          outputTokens,
          costEstimate: estimateCost(LLM.model, inputTokens, outputTokens),
          latencyMs: Date.now() - started,
        },
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < retries) await sleep(400 * (attempt + 1));
    }
  }

  throw new LLMError(lastErr || "LLM request failed", {
    provider: LLM.provider,
    model: LLM.model,
    inputTokens: 0,
    outputTokens: 0,
    costEstimate: 0,
    latencyMs: Date.now() - started,
  });
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first)
    return text.slice(first, last + 1);
  return text.trim();
}

/**
 * Call the model and validate the JSON against a Zod schema. If parsing or
 * validation fails, make ONE repair call that feeds the bad output + the error
 * back to the model and asks for corrected JSON. Usage from both calls is summed.
 */
export async function callStructured<T>(
  schema: z.ZodType<T>,
  messages: LLMMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<{ data: T; usage: LLMUsage }> {
  const first = await callLLM(messages, opts);
  const parsed = tryParse(schema, first.text);
  if (parsed.ok) return { data: parsed.data, usage: first.usage };

  // One repair attempt.
  const repair = await callLLM(
    [
      ...messages,
      { role: "assistant", content: first.text },
      {
        role: "user",
        content:
          `Your previous response was not valid for the required schema. ` +
          `Error: ${parsed.error}. ` +
          `Return ONLY corrected, valid JSON matching the schema. No prose, no markdown.`,
      },
    ],
    opts,
  );

  const usage = sumUsage(first.usage, repair.usage);
  const reparsed = tryParse(schema, repair.text);
  if (reparsed.ok) return { data: reparsed.data, usage };

  throw new LLMError(`Schema validation failed after repair: ${reparsed.error}`, usage);
}

function tryParse<T>(
  schema: z.ZodType<T>,
  text: string,
): { ok: true; data: T } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(text));
  } catch (e) {
    return { ok: false, error: `invalid JSON (${e instanceof Error ? e.message : e})` };
  }
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    error: result.error.issues
      .slice(0, 6)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; "),
  };
}

function sumUsage(a: LLMUsage, b: LLMUsage): LLMUsage {
  return {
    provider: a.provider,
    model: a.model,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    costEstimate: a.costEstimate + b.costEstimate,
    latencyMs: a.latencyMs + b.latencyMs,
  };
}

export { LLMError };
