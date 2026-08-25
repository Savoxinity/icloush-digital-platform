import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import {
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
  Object.defineProperty(globalThis, "location", {
    value: new URL(`https://example.com${pathname}`),
    configurable: true,
  });
}

describe("BINGZHU 国际化策展前台", () => {
  beforeEach(() => setLocation());

  it("将亚洲和全球入口分别锁定为 CNY 与 USD locale", () => {
    expect(resolveLocaleProfile("zh-cn")).toEqual(LOCALE_PROFILES["zh-cn"]);
    expect(resolveLocaleProfile("en-us")).toEqual(LOCALE_PROFILES["en-us"]);
    expect(resolveLocaleProfile("unsupported").currency).toBe("CNY");
  });

  it("渲染无内容的国际化守门员与两个市场入口", () => {
    const html = renderToStaticMarkup(<GatewayPage />);
    expect(html).toContain("秉烛");
    expect(html).toContain("BINGZHU");
    expect(html).toContain("[ ENTER ASIA (CNY) ]");
    expect(html).toContain("[ ENTER GLOBAL (USD) ]");
    expect(html).toContain("/zh-cn/home");
    expect(html).toContain("/en-us/home");
  });

  it("渲染玄漆首屏神殿及中央品牌主张", () => {
    const html = renderToStaticMarkup(<BingzhuHeroPage />);
    expect(html).toContain("以文化新鲜感破局 · 以单品产品力封神");
    expect(html).toContain("HAPTIC FIELD / NO SOUND");
    expect(html).toContain("进入香气档案");
    expect(html).toContain("bz-haptic-field");
    expect(html).toContain("bz-hero-specimen");
    expect(html).toContain("BZ-YL-03");
  });

  it("渲染非网格化的香气档案名录与显影对象", () => {
    const html = renderToStaticMarkup(<ArchivePage />);
    expect(html).toContain("香气不是货架");
    expect(html).toContain("BZ-YL-03");
    expect(html).toContain("探窗 / 15ml");
    expect(html).toContain("BZ-JH-02");
    expect(html).toContain("贺兰荒骨 / 50ml");
    expect(html).toContain("Hover or touch a line");
    expect(html).toContain("REVEALED");
    expect(html).not.toContain("rounded-");
    expect(html).not.toContain("backdrop-blur");
  });

  it("提供三个模块组成的灯笼定制蓝图入口", () => {
    const html = renderToStaticMarkup(<LanternBuilderPage />);
    expect(html).toContain("THE LANTERN DIY BUILDER / CUSTOM SKU");
    expect(html).toContain("冠部 / HEAD");
    expect(html).toContain("瓶身画纸 / BODY");
    expect(html).toContain("底座 / BASE");
    expect(html).toContain("BUILD CUSTOM SKU");
  });

  it("在未知 slug 时安全回退到首个香气档案", () => {
    expect(resolveArchiveItem("missing-object")).toBe(BINGZHU_ARCHIVE[0]);
  });
});
