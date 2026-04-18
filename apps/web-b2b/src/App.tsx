import React, { useEffect, useMemo, useState } from "react";
import { Link, Route, Switch } from "wouter";
import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { trpc } from "./lib/trpc";

export type ProductSeries = "AP" | "FC";

export type ProductSpec = {
  label: string;
  value: string;
  emphasis?: "primary" | "secondary";
};

export type ShowroomProduct = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  series: ProductSeries;
  price: number;
  size: string;
  layout: "full" | "wide" | "stacked";
  source: "mock" | "database" | "fallback";
  heroLine: string;
  formulation: string;
  discipline: string;
  overview: string;
  notes: string[];
  stats: ProductSpec[];
  accent: {
    glow: string;
    metal: string;
    liquid: string;
  };
};

export const COMPLIANCE_MESSAGE =
  "// SYSTEM NOTIFICATION：当前空间节点合规接入中（ICP备案审核中）。预计将于本月下旬开放全域配额申请，请保留此通讯频段。";

const ACCENT_BY_SERIES: Record<
  ProductSeries,
  Array<{
    glow: string;
    metal: string;
    liquid: string;
  }>
> = {
  AP: [
    {
      glow: "rgba(111, 142, 255, 0.34)",
      metal: "linear-gradient(145deg, rgba(246,242,235,0.22), rgba(59,66,89,0.04) 42%, rgba(9,11,22,0.92) 78%)",
      liquid: "linear-gradient(180deg, rgba(36,45,89,0.85), rgba(10,12,22,0.2))",
    },
    {
      glow: "rgba(120, 164, 255, 0.28)",
      metal: "linear-gradient(145deg, rgba(238,240,246,0.18), rgba(31,39,66,0.14) 46%, rgba(4,6,15,0.96) 82%)",
      liquid: "linear-gradient(180deg, rgba(58,76,136,0.7), rgba(8,10,20,0.14))",
    },
  ],
  FC: [
    {
      glow: "rgba(136, 204, 255, 0.34)",
      metal: "linear-gradient(145deg, rgba(248,250,255,0.52), rgba(188,223,255,0.2) 42%, rgba(33,41,79,0.34) 82%)",
      liquid: "linear-gradient(180deg, rgba(156,212,255,0.88), rgba(226,237,255,0.24))",
    },
    {
      glow: "rgba(176, 222, 255, 0.3)",
      metal: "linear-gradient(145deg, rgba(253,253,255,0.48), rgba(205,220,244,0.26) 46%, rgba(40,49,88,0.26) 82%)",
      liquid: "linear-gradient(180deg, rgba(208,229,255,0.8), rgba(233,242,255,0.18))",
    },
  ],
};

export const SHOWROOM_PRODUCTS: ShowroomProduct[] = [
  {
    id: "void-b03",
    code: "VOID-B03",
    name: "大气重组基质",
    subtitle: "Atmospheric Purification / metal-shadow deodorization core",
    series: "AP",
    price: 298,
    size: "500ml",
    layout: "full",
    source: "mock",
    heroLine: "以冷黑金属、矿石折光与除味基质叙事，构造一件不像家清、更像机甲模块的净味器官。",
    formulation: "Odor Matrix // sulfur-chain collapse // carbon lattice adsorption",
    discipline: "Atmospheric Purification",
    overview: "针对烟味、潮闷织物残留与密闭空间异味而设计，强调冷酷、克制、具实验室感的数据表达。",
    notes: ["适合高端衣橱、车内皮饰、封闭空间场景", "以重金属阴影与暗色高光表达“重力感”", "强调中广测除味报告与工业基质可信度"],
    stats: [
      { label: "硫化氢解构率", value: "93.8%", emphasis: "primary" },
      { label: "氨气异味削减", value: "89.4%" },
      { label: "烟焦油残留压制", value: "91.2%" },
      { label: "建议作用时长", value: "15 MIN" },
    ],
    accent: ACCENT_BY_SERIES.AP[0],
  },
  {
    id: "void-d05",
    code: "VOID-D05",
    name: "暗域除味母体",
    subtitle: "Atmospheric Purification / deep-space absorbent protocol",
    series: "AP",
    price: 328,
    size: "500ml",
    layout: "stacked",
    source: "mock",
    heroLine: "让产品像高定珠宝展中的黑曜石主石，在巨大负空间里释放冷光，而非做成常规货架式电商卡片。",
    formulation: "Void Capture // tar reduction // layered neutralization",
    discipline: "Atmospheric Purification",
    overview: "偏向重污染场景与深色空间布置，适用于宠物、烟草与潮湿复合型异味链路。",
    notes: ["更适合重污染试香区和高端商业空间入口", "通过更高对比度的蓝银高光表达空气切割感", "强化系列内部的“暗域 / 深空”命名秩序"],
    stats: [
      { label: "异戊酸抑制", value: "90.6%", emphasis: "primary" },
      { label: "甲硫醇削减", value: "88.1%" },
      { label: "重污染复配响应", value: "T+8 MIN" },
      { label: "推荐配额", value: "24 LOTS" },
    ],
    accent: ACCENT_BY_SERIES.AP[1],
  },
  {
    id: "fc-le",
    code: "FC-LE",
    name: "织物精华乳",
    subtitle: "Fabric Care Deluxe / liquid silver textile milk",
    series: "FC",
    price: 268,
    size: "500ml",
    layout: "wide",
    source: "mock",
    heroLine: "把丝滑、丁达尔蓝与液态流银做成近乎珠宝釉面的展陈，而不是日化货架上的常规功能图。",
    formulation: "Fabric Care Deluxe // liquid silver suspension // tactile bloom",
    discipline: "Fabric Care Deluxe",
    overview: "面向高价值织物与精细纤维护理场景，强调柔顺触感、抗静电秩序与纤维表面光泽。",
    notes: ["面向高端衣橱、贴身纺织与礼服级织物护理", "视觉上应体现流银、丝滑与冷光蓝丁达尔感", "强调不使用微胶囊的克制技术路线"],
    stats: [
      { label: "赢创 RL 100 靶向剥离", value: "ENABLED", emphasis: "primary" },
      { label: "微胶囊含量", value: "0" },
      { label: "抗熵增冷冻术", value: "PHASE IV" },
      { label: "纤维抚触增益", value: "+27%" },
    ],
    accent: ACCENT_BY_SERIES.FC[0],
  },
  {
    id: "fc-ic",
    code: "FC-IC",
    name: "内衣安净乳",
    subtitle: "Fabric Care Deluxe / intimate-clean system milk",
    series: "FC",
    price: 238,
    size: "500ml",
    layout: "stacked",
    source: "mock",
    heroLine: "以接近医疗器械与高奢美容精华之间的灰阶语言，表达“干净、冷静、柔和但锋利”的护理能量。",
    formulation: "Delicate Surface Care // capsule-free clarity // cold-white balance",
    discipline: "Fabric Care Deluxe",
    overview: "针对贴身织物与敏感纤维建立更安静、更洁净的护理感受，避免夸张香精式表达。",
    notes: ["适合内衣、睡衣、贴身织物与婴敏织物辅助护理", "用更轻的高光与冷白银强调安静科技感", "与 FC-LE 形成同系列、不同触感密度的双生组合"],
    stats: [
      { label: "微胶囊含量", value: "0", emphasis: "primary" },
      { label: "冷白净化阈值", value: "98.2" },
      { label: "纤维残留负担", value: "LOW" },
      { label: "建议配额", value: "18 LOTS" },
    ],
    accent: ACCENT_BY_SERIES.FC[1],
  },
];

type ManagedProductQueryRecord = {
  id: number;
  code: string;
  name: string;
  slug: string;
  series: ProductSeries | null;
  price: number | null;
  status: string;
  imageUrl: string | null;
  subtitle: string | null;
  description: string | null;
  specs: Array<{ key: string; value: string }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function getSeriesLabel(series: ProductSeries) {
  return series === "AP" ? "Atmospheric Purification" : "Fabric Care Deluxe";
}

function getLayoutByIndex(index: number): ShowroomProduct["layout"] {
  if (index === 0) return "full";
  return index % 3 === 0 ? "wide" : "stacked";
}

function mapManagedProductToShowroom(product: ManagedProductQueryRecord, index: number, source: "database" | "fallback"): ShowroomProduct {
  const series = product.series ?? (product.code.startsWith("FC") ? "FC" : "AP");
  const accentPalette = ACCENT_BY_SERIES[series][index % ACCENT_BY_SERIES[series].length];
  const stats = (product.specs?.length ? product.specs : [{ key: "Status", value: product.status.toUpperCase() }]).slice(0, 4).map((item, itemIndex) => ({
    label: item.key,
    value: item.value,
    emphasis: itemIndex === 0 ? "primary" : "secondary",
  })) as ProductSpec[];

  return {
    id: product.slug || product.code.toLowerCase(),
    code: product.code,
    name: product.name,
    subtitle: product.subtitle || `${getSeriesLabel(series)} / Product protocol`,
    series,
    price: typeof product.price === "number" ? product.price : 0,
    size: product.imageUrl ? "SHOWROOM ASSET" : "500ml",
    layout: getLayoutByIndex(index),
    source,
    heroLine: product.description || `${product.name} 被陈列为一件具备实验室张力的展柜对象，而非普通货架 SKU。`,
    formulation:
      product.specs && product.specs.length > 0
        ? product.specs.slice(0, 3).map((item) => `${item.key} // ${item.value}`).join(" // ")
        : `${getSeriesLabel(series)} // ${product.code} // ${product.status.toUpperCase()}`,
    discipline: getSeriesLabel(series),
    overview: product.description || product.subtitle || "当前条目已接入真实商品池，可继续补充更具转化力的实验室说明。",
    notes:
      product.specs && product.specs.length > 0
        ? product.specs.slice(0, 3).map((item) => `${item.key}：${item.value}`)
        : ["当前商品已从后台同步", "可继续补充 specs 参数", "PDP 将自动复用这些参数构建数据面板"],
    stats,
    accent: accentPalette,
  };
}

export function getShowroomProductById(id: string, products: ShowroomProduct[] = SHOWROOM_PRODUCTS) {
  return products.find((product) => product.id === id || product.code.toLowerCase() === id.toLowerCase()) ?? null;
}

function ProductArtifact({ product, index, mode = "card" }: { product: ShowroomProduct; index: number; mode?: "card" | "hero" }) {
  const scaleClassName = mode === "hero" ? "h-[28rem] md:h-[42rem]" : "h-72 md:h-80";

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#070912] ${scaleClassName}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.08),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(147,197,253,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.24))]" />
      <div
        className="absolute inset-x-[10%] top-[11%] h-[72%] rounded-[2.25rem] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_40px_120px_rgba(0,0,0,0.55)]"
        style={{ background: product.accent.metal, boxShadow: `0 0 90px ${product.accent.glow}, inset 0 1px 0 rgba(255,255,255,0.18)` }}
      >
        <div className="absolute inset-x-[11%] top-[12%] h-[58%] rounded-[1.5rem] border border-white/10" style={{ background: product.accent.liquid }} />
        <div className="absolute inset-x-[22%] top-[-2.5rem] h-20 rounded-[1.5rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,15,29,0.96),rgba(50,56,76,0.76))]" />
        <div className="absolute left-[50%] top-[-3.4rem] h-8 w-16 -translate-x-1/2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(196,204,222,0.3),rgba(18,21,34,0.94))]" />
        <div className="absolute inset-x-[18%] top-[22%] h-px bg-white/14" />
        <div className="absolute inset-x-[18%] top-[28%] h-px bg-white/10" />
        <div className="absolute inset-x-[18%] top-[34%] h-px bg-white/10" />
        <div className="absolute bottom-[18%] left-[18%] h-14 w-14 rounded-full border border-white/10 bg-white/5" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(2,6,23,0.06),rgba(2,6,23,0.54))]" style={{ transform: `translateY(${index * 8}px)` }} />
    </div>
  );
}

export function ShowroomPage(props?: { products?: ShowroomProduct[]; sourceLabel?: string; isSyncing?: boolean }) {
  const products = props?.products ?? SHOWROOM_PRODUCTS;
  const sourceLabel = props?.sourceLabel ?? (products.every((product) => product.source === "database") ? "DATABASE" : "MOCK-LAB");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleScroll = () => setScrollY(window.scrollY || 0);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-[#05070d] text-[#f5efe6]">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(76,101,255,0.18),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(111,223,255,0.12),transparent_26%),linear-gradient(180deg,#05070d_0%,#060913_42%,#05070d_100%)]" />
        <div className="noise-layer absolute inset-0 opacity-40" />
        <div className="mx-auto flex max-w-[1440px] flex-col gap-16 px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <header className="flex items-center justify-between gap-6 border-b border-white/10 pb-6">
            <Link href="/showroom" className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/6 text-sm font-semibold uppercase tracking-[0.28em] text-[#f5efe6]">IC</div>
              <div>
                <p className="font-[Syncopate] text-sm uppercase tracking-[0.24em] text-[#f5efe6]">iCloush LAB.</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#8f99b7]">Brutalist Ornament Space Jeweler</p>
              </div>
            </Link>
            <nav className="hidden items-center gap-8 text-sm uppercase tracking-[0.2em] text-[#a4acc6] md:flex">
              <Link href="/showroom" className="transition hover:text-white">Showroom</Link>
              <a href="#series" className="transition hover:text-white">Series Matrix</a>
              <a href="#allocation" className="transition hover:text-white">Allocation</a>
            </nav>
          </header>

          <div className="grid gap-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#cfd6ee]">
                <span className="h-2 w-2 rounded-full bg-[#a9c5ff] shadow-[0_0_18px_rgba(169,197,255,0.8)]" />
                DIGITAL SHOWROOM // 60 / 30 / 10 DISCIPLINE
              </div>
              <h1 className="mt-8 max-w-5xl font-[Syncopate] text-[2.8rem] uppercase leading-[0.92] tracking-[0.08em] text-[#f8f2ea] md:text-[4.8rem] xl:text-[6.1rem]">
                We do not build shelves. We build ritualized product orbitals.
              </h1>
              <p className="mt-8 max-w-3xl text-base leading-8 text-[#c5cbe0] md:text-lg">
                Sprint 3 的前台展示逻辑不再是传统货架，而是以高定珠宝展的负空间、冷光金属与流银材质来陈列 AP 与 FC 双系列。核心单品被当作空间装置，而不是普通 SKU 卡片。
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a href="#series" className="ghost-button inline-flex h-14 items-center justify-center rounded-full px-7 text-sm font-medium uppercase tracking-[0.24em] text-[#f8f2ea]">
                  Enter Showroom
                </a>
                <Link href={`/product/${products[0]?.id ?? "void-b03"}`} className="inline-flex h-14 items-center justify-center rounded-full border border-[#8aa8ff]/30 bg-[#88b8ff]/12 px-7 text-sm font-medium uppercase tracking-[0.24em] text-[#dfe9ff] transition hover:border-[#b7ccff]/48 hover:bg-[#88b8ff]/18">
                  View Signature Object
                </Link>
              </div>
            </div>

            <aside className="rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,11,22,0.94),rgba(5,7,13,0.92))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8f99b7]">Current source</p>
                  <p className="mt-3 font-[Syncopate] text-2xl uppercase tracking-[0.14em] text-[#f8f2ea]">DATA SOURCE // {sourceLabel}</p>
                </div>
                <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#9ab9ff]">Fallback safe</div>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Series", value: "AP / FC" },
                  { label: "Display logic", value: "Staggered" },
                  { label: "Gravity", value: "Parallax" },
                  { label: "Conversion", value: "Compliance CTA" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.6rem] border border-white/8 bg-white/4 p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8f99b7]">{item.label}</p>
                    <p className="mt-3 text-xl font-semibold tracking-[0.04em] text-[#f8f2ea]">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm leading-7 text-[#bfc6dc]">
                {props?.isSyncing
                  ? "当前正在同步真实商品池；若查询延迟，界面会保留 fallback 展柜，避免预览链路中断。"
                  : "当前版本已优先接入真实商品池，同时保留 fallback 合规状态标识，确保 showroom 与 PDP 在预览期稳定可见。"}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section id="series" className="mx-auto max-w-[1440px] px-6 py-16 md:px-10 lg:px-14 xl:px-16">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#8f99b7]">Series matrix</p>
            <h2 className="mt-4 font-[Syncopate] text-3xl uppercase tracking-[0.1em] text-[#f8f2ea] md:text-4xl">AP // FC display sequence</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#bfc6dc]">
            一行不超过两件产品，核心单品可独占整行；产品移动速度略慢于背景，以形成“更重、更值钱”的引力感。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 xl:gap-8">
          {products.map((product, index) => {
            const columnClassName = product.layout === "full" ? "lg:col-span-12" : product.layout === "wide" ? "lg:col-span-7" : "lg:col-span-5";
            const parallaxStyle = { transform: `translateY(${Math.min(scrollY * (0.018 + index * 0.004), 28)}px)` };

            return (
              <article key={product.id} style={parallaxStyle} className={`${columnClassName} group relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,12,24,0.92),rgba(5,7,13,0.94))] p-5 transition duration-500 hover:border-white/18 hover:shadow-[0_34px_120px_rgba(0,0,0,0.45)] md:p-7`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_24%,rgba(0,0,0,0.22))]" />
                <div className="absolute inset-0 bg-black/26 transition duration-500 group-hover:bg-black/8" />
                <div className="relative grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                  <ProductArtifact product={product} index={index} />
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#d7def2]">{product.code}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#93a3cd]">{getSeriesLabel(product.series)}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#93a3cd]">{product.size}</span>
                    </div>
                    <h3 className="mt-5 text-3xl font-semibold tracking-[0.02em] text-[#f8f2ea] md:text-4xl">{product.name}</h3>
                    <p className="mt-3 text-sm uppercase tracking-[0.22em] text-[#9ab9ff]">{product.subtitle}</p>
                    <p className="mt-6 max-w-2xl text-sm leading-8 text-[#c2c9df] md:text-base">{product.overview}</p>
                    <div className="mt-7 grid gap-3 sm:grid-cols-2">
                      {product.stats.slice(0, 2).map((item) => (
                        <div key={item.label} className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-[#8f99b7]">{item.label}</p>
                          <p className={`mt-3 text-2xl font-semibold ${item.emphasis === "primary" ? "text-[#e8f0ff]" : "text-[#f8f2ea]"}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#8f99b7]">Request allocation</p>
                        <p className="mt-2 text-2xl font-semibold text-[#f8f2ea]">{formatCurrency(product.price)} / {product.size}</p>
                      </div>
                      <Link href={`/product/${product.id}`} className="inline-flex h-12 items-center justify-center rounded-full border border-[#9bb7ff]/24 bg-[#9bb7ff]/10 px-6 text-xs font-medium uppercase tracking-[0.24em] text-[#e3edff] transition hover:border-[#c5d6ff]/40 hover:bg-[#9bb7ff]/16">
                        Inspect Object
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="allocation" className="border-t border-white/10 bg-[linear-gradient(180deg,#05070d,#05070d_45%,#060913)]">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-6 py-16 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-14 xl:px-16">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#8f99b7]">Allocation protocol</p>
            <h2 className="mt-4 font-[Syncopate] text-3xl uppercase tracking-[0.1em] text-[#f8f2ea] md:text-4xl">Compliance-first conversion hook</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Showroom 先承接高净值品牌感与技术可信度，而不是立刻把用户拖进常规货架式购买流程。",
              "PDP 底部使用 REQUEST ALLOCATION 幽灵按钮，维持高冷、克制、半透明的系统界面感。",
              "当前节点处于合规接入期，因此 CTA 会弹出系统通知，而非跳转微信授权或真实支付链路。",
            ].map((item) => (
              <div key={item} className="rounded-[1.8rem] border border-white/10 bg-white/4 p-5 text-sm leading-7 text-[#c2c9df]">{item}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function ProductDetailPage(props: { id: string; product?: ShowroomProduct | null; sourceLabel?: string }) {
  const product = props.product ?? getShowroomProductById(props.id);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!product) {
    return <NotFoundPage />;
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-[#f5efe6]">
      <section className="relative overflow-hidden border-b border-white/10 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(86,114,255,0.2),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(145,212,255,0.16),transparent_24%),linear-gradient(180deg,#05070d_0%,#08111b_42%,#05070d_100%)]" />
        <div className="noise-layer absolute inset-0 opacity-40" />
        <div className="mx-auto max-w-[1480px] px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <div className="flex items-center justify-between gap-5 border-b border-white/10 pb-6">
            <Link href="/showroom" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#cfd6ee] transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to showroom
            </Link>
            <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[#93a3cd]">{getSeriesLabel(product.series)}</div>
          </div>

          <div className="grid gap-10 pt-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#8f99b7]">{product.discipline}</p>
              <h1 className="mt-4 font-[Syncopate] text-[3.2rem] uppercase leading-[0.9] tracking-[0.12em] text-[#f8f2ea] md:text-[5.4rem] xl:text-[7rem]">{product.code}</h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-[#cad0e2] md:text-lg">{product.heroLine}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#dfe8ff]">{product.name}</span>
                <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#9ab9ff]">{formatCurrency(product.price)} / {product.size}</span>
                <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#9ab9ff]">SOURCE // {(props.sourceLabel ?? product.source).toUpperCase()}</span>
              </div>
            </div>
            <ProductArtifact product={product} index={2} mode="hero" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1480px] gap-8 px-6 py-16 md:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-14 xl:px-16">
        <aside className="rounded-[2.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,11,22,0.94),rgba(5,7,13,0.96))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.42)] md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8f99b7]">Data panel // chassis map</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-[0.04em] text-[#f8f2ea]">成分解构面板</h2>
          <p className="mt-4 text-sm leading-7 text-[#c2c9df]">像机甲图纸、芯片参数或实验底稿那样读懂产品，而不是使用传统快消品式卖点堆叠。</p>
          <div className="mt-6 space-y-4">
            {product.stats.map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-white/8 bg-white/4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8f99b7]">{item.label}</p>
                    <p className={`mt-3 text-3xl font-semibold ${item.emphasis === "primary" ? "text-[#e6efff]" : "text-[#f8f2ea]"}`}>{item.value}</p>
                  </div>
                  <Sparkles className="mt-1 h-5 w-5 text-[#89b3ff]" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-[2.1rem] border border-white/10 bg-white/4 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-[#8f99b7]">Protocol note</p>
            <p className="mt-4 text-lg leading-8 text-[#f2ece3]">{product.formulation}</p>
            <p className="mt-4 text-sm leading-8 text-[#c2c9df]">{product.overview}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {product.notes.map((item) => (
              <div key={item} className="rounded-[1.7rem] border border-white/10 bg-white/4 p-5 text-sm leading-7 text-[#c2c9df]">{item}</div>
            ))}
          </div>
          <div className="rounded-[2.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,20,0.95),rgba(5,7,13,0.96))] p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#8f99b7]">Allocation fallback</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[0.03em] text-[#f8f2ea]">REQUEST ALLOCATION / 申请配额</h3>
              </div>
              <p className="text-xl font-semibold text-[#dfe8ff]">{formatCurrency(product.price)} / {product.size}</p>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#c2c9df]">当前先以合规暗黑弹窗承接转化意图，既保留高张力视觉，又不提前暴露未完全开放的交易节点。</p>
            <button type="button" onClick={() => setDialogOpen(true)} className="ghost-button mt-6 inline-flex h-14 items-center justify-center rounded-full px-7 text-sm font-medium uppercase tracking-[0.24em] text-[#f8f2ea]">
              REQUEST ALLOCATION / 申请配额
            </button>
          </div>
        </div>
      </section>

      <div className={`fixed inset-0 z-50 transition ${dialogOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
        <button type="button" aria-label="关闭提示" onClick={() => setDialogOpen(false)} className="absolute inset-0 bg-black/72 backdrop-blur-sm" />
        <div className="absolute inset-x-4 bottom-4 mx-auto max-w-2xl rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,11,22,0.98),rgba(5,7,13,0.98))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.6)] md:bottom-8 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8f99b7]">System drawer</p>
          <h3 className="mt-4 font-[Syncopate] text-2xl uppercase tracking-[0.1em] text-[#f8f2ea]">Allocation pending</h3>
          <p className="mt-5 text-sm leading-8 text-[#c2c9df]">{COMPLIANCE_MESSAGE}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setDialogOpen(false)} className="ghost-button inline-flex h-12 items-center justify-center rounded-full px-6 text-xs font-medium uppercase tracking-[0.24em] text-[#f8f2ea]">
              Keep channel open
            </button>
            <Link href="/showroom" className="inline-flex h-12 items-center justify-center rounded-full border border-[#9bb7ff]/24 bg-[#9bb7ff]/10 px-6 text-xs font-medium uppercase tracking-[0.24em] text-[#e3edff] transition hover:border-[#c5d6ff]/40 hover:bg-[#9bb7ff]/16">
              Return to showroom
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function ConnectedShowroomPage() {
  const showroomQuery = trpc.platform.showroomProducts.useQuery({});
  const products = useMemo(() => {
    const queryProducts = showroomQuery.data?.products ?? [];
    if (queryProducts.length === 0) {
      return SHOWROOM_PRODUCTS;
    }
    return queryProducts.map((product, index) => mapManagedProductToShowroom(product, index, showroomQuery.data?.source ?? "fallback"));
  }, [showroomQuery.data]);

  const sourceLabel = showroomQuery.data?.source === "database" ? "DATABASE" : showroomQuery.data?.source === "fallback" ? "FALLBACK" : "MOCK-LAB";

  if (showroomQuery.isLoading && !showroomQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070d] px-6 text-[#f5efe6]">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm uppercase tracking-[0.2em] text-[#cfd6ee]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Syncing showroom matrix
        </div>
      </main>
    );
  }

  return <ShowroomPage products={products} sourceLabel={sourceLabel} isSyncing={showroomQuery.isFetching} />;
}

function ConnectedProductDetailPage({ id }: { id: string }) {
  const detailQuery = trpc.platform.productDetail.useQuery(
    { slug: id },
    {
      retry: false,
    },
  );
  const fallbackProduct = getShowroomProductById(id);
  const mappedProduct = detailQuery.data ? mapManagedProductToShowroom(detailQuery.data, 0, "database") : fallbackProduct;
  const sourceLabel = detailQuery.data ? "DATABASE" : fallbackProduct?.source ?? "MOCK-LAB";

  if (detailQuery.isLoading && !mappedProduct) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070d] px-6 text-[#f5efe6]">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm uppercase tracking-[0.2em] text-[#cfd6ee]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Syncing product chassis
        </div>
      </main>
    );
  }

  return <ProductDetailPage id={id} product={mappedProduct} sourceLabel={sourceLabel} />;
}

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070d] px-6 text-[#f5efe6]">
      <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/4 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-[#8f99b7]">404</p>
        <h1 className="mt-4 font-[Syncopate] text-3xl uppercase tracking-[0.1em] text-[#f8f2ea]">Unknown object</h1>
        <p className="mt-4 text-sm leading-7 text-[#c2c9df]">该产品对象未在当前展柜矩阵中登记。你可以返回 showroom 继续检索 AP / FC 已展出的单品。</p>
        <Link href="/showroom" className="ghost-button mt-6 inline-flex h-12 items-center justify-center rounded-full px-6 text-xs font-medium uppercase tracking-[0.24em] text-[#f8f2ea]">Return</Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={ConnectedShowroomPage} />
      <Route path="/showroom" component={ConnectedShowroomPage} />
      <Route path="/product/:id">{(params) => <ConnectedProductDetailPage id={params.id} />}</Route>
      <Route component={NotFoundPage} />
    </Switch>
  );
}
