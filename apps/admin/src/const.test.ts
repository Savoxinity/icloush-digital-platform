import { afterEach, describe, expect, it, vi } from "vitest";

import { getLoginUrl } from "./const";

describe("getLoginUrl", () => {
  const originalWindow = globalThis.window;
  const env = import.meta.env;

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.assign(import.meta.env, env);
    if (originalWindow) {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("encodes an explicit return path into OAuth state", () => {
    Object.assign(import.meta.env, {
      VITE_OAUTH_PORTAL_URL: "https://portal.example.com",
      VITE_APP_ID: "app_123",
    });

    vi.stubGlobal("window", {
      location: {
        origin: "https://shop.example.com",
        pathname: "/shop",
        search: "?category=hotel",
        hash: "#hero",
      },
    });

    const url = new URL(getLoginUrl("/account"));
    const state = JSON.parse(Buffer.from(url.searchParams.get("state") ?? "", "base64").toString("utf8"));

    expect(url.origin).toBe("https://portal.example.com");
    expect(url.searchParams.get("appId")).toBe("app_123");
    expect(url.searchParams.get("redirectUri")).toBe("https://shop.example.com/api/oauth/callback");
    expect(state).toEqual({
      redirectUri: "https://shop.example.com/api/oauth/callback",
      returnPath: "/account",
    });
  });

  it("falls back to the current location when returnPath is omitted", () => {
    Object.assign(import.meta.env, {
      VITE_OAUTH_PORTAL_URL: "https://portal.example.com",
      VITE_APP_ID: "app_123",
    });

    vi.stubGlobal("window", {
      location: {
        origin: "https://shop.example.com",
        pathname: "/shop",
        search: "?category=hotel",
        hash: "#hero",
      },
    });

    const url = new URL(getLoginUrl());
    const state = JSON.parse(Buffer.from(url.searchParams.get("state") ?? "", "base64").toString("utf8"));

    expect(state.returnPath).toBe("/shop?category=hotel#hero");
  });
});
