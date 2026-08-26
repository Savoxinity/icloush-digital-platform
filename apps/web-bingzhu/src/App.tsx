import React, { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, Redirect, Route, Switch, useLocation } from "wouter";
import { trpc } from "./lib/trpc";

export type BingzhuLocale = "zh-cn" | "en-us";

export type LocaleProfile = {
  locale: BingzhuLocale;
  currency: "CNY" | "USD";
  language: "zh-CN" | "en-US";
  marketLabel: string;
  entryLabel: string;
};

export type BingzhuFragrance = {
  slug: string;
  code: string;
  name: string;
  nameEn: string;
  collection: string;
  volume: "15ml" | "50ml";
  priceCny: number;
  priceUsd: number;
  accord: string;
  formula: string;
  narrative: string;
  notes: readonly string[];
};

export const LOCALE_PROFILES: Record<BingzhuLocale, LocaleProfile> = {
  "zh-cn": { locale: "zh-cn", currency: "CNY", language: "zh-CN", marketLabel: "ASIA PACIFIC / CNY", entryLabel: "简体中文 / CNY ¥" },
  "en-us": { locale: "en-us", currency: "USD", language: "en-US", marketLabel: "GLOBAL / USD", entryLabel: "ENGLISH / USD $" },
};

export const BINGZHU_ARCHIVE: readonly BingzhuFragrance[] = [
  { slug: "tanchuang", code: "BZ-YL-03", name: "探窗", nameEn: "WINDOW / 03", collection: "夜历 / NIGHT ALMANAC", volume: "15ml", priceCny: 198, priceUsd: 28, accord: "宣纸冷雾 · 老木窗棂 · 晚熟柚皮", formula: "PAPER FIBRE / COOL RESIN / CITRUS ASH", narrative: "夜里推开一扇窗。雨气穿过宣纸与旧木的缝隙，留下柔和、清醒的柚皮气息。", notes: ["冷雾", "宣纸", "柚皮", "柏木"] },
  { slug: "helan-bone", code: "BZ-JH-02", name: "贺兰荒骨", nameEn: "HELANS / 02", collection: "戈壁纪事 / DESERT CHRONICLE", volume: "50ml", priceCny: 980, priceUsd: 136, accord: "晒热石膏 · 枯盐草 · 焚香灰", formula: "GYPSUM DUST / DRY GRASS / INCENSE ASH", narrative: "风将岩层与草根整理成静默的矿物秩序；日落后，只剩近乎无情的留白。", notes: ["石膏", "盐草", "乳香灰", "龙涎木"] },
  { slug: "shan-lan", code: "BZ-CL-07", name: "山岚", nameEn: "MOUNTAIN VEIL / 07", collection: "雾中物 / OBJECTS IN MIST", volume: "15ml", priceCny: 258, priceUsd: 36, accord: "湿石 · 茶气 · 白玉兰未开时", formula: "WET STONE / TEA VAPOUR / MAGNOLIA BUD", narrative: "雨水停在岩面，茶气像一层薄纸，遮住白玉兰尚未开放的部分。", notes: ["湿石", "茶气", "玉兰蕾", "麝香"] },
  { slug: "song-deng", code: "BZ-DX-01", name: "松灯", nameEn: "PINE LAMP / 01", collection: "灯下录 / LANTERN STUDIES", volume: "50ml", priceCny: 1080, priceUsd: 150, accord: "松脂火焰 · 墨烟 · 冷金属", formula: "PINE RESIN / INK SMOKE / COLD METAL", narrative: "一盏灯把松脂、纸面与金属固定在温暖的低光里，留下缓慢而清晰的尾韵。", notes: ["松脂", "墨烟", "冷金属", "安息香"] },
] as const;

const MARKET_STORAGE_KEY = "bingzhu:market";
const PRODUCT_IMAGE = "/manus-storage/bingzhu-foundation-bottle-white_2e2ae48b.jpg";
const ATMOSPHERE_IMAGES: Record<string, string> = {
  tanchuang: "/manus-storage/bingzhu-tanchuang-atmosphere_741418b7.jpg",
  "helan-bone": "/manus-storage/bingzhu-helan-atmosphere_12168c28.jpg",
};

const LocaleRuntimeContext = createContext<LocaleProfile>(LOCALE_PROFILES["zh-cn"]);

export function resolveLocaleProfile(locale?: string | null): LocaleProfile {
  return locale === "en-us" ? LOCALE_PROFILES["en-us"] : LOCALE_PROFILES["zh-cn"];
}

export function resolveArchiveItem(slug?: string | null): BingzhuFragrance {
  return BINGZHU_ARCHIVE.find((item) => item.slug === slug) ?? BINGZHU_ARCHIVE[0];
}

export function formatBingzhuPrice(item: BingzhuFragrance, profile: LocaleProfile) {
  return new Intl.NumberFormat(profile.currency === "USD" ? "en-US" : "zh-CN", {
    style: "currency", currency: profile.currency, maximumFractionDigits: 0,
  }).format(profile.currency === "USD" ? item.priceUsd : item.priceCny);
}

function formatMinorCurrency(amount: number, currency: "CNY" | "USD") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "zh-CN", {
    style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount / 100);
}

function useLocaleRuntime() { return useContext(LocaleRuntimeContext); }

function routeLocale(pathname: string): BingzhuLocale { return pathname.split("/")[1] === "en-us" ? "en-us" : "zh-cn"; }

function rememberMarket(locale: BingzhuLocale) {
  if (typeof window !== "undefined") window.localStorage.setItem(MARKET_STORAGE_KEY, locale);
}

function BrandMark({ href }: { href: string }) {
  return <Link href={href} className="bz-brandmark" aria-label="秉烛 BINGZHU 首页"><span>秉烛</span><small>BINGZHU</small></Link>;
}

function MarketChoice({ locale, onChoose }: { locale: BingzhuLocale; onChoose: (locale: BingzhuLocale) => void }) {
  const label = locale === "zh-cn" ? "ASIA PACIFIC / 简体中文 / CNY ¥" : "GLOBAL / ENGLISH / USD $";
  return <button type="button" className="bz-market-choice" onClick={() => onChoose(locale)}><span>{label}</span><b>{LOCALE_PROFILES[locale].entryLabel}</b></button>;
}

function BingzhuNavigation() {
  const profile = useLocaleRuntime();
  const [menuOpen, setMenuOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [, setLocation] = useLocation();
  const prefix = `/${profile.locale}`;
  const chooseMarket = (locale: BingzhuLocale) => { rememberMarket(locale); setMarketOpen(false); setLocation(`/${locale}/home`); };

  return <>
    <header className="bz-navigation">
      <button type="button" className="bz-nav-action" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="打开名录菜单"><span className="bz-nav-glyph" aria-hidden="true">{menuOpen ? "×" : "≡"}</span><span>MENU</span></button>
      <BrandMark href={`${prefix}/home`} />
      <div className="bz-nav-right"><Link href={`${prefix}/bag`} className="bz-nav-action bz-nav-bag"><span>BAG</span><span className="bz-bag-count">00</span></Link><button type="button" className="bz-market-coordinate" onClick={() => setMarketOpen(true)}>{profile.currency} / {profile.locale === "zh-cn" ? "ZH" : "EN"}</button></div>
    </header>
    {menuOpen ? <aside className="bz-menu" aria-label="秉烛名录菜单"><div className="bz-menu-meta">CATALOGUE / {profile.marketLabel}</div><nav><Link href={`${prefix}/home`} onClick={() => setMenuOpen(false)}>首页 / HOME</Link><Link href={`${prefix}/shop`} onClick={() => setMenuOpen(false)}>香气档案 / ARCHIVE</Link><Link href={`${prefix}/lantern`} onClick={() => setMenuOpen(false)}>灯笼定制 / LANTERN</Link><Link href={`${prefix}/bag`} onClick={() => setMenuOpen(false)}>配额袋 / BAG</Link></nav></aside> : null}
    {marketOpen ? <section className="bz-market-overlay" aria-label="重新选择地区和货币"><button type="button" className="bz-overlay-close" onClick={() => setMarketOpen(false)} aria-label="关闭地区选择">×</button><div className="bz-market-overlay-center"><p className="bz-microcopy">MARKET COORDINATE / CHOOSE AGAIN</p><h2>选择你的<br />香气坐标。</h2><MarketChoice locale="zh-cn" onChoose={chooseMarket} /><MarketChoice locale="en-us" onChoose={chooseMarket} /></div></section> : null}
  </>;
}

function HapticShelf({ item, revealed = false, className = "", onReveal }: { item: BingzhuFragrance; revealed?: boolean; className?: string; onReveal?: () => void }) {
  const atmosphere = ATMOSPHERE_IMAGES[item.slug] ?? ATMOSPHERE_IMAGES.tanchuang;
  const style = { "--shelf-atmosphere": `url(${atmosphere})` } as CSSProperties;
  return <figure className={`bz-haptic-shelf ${revealed ? "is-revealed" : ""} ${className}`} style={style} onPointerEnter={onReveal} onPointerDown={onReveal}>
    <img className="bz-shelf-product" src={PRODUCT_IMAGE} alt={`${item.name} 香水瓶白底摄影`} />
    <figcaption className="bz-shelf-caption"><span>{item.code}</span><b>{item.name}</b><small>{item.volume} / {item.formula}</small></figcaption>
  </figure>;
}

export function GatewayPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("market") === "choose") return;
    const remembered = typeof window === "undefined" ? null : window.localStorage.getItem(MARKET_STORAGE_KEY);
    if (remembered === "zh-cn" || remembered === "en-us") setLocation(`/${remembered}/home`, { replace: true });
  }, [setLocation]);
  const chooseMarket = (locale: BingzhuLocale) => { rememberMarket(locale); setLocation(`/${locale}/home`); };
  return <main className="bz-gateway"><div className="bz-gateway-center"><div className="bz-gateway-mark"><span>秉烛</span><small>BINGZHU</small></div><nav aria-label="选择地区和货币"><MarketChoice locale="zh-cn" onChoose={chooseMarket} /><MarketChoice locale="en-us" onChoose={chooseMarket} /></nav></div></main>;
}

export function BingzhuHeroPage() {
  const profile = useLocaleRuntime();
  return <main className="bz-page bz-hero-page"><BingzhuNavigation /><section className="bz-hero" aria-labelledby="bingzhu-hero-statement"><HapticShelf item={BINGZHU_ARCHIVE[0]} className="bz-hero-shelf" /><div className="bz-hero-center"><p id="bingzhu-hero-statement" className="bz-microcopy">A SIGNATURE SCENT, HELD IN LIGHT</p><h1>以香为礼<br />以器为证。</h1><Link href={`/${profile.locale}/shop`} className="bz-hero-enter">进入香气档案 <span>↘</span></Link></div><div className="bz-hero-index bz-microcopy">BINGZHU / 01 / {profile.currency}</div><div className="bz-hero-foot">触摸白底画框，显影气味的另一面。</div></section></main>;
}

export function ArchivePage() {
  const profile = useLocaleRuntime();
  const [activeSlug, setActiveSlug] = useState(BINGZHU_ARCHIVE[0].slug);
  const [revealed, setRevealed] = useState(false);
  const activeItem = resolveArchiveItem(activeSlug);
  const activate = (slug: string) => { setActiveSlug(slug); setRevealed(true); };
  return <main className="bz-page bz-archive-page"><BingzhuNavigation /><section className="bz-archive-shell" aria-labelledby="archive-title"><div className="bz-archive-heading"><p className="bz-microcopy">SCENT DIRECTORY / {profile.marketLabel}</p><h1 id="archive-title">香气不是货架<br />是可被触摸的留白。</h1></div><div className="bz-archive-list" role="list" aria-label="秉烛香气档案名录">{BINGZHU_ARCHIVE.map((item, index) => { const active = item.slug === activeSlug; return <button type="button" role="listitem" className={`bz-archive-row ${active ? "is-active" : ""}`} key={item.slug} onMouseEnter={() => activate(item.slug)} onFocus={() => activate(item.slug)} onPointerDown={() => activate(item.slug)} onClick={() => activate(item.slug)} aria-pressed={active}><span className="bz-archive-number">{String(index + 1).padStart(2, "0")}</span><span className="bz-archive-entry"><b>{item.name}</b><small>{item.volume} / {item.code}</small></span><span className="bz-archive-mark">{active ? "REVEAL" : "VIEW"}</span></button>; })}</div><div className="bz-archive-reveal"><HapticShelf item={activeItem} revealed={revealed} onReveal={() => setRevealed(true)} /><div className="bz-reveal-copy"><p className="bz-microcopy">{activeItem.collection}</p><h2>{activeItem.name}</h2><p>{activeItem.accord}</p><Link href={`/${profile.locale}/objects/${activeItem.slug}`} className="bz-text-link">OPEN ARCHIVE <span>↗</span></Link></div></div><p className="bz-archive-instruction">Hover, press, or touch a line. The white frame will reveal the atmosphere.</p></section></main>;
}

export function ArchiveObjectPage() {
  const profile = useLocaleRuntime();
  const [pathname] = useLocation();
  const item = resolveArchiveItem(pathname.split("/").at(-1));
  return <main className="bz-page bz-object-page"><BingzhuNavigation /><section className="bz-object-grid"><div className="bz-object-visual"><HapticShelf item={item} revealed /></div><article className="bz-object-copy"><p className="bz-microcopy">{item.collection} / {item.code} / {item.volume}</p><h1>{item.name}<small>{item.nameEn}</small></h1><p className="bz-object-price">{formatBingzhuPrice(item, profile)}</p><p className="bz-object-narrative">{item.narrative}</p><dl className="bz-spec-sheet"><div><dt>COMPOSITION</dt><dd>{item.formula}</dd></div><div><dt>NOTES</dt><dd>{item.notes.join(" / ")}</dd></div></dl><div className="bz-object-actions"><Link href={`/${profile.locale}/allocation/${item.slug}`} className="bz-allocation-button">申请配额 <span>REQUEST ALLOCATION</span></Link><Link href={`/${profile.locale}/shop`} className="bz-text-link">RETURN TO DIRECTORY <span>↖</span></Link></div></article></section></main>;
}

export function AllocationPage() {
  const profile = useLocaleRuntime();
  const [pathname] = useLocation();
  const item = resolveArchiveItem(pathname.split("/").at(-1));
  const [volume, setVolume] = useState<"15ml" | "50ml">(item.volume);
  const selected = { ...item, volume };
  return <main className="bz-page bz-allocation-page"><BingzhuNavigation /><section className="bz-allocation-shell"><div className="bz-allocation-heading"><p className="bz-microcopy">ALLOCATION / SANDBOX / {profile.currency}</p><h1>为一件香气<br />留出位置。</h1><p>支付演示仅在 Sandbox 中完成。模拟支付确认后，订单进入待发货队列。</p></div><div className="bz-allocation-summary"><div className="bz-allocation-record"><span>OBJECT</span><b>{item.name} / {item.code}</b></div><div className="bz-volume-selector">{(["15ml", "50ml"] as const).map((candidate) => <button key={candidate} type="button" className={volume === candidate ? "is-selected" : ""} onClick={() => setVolume(candidate)}>{candidate}</button>)}</div><div className="bz-allocation-record"><span>ALLOCATION</span><b>{formatBingzhuPrice(selected, profile)}</b></div><div className="bz-sandbox-notice">SANDBOX / SIMULATED PAYMENT / AWAITING FULFILLMENT</div><p className="bz-compliance-note">UN1266 易燃液体：仅进入合规陆运或保税仓调度，不进入航空运输链路。</p><button type="button" className="bz-allocation-button">提交配额申请 <span>REQUEST IN SANDBOX</span></button></div></section></main>;
}

function ConnectedAllocationPage() {
  const profile = useLocaleRuntime();
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
  const amount = selectedSku ? (profile.currency === "USD" ? selectedSku.priceUsd : selectedSku.basePriceCny) : null;
  const requestAllocation = () => {
    if (!selectedSku || amount === null) return;
    createOrder.mutate({ brandId, items: [{ productId: product.id, skuId: selectedSku.id, quantity: 1 }], gateway: "wechat_pay_v3", currency: profile.currency, logistics: { fulfillmentMethod, recipientRegion: recipientRegion || null }, origin: window.location.origin }, { onSuccess: (response) => setResultText(`PAYMENT SIMULATED / ${response.order.orderNo} / AWAITING FULFILLMENT / ${response.logisticsCompliance.dispatchMode.toUpperCase()}`), onError: (error) => setResultText(error.message || "SANDBOX REQUEST FAILED") });
  };
  return <main className="bz-page bz-allocation-page"><BingzhuNavigation /><section className="bz-allocation-shell"><div className="bz-allocation-heading"><p className="bz-microcopy">ALLOCATION / SANDBOX / {profile.currency}</p><h1>为一件香气<br />留出位置。</h1><p>确认申请后，将触发库存预占与模拟支付成功，并将订单交给待发货队列。</p></div><div className="bz-allocation-summary"><div className="bz-allocation-record"><span>OBJECT</span><b>{product.name} / {product.code}</b></div><div className="bz-volume-selector">{selectableSkus.map((sku) => <button type="button" key={sku.id} className={selectedSku?.id === sku.id ? "is-selected" : ""} onClick={() => setSelectedSkuId(sku.id)}>{sku.packSize}</button>)}</div><div className="bz-allocation-record"><span>ALLOCATION</span><b>{amount === null ? "UNAVAILABLE" : formatMinorCurrency(amount, profile.currency)}</b></div><label className="bz-logistics-panel"><span>UN1266 / COMPLIANT ROUTING</span><select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as "ground_delivery" | "instant_pickup")}><option value="ground_delivery">合规陆运 / GROUND</option><option value="instant_pickup">即时自提 / COMPLIANCE REVIEW</option></select><input value={recipientRegion} onChange={(event) => setRecipientRegion(event.target.value)} placeholder="区域摘要（机场/空港区域将转危化品陆运）" /></label><button type="button" className="bz-allocation-button" disabled={!selectedSku || createOrder.isPending} onClick={requestAllocation}>{createOrder.isPending ? "确认中" : "提交配额申请"}<span>REQUEST IN SANDBOX</span></button>{resultText ? <p className="bz-request-status" role="status">{resultText}</p> : null}</div></section></main>;
}

const BUILDER_STEPS = [{ id: "HEAD", title: "冠部 / HEAD", options: ["嫩戗飞檐盖头", "博山炉冠"] }, { id: "BODY_WRAP", title: "瓶身画纸 / BODY", options: ["探窗宣纸画纸", "冷雾矿物画纸"] }, { id: "BASE", title: "底座 / BASE", options: ["挂环与流苏", "黑瓷悬挂座"] }] as const;

export function LanternBuilderPage() {
  const profile = useLocaleRuntime();
  const [selected, setSelected] = useState<Record<string, string>>({ HEAD: BUILDER_STEPS[0].options[0], BODY_WRAP: BUILDER_STEPS[1].options[0], BASE: BUILDER_STEPS[2].options[0] });
  return <main className="bz-page bz-builder-page"><BingzhuNavigation /><section className="bz-builder-shell"><div className="bz-builder-title"><p className="bz-microcopy">LANTERN BUILDER / CUSTOM SKU / SANDBOX</p><h1>把一盏灯<br />组装成你的气味。</h1><p>冠部、瓶身画纸与底座会以不可变快照写入 Sandbox 订单。</p></div><div className="bz-blueprint"><div className="bz-blueprint-scale">01 — 03 / COMPONENT STUDY</div><div className="bz-lantern-drawing" aria-hidden="true"><span /><i /><b /></div><div className="bz-blueprint-label label-head">HEAD / {selected.HEAD}</div><div className="bz-blueprint-label label-body">BODY / {selected.BODY_WRAP}</div><div className="bz-blueprint-label label-base">BASE / {selected.BASE}</div></div><div className="bz-builder-controls">{BUILDER_STEPS.map((step, index) => <fieldset key={step.id}><legend><span>0{index + 1}</span>{step.title}</legend>{step.options.map((option) => <label key={option}><input type="radio" name={step.id} checked={selected[step.id] === option} onChange={() => setSelected((current) => ({ ...current, [step.id]: option }))} /><span>{option}</span></label>)}</fieldset>)}<div className="bz-builder-total"><span>EST. CUSTOM BUILD / {profile.currency}</span><b>{profile.currency === "CNY" ? "¥ 2,680 起" : "$ 370 FROM"}</b></div><div className="bz-sandbox-notice">SANDBOX / BUILD REQUEST / UN1266 GROUND ROUTING</div><button type="button" className="bz-allocation-button">生成定制配额 <span>BUILD CUSTOM SKU</span></button></div></section></main>;
}

export function BagPage() {
  const profile = useLocaleRuntime();
  return <main className="bz-page bz-bag-page"><BingzhuNavigation /><section className="bz-empty-bag"><p className="bz-microcopy">BAG / SANDBOX / {profile.currency}</p><h1>配额袋仍是空的。</h1><p>从香气档案选择一件香气，或开始一盏灯的定制。</p><Link href={`/${profile.locale}/shop`} className="bz-allocation-button">打开香气档案 <span>ARCHIVE</span></Link></section></main>;
}

function LocaleLandingRedirect() { return <Redirect to={`/${useLocaleRuntime().locale}/home`} />; }

function LocaleRuntime({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();
  const profile = useMemo(() => resolveLocaleProfile(routeLocale(pathname)), [pathname]);
  useEffect(() => { document.documentElement.lang = profile.language; document.documentElement.dataset.locale = profile.locale; document.documentElement.dataset.currency = profile.currency; document.title = profile.locale === "zh-cn" ? "秉烛 BINGZHU · 香气档案" : "BINGZHU · Scent Archive"; rememberMarket(profile.locale); }, [profile]);
  return <LocaleRuntimeContext.Provider value={profile}>{children}</LocaleRuntimeContext.Provider>;
}

function BingzhuRouter() {
  return <Switch><Route path="/" component={GatewayPage} /><Route path="/:locale/home" component={BingzhuHeroPage} /><Route path="/:locale/shop" component={ArchivePage} /><Route path="/:locale/objects/:slug" component={ArchiveObjectPage} /><Route path="/:locale/allocation/:slug" component={ConnectedAllocationPage} /><Route path="/:locale/lantern" component={LanternBuilderPage} /><Route path="/:locale/bag" component={BagPage} /><Route path="/:locale" component={LocaleLandingRedirect} /><Route component={GatewayPage} /></Switch>;
}

export default function App() { return <LocaleRuntime><BingzhuRouter /></LocaleRuntime>; }
