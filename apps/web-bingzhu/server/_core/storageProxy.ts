import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";

import { ENV } from "./env";

const LOCAL_ASSET_ROOTS = [
  "/home/ubuntu/webdev-static-assets",
  "/home/ubuntu/webdev-static-assets/huanxiduo",
] as const;

function buildCandidateNames(key: string) {
  const basename = path.basename(decodeURIComponent(key));
  const withoutHash = basename.replace(/_[a-f0-9]{8}(?=.[^.]+$)/i, "");
  return Array.from(new Set([basename, withoutHash]));
}

function resolveLocalAssetPath(key: string) {
  for (const rootDir of LOCAL_ASSET_ROOTS) {
    for (const candidateName of buildCandidateNames(key)) {
      const candidatePath = path.join(rootDir, candidateName);
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        return candidatePath;
      }
    }
  }
  return null;
}

function resolveForgeConfig() {
  return {
    apiUrl:
      ENV.forgeApiUrl ||
      process.env.ADMIN_BUILT_IN_FORGE_API_URL?.trim() ||
      process.env.BUILT_IN_FORGE_API_URL?.trim() ||
      process.env.VITE_FRONTEND_FORGE_API_URL?.trim() ||
      "",
    apiKey:
      ENV.forgeApiKey ||
      process.env.ADMIN_BUILT_IN_FORGE_API_KEY?.trim() ||
      process.env.BUILT_IN_FORGE_API_KEY?.trim() ||
      process.env.VITE_FRONTEND_FORGE_API_KEY?.trim() ||
      "",
  };
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string | undefined>)["0"];

    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const localAssetPath = resolveLocalAssetPath(key);
    if (localAssetPath) {
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.sendFile(localAssetPath);
      return;
    }

    const { apiUrl, apiKey } = resolveForgeConfig();
    if (!apiUrl || !apiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL("v1/storage/presign/get", apiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
