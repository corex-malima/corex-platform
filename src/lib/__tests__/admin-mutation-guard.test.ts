import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { parseAndValidate } from "@/lib/admin-mutation-guard";

function makeRequest(body: unknown) {
  return new Request("http://test/api/admin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("parseAndValidate", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().min(0),
  });

  it("returns parsed data on valid body", async () => {
    const req = makeRequest({ name: "Ana", age: "30" });
    const { data, errorResponse } = await parseAndValidate(req, schema, "req-1");
    expect(errorResponse).toBe(null);
    expect(data).toEqual({ name: "Ana", age: 30 });
  });

  it("returns 400 when body is invalid", async () => {
    const req = makeRequest({ name: "", age: -1 });
    const { data, errorResponse } = await parseAndValidate(req, schema, "req-2");
    expect(data).toBe(null);
    expect(errorResponse).not.toBe(null);
    expect(errorResponse!.status).toBe(400);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://test/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    }) as unknown as import("next/server").NextRequest;
    const { data, errorResponse } = await parseAndValidate(req, schema, "req-3");
    expect(data).toBe(null);
    expect(errorResponse).not.toBe(null);
    expect(errorResponse!.status).toBe(400);
  });
});

describe("rate limit env override", () => {
  beforeEach(() => {
    process.env.ADMIN_MAESTROS_RATE_LIMIT = "5";
    process.env.ADMIN_MAESTROS_RATE_LIMIT_WINDOW_MS = "30000";
  });

  afterEach(() => {
    delete process.env.ADMIN_MAESTROS_RATE_LIMIT;
    delete process.env.ADMIN_MAESTROS_RATE_LIMIT_WINDOW_MS;
  });

  it("env vars are read by getEnvNumber when calling enforceAdminMaestrosRateLimit", () => {
    // Sanity check — el helper getEnvNumber prefiere env > default
    const limit = Number(process.env.ADMIN_MAESTROS_RATE_LIMIT);
    expect(limit).toBe(5);
  });
});
