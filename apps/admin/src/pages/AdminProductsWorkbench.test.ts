import { describe, expect, it } from "vitest";

import {
  getDetailImageValidationError,
  isAllowedDetailImageUrl,
  normalizeDetailImageValue,
} from "./AdminProductsWorkbench";

describe("AdminProductsWorkbench detail image helpers", () => {
  it("normalizes multiline detail image input while preserving order", () => {
    expect(
      normalizeDetailImageValue(" https://cdn.example.com/a.png\n\n/manus-storage/demo/b.png \nhttps://cdn.example.com/c.png "),
    ).toEqual([
      "https://cdn.example.com/a.png",
      "/manus-storage/demo/b.png",
      "https://cdn.example.com/c.png",
    ]);
  });

  it("accepts only http(s) and /manus-storage detail image urls", () => {
    expect(isAllowedDetailImageUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isAllowedDetailImageUrl("http://cdn.example.com/a.png")).toBe(true);
    expect(isAllowedDetailImageUrl("/manus-storage/demo/a.png")).toBe(true);
    expect(isAllowedDetailImageUrl("ftp://cdn.example.com/a.png")).toBe(false);
    expect(isAllowedDetailImageUrl("data:image/png;base64,abc")).toBe(false);
  });

  it("returns explicit validation error for unsupported detail image url", () => {
    expect(getDetailImageValidationError("https://cdn.example.com/a.png\nftp://cdn.example.com/b.png")).toBe(
      "详情长图仅支持 http(s) 或 /manus-storage/ 开头的图片地址。请先修正后再保存。",
    );
  });

  it("returns explicit validation error when detail image count exceeds limit", () => {
    const tooManyImages = Array.from({ length: 9 }, (_, index) => `https://cdn.example.com/${index + 1}.png`).join("\n");
    expect(getDetailImageValidationError(tooManyImages)).toBe("详情长图当前最多支持 8 张，请先删减后再保存。");
  });

  it("returns null when detail image input is valid", () => {
    expect(
      getDetailImageValidationError("https://cdn.example.com/a.png\n/manus-storage/demo/b.png\nhttps://cdn.example.com/c.png"),
    ).toBeNull();
  });
});
