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

describe("web storefront sprint 3 中文化重构", () => {
  it("渲染中文主标题、2C 路由入口与对象序列按钮", () => {
    setLocation("/showroom");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("深空展柜");
    expect(html).toContain("数字展柜");
    expect(html).toContain("VOID-B03");
    expect(html).toContain("FC-LE");
    expect(html).toContain("/object/void-b03");
    expect(html).toContain("进入对象序列");
    expect(html).not.toContain("B2B");
  });

  it("渲染 6:3:1 方尖碑系统与中文字体分层类名", () => {
    setLocation("/gallery");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("巨物粗野");
    expect(html).toContain("绝对材质");
    expect(html).toContain("神性纹章");
    expect(html).toContain("hairline-grid");
    expect(html).toContain("crosshair");
    expect(html).toContain("clip-path:polygon(");
    expect(html).toContain("display-title");
    expect(html).toContain("font-zh-sans");
    expect(html).toContain("font-zh-serif");
    expect(html).toContain("SIGNAL");
  });

  it("渲染中文单品档案、实验数据面板与升级后的 fallback 通讯频道", () => {
    setLocation("/object/void-b03");
    const showroomHtml = renderToStaticMarkup(<ShowroomPage />);
    const detailHtml = renderToStaticMarkup(<ProductDetailPage id="void-b03" />);

    expect(detailHtml).toContain("实验数据面板");
    expect(detailHtml).toContain("成分解构");
    expect(detailHtml).toContain("REQUEST ALLOCATION / 申请配额");
    expect(detailHtml).toContain("返回数字展柜");
    expect(detailHtml).toContain("硫化氢解构率");
    expect(detailHtml).toContain("企业微信顾问");
    expect(detailHtml).toContain("小程序节点预留");
    expect(detailHtml).toContain("channel-frame");
    expect(detailHtml).toContain("clip-path:polygon(");
    expect(showroomHtml).not.toContain("rounded-full");
    expect(showroomHtml).not.toContain("backdrop-blur");
    expect(showroomHtml).not.toContain("shadow-");
    expect(detailHtml).not.toContain("rounded-full");
    expect(detailHtml).not.toContain("backdrop-blur");
    expect(detailHtml).not.toContain("shadow-");
  });

  it("暴露新的合规提示与对象查询 helper", () => {
    expect(COMPLIANCE_MESSAGE).toContain("交易通道（WeChat / Alipay）合规接入中");
    expect(getShowroomProductById("fc-le")?.code).toBe("FC-LE");
    expect(SHOWROOM_PRODUCTS).toHaveLength(4);
  });
});
