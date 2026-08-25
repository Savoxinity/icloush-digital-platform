import { describe, expect, it } from "vitest";

import { getSafeReturnPath, parseOAuthState } from "./oauth";

describe("OAuth return path helpers", () => {
  it("parses base64 JSON state payloads", () => {
    const state = Buffer.from(
      JSON.stringify({
        redirectUri: "https://shop.example.com/api/oauth/callback",
        returnPath: "/account",
      }),
      "utf8",
    ).toString("base64");

    expect(parseOAuthState(state)).toEqual({
      redirectUri: "https://shop.example.com/api/oauth/callback",
      returnPath: "/account",
    });
  });

  it("returns the requested internal path when it is safe", () => {
    const state = Buffer.from(JSON.stringify({ returnPath: "/account" }), "utf8").toString("base64");

    expect(getSafeReturnPath(state)).toBe("/account");
  });

  it("falls back to root for malformed or external return paths", () => {
    const externalState = Buffer.from(JSON.stringify({ returnPath: "https://evil.example.com" }), "utf8").toString("base64");

    expect(getSafeReturnPath(externalState)).toBe("/");
    expect(getSafeReturnPath("not-base64")).toBe("/");
  });
});
