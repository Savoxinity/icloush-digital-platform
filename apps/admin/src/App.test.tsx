import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminContent, CarePage, LabPage, PlatformHome, ShopPage, TechPage } from "./App";

function setPathname(pathname: string) {
  Object.defineProperty(globalThis, "location", {
    value: { pathname, search: "", hash: "" },
    configurable: true,
  });
}

Object.defineProperty(globalThis, "history", {
  value: {
    pushState: () => undefined,
    replaceState: () => undefined,
  },
  configurable: true,
});

globalThis.addEventListener ??= () => undefined;
globalThis.removeEventListener ??= () => undefined;

describe("admin front-stage skeleton pages", () => {
  it("renders platform home with commerce and brand navigation copy", () => {
    setPathname("/");
    const html = renderToStaticMarkup(<PlatformHome />);

    expect(html).toContain("统一平台总入口");
    expect(html).toContain("平台结构概览");
  });

  it("renders shop page with checkout and payment planning copy", () => {
    setPathname("/shop");
    const html = renderToStaticMarkup(<ShopPage />);

    expect(html).toContain("购物车预览");
    expect(html).toContain("采购结算单");
    expect(html).toContain("支付方式选择");
    expect(html).toContain("微信支付 JSAPI");
  });

  it("renders lab site skeleton with service-oriented messaging", () => {
    setPathname("/lab");
    const html = renderToStaticMarkup(<LabPage />);

    expect(html).toContain("iCloush LAB");
  });

  it("renders tech site skeleton with industrial solution messaging", () => {
    setPathname("/tech");
    const html = renderToStaticMarkup(<TechPage />);

    expect(html).toContain("环洗朵科技");
  });

  it("renders care site skeleton with service package messaging", () => {
    setPathname("/care");
    const html = renderToStaticMarkup(<CarePage />);

    expect(html).toContain("iCloush Care");
    expect(html).toContain("服务介绍");
  });

  it("renders admin order console with review queue and fulfillment stages", () => {
    setPathname("/admin/orders");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("审核队列");
    expect(html).toContain("履约阶段");
    expect(html).toContain("运营提示");
    expect(html).toContain("IC-2026-0021");
  });
});
