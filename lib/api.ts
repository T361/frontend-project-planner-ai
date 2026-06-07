import { NextResponse } from "next/server";
import { HttpError } from "@/lib/auth";
import { LLMError } from "@/lib/llm/client";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra?: unknown) {
  return NextResponse.json({ error: message, ...(extra ? { detail: extra } : {}) }, { status });
}

/**
 * Wrap a route handler so thrown HttpError/LLMError/validation errors become
 * clean JSON responses instead of leaking stack traces to the client.
 */
export function handler<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>,
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e instanceof LLMError) return fail(502, e.message);
      console.error("[api] unhandled", e);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}
