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
  tone: "gold" | "vermilion" | "bone" | "smoke";
};

export const LOCALE_PROFILES: Record<BingzhuLocale, LocaleProfile> = {
  "zh-cn": {
    locale: "zh-cn",
    currency: "CNY",
    language: "zh-CN",
    marketLabel: "ASIA / CNY",
    entryLabel: "进入亚洲市场",
  },
  "en-us": {
    locale: "en-us",
    currency: "USD",
    language: "en-US",
    marketLabel: "GLOBAL / USD",
    entryLabel: "ENTER GLOBAL",
  },
};

export const BINGZHU_ARCHIVE: readonly BingzhuFragrance[] = [
  {
    slug: "tanchuang",
    code: "BZ-YL-03",
    name: "探窗",
    nameEn: "WINDOW / 03",
    collection: "夜历 / NIGHT ALMANAC",
    volume: "15ml",
    priceCny: 420,
    priceUsd: 58,
    accord: "宣纸冷雾 · 老木窗棂 · 晚熟柚皮",
    formula: "PAPER FIBRE / COOL RESIN / CITRUS ASH",
    narrative: "夜里推开一扇没有灯的窗。冷雾先进入房间，随后是纸纤维、旧木与被压低的柚皮气味。",
    notes: ["冷雾", "宣纸", "柚皮", "柏木"],
    tone: "gold",
  },
  {
    slug: "helan-bone",
    code: "BZ-JH-02",
    name: "贺兰荒骨",
    nameEn: "HELANS / 02",
    collection: "戈壁纪事 / DESERT CHRONICLE",
    volume: "50ml",
    priceCny: 980,
    priceUsd: 136,
    accord: "晒热石膏 · 枯盐草 · 焚香灰",
    formula: "GYPSUM DUST / DRY GRASS / INCENSE ASH",
    narrative: "不是沙漠的浪漫版本，而是日落之后被风刮净的矿物骨架。干燥、留白、近乎无情。",
    notes: ["石膏", "盐草", "乳香灰", "龙涎木"],
    tone: "vermilion",
  },
  {
    slug: "shan-lan",
    code: "BZ-CL-07",
    name: "山岚",
    nameEn: "MOUNTAIN VEIL / 07",
    collection: "雾中物 / OBJECTS IN MIST",
    volume: "15ml",
    priceCny: 460,
    priceUsd: 64,
    accord: "湿石 · 茶气 · 白玉兰未开时",
    formula: "WET STONE / TEA VAPOUR / MAGNOLIA BUD",
    narrative: "雨水没有落下，只是停在岩面上。茶气像一层薄纸，遮住花尚未开放的白。",
    notes: ["湿石", "茶气", "玉兰蕾", "麝香"],
    tone: "bone",
  },
  {
    slug: "song-deng",
    code: "BZ-DX-01",
    name: "松灯",
    nameEn: "PINE LAMP / 01",
    collection: "灯下录 / LANTERN STUDIES",
    volume: "50ml",
    priceCny: 1080,
    priceUsd: 150,
    accord: "松脂火焰 · 墨烟 · 冷金属",
    formula: "PINE RESIN / INK SMOKE / COLD METAL",
    narrative: "一盏灯在纸上投下微黄的边缘。松脂燃得很慢，墨烟和金属把房间固定在更深的夜色里。",
    notes: ["松脂", "墨烟", "冷金属", "安息香"],
    tone: "smoke",
  },
] as const;

const LocaleRuntimeContext = createContext<LocaleProfile>(LOCALE_PROFILES["zh-cn"]);

export function resolveLocaleProfile(locale?: string | null): LocaleProfile {
  return locale === "en-us" ? LOCALE_PROFILES["en-us"] : LOCALE_PROFILES["zh-cn"];
}

export function resolveArchiveItem(slug?: string | null): BingzhuFragrance {
  return BINGZHU_ARCHIVE.find((item) => item.slug === slug) ?? BINGZHU_ARCHIVE[0];
}

export function formatBingzhuPrice(item: BingzhuFragrance, profile: LocaleProfile) {
  if (profile.currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(item.priceUsd);
  }

  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(item.priceCny);
}

function useLocaleRuntime() {
  return useContext(LocaleRuntimeContext);
}

function routeLocale(pathname: string): BingzhuLocale {
  const segment = pathname.split("/")[1];
  return segment === "en-us" ? "en-us" : "zh-cn";
}

function BrandMark({ href }: { href: string }) {
  return (
    <Link href={href} className="bz-brandmark" aria-label="秉烛 BINGZHU 首页">
      <span>秉烛</span>
      <small>BINGZHU</small>
    </Link>
  );
}

function BingzhuNavigation() {
  const profile = useLocaleRuntime();
  const [menuOpen, setMenuOpen] = useState(false);
  const prefix = `/${profile.locale}`;

  return (
    <>
      <header className="bz-navigation">
        <button type="button" className="bz-nav-action" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="打开名录菜单">
          <span className="bz-nav-glyph" aria-hidden="true">{menuOpen ? "×" : "≡"}</span>
          <span>MENU</span>
        </button>
        <BrandMark href={`${prefix}/home`} />
        <Link href={`${prefix}/bag`} className="bz-nav-action bz-nav-bag" aria-label="打开购物袋">
          <span>BAG</span>
          <span className="bz-bag-count">00</span>
        </Link>
      </header>
      {menuOpen ? (
        <aside className="bz-menu" aria-label="秉烛名录菜单">
          <div className="bz-menu-meta">CATALOGUE / {profile.marketLabel}</div>
          <nav>
            <Link href={`${prefix}/home`} onClick={() => setMenuOpen(false)}>神殿首页 / HOME</Link>
            <Link href={`${prefix}/shop`} onClick={() => setMenuOpen(false)}>香气档案 / ARCHIVE</Link>
            <Link href={`${prefix}/lantern`} onClick={() => setMenuOpen(false)}>灯笼定制 / LANTERN BUILDER</Link>
            <Link href={`${prefix}/bag`} onClick={() => setMenuOpen(false)}>配额袋 / BAG</Link>
          </nav>
          <p>秉烛以香气建立可被触摸的文化新鲜感。每一次选择，都由直角、留白、材质与时间完成。</p>
        </aside>
      ) : null}
    </>
  );
}

function HapticField({ item, className = "" }: { item: BingzhuFragrance; className?: string }) {
  const [pointer, setPointer] = useState({ x: 56, y: 42 });
  const style = {
    "--pointer-x": `${pointer.x}%`,
    "--pointer-y": `${pointer.y}%`,
  } as CSSProperties;

  return (
    <div
      className={`bz-haptic-field bz-tone-${item.tone} ${className}`}
      style={style}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
      aria-label={`${item.name} 的触觉材质显影`}
    >
      <span className="bz-field-grain" />
      <span className="bz-field-vapour bz-field-vapour-one" />
      <span className="bz-field-vapour bz-field-vapour-two" />
      <span className="bz-field-vapour bz-field-vapour-three" />
      <span className="bz-field-arc bz-field-arc-one" />
      <span className="bz-field-arc bz-field-arc-two" />
      <div className="bz-bottle" aria-hidden="true">
        <span className="bz-bottle-cap" />
        <span className="bz-bottle-body" />
        <span className="bz-bottle-label">{item.code}</span>
      </div>
      <div className="bz-field-index">{item.collection}</div>
    </div>
  );
}

export function GatewayPage() {
  return (
    <main className="bz-gateway">
      <div className="bz-gateway-void" aria-hidden="true" />
      <div className="bz-gateway-center">
        <div className="bz-gateway-mark"><span>秉烛</span><small>BINGZHU</small></div>
        <nav aria-label="选择地区和货币">
          <a href="/zh-cn/home">[ ENTER ASIA (CNY) ]</a>
          <a href="/en-us/home">[ ENTER GLOBAL (USD) ]</a>
        </nav>
      </div>
    </main>
  );
}

export function BingzhuHeroPage() {
  const profile = useLocaleRuntime();
  const featured = BINGZHU_ARCHIVE[0];
  const prefix = `/${profile.locale}`;

  return (
    <main className="bz-page bz-hero-page">
      <BingzhuNavigation />
      <section className="bz-hero" aria-labelledby="bingzhu-hero-statement">
        <HapticField item={featured} className="bz-hero-haptic" />
        <div className="bz-hero-specimen" aria-hidden="true">
          <span className="bz-hero-specimen-cap" />
          <span className="bz-hero-specimen-body" />
          <span className="bz-hero-specimen-seal">BZ-YL-03</span>
          <span className="bz-hero-specimen-orbit orbit-one" />
          <span className="bz-hero-specimen-orbit orbit-two" />
        </div>
        <div className="bz-hero-center">
          <p id="bingzhu-hero-statement" className="bz-microcopy">以文化新鲜感破局 · 以单品产品力封神</p>
          <div className="bz-hero-rule" aria-hidden="true" />
          <Link href={`${prefix}/shop`} className="bz-hero-enter">进入香气档案 <span>↘</span></Link>
        </div>
        <div className="bz-hero-index bz-microcopy">01 / NIGHT ALMANAC / {profile.currency}</div>
        <div className="bz-hero-foot">
          <span>HAPTIC FIELD / NO SOUND</span>
          <span>THE SCENT IS READ BEFORE IT IS WORN</span>
        </div>
      </section>
    </main>
  );
}

export function ArchivePage() {
  const profile = useLocaleRuntime();
  const [activeSlug, setActiveSlug] = useState(BINGZHU_ARCHIVE[0].slug);
  const activeItem = resolveArchiveItem(activeSlug);
  const prefix = `/${profile.locale}`;

  return (
    <main className="bz-page bz-archive-page">
      <BingzhuNavigation />
      <section className="bz-archive-shell" aria-labelledby="archive-title">
        <div className="bz-archive-heading">
          <p className="bz-microcopy">ARCHIVE DIRECTORY / {profile.marketLabel}</p>
          <h1 id="archive-title">香气不是货架<br />是待被开启的档案。</h1>
        </div>
        <div className="bz-archive-list" role="list" aria-label="秉烛香气档案名录">
          {BINGZHU_ARCHIVE.map((item, index) => {
            const active = item.slug === activeSlug;
            return (
              <button
                type="button"
                role="listitem"
                className={`bz-archive-row ${active ? "is-active" : ""}`}
                key={item.slug}
                onMouseEnter={() => setActiveSlug(item.slug)}
                onFocus={() => setActiveSlug(item.slug)}
                onClick={() => setActiveSlug(item.slug)}
                aria-pressed={active}
              >
                <span className="bz-archive-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="bz-archive-entry"><b>{item.code}</b> / {item.name} / {item.volume}</span>
                <span className="bz-archive-mark">{active ? "REVEALED" : "HOVER"}</span>
              </button>
            );
          })}
        </div>
        <div className="bz-archive-reveal">
          <HapticField item={activeItem} />
          <div className="bz-reveal-copy">
            <p className="bz-microcopy">{activeItem.code} / {activeItem.nameEn}</p>
            <h2>{activeItem.name}</h2>
            <p>{activeItem.accord}</p>
            <Link href={`${prefix}/objects/${activeItem.slug}`} className="bz-text-link">OPEN ARCHIVE <span>↗</span></Link>
          </div>
        </div>
        <p className="bz-archive-instruction">Hover or touch a line. The object will reveal itself in the void.</p>
      </section>
    </main>
  );
}

export function ArchiveObjectPage() {
  const profile = useLocaleRuntime();
  const [pathname] = useLocation();
  const item = resolveArchiveItem(pathname.split("/").at(-1));
  const prefix = `/${profile.locale}`;

  return (
    <main className="bz-page bz-object-page">
      <BingzhuNavigation />
      <section className="bz-object-grid">
        <div className="bz-object-visual"><HapticField item={item} /></div>
        <article className="bz-object-copy">
          <p className="bz-microcopy">{item.collection} / {item.code} / {item.volume}</p>
          <h1>{item.name}<small>{item.nameEn}</small></h1>
          <p className="bz-object-price">{formatBingzhuPrice(item, profile)}</p>
          <p className="bz-object-narrative">{item.narrative}</p>
          <dl className="bz-spec-sheet">
            <div><dt>OLFATIVE INDEX</dt><dd>{item.accord}</dd></div>
            <div><dt>COMPOSITION</dt><dd>{item.formula}</dd></div>
            <div><dt>VOLUME</dt><dd>{item.volume}</dd></div>
            <div><dt>NOTES</dt><dd>{item.notes.join(" / ")}</dd></div>
          </dl>
          <div className="bz-object-actions">
            <Link href={`${prefix}/allocation/${item.slug}`} className="bz-allocation-button">申请配额 <span>REQUEST ALLOCATION</span></Link>
            <Link href={`${prefix}/shop`} className="bz-text-link">RETURN TO DIRECTORY <span>↖</span></Link>
          </div>
        </article>
      </section>
    </main>
  );
}

export function AllocationPage() {
  const profile = useLocaleRuntime();
  const [pathname] = useLocation();
  const item = resolveArchiveItem(pathname.split("/").at(-1));
  const [volume, setVolume] = useState<"15ml" | "50ml">(item.volume);
  const selectedItem = { ...item, volume };
  const prefix = `/${profile.locale}`;

  return (
    <main className="bz-page bz-allocation-page">
      <BingzhuNavigation />
      <section className="bz-allocation-shell">
        <div className="bz-allocation-heading">
          <p className="bz-microcopy">ALLOCATION DESK / SANDBOX MODE / {profile.currency}</p>
          <h1>为一件香气<br />留出位置。</h1>
          <p>此入口已经为支付内核保留调用边界。MVP 展示环境会明确停留在 Sandbox，不会触发真实支付。</p>
        </div>
        <div className="bz-allocation-summary">
          <div className="bz-allocation-record"><span>OBJECT</span><b>{item.code} / {item.name}</b></div>
          <div className="bz-volume-selector" aria-label="选择规格">
            {(["15ml", "50ml"] as const).map((candidate) => (
              <button type="button" key={candidate} onClick={() => setVolume(candidate)} className={volume === candidate ? "is-selected" : ""} aria-pressed={volume === candidate}>{candidate}</button>
            ))}
          </div>
          <div className="bz-allocation-record"><span>ALLOCATION</span><b>{formatBingzhuPrice(selectedItem, profile)}</b></div>
          <div className="bz-sandbox-notice">SANDBOX / REQUEST CAPTURE ONLY / NO LIVE CHARGE</div>
          <button type="button" className="bz-allocation-button bz-request-button">提交配额申请 <span>REQUEST IN SANDBOX</span></button>
          <Link href={`${prefix}/objects/${item.slug}`} className="bz-text-link">BACK TO OBJECT <span>↖</span></Link>
        </div>
      </section>
    </main>
  );
}

function formatMinorCurrency(amount: number, currency: "CNY" | "USD") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function ConnectedAllocationPage() {
  const profile = useLocaleRuntime();
  const [pathname] = useLocation();
  const slug = pathname.split("/").at(-1) ?? "";
  const catalog = trpc.bingzhu.catalog.useQuery();
  const createOrder = trpc.retail.createRetailOrder.useMutation();
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"ground_delivery" | "instant_pickup">("ground_delivery");
  const [recipientRegion, setRecipientRegion] = useState("");
  const prefix = `/${profile.locale}`;
  const brandId = catalog.data?.brandId ?? null;
  const product = catalog.data?.products.find((item) => item.slug === slug) ?? null;
  const selectableSkus = product?.skus.filter((sku) => profile.currency === "CNY" || sku.priceUsd !== null) ?? [];
  const selectedSku = selectableSkus.find((sku) => sku.id === selectedSkuId) ?? selectableSkus[0] ?? null;

  useEffect(() => {
    setSelectedSkuId(selectableSkus[0]?.id ?? null);
    setResultText(null);
  }, [profile.currency, product?.id]);

  if (!product || !brandId) {
    return <AllocationPage />;
  }

  const amount = selectedSku ? (profile.currency === "USD" ? selectedSku.priceUsd : selectedSku.basePriceCny) : null;
  const requestAllocation = () => {
    if (!selectedSku || amount === null) return;
    createOrder.mutate(
      {
        brandId,
        items: [{ productId: product.id, skuId: selectedSku.id, quantity: 1 }],
        gateway: "wechat_pay_v3",
        currency: profile.currency,
        logistics: { fulfillmentMethod, recipientRegion: recipientRegion || null },
        origin: window.location.origin,
      },
      {
        onSuccess: (response) => setResultText(`SANDBOX ORDER ${response.order.orderNo} / ${response.gateway.stage.toUpperCase()} / ${response.logisticsCompliance.dispatchMode.toUpperCase()}`),
        onError: (error) => setResultText(error.message || "SANDBOX REQUEST FAILED"),
      },
    );
  };

  return (
    <main className="bz-page bz-allocation-page">
      <BingzhuNavigation />
      <section className="bz-allocation-shell">
        <div className="bz-allocation-heading">
          <p className="bz-microcopy">ALLOCATION DESK / SANDBOX MODE / {profile.currency}</p>
          <h1>为一件香气<br />留出位置。</h1>
          <p>此入口经由秉烛品牌作用域、OMS 和 payments 沙盒主线创建演示订单，不会触发真实扣款。</p>
        </div>
        <div className="bz-allocation-summary">
          <div className="bz-allocation-record"><span>OBJECT</span><b>{product.code} / {product.name}</b></div>
          <div className="bz-volume-selector" aria-label="选择规格">
            {selectableSkus.map((sku) => (
              <button type="button" key={sku.id} onClick={() => setSelectedSkuId(sku.id)} className={selectedSku?.id === sku.id ? "is-selected" : ""} aria-pressed={selectedSku?.id === sku.id}>{sku.packSize ?? sku.specName ?? sku.skuCode}</button>
            ))}
          </div>
          <div className="bz-allocation-record"><span>ALLOCATION</span><b>{amount === null ? "UNAVAILABLE" : formatMinorCurrency(amount, profile.currency)}</b></div>
          <div className="bz-sandbox-notice">SANDBOX / REQUEST CAPTURE ONLY / NO LIVE CHARGE</div>
          <label className="bz-logistics-panel">
            <span>UN1266 / DELIVERY ROUTING</span>
            <select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as "ground_delivery" | "instant_pickup")}>
              <option value="ground_delivery">合规地面配送 / GROUND</option>
              <option value="instant_pickup">即时自提 / COMPLIANCE REVIEW</option>
            </select>
            <input value={recipientRegion} onChange={(event) => setRecipientRegion(event.target.value)} placeholder="区域摘要（机场/空港区域将转危化品陆运）" />
          </label>
          <button type="button" className="bz-allocation-button bz-request-button" disabled={!selectedSku || createOrder.isPending} onClick={requestAllocation}>
            {createOrder.isPending ? "记录配额中" : "提交配额申请"} <span>REQUEST IN SANDBOX</span>
          </button>
          {resultText ? <p className="bz-microcopy bz-request-status" role="status">{resultText}</p> : null}
          <Link href={`${prefix}/objects/${product.slug}`} className="bz-text-link">BACK TO OBJECT <span>↖</span></Link>
        </div>
      </section>
    </main>
  );
}

const BUILDER_STEPS = [
  { id: "HEAD", title: "冠部 / HEAD", options: ["嫩戗发戗飞檐盖头", "折光铜冠", "素面黑檀冠"] },
  { id: "BODY_WRAP", title: "瓶身画纸 / BODY", options: ["雨窗宣纸", "空白绢本", "来稿上传位"] },
  { id: "BASE", title: "底座 / BASE", options: ["悬挂铜环", "深色流苏", "黑石托座"] },
] as const;

export function LanternBuilderPage() {
  const profile = useLocaleRuntime();
  const [selected, setSelected] = useState<Record<string, string>>({
    HEAD: BUILDER_STEPS[0].options[0],
    BODY_WRAP: BUILDER_STEPS[1].options[0],
    BASE: BUILDER_STEPS[2].options[0],
  });

  return (
    <main className="bz-page bz-builder-page">
      <BingzhuNavigation />
      <section className="bz-builder-shell">
        <div className="bz-builder-title">
          <p className="bz-microcopy">THE LANTERN DIY BUILDER / CUSTOM SKU</p>
          <h1>把一盏灯<br />组装成你的气味。</h1>
          <p>工匠定制流以蓝图方式处理冠部、瓶身画纸与底座。每个选择将形成可写入订单的 Custom SKU 组合。</p>
        </div>
        <div className="bz-blueprint" aria-label="灯笼香水定制蓝图">
          <div className="bz-blueprint-scale">0 — 100 / SCALE LOCKED</div>
          <div className="bz-lantern-drawing" aria-hidden="true"><span /><i /><b /></div>
          <div className="bz-blueprint-label label-head">HEAD / {selected.HEAD}</div>
          <div className="bz-blueprint-label label-body">BODY / {selected.BODY_WRAP}</div>
          <div className="bz-blueprint-label label-base">BASE / {selected.BASE}</div>
        </div>
        <div className="bz-builder-controls">
          {BUILDER_STEPS.map((step, stepIndex) => (
            <fieldset key={step.id}>
              <legend><span>0{stepIndex + 1}</span>{step.title}</legend>
              {step.options.map((option) => (
                <label key={option}>
                  <input type="radio" name={step.id} checked={selected[step.id] === option} onChange={() => setSelected((current) => ({ ...current, [step.id]: option }))} />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <div className="bz-builder-total"><span>EST. CUSTOM BUILD / {profile.currency}</span><b>{profile.currency === "CNY" ? "¥ 2,680 起" : "$ 370 FROM"}</b></div>
          <button type="button" className="bz-allocation-button bz-request-button">生成定制配额 <span>BUILD CUSTOM SKU</span></button>
        </div>
      </section>
    </main>
  );
}

const CUSTOM_COMPONENT_TYPES = ["HEAD", "BODY_WRAP", "BASE"] as const;
type CustomComponentType = (typeof CUSTOM_COMPONENT_TYPES)[number];

function ConnectedLanternBuilderPage() {
  const profile = useLocaleRuntime();
  const catalog = trpc.bingzhu.catalog.useQuery();
  const createOrder = trpc.retail.createRetailOrder.useMutation();
  const [selected, setSelected] = useState<Partial<Record<CustomComponentType, number>>>({});
  const [resultText, setResultText] = useState<string | null>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"ground_delivery" | "instant_pickup">("ground_delivery");
  const [recipientRegion, setRecipientRegion] = useState("");
  const brandId = catalog.data?.brandId ?? null;
  const componentsFor = (type: CustomComponentType) => catalog.data?.components.filter((component) => component.type === type) ?? [];
  const customProduct = catalog.data?.products.find((product) => product.code === "BZ-LT-CUSTOM") ?? null;
  const customSku = customProduct?.skus.find((sku) => profile.currency === "CNY" || sku.priceUsd !== null) ?? null;

  useEffect(() => {
    if (!catalog.data?.brandId) return;
    setSelected((current) => {
      const next = { ...current };
      CUSTOM_COMPONENT_TYPES.forEach((type) => {
        if (!next[type]) next[type] = componentsFor(type)[0]?.id;
      });
      return next;
    });
    setResultText(null);
  }, [catalog.data?.brandId]);

  const selectedComponents = CUSTOM_COMPONENT_TYPES.map((type) => componentsFor(type).find((component) => component.id === selected[type]) ?? null);
  const readyToBuild = Boolean(brandId && customProduct && customSku && selectedComponents.every(Boolean));
  const basePrice = customSku ? (profile.currency === "USD" ? customSku.priceUsd : customSku.basePriceCny) : null;
  const componentPrice = selectedComponents.reduce((sum, component) => sum + (component ? (profile.currency === "USD" ? component.extraPriceUsd ?? 0 : component.extraPriceCny) : 0), 0);
  const total = basePrice === null ? null : basePrice + componentPrice;

  if (!brandId || !customProduct || !customSku) return <LanternBuilderPage />;

  const submitCustomBuild = () => {
    if (!readyToBuild || total === null) return;
    createOrder.mutate(
      {
        brandId,
        items: [{ productId: customProduct.id, skuId: customSku.id, quantity: 1 }],
        gateway: "wechat_pay_v3",
        currency: profile.currency,
        customization: { components: selectedComponents.filter(Boolean).map((component) => ({ componentId: component!.id })) },
        logistics: { fulfillmentMethod, recipientRegion: recipientRegion || null },
        origin: window.location.origin,
      },
      {
        onSuccess: (response) => setResultText(`CUSTOM SKU ${response.order.orderNo} / ${response.gateway.stage.toUpperCase()} / ${response.logisticsCompliance.dispatchMode.toUpperCase()}`),
        onError: (error) => setResultText(error.message || "CUSTOM SKU REQUEST FAILED"),
      },
    );
  };

  const labels: Record<CustomComponentType, string> = {
    HEAD: "冠部 / HEAD",
    BODY_WRAP: "瓶身画纸 / BODY",
    BASE: "底座 / BASE",
  };

  return (
    <main className="bz-page bz-builder-page">
      <BingzhuNavigation />
      <section className="bz-builder-shell">
        <div className="bz-builder-title">
          <p className="bz-microcopy">THE LANTERN DIY BUILDER / CUSTOM SKU / SANDBOX</p>
          <h1>把一盏灯<br />组装成你的气味。</h1>
          <p>每段材料均从秉烛品牌组件目录读取；提交后将以不可变组件快照写入 Sandbox 订单。</p>
        </div>
        <div className="bz-blueprint" aria-label="灯笼香水定制蓝图">
          <div className="bz-blueprint-scale">0 — 100 / COMPONENT LOCKED</div>
          <div className="bz-lantern-drawing" aria-hidden="true"><span /><i /><b /></div>
          <div className="bz-blueprint-label label-head">HEAD / {selectedComponents[0]?.name ?? "—"}</div>
          <div className="bz-blueprint-label label-body">BODY / {selectedComponents[1]?.name ?? "—"}</div>
          <div className="bz-blueprint-label label-base">BASE / {selectedComponents[2]?.name ?? "—"}</div>
        </div>
        <div className="bz-builder-controls">
          {CUSTOM_COMPONENT_TYPES.map((type, index) => (
            <fieldset key={type}>
              <legend><span>0{index + 1}</span>{labels[type]}</legend>
              {componentsFor(type).map((component) => (
                <label key={component.id}>
                  <input type="radio" name={type} checked={selected[type] === component.id} onChange={() => setSelected((current) => ({ ...current, [type]: component.id }))} />
                  <span>{component.name} / {component.material ?? "MATERIAL TBC"}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <div className="bz-builder-total"><span>EST. CUSTOM BUILD / {profile.currency}</span><b>{total === null ? "UNAVAILABLE" : formatMinorCurrency(total, profile.currency)}</b></div>
          <label className="bz-logistics-panel">
            <span>UN1266 / DELIVERY ROUTING</span>
            <select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as "ground_delivery" | "instant_pickup")}>
              <option value="ground_delivery">合规地面配送 / GROUND</option>
              <option value="instant_pickup">即时自提 / COMPLIANCE REVIEW</option>
            </select>
            <input value={recipientRegion} onChange={(event) => setRecipientRegion(event.target.value)} placeholder="区域摘要（机场/空港区域将转危化品陆运）" />
          </label>
          <button type="button" className="bz-allocation-button bz-request-button" disabled={!readyToBuild || createOrder.isPending} onClick={submitCustomBuild}>
            {createOrder.isPending ? "封存定制中" : "生成定制配额"} <span>BUILD CUSTOM SKU</span>
          </button>
          {resultText ? <p className="bz-microcopy bz-request-status" role="status">{resultText}</p> : null}
        </div>
      </section>
    </main>
  );
}

export function BagPage() {
  const profile = useLocaleRuntime();
  const prefix = `/${profile.locale}`;
  return (
    <main className="bz-page bz-bag-page">
      <BingzhuNavigation />
      <section className="bz-empty-bag">
        <p className="bz-microcopy">BAG / SANDBOX / {profile.currency}</p>
        <h1>配额袋仍是空的。</h1>
        <p>从档案名录选择一件香气，或开始一盏灯的定制。</p>
        <div><Link href={`${prefix}/shop`} className="bz-allocation-button">打开香气档案 <span>ARCHIVE</span></Link><Link href={`${prefix}/lantern`} className="bz-text-link">进入灯笼定制 <span>↗</span></Link></div>
      </section>
    </main>
  );
}

function LocaleLandingRedirect() {
  const profile = useLocaleRuntime();
  return <Redirect to={`/${profile.locale}/home`} />;
}

function LocaleRuntime({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();
  const profile = useMemo(() => resolveLocaleProfile(routeLocale(pathname)), [pathname]);

  useEffect(() => {
    document.documentElement.lang = profile.language;
    document.documentElement.dataset.locale = profile.locale;
    document.documentElement.dataset.currency = profile.currency;
    document.title = profile.locale === "zh-cn" ? "秉烛 BINGZHU · 香气档案" : "BINGZHU · Scent Archive";
  }, [profile]);

  return <LocaleRuntimeContext.Provider value={profile}>{children}</LocaleRuntimeContext.Provider>;
}

function BingzhuRouter() {
  return (
    <Switch>
      <Route path="/" component={GatewayPage} />
      <Route path="/:locale/home" component={BingzhuHeroPage} />
      <Route path="/:locale/shop" component={ArchivePage} />
      <Route path="/:locale/objects/:slug" component={ArchiveObjectPage} />
      <Route path="/:locale/allocation/:slug" component={ConnectedAllocationPage} />
      <Route path="/:locale/lantern" component={ConnectedLanternBuilderPage} />
      <Route path="/:locale/bag" component={BagPage} />
      <Route path="/:locale" component={LocaleLandingRedirect} />
      <Route component={GatewayPage} />
    </Switch>
  );
}

export default function App() {
  return <LocaleRuntime><BingzhuRouter /></LocaleRuntime>;
}
