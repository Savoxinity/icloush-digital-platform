import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  buildTransactionSignalBody,
  COMPLIANCE_MESSAGE,
  getRetailOrderStatusRefetchInterval,
  MonolithicHeroPage,
  ProductDetailPage,
  ShowroomPage,
  SHOWROOM_PRODUCTS,
  TransactionSignalOverlay,
  TRANSACTION_SIGNAL_HEADLINE,
  getShowroomProductById,
} from "./App";

function setLocation(pathname: string) {
  Object.defineProperty(globalThis, "location", {
    value: new URL(`https://example.com${pathname}`),
    configurable: true,
  });
}

describe("web storefront sprint 3 中文化重构", () => {
  it("渲染 Monolithic Hero 首页，包含品牌大字、3026 副标题与唯一 showroom 切割箭头", () => {
    setLocation("/");
    const html = renderToStaticMarkup(<MonolithicHeroPage featured={SHOWROOM_PRODUCTS[0]} />);

    expect(html).toContain("ICLOUSH LAB.");
    expect(html).toContain("3026 ORBITAL JEWELER");
    expect(html).toContain("ENTER /SHOWROOM");
    expect(html).toContain("/showroom");
    expect(html).toContain("hero-depth-stage");
    expect(html).not.toContain("购物袋");
  });

  it("渲染中文主标题、2C 路由入口、对象序列按钮与购物袋入口", () => {
    setLocation("/showroom");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("深空展柜");
    expect(html).toContain("数字展柜");
    expect(html).toContain("VOID-B03");
    expect(html).toContain("FC-LE");
    expect(html).toContain("/object/void-b03");
    expect(html).toContain("进入对象序列");
    expect(html).toContain("加入购物袋");
    expect(html).toContain("RETAIL CART");
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

  it("渲染中文单品档案、实验数据面板、外部入口桥接层与升级后的 fallback 通讯频道", () => {
    setLocation("/object/void-b03");
    const showroomHtml = renderToStaticMarkup(<ShowroomPage />);
    const detailHtml = renderToStaticMarkup(<ProductDetailPage id="void-b03" />);

    expect(detailHtml).toContain("实验数据面板");
    expect(detailHtml).toContain("成分解构");
    expect(detailHtml).toContain("REQUEST ALLOCATION / 申请配额");
    expect(detailHtml).toContain("ADD TO CART / 加入购物袋");
    expect(detailHtml).toContain("EXTERNAL ACCESS / 外部入口");
    expect(detailHtml).toContain("TAOBAO / TMALL / MINI PROGRAM");
    expect(detailHtml).toContain("SKU OPTION");
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

  it("根据后台外链元数据展示真实二维码与跳转入口", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage
        id="void-b03"
        product={{
          ...SHOWROOM_PRODUCTS[0],
          externalAccess: {
            taobaoUrl: "https://m.tb.cn/example",
            tmallUrl: "https://detail.tmall.com/item.htm?id=1",
            miniProgramPath: "pages/shop/detail?id=VOID-B03",
            wechatQrUrl: "https://cdn.example.com/wechat-qr.png",
          },
        }}
      />,
    );

    expect(html).toContain("https://m.tb.cn/example");
    expect(html).toContain("https://detail.tmall.com/item.htm?id=1");
    expect(html).toContain("https://cdn.example.com/wechat-qr.png");
    expect(html).toContain("pages/shop/detail?id=VOID-B03");
    expect(html).toContain("api.qrserver.com");
    expect(html).toContain("二维码");
  });

  it("暴露新的合规提示与对象查询 helper", () => {
    expect(COMPLIANCE_MESSAGE).toContain("交易通道（WeChat / Alipay）合规接入中");
    expect(getShowroomProductById("fc-le")?.code).toBe("FC-LE");
    expect(SHOWROOM_PRODUCTS).toHaveLength(4);
  });

  it("提供 2 秒轮询 helper，并在终态时停止轮询", () => {
    expect(getRetailOrderStatusRefetchInterval({ state: { data: undefined } })).toBe(2000);
    expect(getRetailOrderStatusRefetchInterval({ state: { data: { terminal: false } } })).toBe(2000);
    expect(getRetailOrderStatusRefetchInterval({ state: { data: { terminal: true } } })).toBe(false);
  });

  it("渲染交易成功弹层与科幻式回执文案", () => {
    const html = renderToStaticMarkup(
      <TransactionSignalOverlay
        open
        typedSignalBody={buildTransactionSignalBody("RTL-20260419-002")}
        orderNo="RTL-20260419-002"
        onAcknowledge={() => undefined}
        onReturn={() => undefined}
      />,
    );

    expect(html).toContain("PAYMENT SIGNAL / SANDBOX LOOP CLOSED");
    expect(html).toContain(TRANSACTION_SIGNAL_HEADLINE);
    expect(html).toContain("RTL-20260419-002");
    expect(html).toContain("配额已确认，等待星际物理投递");
    expect(html).toContain("ACKNOWLEDGE SIGNAL");
    expect(html).toContain("RETURN TO CART");
  });
});
