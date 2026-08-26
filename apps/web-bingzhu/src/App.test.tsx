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
  LOCALE_PROFILES,
  resolveArchiveItem,
  resolveLocaleProfile,
} from "./App";

function setLocation(pathname = "/zh-cn/home") {
  Object.defineProperty(globalThis, "location", { value: new URL(`https://example.com${pathname}`), configurable: true });
}

describe("BINGZHU 无框悬浮前台", () => {
  beforeEach(() => setLocation());

  it("将亚洲与全球入口分别锁定为 CNY 和 USD locale", () => {
    expect(resolveLocaleProfile("zh-cn")).toEqual(LOCALE_PROFILES["zh-cn"]);
    expect(resolveLocaleProfile("en-us")).toEqual(LOCALE_PROFILES["en-us"]);
    expect(resolveLocaleProfile("unsupported").currency).toBe("CNY");
  });

  it("渲染带方括号文本分流的全屏 Gateway", () => {
    const html = renderToStaticMarkup(<GatewayPage />);
    expect(html).toContain("秉烛");
    expect(html).toContain("BINGZHU");
    expect(html).toContain("[ ASIA PACIFIC / 简体中文 / CNY ¥ ]");
    expect(html).toContain("[ GLOBAL / ENGLISH / USD $ ]");
    expect(html).toContain("bz-media-canvas");
  });

  it("渲染用户提供器物渲染驱动的全屏首页与无图标导航", () => {
    const html = renderToStaticMarkup(<BingzhuHeroPage />);
    expect(html).toContain("FzPAlbOQiXnYLWpa.webp");
    expect(html).toContain("[ MENU ]");
    expect(html).toContain("[ BAG 0 ]");
    expect(html).toContain("以香为礼");
    expect(html).toContain("bz-hero-layout");
    expect(html).not.toContain("bz-nav-glyph");
    expect(html).not.toContain("bz-haptic-shelf");
  });

  it("渲染以无框文字目录控制全屏媒介显影的货架", () => {
    const html = renderToStaticMarkup(<ArchivePage />);
    expect(html).toContain("香气不是货架");
    expect(html).toContain("探窗");
    expect(html).toContain("15ml / BZ-YL-03");
    expect(html).toContain("贺兰荒骨");
    expect(html).toContain("50ml / BZ-JH-02");
    expect(html).toContain("[ REVEAL ]");
    expect(html).toContain("bz-directory-row");
    expect(html).toContain("sEGYzeekNnzlfLVT.webp");
    expect(html).not.toContain("rounded-");
    expect(html).not.toContain("backdrop-blur");
  });

  it("将全部预制款限制在15ml或50ml，并保留灯笼定制入口", () => {
    expect(BINGZHU_ARCHIVE.every((item) => item.volume === "15ml" || item.volume === "50ml")).toBe(true);
    expect(BINGZHU_ARCHIVE.map((item) => item.volume)).not.toContain("100ml");
    const html = renderToStaticMarkup(<LanternBuilderPage />);
    expect(html).toContain("冠部 / HEAD");
    expect(html).toContain("瓶身画纸 / BODY");
    expect(html).toContain("底座 / BASE");
    expect(html).toContain("UN1266 GROUND ROUTING");
  });

  it("在配额页展示15ml/50ml、Sandbox库存预占与UN1266陆运提示", () => {
    setLocation("/zh-cn/allocation/tanchuang");
    const html = renderToStaticMarkup(<AllocationPage />);
    expect(html).toContain("15ml");
    expect(html).toContain("50ml");
    expect(html).toContain("STOCK RESERVED");
    expect(html).toContain("AWAITING FULFILLMENT");
    expect(html).toContain("UN1266 / COMPLIANT GROUND ROUTING ONLY");
  });

  it("在未知slug时安全回退到首个香气档案", () => {
    expect(resolveArchiveItem("missing-object")).toBe(BINGZHU_ARCHIVE[0]);
  });
});
