/**
 * Typed API client.
 *
 * Types come from the backend's OpenAPI document (`make gen-api`), so a
 * renamed field breaks the build instead of the page. Every non-2xx answer
 * becomes an `ApiError` carrying the backend's `{code, message, details}`.
 */
import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];

export const api = createClient<paths>({ baseUrl: "", credentials: "include" });

export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Validation problems keyed by field name, for forms. */
  fieldIssues(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(
      (this.details as FieldIssue[]).filter((d) => d.field).map((d) => [d.field, d.message]),
    );
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

/** Unwrap an openapi-fetch result: return data, or throw an ApiError. */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result: Awaited<typeof call>;
  try {
    result = await call;
  } catch {
    throw new ApiError(0, "network_error", "Can't reach Tailr. Check your connection and try again.");
  }
  const { data, error, response } = result;
  if (response.ok) return data as T;
  const body = (error ?? {}) as ErrorBody;
  throw new ApiError(
    response.status,
    body.error?.code ?? "http_error",
    body.error?.message ?? "Something went wrong. Try again.",
    body.error?.details,
  );
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
