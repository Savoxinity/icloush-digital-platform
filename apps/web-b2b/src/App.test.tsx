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

describe("web storefront monolith refactor", () => {
  it("renders the retail gallery headline, 2C route targets and monolith source marker", () => {
    setLocation("/gallery");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("RETAIL MONOLITH.");
    expect(html).toContain("FALLBACK SAFE");
    expect(html).toContain("VOID-B03");
    expect(html).toContain("FC-LE");
    expect(html).toContain("/object/void-b03");
    expect(html).toContain("ENTER RETAIL GALLERY");
    expect(html).not.toContain("B2B");
  });

  it("renders the 6:3:1 monolith system with chamfered containers and divine vector markers", () => {
    setLocation("/gallery");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("MONOLITHIC MASS");
    expect(html).toContain("ASCETIC MATERIAL");
    expect(html).toContain("DIVINE VECTOR");
    expect(html).toContain("hairline-grid");
    expect(html).toContain("crosshair");
    expect(html).toContain("clip-path:polygon(");
    expect(html).toContain("micro-copy");
    expect(html).toContain("SIGNAL");
  });

  it("renders the object detail archive and strips glassmorphism-era class markers from active retail surfaces", () => {
    setLocation("/object/void-b03");
    const showroomHtml = renderToStaticMarkup(<ShowroomPage />);
    const detailHtml = renderToStaticMarkup(<ProductDetailPage id="void-b03" />);

    expect(detailHtml).toContain("SPEC ARCHIVE");
    expect(detailHtml).toContain("DATA ALTAR");
    expect(detailHtml).toContain("REQUEST ALLOCATION / 申请配额");
    expect(detailHtml).toContain("RETURN TO GALLERY");
    expect(detailHtml).toContain("SULFIDE COLLAPSE");
    expect(detailHtml).toContain("ALLOCATION PENDING");
    expect(detailHtml).toContain("clip-path:polygon(");
    expect(showroomHtml).not.toContain("rounded-full");
    expect(showroomHtml).not.toContain("backdrop-blur");
    expect(showroomHtml).not.toContain("shadow-");
    expect(detailHtml).not.toContain("rounded-full");
    expect(detailHtml).not.toContain("backdrop-blur");
    expect(detailHtml).not.toContain("shadow-");
  });

  it("exposes compliance fallback copy and product lookup helper", () => {
    expect(COMPLIANCE_MESSAGE).toContain("ICP备案审核中");
    expect(getShowroomProductById("fc-le")?.code).toBe("FC-LE");
    expect(SHOWROOM_PRODUCTS).toHaveLength(4);
  });
});
