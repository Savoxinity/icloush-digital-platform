import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  COMPLIANCE_MESSAGE,
  ProductDetailPage,
  ShowroomPage,
  SHOWROOM_PRODUCTS,
  getShowroomProductById,
} from "./App";

function setLocation(pathname: string) {
  Object.defineProperty(globalThis, "location", {
    value: new URL(`https://example.com${pathname}`),
    configurable: true,
  });
}

describe("web-b2b showroom sprint 3", () => {
  it("renders the staggered showroom headline and source marker", () => {
    setLocation("/showroom");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("DIGITAL SHOWROOM");
    expect(html).toContain("DATA SOURCE // MOCK-LAB");
    expect(html).toContain("VOID-B03");
    expect(html).toContain("FC-LE");
  });

  it("renders the product detail data panel and allocation CTA", () => {
    setLocation("/product/void-b03");
    const html = renderToStaticMarkup(<ProductDetailPage id="void-b03" />);

    expect(html).toContain("成分解构面板");
    expect(html).toContain("REQUEST ALLOCATION / 申请配额");
    expect(html).toContain("硫化氢解构率");
  });

  it("exposes compliance fallback copy and product lookup helper", () => {
    expect(COMPLIANCE_MESSAGE).toContain("ICP备案审核中");
    expect(getShowroomProductById("fc-le")?.code).toBe("FC-LE");
    expect(SHOWROOM_PRODUCTS).toHaveLength(4);
  });
});
