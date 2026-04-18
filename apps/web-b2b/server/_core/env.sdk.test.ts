import { describe, expect, it, vi } from "vitest";
import { ENV, createAdminEnv, type AdminEnv } from "./env";
import { SDKServer } from "./sdk";

function createFixtureEnv(overrides: Partial<Record<string, string>> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    VITE_APP_ID: "app_test_123",
    JWT_SECRET: "0123456789abcdef0123456789abcdef01234567",
    DATABASE_URL: "mysql://tester:secret@localhost:3306/icloush_test",
    OAUTH_SERVER_URL: "https://api.manus.im",
    ...overrides,
  };
}

function createAdminEnvFixture(overrides: Partial<Record<string, string>> = {}): AdminEnv {
  return createAdminEnv(createFixtureEnv(overrides));
}

describe("createAdminEnv", () => {
  it("throws a clear error when OAUTH_SERVER_URL is missing", () => {
    expect(() =>
      createAdminEnv(createFixtureEnv({ OAUTH_SERVER_URL: "" }))
    ).toThrowError(/OAUTH_SERVER_URL/);
  });

  it("throws a clear error when JWT_SECRET is shorter than 40 characters", () => {
    expect(() => createAdminEnv(createFixtureEnv({ JWT_SECRET: "too-short" }))).toThrowError(
      /JWT_SECRET/
    );
  });

  it("returns a normalized env object when required values are present", () => {
    const env = createAdminEnv(
      createFixtureEnv({
        OAUTH_SERVER_URL: "  https://api.manus.im  ",
        JWT_SECRET: "  0123456789abcdef0123456789abcdef01234567  ",
      })
    );

    expect(env).toMatchObject({
      appId: "app_test_123",
      databaseUrl: "mysql://tester:secret@localhost:3306/icloush_test",
      oAuthServerUrl: "https://api.manus.im",
      cookieSecret: "0123456789abcdef0123456789abcdef01234567",
      isProduction: false,
    });
  });
});

describe("runtime admin secrets", () => {
  it("prefers ADMIN_* overrides over short base secrets and uses the provided JWT secret when calling the OAuth JWT endpoint", async () => {
    expect(process.env.ADMIN_OAUTH_SERVER_URL).toBe("https://api.manus.im");
    expect(process.env.ADMIN_JWT_SECRET).toBeTruthy();
    expect(process.env.ADMIN_JWT_SECRET!.length).toBeGreaterThanOrEqual(40);
    expect(process.env.JWT_SECRET ?? "").not.toBe(process.env.ADMIN_JWT_SECRET);
    expect(ENV.oAuthServerUrl).toBe(process.env.ADMIN_OAUTH_SERVER_URL);
    expect(ENV.cookieSecret).toBe(process.env.ADMIN_JWT_SECRET);

    const post = vi.fn().mockResolvedValue({
      data: {
        openId: "open-id-1",
        name: "ICloush Admin",
        email: "admin@example.com",
        platform: "email",
      },
    });
    const sdk = new SDKServer({ post } as any, ENV);
    const token = await sdk.createSessionToken("open-id-1", {
      name: "ICloush Admin",
      expiresInMs: 60_000,
    });

    await sdk.getUserInfoWithJwt(token);

    expect(post).toHaveBeenCalledWith(
      "/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt",
      expect.objectContaining({
        jwtToken: token,
        projectId: ENV.appId,
      })
    );
  });
});

describe("SDKServer auth chain", () => {
  it("creates and verifies a signed session token with the validated JWT secret", async () => {
    const sdk = new SDKServer(undefined as any, createAdminEnvFixture());

    const token = await sdk.createSessionToken("open-id-1", {
      name: "ICloush Admin",
      expiresInMs: 60_000,
    });
    const verified = await sdk.verifySession(token);

    expect(verified).toEqual({
      openId: "open-id-1",
      appId: "app_test_123",
      name: "ICloush Admin",
    });
  });

  it("builds the OAuth exchange payload with validated appId and decoded redirectUri", async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        accessToken: "access-token",
      },
    });
    const sdk = new SDKServer(
      {
        post,
      } as any,
      createAdminEnvFixture()
    );

    await sdk.exchangeCodeForToken(
      "oauth-code",
      Buffer.from("https://example.com/callback").toString("base64")
    );

    expect(post).toHaveBeenCalledWith(
      "/webdev.v1.WebDevAuthPublicService/ExchangeToken",
      expect.objectContaining({
        clientId: "app_test_123",
        grantType: "authorization_code",
        code: "oauth-code",
        redirectUri: "https://example.com/callback",
      })
    );
  });
});
