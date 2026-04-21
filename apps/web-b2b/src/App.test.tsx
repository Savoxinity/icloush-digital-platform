import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  buildTransactionSignalBody,
  COMPLIANCE_MESSAGE,
  getRetailOrderStatusRefetchInterval,
  HuanxiduoTechPage,
  MonolithicHeroPage,
  PlatformEcosystemPage,
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
  it("渲染 LAB 静奢首页，包含 3026 片名式标题、ACCESS 入口与全屏菜单文案", () => {
    setLocation("/");
    const html = renderToStaticMarkup(<MonolithicHeroPage featured={SHOWROOM_PRODUCTS[0]} />);

    expect(html).toContain("ICLOUSH LAB.");
    expect(html).toContain("3026 Orbital Jeweler");
    expect(html).toContain("Enter showroom");
    expect(html).toContain("Access");
    expect(html).toContain("The Vault Menu");
    expect(html).toContain("SERIES: AP");
    expect(html).not.toContain("购物袋");
  });

  it("渲染名录式卖场首页，包含对象目录、系列筛选、悬停微距预览与购物袋入口", () => {
    setLocation("/showroom");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("Object Index / Silent Catalogue");
    expect(html).toContain("Objects");
    expect(html).toContain("All Objects");
    expect(html).toContain("Atmospheric Purification");
    expect(html).toContain("Fabric Care");
    expect(html).toContain("VOID-B03 / 大气重组基质");
    expect(html).toContain("FC-LE / 织物精华乳");
    expect(html).toContain("Hover Focus");
    expect(html).toContain("Macro Preview");
    expect(html).toContain("View object");
    expect(html).toContain("Add to bag");
    expect(html).toContain("RETAIL CART");
  });

  it("卖场切换为目录陈列后，仍保留极简黑场、黑白灰语言与对象预览结构", () => {
    setLocation("/gallery");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("Silent Catalogue");
    expect(html).toContain("Conversion Discipline");
    expect(html).toContain("Atmospheric Purification");
    expect(html).toContain("font-zh-sans");
    expect(html).toContain("font-zh-serif");
    expect(html).not.toContain("rounded-full");
    expect(html).not.toContain("shadow-");
  });

  it("渲染中文单品档案、静奢参数索引、外部入口桥接层与升级后的私域通讯频道", () => {
    setLocation("/object/void-b03");
    const showroomHtml = renderToStaticMarkup(<ShowroomPage />);
    const detailHtml = renderToStaticMarkup(<ProductDetailPage id="void-b03" />);

    expect(detailHtml).toContain("实验数据面板");
    expect(detailHtml).toContain("成分解构");
    expect(detailHtml).toContain("Request allocation / 申请配额");
    expect(detailHtml).toContain("Add to bag / 加入购物袋");
    expect(detailHtml).toContain("EXTERNAL ACCESS / 外部入口");
    expect(detailHtml).toContain("TAOBAO / TMALL / MINI PROGRAM");
    expect(detailHtml).toContain("SKU OPTION");
    expect(detailHtml).toContain("Back");
    expect(detailHtml).toContain("Archive Source");
    expect(detailHtml).toContain("Quiet Spec");
    expect(detailHtml).toContain("硫化氢解构率");
    expect(detailHtml).toContain("企业微信顾问");
    expect(detailHtml).toContain("小程序节点预留");
    expect(detailHtml).toContain("Private Access");
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

  it("恢复统一数字底座总入口，展示多品牌站点与关键路由", () => {
    setLocation("/");
    const html = renderToStaticMarkup(<PlatformEcosystemPage />);

    expect(html).toContain("iCloush Digital Platform");
    expect(html).toContain("统一数字底座");
    expect(html).toContain("环洗朵科技");
    expect(html).toContain('href="/lab"');
    expect(html).toContain('href="/tech"');
    expect(html).toContain('href="/care"');
    expect(html).toContain('href="/shop"');
  });

  it("恢复环洗朵科技官网首页，采用动态 Hero、真实高清媒资链路、强制整屏吸附滚动与无边框悬浮排版", () => {
    setLocation("/tech");
    const html = renderToStaticMarkup(<HuanxiduoTechPage />);

    expect(html).toContain("Hyper-Resolution Industrial Terminal");
    expect(html).toContain("次时代清洁解决方案");
    expect(html).toContain("4K POSTER // REAL ASSET FEED");
    expect(html).toContain("PH VALUE 7.0");
    expect(html).toContain("CNAS CERTIFIED");
    expect(html).toContain("INDUSTRIAL LAUNDRY | KITCHEN HYGIENE | ROOM CARE");
    expect(html).toContain("snap-mandatory");
    expect(html).toContain("snap-start snap-always");
    expect(html).toContain('href="#technology"');
    expect(html).toContain('href="#solutions"');
    expect(html).toContain('href="#products"');
    expect(html).toContain('href="#sample"');
    expect(html).toContain("REQUEST SAMPLE");
    expect(html).toContain("DOWNLOAD TDS / 下载 TDS");
    expect(html).toContain("/manus-storage/huanxiduo-hero-4k_a47d4dd9.jpg");
    expect(html).toContain("/manus-storage/huanxiduo-tds-placeholder_18e633bb.pdf");
    expect(html).not.toContain("data:image/jpeg;base64,");
    expect(html).not.toContain("data:application/pdf;base64,");
    expect(html).not.toContain("border border-white/10");
    expect(html).not.toContain("gap-px border");
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
