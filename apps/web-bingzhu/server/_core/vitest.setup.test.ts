import { describe, expect, it } from "vitest";

import {
  applyVitestEnv,
  minimumSecretLength,
  safeFallbackSecret,
} from "../../vitest.setup";

describe("applyVitestEnv", () => {
  it("replaces short JWT secrets with the 40+ character safe fallback", () => {
    const env = applyVitestEnv({
      NODE_ENV: "test",
      VITE_APP_ID: "app_test_123",
      DATABASE_URL: "mysql://tester:secret@localhost:3306/icloush_test",
      OAUTH_SERVER_URL: "https://api.manus.im",
      JWT_SECRET: "short-secret",
    });

    expect(env.JWT_SECRET).toBe(safeFallbackSecret);
    expect(env.JWT_SECRET).toHaveLength(minimumSecretLength);
  });

  it("preserves JWT secrets that already satisfy the 40+ character policy", () => {
    const compliantSecret = "Z9x8C7v6B5n4M3k2J1h0G9f8D7s6A5q4W3e2R1t0";
    const env = applyVitestEnv({
      NODE_ENV: "test",
      VITE_APP_ID: "app_test_123",
      DATABASE_URL: "mysql://tester:secret@localhost:3306/icloush_test",
      OAUTH_SERVER_URL: "https://api.manus.im",
      JWT_SECRET: compliantSecret,
    });

    expect(env.JWT_SECRET).toBe(compliantSecret);
    expect(env.JWT_SECRET).toHaveLength(minimumSecretLength);
  });
});
