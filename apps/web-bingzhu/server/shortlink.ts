import type { Express } from "express";

export type ManagedProductShortlinkRecord = {
  slug: string;
};

export async function resolveShortlinkRedirectTarget(params: {
  shortCode: string;
  getProductByShortCode: (shortCode: string) => Promise<ManagedProductShortlinkRecord | null>;
}) {
  try {
    const product = await params.getProductByShortCode(params.shortCode);
    return product ? `/object/${product.slug}` : "/gallery";
  } catch {
    return "/gallery";
  }
}

export function registerShortlinkRoute(
  app: Express,
  getProductByShortCode: (shortCode: string) => Promise<ManagedProductShortlinkRecord | null>,
) {
  app.get("/s/:shortCode", async (req, res) => {
    const shortCode = typeof req.params.shortCode === "string" ? req.params.shortCode : "";
    const target = await resolveShortlinkRedirectTarget({
      shortCode,
      getProductByShortCode,
    });
    res.redirect(302, target);
  });
}
