import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import {
  AllocationPage,
  ArchivePage,
  BINGZHU_ARCHIVE,
  BingzhuHeroPage,
  GatewayPage,
  LanternBuilderPage,
  LocaleRuntimeContext,
  LOCALE_PROFILES,
  resolveArchiveItem,
  resolveLocaleProfile,
} from "./App";

function setLocation(pathname = "/zh-cn/home") {
  Object.defineProperty(globalThis, "location", { value: new URL(`https://example.com${pathname}`), configurable: true });
}

function renderForLocale(locale: "zh-cn" | "en-us", node: React.ReactNode) {
  return renderToStaticMarkup(<LocaleRuntimeContext.Provider value={LOCALE_PROFILES[locale]}>{node}</LocaleRuntimeContext.Provider>);
}

describe("BINGZHU 严格地区单语前台", () => {
  beforeEach(() => setLocation());

  it("将中国大陆与全球入口分别锁定为 CNY 和 USD locale", () => {
    expect(resolveLocaleProfile("zh-cn")).toEqual(LOCALE_PROFILES["zh-cn"]);
    expect(resolveLocaleProfile("en-us")).toEqual(LOCALE_PROFILES["en-us"]);
    expect(resolveLocaleProfile("unsupported").currency).toBe("CNY");
  });

  it("仅在 Gateway 保留两种地区入口，以便用户显式选择语言与币种", () => {
    const html = renderToStaticMarkup(<GatewayPage />);
    expect(html).toContain("[ 中国大陆／简体中文／人民币 ¥ ]");
    expect(html).toContain("[ GLOBAL / ENGLISH / USD $ ]");
    expect(html).toContain("bz-media-canvas");
  });

  it("在中文地区渲染完整的中文首页，不泄漏英文说明性文本", () => {
    const html = renderForLocale("zh-cn", <BingzhuHeroPage />);
    expect(html).toContain("以香为礼");
    expect(html).toContain("一款签名香，安置于幽暗之中");
    expect(html).toContain("[ 菜单 ]");
    expect(html).toContain("[ 进入香气档案 ]");
    expect(html).toContain("15 毫升／50 毫升／沙盒演示");
    expect(html).not.toContain("A signature scent");
    expect(html).not.toContain("ENTER THE SCENT ARCHIVE");
    expect(html).toContain("FzPAlbOQiXnYLWpa.webp");
  });

  it("在全球地区渲染文化机构语境英文首页，不泄漏中文描述性文本", () => {
    setLocation("/en-us/home");
    const html = renderForLocale("en-us", <BingzhuHeroPage />);
    expect(html).toContain("Scent as offering.");
    expect(html).toContain("A signature scent, held in quiet darkness");
    expect(html).toContain("[ MENU ]");
    expect(html).toContain("[ ENTER THE SCENT ARCHIVE ]");
    expect(html).toContain("15 ML / 50 ML / SANDBOX");
    expect(html).not.toContain("以香为礼");
    expect(html).not.toContain("一款签名香");
    expect(html).not.toContain("[ 菜单 ]");
  });

  it("在中文地区以中文名录、器物资料和显现动作为货架语言", () => {
    const html = renderForLocale("zh-cn", <ArchivePage />);
    expect(html).toContain("香气不是货架");
    expect(html).toContain("探窗");
    expect(html).toContain("15 毫升／BZ-YL-03");
    expect(html).toContain("[ 显现 ]");
    expect(html).toContain("悬停或轻触名称，显现器物。");
    expect(html).not.toContain("Scent is not merchandise");
    expect(html).toContain("bz-directory-row");
  });

  it("在全球地区以英文名录、器物资料和显现动作为货架语言", () => {
    setLocation("/en-us/shop");
    const html = renderForLocale("en-us", <ArchivePage />);
    expect(html).toContain("Scent is not merchandise.");
    expect(html).toContain("WINDOW");
    expect(html).toContain("15 ML／BZ-YL-03");
    expect(html).toContain("[ REVEAL ]");
    expect(html).toContain("HOVER OR PRESS A NAME TO REVEAL THE OBJECT.");
    expect(html).not.toContain("香气不是货架");
    expect(html).not.toContain("探窗");
    expect(html).toContain("sEGYzeekNnzlfLVT.webp");
  });

  it("将预制款限制在15ml或50ml，并分别为中文和英文地区本地化灯笼定制与合规文本", () => {
    expect(BINGZHU_ARCHIVE.every((item) => item.volume === "15ml" || item.volume === "50ml")).toBe(true);
    expect(BINGZHU_ARCHIVE.map((item) => item.volume)).not.toContain("100ml");
    const zh = renderForLocale("zh-cn", <LanternBuilderPage />);
    const en = renderForLocale("en-us", <LanternBuilderPage />);
    expect(zh).toContain("冠部");
    expect(zh).toContain("瓶身画纸");
    expect(zh).toContain("UN1266 合规陆运");
    expect(zh).not.toContain("LANTERN COMMISSION");
    expect(en).toContain("LANTERN COMMISSION");
    expect(en).toContain("BODY WRAP");
    expect(en).toContain("UN1266 COMPLIANT GROUND ROUTING");
    expect(en).not.toContain("冠部");
  });

  it("在中文配额页展示中文规格、沙盒库存预占与UN1266提示", () => {
    setLocation("/zh-cn/allocation/tanchuang");
    const html = renderForLocale("zh-cn", <AllocationPage />);
    expect(html).toContain("15 毫升");
    expect(html).toContain("50 毫升");
    expect(html).toContain("沙盒演示／库存已预占／等待发货");
    expect(html).toContain("在沙盒中申请配额");
    expect(html).not.toContain("STOCK RESERVED");
  });

  it("在未知slug时安全回退到首个香气档案", () => {
    expect(resolveArchiveItem("missing-object")).toBe(BINGZHU_ARCHIVE[0]);
  });
});
