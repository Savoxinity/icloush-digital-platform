import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  buildTransactionSignalBody,
  BRAND_SITE_RUNTIMES,
  COMPLIANCE_MESSAGE,
  getRetailOrderStatusRefetchInterval,
  AstroPage,
  CareBrandPage,
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
    expect(html).toContain("进入首发货架");
    expect(html).toContain("查看主推对象");
    expect(html).toContain("Access");
    expect(html).toContain("The Vault Menu");
    expect(html).toContain("SERIES: AP");
    expect(html).not.toContain("购物袋");
  });

  it("渲染名录式卖场首页，包含对象目录、系列筛选、悬停微距预览与购物袋入口", () => {
    setLocation("/showroom");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("Featured Shelf / Commerce Selection");
    expect(html).toContain("精选商品货架");
    expect(html).toContain("全部在售商品");
    expect(html).toContain("空气净域系列");
    expect(html).toContain("织物护理系列");
    expect(html).toContain("VOID-B03 / 大气重组基质");
    expect(html).toContain("FC-LE / 织物精华乳");
    expect(html).toContain("Hover Focus");
    expect(html).toContain("Macro Preview");
    expect(html).toContain("首发系列占比");
    expect(html).toContain("Shelf Brief / 上架策略");
    expect(html).toContain("先做主推位，不先做大全目录");
    expect(html).toContain("Launch Signal");
    expect(html).toContain("同页完成加购");
    expect(html).toContain("View object");
    expect(html).toContain("Add to bag");
    expect(html).toContain("RETAIL CART");
  });

  it("卖场切换为目录陈列后，仍保留极简黑场、黑白灰语言与对象预览结构", () => {
    setLocation("/gallery");
    const html = renderToStaticMarkup(<ShowroomPage />);

    expect(html).toContain("Featured Shelf / Commerce Selection");
    expect(html).toContain("Conversion Discipline");
    expect(html).toContain("空气净域系列");
    expect(html).toContain("font-zh-sans");
    expect(html).toContain("font-zh-serif");
    expect(html).not.toContain("rounded-full");
    expect(html).not.toContain("shadow-");
  });

  it("渲染中文单品档案、静奢参数索引、购买理由/陈列打法模块、服务承诺与升级后的私域通讯频道", () => {
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
    expect(detailHtml).toContain("购买理由");
    expect(detailHtml).toContain("陈列打法");
    expect(detailHtml).toContain("企业微信顾问");
    expect(detailHtml).toContain("小程序节点预留");
    expect(detailHtml).toContain("发售状态");
    expect(detailHtml).toContain("成交桥接");
    expect(detailHtml).toContain("Commerce Runtime / 正式商城信息");
    expect(detailHtml).toContain("发货方式");
    expect(detailHtml).toContain("售后保障");
    expect(detailHtml).toContain("使用建议");
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

  it("在商品挂载详情长图序列时渲染沉浸式详情浏览区块", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage
        id="void-b03"
        product={{
          ...SHOWROOM_PRODUCTS[0],
          detailImages: [
            "https://cdn.example.com/detail-01.jpg",
            "https://cdn.example.com/detail-02.jpg",
          ],
        }}
      />,
    );

    expect(html).toContain("Rich Content / 商品详情长图");
    expect(html).toContain("沉浸详情浏览");
    expect(html).toContain("https://cdn.example.com/detail-01.jpg");
    expect(html).toContain("https://cdn.example.com/detail-02.jpg");
    expect(html).toContain("Detail Frame 01");
  });

  it("在商品未挂载详情长图时不渲染沉浸式详情浏览区块", () => {
    const html = renderToStaticMarkup(<ProductDetailPage id="void-b03" product={{ ...SHOWROOM_PRODUCTS[0], detailImages: [] }} />);

    expect(html).not.toContain("Rich Content / 商品详情长图");
    expect(html).not.toContain("Detail Frame 01");
  });

  it("服务型商品在 PDP 中切换为方案承接语义而非实物加购", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage
        id="care-service"
        product={{
          ...SHOWROOM_PRODUCTS[0],
          id: "care-service",
          code: "CARE-SVC-01",
          name: "客房织物奢护服务",
          productType: "service",
          price: 2999,
        }}
      />,
    );

    expect(html).toContain("Service Access");
    expect(html).toContain("服务方案");
    expect(html).toContain("Start service order / 发起方案下单");
    expect(html).not.toContain("SKU OPTION");
    expect(html).not.toContain("Add to bag / 加入购物袋");
  });

  it("订阅型商品在 PDP 中展示订阅摘要与阶梯价提示，承接多维商品模型", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage
        id="hxdaas-plan"
        product={{
          ...SHOWROOM_PRODUCTS[0],
          id: "hxdaas-plan",
          code: "HXD-DAAS-01",
          name: "环洗朵 DaaS 月度焕新计划",
          productType: "subscription",
          price: 1299,
          subscriptionLabel: "月度焕新计划 · 按月 ¥1299",
          subscriptionPlanCount: 2,
          tierPriceLabel: "阶梯价低至 ¥1099 · 12件起",
          tierPriceCount: 2,
        }}
      />,
    );

    expect(html).toContain("Subscription Access");
    expect(html).toContain("订阅方案");
    expect(html).toContain("月度焕新计划");
    expect(html).toContain("按月");
    expect(html).toContain("阶梯价低至 ¥1099 · 12件起");
    expect(html).toContain("Start subscription order / 发起订阅下单");
    expect(html).not.toContain("Add to bag / 加入购物袋");
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
    expect(html).toContain("先让客户被品牌吸引，再让商品被看见，最后让成交与咨询自然发生。");
    expect(html).toContain("浣星司 / ASTRO");
    expect(html).toContain('href="/lab"');
    expect(html).toContain('href="/tech"');
    expect(html).toContain('href="/astro"');
    expect(html).toContain('href="/care"');
    expect(html).toContain('href="/shop"');
    expect(html).toContain("品牌官网、展厅与商城在同一入口收口");
    expect(html).toContain("Launch Checklist / 商城上架准备度");
    expect(html).toContain("根首页已经开始承担“先解释、再导购、再转化”的正式任务");
    expect(html).toContain("精选陈列");
    expect(html).toContain("商详说服");
  });

  it("为四个品牌暴露独立 H5 入口映射，并允许品牌页接收运行时文案覆写", () => {
    expect(BRAND_SITE_RUNTIMES.lab.entryPath).toBe("/h5/lab");
    expect(BRAND_SITE_RUNTIMES.tech.entryPath).toBe("/h5/tech");
    expect(BRAND_SITE_RUNTIMES.astro.entryPath).toBe("/h5/astro");
    expect(BRAND_SITE_RUNTIMES.care.entryPath).toBe("/h5/care");

    const techHtml = renderToStaticMarkup(
      <HuanxiduoTechPage headline="品牌化技术终端" description="按品牌初始化后的技术站点文案。" />,
    );
    const careHtml = renderToStaticMarkup(
      <CareBrandPage headline="品牌化服务触点" description="按品牌初始化后的服务站点文案。" />,
    );

    expect(techHtml).toContain("品牌化技术终端");
    expect(techHtml).toContain("按品牌初始化后的技术站点文案。");
    expect(careHtml).toContain("品牌化服务触点");
    expect(careHtml).toContain("按品牌初始化后的服务站点文案。");
  });

  it("恢复浣星司 `/astro` 图像展厅首页，采用黑场 scroll-snap、高清商品图展陈与生态桥接语义", () => {
    setLocation("/astro");
    const html = renderToStaticMarkup(<AstroPage />);

    expect(html).toContain("浣星司 ASTRO");
    expect(html).toContain("Tempting Product Imagery / Exhibition Index");
    expect(html).toContain("View exhibition");
    expect(html).toContain("Enter commerce layer");
    expect(html).toContain("Image before explanation. Desire before specification.");
    expect(html).toContain("让浣星司不仅能展示");
    expect(html).toContain("诱人商品图挂载位");
    expect(html).toContain("商品落地页跳转挂载位");
    expect(html).toContain("Product Landing Hooks");
    expect(html).toContain("夜行香幕 / 商品详情挂载示例");
    expect(html).toContain('href="#astro-catalogue"');
    expect(html).toContain('href="/shop"');
    expect(html).toContain('href="/object/void-b03"');
    expect(html).toContain('href="/object/void-d05"');
    expect(html).toContain("snap-y snap-mandatory");
    expect(html).toContain("/manus-storage/BD-01-电商封面图（1080-1920）_19cf7f90.png");
    expect(html).toContain("/manus-storage/AP_Detail_Screen04_OlfactoryArchive_Raw_v5_228eed76.webp");
    expect(html).toContain("/manus-storage/AP_Detail_Screen03_VoidSetting_Raw_v3_e5514ed6.webp");
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
    expect(html).toContain("VIEW COMMERCE SHELF / 查看货架");
    expect(html).toContain("进入商城货架");
    expect(html).toContain("DOWNLOAD TDS / 下载 TDS");
    expect(html).toContain("/manus-storage/huanxiduo-hero-4k_a47d4dd9.jpg");
    expect(html).toContain("/manus-storage/huanxiduo-tds-placeholder_18e633bb.pdf");
    expect(html).not.toContain("data:image/jpeg;base64,");
    expect(html).not.toContain("data:application/pdf;base64,");
    expect(html).not.toContain("border border-white/10");
    expect(html).not.toContain("gap-px border");
  });

  it("恢复 Care 服务品牌页，具备服务说明、流程与跨站转化入口", () => {
    setLocation("/care");
    const html = renderToStaticMarkup(<CareBrandPage />);

    expect(html).toContain("酒店奢护服务品牌页");
    expect(html).toContain("服务型品牌页现在要讲清楚的三件事");
    expect(html).toContain("客房织物奢护");
    expect(html).toContain("从咨询到合作的服务链路");
    expect(html).toContain("查看解决方案母站");
    expect(html).toContain("查看可陈列商品货架");
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
