import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Redirect, Route, Switch, useLocation } from "wouter";
import { trpc } from "./lib/trpc";

export type BingzhuLocale = "zh-cn" | "en-us";
type TextLanguage = "zh" | "en";
type LocalizedText = Record<TextLanguage, string>;

export type LocaleProfile = {
  locale: BingzhuLocale;
  currency: "CNY" | "USD";
  language: "zh-CN" | "en-US";
  textLanguage: TextLanguage;
  marketLabel: string;
  entryLabel: string;
};

export type BingzhuFragrance = {
  slug: string;
  code: string;
  name: LocalizedText;
  collection: LocalizedText;
  volume: "15ml" | "50ml";
  priceCny: number;
  priceUsd: number;
  accord: LocalizedText;
  formula: LocalizedText;
  narrative: LocalizedText;
  notes: readonly LocalizedText[];
};

type LocaleCopy = {
  brand: string;
  menu: string;
  close: string;
  bag: string;
  home: string;
  directory: string;
  lantern: string;
  chooseMarket: string;
  marketCoordinate: string;
  heroEyebrow: string;
  heroTitle: string;
  enterDirectory: string;
  heroTopLeft: string;
  heroBottomLeft: string;
  heroBottomRight: string;
  archiveEyebrow: string;
  archiveTitle: string;
  archiveInstruction: string;
  reveal: string;
  view: string;
  openArchive: string;
  requestAllocation: string;
  returnDirectory: string;
  allocationEyebrow: string;
  allocationTitle: string;
  sandboxLine: string;
  requestSandbox: string;
  confirming: string;
  unavailable: string;
  routingLabel: string;
  groundDelivery: string;
  instantPickup: string;
  regionPlaceholder: string;
  sandboxSuccess: (orderNo: string) => string;
  sandboxError: string;
  builderEyebrow: string;
  builderTitle: string;
  builderNarrative: string;
  customEstimate: string;
  buildCustomSku: string;
  bagEyebrow: string;
  bagTitle: string;
  openDirectory: string;
  mediaAlt: string;
};

export const LOCALE_PROFILES: Record<BingzhuLocale, LocaleProfile> = {
  "zh-cn": {
    locale: "zh-cn",
    currency: "CNY",
    language: "zh-CN",
    textLanguage: "zh",
    marketLabel: "中国大陆／人民币",
    entryLabel: "中国大陆／简体中文／人民币 ¥",
  },
  "en-us": {
    locale: "en-us",
    currency: "USD",
    language: "en-US",
    textLanguage: "en",
    marketLabel: "GLOBAL / USD",
    entryLabel: "GLOBAL / ENGLISH / USD $",
  },
};

const LOCALE_COPY: Record<TextLanguage, LocaleCopy> = {
  zh: {
    brand: "秉烛",
    menu: "菜单",
    close: "关闭",
    bag: "配额袋",
    home: "首页",
    directory: "香气档案",
    lantern: "灯笼定制",
    chooseMarket: "选择地区与货币",
    marketCoordinate: "选择你的香气坐标。",
    heroEyebrow: "一款签名香，安置于幽暗之中",
    heroTitle: "以香为礼\n以器为证。",
    enterDirectory: "进入香气档案",
    heroTopLeft: "秉烛／感官器物／2026",
    heroBottomLeft: "15 毫升／50 毫升／沙盒演示",
    heroBottomRight: "UN1266／仅限合规陆运",
    archiveEyebrow: "香气档案／中国大陆／人民币",
    archiveTitle: "香气不是货架。\n是一种压迫感。",
    archiveInstruction: "悬停或轻触名称，显现器物。",
    reveal: "显现",
    view: "查看",
    openArchive: "打开档案",
    requestAllocation: "申请配额",
    returnDirectory: "返回香气档案",
    allocationEyebrow: "配额申请／沙盒演示／人民币",
    allocationTitle: "为一件香气\n留出位置。",
    sandboxLine: "沙盒演示／库存已预占／等待发货\nUN1266／仅限合规陆运",
    requestSandbox: "在沙盒中申请配额",
    confirming: "正在确认",
    unavailable: "暂不可用",
    routingLabel: "UN1266／合规运输方式",
    groundDelivery: "合规陆运",
    instantPickup: "即时自提／需复核",
    regionPlaceholder: "配送区域摘要",
    sandboxSuccess: (orderNo) => `沙盒支付已成功／库存已预占／订单 ${orderNo}／等待发货／将按 UN1266 合规规则调度。`,
    sandboxError: "本次沙盒配额申请未能完成，请稍后再次尝试。",
    builderEyebrow: "灯笼定制／自定义编号／沙盒演示",
    builderTitle: "把一盏灯\n组装成你的气味。",
    builderNarrative: "冠部、瓶身画纸与底座将作为不可变快照写入沙盒订单。",
    customEstimate: "预计定制价格／人民币／UN1266 合规陆运",
    buildCustomSku: "生成定制编号",
    bagEyebrow: "配额袋／沙盒演示／人民币",
    bagTitle: "配额袋仍是空的。",
    openDirectory: "打开香气档案",
    mediaAlt: "秉烛香器渲染",
  },
  en: {
    brand: "BINGZHU",
    menu: "MENU",
    close: "CLOSE",
    bag: "BAG",
    home: "HOME",
    directory: "SCENT ARCHIVE",
    lantern: "LANTERN COMMISSION",
    chooseMarket: "SELECT REGION AND CURRENCY",
    marketCoordinate: "Select your coordinate of scent.",
    heroEyebrow: "A signature scent, held in quiet darkness",
    heroTitle: "Scent as offering.\nObject as witness.",
    enterDirectory: "ENTER THE SCENT ARCHIVE",
    heroTopLeft: "BINGZHU / SENSORY OBJECTS / 2026",
    heroBottomLeft: "15 ML / 50 ML / SANDBOX",
    heroBottomRight: "UN1266 / COMPLIANT GROUND ROUTING",
    archiveEyebrow: "SCENT ARCHIVE / GLOBAL / USD",
    archiveTitle: "Scent is not merchandise.\nIt is an atmosphere of command.",
    archiveInstruction: "HOVER OR PRESS A NAME TO REVEAL THE OBJECT.",
    reveal: "REVEAL",
    view: "VIEW",
    openArchive: "OPEN ARCHIVE",
    requestAllocation: "REQUEST ALLOCATION",
    returnDirectory: "RETURN TO ARCHIVE",
    allocationEyebrow: "ALLOCATION REQUEST / SANDBOX / USD",
    allocationTitle: "Reserve a place\nfor one scent object.",
    sandboxLine: "SANDBOX / STOCK RESERVED / AWAITING FULFILMENT\nUN1266 / COMPLIANT GROUND ROUTING ONLY",
    requestSandbox: "REQUEST IN SANDBOX",
    confirming: "CONFIRMING",
    unavailable: "UNAVAILABLE",
    routingLabel: "UN1266 / COMPLIANT ROUTING",
    groundDelivery: "COMPLIANT GROUND DELIVERY",
    instantPickup: "IMMEDIATE COLLECTION / REVIEW REQUIRED",
    regionPlaceholder: "DELIVERY REGION",
    sandboxSuccess: (orderNo) => `SANDBOX PAYMENT CONFIRMED / STOCK RESERVED / ORDER ${orderNo} / AWAITING FULFILMENT / UN1266 COMPLIANT ROUTING APPLIED.`,
    sandboxError: "THE SANDBOX ALLOCATION COULD NOT BE CONFIRMED. PLEASE TRY AGAIN SHORTLY.",
    builderEyebrow: "LANTERN COMMISSION / CUSTOM IDENTIFIER / SANDBOX",
    builderTitle: "Compose a lantern\ninto your own scent object.",
    builderNarrative: "Head, body wrap and base are preserved as an immutable record within the Sandbox order.",
    customEstimate: "ESTIMATED COMMISSION / USD / UN1266 COMPLIANT GROUND ROUTING",
    buildCustomSku: "CREATE CUSTOM IDENTIFIER",
    bagEyebrow: "BAG / SANDBOX / USD",
    bagTitle: "The allocation bag remains empty.",
    openDirectory: "OPEN SCENT ARCHIVE",
    mediaAlt: "BINGZHU scent object rendering",
  },
};

export const BINGZHU_ARCHIVE: readonly BingzhuFragrance[] = [
  {
    slug: "tanchuang",
    code: "BZ-YL-03",
    name: { zh: "探窗", en: "WINDOW" },
    collection: { zh: "夜历", en: "NIGHT ALMANAC" },
    volume: "15ml",
    priceCny: 198,
    priceUsd: 28,
    accord: { zh: "宣纸冷雾／老木窗棂／晚熟柚皮", en: "Paper mist / aged windowwood / late-ripened pomelo peel" },
    formula: { zh: "纸纤维／冷树脂／柑橘灰", en: "PAPER FIBRE / COOL RESIN / CITRUS ASH" },
    narrative: { zh: "夜里推开一扇窗。雨气穿过宣纸与旧木的缝隙，留下柔和、清醒的柚皮气息。", en: "A window opens after dark. Rain slips through paper and aged timber, leaving the lucid softness of pomelo peel." },
    notes: [{ zh: "冷雾", en: "cool mist" }, { zh: "宣纸", en: "paper" }, { zh: "柚皮", en: "pomelo peel" }, { zh: "柏木", en: "cypress" }],
  },
  {
    slug: "helan-bone",
    code: "BZ-JH-02",
    name: { zh: "贺兰荒骨", en: "HELANS" },
    collection: { zh: "戈壁纪事", en: "DESERT CHRONICLE" },
    volume: "50ml",
    priceCny: 980,
    priceUsd: 136,
    accord: { zh: "晒热石膏／枯盐草／焚香灰", en: "Sun-warmed gypsum / salt grass / incense ash" },
    formula: { zh: "石膏尘／旱草／香灰", en: "GYPSUM DUST / DRY GRASS / INCENSE ASH" },
    narrative: { zh: "风将岩层与草根整理成静默的矿物秩序；日落后，只剩近乎无情的留白。", en: "Wind arranges strata and roots into a mineral order. After sunset, only a nearly merciless reserve remains." },
    notes: [{ zh: "石膏", en: "gypsum" }, { zh: "盐草", en: "salt grass" }, { zh: "乳香灰", en: "olibanum ash" }, { zh: "龙涎木", en: "agarwood" }],
  },
  {
    slug: "shan-lan",
    code: "BZ-CL-07",
    name: { zh: "山岚", en: "MOUNTAIN VEIL" },
    collection: { zh: "雾中物", en: "OBJECTS IN MIST" },
    volume: "15ml",
    priceCny: 258,
    priceUsd: 36,
    accord: { zh: "湿石／茶气／白玉兰未开时", en: "Wet stone / tea vapour / unopened magnolia" },
    formula: { zh: "湿石／茶汽／玉兰蕾", en: "WET STONE / TEA VAPOUR / MAGNOLIA BUD" },
    narrative: { zh: "雨水停在岩面，茶气像一层薄纸，遮住白玉兰尚未开放的部分。", en: "Rain lingers on stone. Tea vapour lies like fine paper over a magnolia still held in reserve." },
    notes: [{ zh: "湿石", en: "wet stone" }, { zh: "茶气", en: "tea vapour" }, { zh: "玉兰蕾", en: "magnolia bud" }, { zh: "麝香", en: "musk" }],
  },
  {
    slug: "song-deng",
    code: "BZ-DX-01",
    name: { zh: "松灯", en: "PINE LAMP" },
    collection: { zh: "灯下录", en: "LANTERN STUDIES" },
    volume: "50ml",
    priceCny: 1080,
    priceUsd: 150,
    accord: { zh: "松脂火焰／墨烟／冷金属", en: "Pine resin flame / ink smoke / cool metal" },
    formula: { zh: "松脂／墨烟／冷金属", en: "PINE RESIN / INK SMOKE / COLD METAL" },
    narrative: { zh: "一盏灯把松脂、纸面与金属固定在温暖的低光里，留下缓慢而清晰的尾韵。", en: "A single lamp holds resin, paper and metal in warm low light, leaving a slow and lucid trail." },
    notes: [{ zh: "松脂", en: "pine resin" }, { zh: "墨烟", en: "ink smoke" }, { zh: "冷金属", en: "cool metal" }, { zh: "安息香", en: "benzoin" }],
  },
] as const;

const MARKET_STORAGE_KEY = "bingzhu:market";
const BINGZHU_MEDIA = {
  hero: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663034474299/FzPAlbOQiXnYLWpa.webp",
  tanchuang: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663034474299/sEGYzeekNnzlfLVT.webp",
  "helan-bone": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663034474299/pYaBVjKgjmEpFKbm.webp",
  "shan-lan": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663034474299/TQyGhVgDWkAlAqbI.webp",
  "song-deng": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663034474299/zmmbiBAqgyWrTYaF.webp",
  lantern: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663034474299/QGkGoozwIxKzPPpp.webp",
} as const;

export const LocaleRuntimeContext = createContext<LocaleProfile>(LOCALE_PROFILES["zh-cn"]);

export function resolveLocaleProfile(locale?: string | null): LocaleProfile {
  return locale === "en-us" ? LOCALE_PROFILES["en-us"] : LOCALE_PROFILES["zh-cn"];
}
export function resolveArchiveItem(slug?: string | null): BingzhuFragrance {
  return BINGZHU_ARCHIVE.find((item) => item.slug === slug) ?? BINGZHU_ARCHIVE[0];
}
export function formatBingzhuPrice(item: BingzhuFragrance, profile: LocaleProfile) {
  return new Intl.NumberFormat(profile.currency === "USD" ? "en-US" : "zh-CN", { style: "currency", currency: profile.currency, maximumFractionDigits: 0 }).format(profile.currency === "USD" ? item.priceUsd : item.priceCny);
}

function formatMinorCurrency(amount: number, currency: "CNY" | "USD") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "zh-CN", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount / 100);
}
function useLocaleRuntime() { return useContext(LocaleRuntimeContext); }
function useLocaleCopy() { return LOCALE_COPY[useLocaleRuntime().textLanguage]; }
function localized(value: LocalizedText, profile: LocaleProfile) { return value[profile.textLanguage]; }
function routeLocale(pathname: string): BingzhuLocale { return pathname.split("/")[1] === "en-us" ? "en-us" : "zh-cn"; }
function rememberMarket(locale: BingzhuLocale) { if (typeof window !== "undefined") window.localStorage.setItem(MARKET_STORAGE_KEY, locale); }
function mediaFor(slug: string) { return BINGZHU_MEDIA[slug as keyof typeof BINGZHU_MEDIA] ?? BINGZHU_MEDIA.hero; }
function displayVolume(volume: "15ml" | "50ml", profile: LocaleProfile) { return profile.textLanguage === "zh" ? volume.replace("ml", " 毫升") : volume.replace("ml", " ML"); }

function MediaCanvas({ src, alt, emphasis = "balanced" }: { src: string; alt: string; emphasis?: "balanced" | "left" | "right" }) {
  return <div className={`bz-media-canvas bz-media-${emphasis}`} aria-hidden="true"><img src={src} alt={alt} className="bz-media-image" /><div className="bz-media-shade" /></div>;
}

function BrandMark({ href }: { href: string }) {
  const copy = useLocaleCopy();
  return <Link href={href} className="bz-brandmark" aria-label={copy.home}>{copy.brand}</Link>;
}

function MarketChoice({ locale, onChoose }: { locale: BingzhuLocale; onChoose: (locale: BingzhuLocale) => void }) {
  return <button type="button" className="bz-market-choice" onClick={() => onChoose(locale)}>[ {LOCALE_PROFILES[locale].entryLabel} ]</button>;
}

function BingzhuNavigation() {
  const profile = useLocaleRuntime();
  const copy = useLocaleCopy();
  const [menuOpen, setMenuOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [, setLocation] = useLocation();
  const prefix = `/${profile.locale}`;
  const chooseMarket = (locale: BingzhuLocale) => { rememberMarket(locale); setMarketOpen(false); setLocation(`/${locale}/home`); };
  return <>
    <header className="bz-navigation">
      <button type="button" className="bz-nav-action" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>[ {menuOpen ? copy.close : copy.menu} ]</button>
      <BrandMark href={`${prefix}/home`} />
      <div className="bz-nav-right"><Link href={`${prefix}/bag`} className="bz-nav-action">[ {copy.bag} 0 ]</Link><button type="button" className="bz-nav-action" onClick={() => setMarketOpen(true)}>[ {profile.currency === "CNY" ? "人民币／中文" : "USD / EN"} ]</button></div>
    </header>
    {menuOpen ? <aside className="bz-menu" aria-label={copy.menu}><p className="bz-microcopy">{copy.directory}／{profile.marketLabel}</p><nav><Link href={`${prefix}/home`} onClick={() => setMenuOpen(false)}>[ {copy.home} ]</Link><Link href={`${prefix}/shop`} onClick={() => setMenuOpen(false)}>[ {copy.directory} ]</Link><Link href={`${prefix}/lantern`} onClick={() => setMenuOpen(false)}>[ {copy.lantern} ]</Link><Link href={`${prefix}/bag`} onClick={() => setMenuOpen(false)}>[ {copy.bag} ]</Link></nav></aside> : null}
    {marketOpen ? <section className="bz-market-overlay" aria-label={copy.chooseMarket}><button type="button" className="bz-overlay-close" onClick={() => setMarketOpen(false)}>[ {copy.close} ]</button><div className="bz-market-overlay-center"><p className="bz-microcopy">{copy.chooseMarket}</p><h2>{copy.marketCoordinate}</h2><MarketChoice locale="zh-cn" onChoose={chooseMarket} /><MarketChoice locale="en-us" onChoose={chooseMarket} /></div></section> : null}
  </>;
}

export function HapticShelf({ item, revealed = false, className = "", onReveal }: { item: BingzhuFragrance; revealed?: boolean; className?: string; onReveal?: () => void }) {
  const profile = useLocaleRuntime();
  const copy = useLocaleCopy();
  return <div className={`bz-floating-media ${revealed ? "is-revealed" : ""} ${className}`} onPointerEnter={onReveal} onPointerDown={onReveal}><MediaCanvas src={mediaFor(item.slug)} alt={copy.mediaAlt} /><div className="bz-floating-caption"><span>{item.code}</span><b>{localized(item.name, profile)}</b><small>{displayVolume(item.volume, profile)}／{localized(item.formula, profile)}</small></div></div>;
}

export function GatewayPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("market") === "choose") return;
    const remembered = typeof window === "undefined" ? null : window.localStorage.getItem(MARKET_STORAGE_KEY);
    if (remembered === "zh-cn" || remembered === "en-us") setLocation(`/${remembered}/home`, { replace: true });
  }, [setLocation]);
  const chooseMarket = (locale: BingzhuLocale) => { rememberMarket(locale); setLocation(`/${locale}/home`); };
  return <main className="bz-gateway bz-immersive"><MediaCanvas src={BINGZHU_MEDIA.lantern} alt="BINGZHU" emphasis="right" /><div className="bz-gateway-center bz-layer"><div className="bz-gateway-mark">BINGZHU</div><nav aria-label="MARKET SELECTION"><MarketChoice locale="zh-cn" onChoose={chooseMarket} /><MarketChoice locale="en-us" onChoose={chooseMarket} /></nav></div></main>;
}

export function BingzhuHeroPage() {
  const profile = useLocaleRuntime();
  const copy = useLocaleCopy();
  return <main className="bz-immersive bz-hero-page"><MediaCanvas src={BINGZHU_MEDIA.hero} alt={copy.mediaAlt} emphasis="right" /><BingzhuNavigation /><section className="bz-hero-layout bz-layer"><p className="bz-corner bz-corner-top-left">{copy.heroTopLeft}</p><div className="bz-hero-statement"><p className="bz-microcopy">{copy.heroEyebrow}</p><h1>{copy.heroTitle.split("\n").map((line, index) => <React.Fragment key={line}>{line}{index === 0 ? <br /> : null}</React.Fragment>)}</h1><Link href={`/${profile.locale}/shop`} className="bz-plain-link">[ {copy.enterDirectory} ]</Link></div><p className="bz-corner bz-corner-bottom-left">{copy.heroBottomLeft}</p><p className="bz-corner bz-corner-bottom-right">{copy.heroBottomRight}</p></section></main>;
}

export function ArchivePage() {
  const profile = useLocaleRuntime();
  const copy = useLocaleCopy();
  const [activeSlug, setActiveSlug] = useState(BINGZHU_ARCHIVE[0].slug);
  const activeItem = resolveArchiveItem(activeSlug);
  const activate = (slug: string) => setActiveSlug(slug);
  return <main className="bz-immersive bz-archive-page"><MediaCanvas src={mediaFor(activeItem.slug)} alt={copy.mediaAlt} emphasis="right" /><BingzhuNavigation /><section className="bz-archive-layout bz-layer flex flex-col lg:flex-row" aria-labelledby="archive-title"><div className="bz-directory-copy"><p className="bz-microcopy">{copy.archiveEyebrow}</p><h1 id="archive-title">{copy.archiveTitle.split("\n").map((line, index) => <React.Fragment key={line}>{line}{index === 0 ? <br /> : null}</React.Fragment>)}</h1><p className="bz-directory-instruction">{copy.archiveInstruction}</p></div><div className="bz-directory-list" role="list" aria-label={copy.directory}>{BINGZHU_ARCHIVE.map((item, index) => { const active = item.slug === activeSlug; return <button type="button" role="listitem" className={`bz-directory-row ${active ? "is-active" : ""}`} key={item.slug} onMouseEnter={() => activate(item.slug)} onFocus={() => activate(item.slug)} onPointerDown={() => activate(item.slug)} onClick={() => activate(item.slug)} aria-pressed={active}><span>{String(index + 1).padStart(2, "0")}</span><b>{localized(item.name, profile)}</b><small>{displayVolume(item.volume, profile)}／{item.code}</small><em>[ {active ? copy.reveal : copy.view} ]</em></button>; })}</div><div className="bz-directory-object"><p className="bz-microcopy">{localized(activeItem.collection, profile)}／{localized(activeItem.formula, profile)}</p><h2>{localized(activeItem.name, profile)}</h2><p>{localized(activeItem.accord, profile)}</p><Link href={`/${profile.locale}/objects/${activeItem.slug}`} className="bz-plain-link">[ {copy.openArchive} ]</Link></div></section></main>;
}

function ImmersiveDetail({ item, children }: { item: BingzhuFragrance; children: ReactNode }) {
  const copy = useLocaleCopy();
  return <main className="bz-immersive bz-detail-page"><MediaCanvas src={mediaFor(item.slug)} alt={copy.mediaAlt} emphasis="right" /><BingzhuNavigation /><section className="bz-detail-layout bz-layer">{children}</section></main>;
}

export function ArchiveObjectPage() {
  const profile = useLocaleRuntime();
  const copy = useLocaleCopy();
  const [pathname] = useLocation();
  const item = resolveArchiveItem(pathname.split("/").at(-1));
  return <ImmersiveDetail item={item}><div className="bz-detail-copy"><p className="bz-microcopy">{localized(item.collection, profile)}／{item.code}／{displayVolume(item.volume, profile)}</p><h1>{localized(item.name, profile)}</h1><p className="bz-detail-price">{formatBingzhuPrice(item, profile)}</p><p>{localized(item.narrative, profile)}</p><p className="bz-microcopy">{localized(item.formula, profile)}<br />{item.notes.map((note) => localized(note, profile)).join(profile.textLanguage === "zh" ? "／" : " / ")}</p><div className="bz-detail-actions"><Link href={`/${profile.locale}/allocation/${item.slug}`} className="bz-plain-link">[ {copy.requestAllocation} ]</Link><Link href={`/${profile.locale}/shop`} className="bz-plain-link">[ {copy.returnDirectory} ]</Link></div></div></ImmersiveDetail>;
}

export function AllocationPage() {
  const profile = useLocaleRuntime();
  const copy = useLocaleCopy();
  const [pathname] = useLocation();
  const item = resolveArchiveItem(pathname.split("/").at(-1));
  const [volume, setVolume] = useState<"15ml" | "50ml">(item.volume);
  return <ImmersiveDetail item={item}><div className="bz-detail-copy bz-allocation-copy"><p className="bz-microcopy">{copy.allocationEyebrow}</p><h1>{copy.allocationTitle.split("\n").map((line, index) => <React.Fragment key={line}>{line}{index === 0 ? <br /> : null}</React.Fragment>)}</h1><p>{localized(item.name, profile)}／{item.code}／{formatBingzhuPrice({ ...item, volume }, profile)}</p><div className="bz-volume-selector">{(["15ml", "50ml"] as const).map((candidate) => <button key={candidate} type="button" className={volume === candidate ? "is-selected" : ""} onClick={() => setVolume(candidate)}>[ {displayVolume(candidate, profile)} ]</button>)}</div><p className="bz-microcopy">{copy.sandboxLine.split("\n").map((line, index) => <React.Fragment key={line}>{line}{index === 0 ? <br /> : null}</React.Fragment>)}</p><button type="button" className="bz-plain-link">[ {copy.requestSandbox} ]</button></div></ImmersiveDetail>;
}

function ConnectedAllocationPage() {
  const profile = useLocaleRuntime();
  const copy = useLocaleCopy();
  const [pathname] = useLocation();
  const catalog = trpc.bingzhu.catalog.useQuery();
  const createOrder = trpc.retail.createRetailOrder.useMutation();
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"ground_delivery" | "instant_pickup">("ground_delivery");
  const [recipientRegion, setRecipientRegion] = useState("");
  const slug = pathname.split("/").at(-1) ?? "";
  const brandId = catalog.data?.brandId ?? null;
  const product = catalog.data?.products.find((item) => item.slug === slug) ?? null;
  const selectableSkus = product?.skus.filter((sku) => ["15ml", "50ml"].includes(sku.packSize ?? "") && (profile.currency === "CNY" || sku.priceUsd !== null)) ?? [];
  const selectedSku = selectableSkus.find((sku) => sku.id === selectedSkuId) ?? selectableSkus[0] ?? null;
  useEffect(() => { setSelectedSkuId(selectableSkus[0]?.id ?? null); setResultText(null); }, [profile.currency, product?.id]);
  if (!product || !brandId) return <AllocationPage />;
  const fallback = resolveArchiveItem(slug);
  const amount = selectedSku ? (profile.currency === "USD" ? selectedSku.priceUsd : selectedSku.basePriceCny) : null;
  const requestAllocation = () => {
    if (!selectedSku || amount === null) return;
    createOrder.mutate({ brandId, items: [{ productId: product.id, skuId: selectedSku.id, quantity: 1 }], gateway: "wechat_pay_v3", currency: profile.currency, logistics: { fulfillmentMethod, recipientRegion: recipientRegion || null }, origin: window.location.origin }, { onSuccess: (response) => setResultText(copy.sandboxSuccess(response.order.orderNo)), onError: () => setResultText(copy.sandboxError) });
  };
  return <ImmersiveDetail item={fallback}><div className="bz-detail-copy bz-allocation-copy"><p className="bz-microcopy">{copy.allocationEyebrow}</p><h1>{copy.allocationTitle.split("\n").map((line, index) => <React.Fragment key={line}>{line}{index === 0 ? <br /> : null}</React.Fragment>)}</h1><p>{localized(fallback.name, profile)}／{fallback.code}</p><div className="bz-volume-selector">{selectableSkus.map((sku) => <button type="button" key={sku.id} className={selectedSku?.id === sku.id ? "is-selected" : ""} onClick={() => setSelectedSkuId(sku.id)}>[ {displayVolume(sku.packSize as "15ml" | "50ml", profile)} ]</button>)}</div><p>{amount === null ? copy.unavailable : formatMinorCurrency(amount, profile.currency)}</p><label className="bz-transparent-field"><span>{copy.routingLabel}</span><select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as "ground_delivery" | "instant_pickup")}><option value="ground_delivery">{copy.groundDelivery}</option><option value="instant_pickup">{copy.instantPickup}</option></select><input value={recipientRegion} onChange={(event) => setRecipientRegion(event.target.value)} placeholder={copy.regionPlaceholder} /></label><button type="button" className="bz-plain-link" disabled={!selectedSku || createOrder.isPending} onClick={requestAllocation}>[ {createOrder.isPending ? copy.confirming : copy.requestSandbox} ]</button>{resultText ? <p className="bz-request-status" role="status">{resultText}</p> : null}</div></ImmersiveDetail>;
}

function getBuilderSteps(profile: LocaleProfile) {
  const text = profile.textLanguage;
  return [
    { id: "HEAD", title: text === "zh" ? "冠部" : "HEAD", options: text === "zh" ? ["嫩戗飞檐盖头", "博山炉冠"] : ["Upturned-eave cap", "Boshan crown"] },
    { id: "BODY_WRAP", title: text === "zh" ? "瓶身画纸" : "BODY WRAP", options: text === "zh" ? ["探窗宣纸画纸", "冷雾矿物画纸"] : ["Window paper wrap", "Cool-mineral paper wrap"] },
    { id: "BASE", title: text === "zh" ? "底座" : "BASE", options: text === "zh" ? ["挂环与流苏", "黑瓷悬挂座"] : ["Hanging ring and tassel", "Black ceramic suspension base"] },
  ] as const;
}

export function LanternBuilderPage() {
  const profile = useLocaleRuntime();
  const copy = useLocaleCopy();
  const steps = getBuilderSteps(profile);
  const [selected, setSelected] = useState<Record<string, string>>({ HEAD: steps[0].options[0], BODY_WRAP: steps[1].options[0], BASE: steps[2].options[0] });
  useEffect(() => { setSelected({ HEAD: steps[0].options[0], BODY_WRAP: steps[1].options[0], BASE: steps[2].options[0] }); }, [profile.locale]);
  return <main className="bz-immersive bz-builder-page"><MediaCanvas src={BINGZHU_MEDIA.lantern} alt={copy.mediaAlt} emphasis="right" /><BingzhuNavigation /><section className="bz-builder-layout bz-layer flex flex-col lg:flex-row"><div><p className="bz-microcopy">{copy.builderEyebrow}</p><h1>{copy.builderTitle.split("\n").map((line, index) => <React.Fragment key={line}>{line}{index === 0 ? <br /> : null}</React.Fragment>)}</h1><p>{copy.builderNarrative}</p></div><div className="bz-builder-options">{steps.map((step) => <fieldset key={step.id}><legend>{step.title}</legend>{step.options.map((option) => <label key={option}><input type="radio" name={step.id} checked={selected[step.id] === option} onChange={() => setSelected((current) => ({ ...current, [step.id]: option }))} /><span>{option}</span></label>)}</fieldset>)}<p className="bz-microcopy">{copy.customEstimate}</p><button type="button" className="bz-plain-link">[ {copy.buildCustomSku} ]</button></div></section></main>;
}

export function BagPage() {
  const profile = useLocaleRuntime();
  const copy = useLocaleCopy();
  return <main className="bz-immersive bz-bag-page"><MediaCanvas src={BINGZHU_MEDIA.lantern} alt={copy.mediaAlt} emphasis="right" /><BingzhuNavigation /><section className="bz-empty-bag bz-layer"><p className="bz-microcopy">{copy.bagEyebrow}</p><h1>{copy.bagTitle}</h1><Link href={`/${profile.locale}/shop`} className="bz-plain-link">[ {copy.openDirectory} ]</Link></section></main>;
}

function LocaleLandingRedirect() { return <Redirect to={`/${useLocaleRuntime().locale}/home`} />; }
function LocaleRuntime({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();
  const profile = useMemo(() => resolveLocaleProfile(routeLocale(pathname)), [pathname]);
  useEffect(() => { document.documentElement.lang = profile.language; document.documentElement.dataset.locale = profile.locale; document.documentElement.dataset.currency = profile.currency; document.title = profile.locale === "zh-cn" ? "秉烛｜香气档案" : "BINGZHU | Scent Archive"; rememberMarket(profile.locale); }, [profile]);
  return <LocaleRuntimeContext.Provider value={profile}>{children}</LocaleRuntimeContext.Provider>;
}
function BingzhuRouter() { return <Switch><Route path="/" component={GatewayPage} /><Route path="/:locale/home" component={BingzhuHeroPage} /><Route path="/:locale/shop" component={ArchivePage} /><Route path="/:locale/objects/:slug" component={ArchiveObjectPage} /><Route path="/:locale/allocation/:slug" component={ConnectedAllocationPage} /><Route path="/:locale/lantern" component={LanternBuilderPage} /><Route path="/:locale/bag" component={BagPage} /><Route path="/:locale" component={LocaleLandingRedirect} /><Route component={GatewayPage} /></Switch>; }
export default function App() { return <LocaleRuntime><BingzhuRouter /></LocaleRuntime>; }
