import express from "express";
import { createServer } from "http";
import { afterEach, describe, expect, it } from "vitest";

import { registerShortlinkRoute } from "./shortlink";

const activeServers = new Set<ReturnType<typeof createServer>>();

async function startShortlinkTestServer(getProductByShortCode: (shortCode: string) => Promise<{ slug: string } | null>) {
  const app = express();
  registerShortlinkRoute(app, getProductByShortCode);
  const server = createServer(app);
  activeServers.add(server);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("测试服务未能获取端口。");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

afterEach(async () => {
  await Promise.all(
    Array.from(activeServers).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
    ),
  );
  activeServers.clear();
});

describe("registerShortlinkRoute", () => {
  it("redirects existing short code to the matching PDP route", async () => {
    const { baseUrl } = await startShortlinkTestServer(async (shortCode) =>
      shortCode === "iclou-testx01" ? { slug: "test-x01" } : null,
    );

    const response = await fetch(`${baseUrl}/s/iclou-testx01`, { redirect: "manual" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/object/test-x01");
  });

  it("falls back to /gallery when short code does not exist", async () => {
    const { baseUrl } = await startShortlinkTestServer(async () => null);

    const response = await fetch(`${baseUrl}/s/missing-code`, { redirect: "manual" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/gallery");
  });
});
