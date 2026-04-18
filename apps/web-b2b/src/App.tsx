import React, { useEffect, useMemo, useState } from "react";
import { Link, Route, Switch } from "wouter";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
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
  imageUrl?: string | null;
};

const SOURCE_LABELS: Record<ShowroomProduct["source"], string> = {
  mock: "原型档案",
  database: "数据库",
  fallback: "回退档案",
};

const SERIES_LABELS: Record<ProductSeries, string> = {
  AP: "Atmospheric Purification / 空气净域",
  FC: "Fabric Care / 织物护理",
};

const SIGNAL_COLOR: Record<ProductSeries, string> = {
  AP: "#9c7a31",
  FC: "#7a232a",
};

export const COMPLIANCE_MESSAGE =
  "// SYSTEM NOTIFICATION：当前空间节点交易通道（WeChat / Alipay）合规接入中。正式收款链路与私域商城跳转将在备案与支付钥匙生效后开启。";

const BACKUP_CHANNEL_MESSAGE =
  "在交易通道开放前，备用通讯频道将承接顾问式转化、企业微信深聊与小程序节点导流，缩短高端零售客户的决策链路。";

export const SHOWROOM_PRODUCTS: ShowroomProduct[] = [
  {
    id: "void-b03",
    code: "VOID-B03",
    name: "大气重组基质",
    subtitle: "空气净域序列 / 零售展陈对象",
    series: "AP",
    price: 298,
    size: "500ML",
    layout: "full",
    source: "mock",
    heroLine: "它不是一瓶等待被挑选的消费品，而是一块向下施压的黑色方尖碑。先让人停步、抬头、读取，再让人产生拥有它的欲望。",
    formulation: "RL-LESS PERFUME / 硫化氢解构链路 / 深空黑域压制",
    discipline: "空气净域 · 大气净化",
    overview: "面向衣橱、皮具、车内与密闭空间的高端零售展示对象。以极黑材质、少量高光和极细参数文本建立实验器物级可信度，而不是用柔和氛围讨好用户。",
    notes: [
      "中广测环境样本中，硫化氢解构率可达 93.8% 的展示级阐述已预埋至单品面板。",
      "适用于烟味、潮闷织物残留与密闭空间异味链路的高强度陈列叙事。",
      "6:3:1 审美继续保持：60% 巨物粗野，30% 绝对材质，10% 神性纹章。",
    ],
    stats: [
      { label: "硫化氢解构率", value: "93.8%", emphasis: "primary" },
      { label: "氨系抑制窗口", value: "89.4%" },
      { label: "拖拽响应时间", value: "15 MIN" },
      { label: "陈列级别", value: "LUXE RETAIL" },
    ],
  },
  {
    id: "void-d05",
    code: "VOID-D05",
    name: "暗域除味母体",
    subtitle: "空气净域序列 / 深空吸积单元",
    series: "AP",
    price: 328,
    size: "500ML",
    layout: "stacked",
    source: "mock",
    heroLine: "不是喷洒感，而是吸积感。不是轻巧去味，而是黑洞般的气味坍缩。",
    formulation: "SULFUR SHUTDOWN / TAR RESIDUE ABSORPTION / LOW-LIGHT MASS",
    discipline: "空气净域 · 重污染空间",
    overview: "用于重污染空间与深色陈列环境，以迟缓、沉重和几乎无高光的物理边界表达净化的力量。",
    notes: [
      "更适合门店入口、试香区与重污染场景的戏剧性陈列。",
      "用更大的留白让对象独立存在，而非被挤入热闹货架。",
      "高光被严格压缩，避免潮流金属哥特或多巴胺风格滑入画面。",
    ],
    stats: [
      { label: "异戊酸压制", value: "90.6%", emphasis: "primary" },
      { label: "甲硫醇抑制", value: "88.1%" },
      { label: "响应阈值", value: "T+8 MIN" },
      { label: "建议陈列批次", value: "24 LOTS" },
    ],
  },
  {
    id: "fc-le",
    code: "FC-LE",
    name: "织物精华乳",
    subtitle: "织物护理序列 / 无微胶囊静默核心",
    series: "FC",
    price: 268,
    size: "500ML",
    layout: "wide",
    source: "mock",
    heroLine: "我们不把织物护理做成柔软讨好的甜美消费幻觉，而是把它表达成一件极冷、极克制、近乎宗教器物的秩序。",
    formulation: "赢创 RL 100 / ZERO CAPSULE / TEXTILE DISCIPLINE",
    discipline: "织物护理 · 高价值纤维",
    overview: "面向礼服、真丝与贴身高级织物，以冷白参数和极小字号组织强技术感，同时保留高奢环境中的绝对克制。",
    notes: [
      "以赢创 RL 100 作为核心技术铭文嵌入单品页。",
      "无微胶囊表达避免廉价香精化联想。",
      "排版保持程序式与实验仪器式的冷静，不做柔顺广告片。",
    ],
    stats: [
      { label: "赢创 RL 100", value: "ENABLED", emphasis: "primary" },
      { label: "微胶囊含量", value: "0" },
      { label: "静电平衡", value: "PHASE IV" },
      { label: "触感增益", value: "+27%" },
    ],
  },
  {
    id: "fc-ic",
    code: "FC-IC",
    name: "内衣安净乳",
    subtitle: "织物护理序列 / 贴身洁净对象",
    series: "FC",
    price: 238,
    size: "500ML",
    layout: "stacked",
    source: "mock",
    heroLine: "将洁净表达为黑碑上的细线与坐标，而不是任何圆润、温吞、带生活方式滤镜的表情。",
    formulation: "DELICATE SURFACE CARE / COLD WHITE INDEX / QUIET HYGIENE",
    discipline: "织物护理 · 贴身场景",
    overview: "面向贴身织物与敏感纤维护理，以安静却锋利的边界、低饱和参数与冷白信息结构建立可信度。",
    notes: [
      "适用于贴身衣物与敏感纤维护理。",
      "更适合在高净值零售顾问式介绍中承接成交。",
      "通过极小参数和直角分区维持医疗器械级冷静感。",
    ],
    stats: [
      { label: "微胶囊含量", value: "0", emphasis: "primary" },
      { label: "纯净阈值", value: "98.2" },
      { label: "纤维负荷", value: "LOW" },
      { label: "建议陈列批次", value: "18 LOTS" },
    ],
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
  return SERIES_LABELS[series];
}

function getLayoutByIndex(index: number): ShowroomProduct["layout"] {
  if (index === 0) return "full";
  return index % 3 === 0 ? "wide" : "stacked";
}

function normalizeStatLabel(label: string) {
  return label.replace(/_/g, " ");
}

function mapManagedProductToShowroom(product: ManagedProductQueryRecord, index: number, source: "database" | "fallback"): ShowroomProduct {
  const series = product.series ?? (product.code.startsWith("FC") ? "FC" : "AP");
  const specs = (product.specs?.length ? product.specs : [{ key: "状态", value: product.status.toUpperCase() }]).slice(0, 4);

  return {
    id: product.slug || product.code.toLowerCase(),
    code: product.code,
    name: product.name,
    subtitle: product.subtitle || `${getSeriesLabel(series)} / 零售展陈对象`,
    series,
    price: typeof product.price === "number" ? product.price : 0,
    size: product.imageUrl ? "ARCHIVE ASSET" : "500ML",
    layout: getLayoutByIndex(index),
    source,
    heroLine: product.description || `${product.name} 已接入真实商品池，并以零售展陈对象而非普通货架 SKU 的方式被陈列。`,
    formulation:
      product.specs && product.specs.length > 0
        ? product.specs
            .slice(0, 3)
            .map((item) => `${normalizeStatLabel(item.key).toUpperCase()} // ${item.value}`)
            .join(" // ")
        : `${getSeriesLabel(series).toUpperCase()} // ${product.code} // ${product.status.toUpperCase()}`,
    discipline: series === "AP" ? "空气净域 · 零售展陈" : "织物护理 · 零售展陈",
    overview: product.description || product.subtitle || "当前条目已进入真实商品池，可继续补充更具零售转化力的实验档案与顾问式陈列文案。",
    notes:
      product.specs && product.specs.length > 0
        ? product.specs.slice(0, 3).map((item) => `${normalizeStatLabel(item.key)}：${item.value}`)
        : ["当前商品已从后台同步", "可继续补充 specs 参数", "PDP 会自动复用这些参数构建设备式数据面板"],
    stats: specs.map((item, itemIndex) => ({
      label: normalizeStatLabel(item.key),
      value: item.value,
      emphasis: itemIndex === 0 ? "primary" : "secondary",
    })),
    imageUrl: product.imageUrl,
  };
}

function getProductSignalColor(product: ShowroomProduct) {
  return SIGNAL_COLOR[product.series];
}

export function getShowroomProductById(id: string, products: ShowroomProduct[] = SHOWROOM_PRODUCTS) {
  return products.find((product) => product.id === id || product.code.toLowerCase() === id.toLowerCase()) ?? null;
}

function BrandMark() {
  return (
    <div className="flex items-center gap-4">
      <div className="monolith-badge flex h-12 w-12 items-center justify-center font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f3efe6]">IC</div>
      <div>
        <p className="font-zh-sans text-sm font-semibold tracking-[0.42em] text-[#f3efe6]">ICLOUSH LAB.</p>
        <p className="micro-copy mt-1 text-[#7f7f7f]">数字展柜协议 / 06 : 03 : 01</p>
      </div>
    </div>
  );
}

function Crosshair({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crosshair ${className}`.trim()} />;
}

function ProductArtifact({ product, index, mode = "card" }: { product: ShowroomProduct; index: number; mode?: "card" | "hero" }) {
  const isHero = mode === "hero";
  const signal = getProductSignalColor(product);

  return (
    <div
      data-testid={isHero ? "artifact-hero" : "artifact-card"}
      className={`relative overflow-hidden border border-[#1d1d1d] bg-black ${isHero ? "h-[32rem] md:h-[42rem]" : "h-[24rem] md:h-[30rem]"}`}
      style={{ clipPath: "polygon(0 0, calc(100% - 2rem) 0, 100% 2rem, 100% 100%, 2rem 100%, 0 calc(100% - 2rem))" }}
    >
      <div className="hairline-grid absolute inset-0 opacity-60" />
      <div className="absolute inset-x-6 top-6 flex items-start justify-between">
        <div className="micro-copy text-[#737373]">OBJECT // {String(index + 1).padStart(2, "0")}</div>
        <div className="micro-copy text-[#737373]">{product.code}</div>
      </div>
      <Crosshair className="left-6 top-14" />
      <Crosshair className="bottom-10 right-8" />
      <div
        className="absolute inset-x-[12%] bottom-[12%] top-[12%] border border-[#232323]"
        style={{ clipPath: "polygon(0 0, calc(100% - 1.5rem) 0, 100% 1.5rem, 100% 100%, 1.5rem 100%, 0 calc(100% - 1.5rem))" }}
      />
      <div className="absolute bottom-[9%] left-[14%] right-[14%] h-px bg-[#242424]" />
      <div className="absolute left-[12%] top-[14%] bottom-[14%] w-px bg-[#191919]" />
      <div className="absolute right-[12%] top-[14%] bottom-[14%] w-px bg-[#191919]" />

      {product.imageUrl ? (
        <div className="absolute inset-x-[18%] bottom-[10%] top-[18%] flex items-center justify-center">
          <img src={product.imageUrl} alt={product.name} className="max-h-full max-w-full object-contain grayscale contrast-125" />
        </div>
      ) : (
        <>
          <div
            className="absolute left-1/2 top-[16%] h-[64%] w-[24%] -translate-x-1/2 border border-[#303030] bg-[#050505]"
            style={{ clipPath: "polygon(16% 0, 84% 0, 100% 12%, 100% 100%, 0 100%, 0 12%)" }}
          />
          <div className="absolute left-1/2 top-[13%] h-[7%] w-[10%] -translate-x-1/2 border border-[#303030] bg-[#040404]" />
          <div className="absolute left-1/2 top-[24%] h-px w-[24%] -translate-x-1/2 bg-[#2f2f2f]" />
          <div className="absolute left-1/2 top-[31%] h-px w-[24%] -translate-x-1/2 bg-[#262626]" />
          <div className="absolute left-1/2 top-[38%] h-px w-[24%] -translate-x-1/2 bg-[#262626]" />
          <div className="absolute left-1/2 top-[45%] h-px w-[24%] -translate-x-1/2 bg-[#262626]" />
        </>
      )}

      <div className="absolute left-[8%] top-[8%] h-[68%] w-px bg-[#101010]" style={{ transform: `translateY(${Math.min(index * 8, 24)}px)` }} />
      <div className="absolute right-[10%] top-[22%] bottom-[12%] w-px" style={{ backgroundColor: `${signal}55` }} />
      <div className="absolute bottom-[10%] right-[12%] flex items-center gap-3">
        <span className="h-px w-12" style={{ backgroundColor: signal }} />
        <span className="micro-copy" style={{ color: signal }}>
          SIGNAL
        </span>
      </div>
    </div>
  );
}

function ProductMetaBand({ product }: { product: ShowroomProduct }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="micro-pill">{product.code}</span>
      <span className="micro-pill">{getSeriesLabel(product.series)}</span>
      <span className="micro-pill">{product.size}</span>
    </div>
  );
}

function MetricPanel({ value, label, description }: { value: string; label: string; description: string }) {
  return (
    <div className="monolith-panel px-4 py-5">
      <p className="font-zh-sans text-[2rem] font-semibold leading-none tracking-[0.28em] text-[#f3efe6] md:text-[2.4rem]">{value}</p>
      <p className="micro-copy mt-3 text-[#7f7f7f]">{label}</p>
      <p className="mt-3 text-sm leading-7 text-[#9b9388]">{description}</p>
    </div>
  );
}

export function ShowroomPage(props?: { products?: ShowroomProduct[]; sourceLabel?: string; isSyncing?: boolean }) {
  const products = props?.products ?? SHOWROOM_PRODUCTS;
  const sourceLabel = props?.sourceLabel ?? (products.every((product) => product.source === "database") ? "数据库" : "原型档案");
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

  const featured = products[0] ?? SHOWROOM_PRODUCTS[0];

  return (
    <main className="min-h-screen bg-[#000000] text-[#f3efe6]">
      <section className="relative overflow-hidden border-b border-[#151515]">
        <div className="noise-layer absolute inset-0 opacity-35" />
        <div className="absolute inset-x-0 top-[-12%] h-[44rem]" style={{ transform: `translateY(${Math.min(scrollY * 0.08, 36)}px)` }}>
          <div className="absolute left-[10%] top-[8%] h-[36rem] w-[17rem] border border-[#121212] bg-[#030303]" style={{ clipPath: "polygon(18% 0, 82% 0, 100% 14%, 100% 100%, 0 100%, 0 14%)" }} />
          <div className="absolute right-[12%] top-[18%] h-[28rem] w-[11rem] border border-[#101010] bg-[#010101]" style={{ clipPath: "polygon(0 0, calc(100% - 1.25rem) 0, 100% 1.25rem, 100% 100%, 1.25rem 100%, 0 calc(100% - 1.25rem))" }} />
          <div className="absolute left-[25%] top-[16%] h-px w-[28%] bg-[#171717]" />
          <div className="absolute right-[20%] bottom-[10%] h-px w-[20%] bg-[#141414]" />
        </div>

        <div className="relative mx-auto max-w-[1520px] px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <header className="flex items-start justify-between gap-8 border-b border-[#151515] pb-6">
            <Link href="/showroom">
              <BrandMark />
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <Link href="/showroom" className="micro-copy text-[#8a8a8a] hover:text-[#f3efe6]">
                数字展柜
              </Link>
              <a href="#sequence" className="micro-copy text-[#8a8a8a] hover:text-[#f3efe6]">
                对象序列
              </a>
              <a href="#allocation" className="micro-copy text-[#8a8a8a] hover:text-[#f3efe6]">
                转化通道
              </a>
            </nav>
          </header>

          <div className="grid gap-12 py-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <p className="micro-copy text-[#7f7f7f]">PARACAUSAL RETAIL DISPLAY / 中文主场 / 黑色祭坛协议</p>
              <h1 className="display-title mt-6 max-w-[7ch] text-[#f3efe6]">
                深空展柜
              </h1>
              <p className="mt-8 max-w-3xl font-zh-serif text-base leading-9 text-[#b7aea3] md:text-lg">
                这里不是柔软讨好的消费场。这里是面向中文区高端众奢与高奢零售顾问式转化的黑色祭坛：巨物压迫、材质赤裸、参数极小、纹章稀薄，先建立敬畏，再启动沟通，再导向成交。
              </p>
              <div className="mt-8 grid max-w-4xl gap-3 md:grid-cols-3">
                <MetricPanel value="60" label="巨物粗野" description="用悬浮体块、深空留白与俯视/仰视尺度建立压迫感。" />
                <MetricPanel value="30" label="绝对材质" description="只保留纯黑、边线、倒角、冷白字重，不使用玻璃与流体糖衣。" />
                <MetricPanel value="10" label="神性纹章" description="以准星、坐标、点阵与微型参数做低比例神谕式装饰。" />
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a href="#sequence" className="monolith-button inline-flex h-14 items-center justify-center px-7 text-xs font-medium tracking-[0.34em]">
                  进入对象序列
                </a>
                <Link href={`/object/${featured.id}`} className="monolith-button inline-flex h-14 items-center justify-center px-7 text-xs font-medium tracking-[0.34em]">
                  查看签名对象
                </Link>
              </div>
            </div>

            <aside className="monolith-panel p-6 md:p-8">
              <div className="flex items-start justify-between gap-6 border-b border-[#191919] pb-5">
                <div>
                  <p className="micro-copy text-[#7f7f7f]">数据来源</p>
                  <p className="mt-4 font-zh-sans text-[1.9rem] font-semibold tracking-[0.24em] text-[#f3efe6] md:text-[2.5rem]">{sourceLabel}</p>
                </div>
                <div className="micro-pill" style={{ borderColor: "#3a2d10", color: "#9c7a31" }}>
                  合规回退启用
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "陈列域", value: "高端零售" },
                  { label: "对象数量", value: String(products.length).padStart(2, "0") },
                  { label: "视角规则", value: "仰视蚁群" },
                  { label: "拖拽系数", value: "ABYSS 0.08" },
                ].map((item) => (
                  <div key={item.label} className="monolith-panel px-4 py-5">
                    <p className="micro-copy text-[#6f6f6f]">{item.label}</p>
                    <p className="mt-3 font-zh-sans text-lg font-semibold tracking-[0.12em] text-[#f3efe6]">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm leading-8 text-[#a89f94]">
                {props?.isSyncing
                  ? "真实商品池正在同步。即使数据短暂延迟，前台仍会保持当前黑色祭坛结构，不会退回普通商品列表。"
                  : "当前版本优先读取真实商品池，并在合规过渡阶段保留回退档案与备用通讯频道，以持续承接顾问式高端零售转化。"}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section id="sequence" className="mx-auto max-w-[1520px] px-6 py-16 md:px-10 lg:px-14 xl:px-16">
        <div className="mb-12 grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="micro-copy text-[#7f7f7f]">OBJECT SEQUENCE / 中文展陈</p>
            <h2 className="display-subtitle mt-4 text-[#f3efe6]">错落瀑布流</h2>
          </div>
          <p className="max-w-3xl font-zh-serif text-sm leading-8 text-[#a89f94] md:text-base">
            一行不超过两件对象。核心单品独占整行，其余对象以不对称体块与深色留白穿插。背景巨物只做极轻视差，像深渊在缓慢拖拽画面，而不是做炫技式滚动秀场。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 xl:gap-8">
          {products.map((product, index) => {
            const columnClassName = product.layout === "full" ? "lg:col-span-12" : product.layout === "wide" ? "lg:col-span-7" : "lg:col-span-5";
            const parallaxStyle = { transform: `translateY(${Math.min(scrollY * (0.02 + index * 0.004), 28)}px)` };
            const signal = getProductSignalColor(product);

            return (
              <article key={product.id} style={parallaxStyle} className={`${columnClassName} group relative border border-[#181818] bg-black p-5 md:p-7`}>
                <div
                  className="absolute inset-0 opacity-100"
                  style={{
                    clipPath: "polygon(0 0, calc(100% - 1.75rem) 0, 100% 1.75rem, 100% 100%, 1.75rem 100%, 0 calc(100% - 1.75rem))",
                    border: "1px solid #181818",
                  }}
                />
                <div className="absolute inset-0 hairline-grid opacity-50" />
                <div className="relative grid gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
                  <ProductArtifact product={product} index={index} />
                  <div>
                    <ProductMetaBand product={product} />
                    <h3 className="mt-5 max-w-[8ch] font-zh-sans text-[2.6rem] font-semibold leading-[0.92] tracking-[0.22em] text-[#f3efe6] md:text-[4rem]">
                      {product.name}
                    </h3>
                    <p className="micro-copy mt-4" style={{ color: signal }}>
                      {product.subtitle}
                    </p>
                    <p className="mt-6 max-w-2xl font-zh-serif text-sm leading-8 text-[#a89f94] md:text-base">{product.overview}</p>
                    <div className="mt-7 grid gap-3 md:grid-cols-2">
                      {product.stats.slice(0, 2).map((item) => (
                        <div key={item.label} className="monolith-panel px-4 py-5">
                          <p className="micro-copy text-[#6f6f6f]">{item.label}</p>
                          <p className={`mt-4 font-zh-sans text-[1.7rem] font-semibold leading-none tracking-[0.16em] ${item.emphasis === "primary" ? "text-[#f3efe6]" : "text-[#c2b6a0]"}`}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="micro-copy text-[#7f7f7f]">建议零售价</p>
                        <p className="mt-3 font-zh-sans text-[1.9rem] font-semibold leading-none tracking-[0.14em] text-[#f3efe6]">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <Link href={`/object/${product.id}`} className="monolith-button inline-flex h-12 items-center justify-center px-5 text-[11px] font-medium tracking-[0.3em]">
                        查看对象档案
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

      <section id="allocation" className="border-t border-[#151515] bg-black">
        <div className="mx-auto grid max-w-[1520px] gap-6 px-6 py-16 md:px-10 lg:grid-cols-[0.75fr_1.25fr] lg:px-14 xl:px-16">
          <div>
            <p className="micro-copy text-[#7f7f7f]">CONVERSION DISCIPLINE</p>
            <h2 className="display-subtitle mt-4 text-[#f3efe6]">转化通道</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "当前前台面向中文区高端零售与顾问式成交，不再使用企业团体采购口吻。",
              "按钮继续保持透明边框与硬切反白反馈，不使用阴影、玻璃、液态过渡或温和亲和的填充块。",
              "在正式支付接入前，所有主转化动作通过系统通知层承接，并为企业微信与小程序导流预留显眼节点。",
            ].map((item) => (
              <div key={item} className="monolith-panel p-5 font-zh-serif text-sm leading-8 text-[#a89f94]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function DataPanelRow({ label, value, signal }: { label: string; value: string; signal: string }) {
  return (
    <div className="monolith-panel px-4 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="micro-copy text-[#6f6f6f]">{label}</p>
          <p className="mt-4 font-zh-sans text-[2rem] font-semibold leading-none tracking-[0.14em] text-[#f3efe6]">{value}</p>
        </div>
        <div className="micro-copy mt-1" style={{ color: signal }}>
          +
        </div>
      </div>
    </div>
  );
}

function AllocationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <button type="button" aria-label="关闭提示" onClick={onClose} className="absolute inset-0 bg-black/92" />
      <div
        className="absolute inset-x-4 bottom-4 mx-auto max-w-3xl border border-[#1f1f1f] bg-[#020202] p-6 md:bottom-8 md:p-8"
        style={{ clipPath: "polygon(0 0, calc(100% - 2rem) 0, 100% 2rem, 100% 100%, 2rem 100%, 0 calc(100% - 2rem))" }}
      >
        <div className="hairline-grid absolute inset-0 opacity-45" />
        <div className="relative">
          <p className="micro-copy text-[#7f7f7f]">SYSTEM GATE</p>
          <h3 className="display-subtitle mt-4 text-[#f3efe6]">申请配额</h3>
          <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">{COMPLIANCE_MESSAGE}</p>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="channel-frame p-5">
              <p className="micro-copy text-[#7f7f7f]">备用通讯频道 A</p>
              <h4 className="mt-4 font-zh-sans text-xl font-semibold tracking-[0.16em] text-[#f3efe6]">企业微信顾问</h4>
              <p className="mt-4 font-zh-serif text-sm leading-8 text-[#a89f94]">顾问式讲解、成分细聊、门店零售训练与高净值客户私域转化，将优先通过该频道承接。</p>
              <div className="qr-placeholder mt-6" aria-label="企业微信二维码占位">
                <span className="micro-copy text-[#7f7f7f]">Q R / PLACEHOLDER</span>
              </div>
            </div>
            <div className="channel-frame p-5">
              <p className="micro-copy text-[#7f7f7f]">备用通讯频道 B</p>
              <h4 className="mt-4 font-zh-sans text-xl font-semibold tracking-[0.16em] text-[#f3efe6]">小程序节点预留</h4>
              <p className="mt-4 font-zh-serif text-sm leading-8 text-[#a89f94]">一旦备案与支付钥匙就位，当前节点将切换为私域商城跳转，直接缩短购买决策路径与复购路径。</p>
              <div className="qr-placeholder mt-6" aria-label="小程序二维码占位">
                <span className="micro-copy text-[#7f7f7f]">MINI PROGRAM / RESERVED</span>
              </div>
            </div>
          </div>
          <p className="mt-6 font-zh-serif text-sm leading-8 text-[#978f84]">{BACKUP_CHANNEL_MESSAGE}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onClose} className="monolith-button inline-flex h-12 items-center justify-center px-6 text-[11px] font-medium tracking-[0.3em]">
              保持频道开启
            </button>
            <Link href="/showroom" className="monolith-button inline-flex h-12 items-center justify-center px-6 text-[11px] font-medium tracking-[0.3em]">
              返回数字展柜
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailPage(props: { id: string; product?: ShowroomProduct | null; sourceLabel?: string }) {
  const product = props.product ?? getShowroomProductById(props.id);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!product) {
    return <NotFoundPage />;
  }

  const signal = getProductSignalColor(product);
  const archiveSource = SOURCE_LABELS[(props.sourceLabel?.toLowerCase() as ShowroomProduct["source"]) ?? product.source] ?? props.sourceLabel ?? SOURCE_LABELS[product.source];
  const experimentRows =
    product.series === "FC"
      ? [
          { label: "核心成分", value: "赢创 RL 100" },
          { label: "微胶囊含量", value: "0" },
          { label: "纤维静电平衡", value: "PHASE IV" },
          { label: "建议陈列环境", value: "高端衣橱 / 奢品门店" },
        ]
      : [
          { label: "硫化氢解构率", value: "93.8%" },
          { label: "污染压制窗口", value: "15 MIN" },
          { label: "适用空间", value: "衣橱 / 皮具 / 车内" },
          { label: "建议陈列环境", value: "众奢 / 高奢零售" },
        ];

  return (
    <main className="min-h-screen bg-[#000000] text-[#f3efe6]">
      <section className="relative overflow-hidden border-b border-[#151515] pb-20">
        <div className="noise-layer absolute inset-0 opacity-35" />
        <div className="mx-auto max-w-[1520px] px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <div className="flex items-center justify-between gap-5 border-b border-[#151515] pb-6">
            <Link href="/showroom" className="micro-copy inline-flex items-center gap-2 text-[#8a8a8a] hover:text-[#f3efe6]">
              <ArrowLeft className="h-4 w-4" />
              返回数字展柜
            </Link>
            <div className="micro-pill">{getSeriesLabel(product.series)}</div>
          </div>

          <div className="grid gap-10 pt-10 xl:grid-cols-[1.04fr_0.96fr] xl:items-end">
            <div>
              <p className="micro-copy" style={{ color: signal }}>
                {product.discipline}
              </p>
              <h1 className="display-title mt-4 max-w-[7ch] text-[#f3efe6]">
                {product.name}
              </h1>
              <p className="mt-6 font-zh-sans text-xl font-semibold tracking-[0.2em] text-[#d8d0c6]">{product.code}</p>
              <p className="mt-6 max-w-3xl font-zh-serif text-base leading-9 text-[#a89f94] md:text-lg">{product.heroLine}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="micro-pill">{formatCurrency(product.price)} / {product.size}</span>
                <span className="micro-pill">来源 // {archiveSource}</span>
                <span className="micro-pill">对象档案</span>
              </div>
            </div>
            <ProductArtifact product={product} index={2} mode="hero" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1520px] gap-8 px-6 py-16 md:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-14 xl:px-16">
        <aside className="monolith-panel p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-[#181818] pb-5">
            <div>
              <p className="micro-copy text-[#7f7f7f]">实验数据面板</p>
              <h2 className="display-subtitle mt-4 text-[#f3efe6]">成分解构</h2>
            </div>
            <Crosshair />
          </div>
          <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">像读取高维器物的工程铭文一样去读取参数，而不是堆叠传统电商卖点。所有信息以冷白、等宽、克制的方式展开。</p>
          <div className="mt-6 space-y-4">
            {experimentRows.map((item) => (
              <DataPanelRow key={item.label} label={item.label} value={item.value} signal={signal} />
            ))}
            {product.stats.map((item) => (
              <DataPanelRow key={`${item.label}-${item.value}`} label={item.label} value={item.value} signal={signal} />
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="monolith-panel p-6 md:p-8">
            <p className="micro-copy text-[#7f7f7f]">协议注记</p>
            <p className="mt-4 font-zh-sans text-lg leading-8 text-[#f3efe6]">{product.formulation}</p>
            <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">{product.overview}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {product.notes.map((item) => (
              <div key={item} className="monolith-panel p-5 font-zh-serif text-sm leading-8 text-[#a89f94]">
                {item}
              </div>
            ))}
          </div>
          <div className="monolith-panel p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="micro-copy text-[#7f7f7f]">主转化入口</p>
                <h3 className="display-subtitle mt-3 text-[#f3efe6]">申请配额</h3>
              </div>
              <p className="font-zh-sans text-[1.8rem] font-semibold leading-none tracking-[0.16em] text-[#f3efe6]">{formatCurrency(product.price)}</p>
            </div>
            <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">当前以前台系统提示层承接高净值零售转化意图，并为企业微信与小程序导流预埋显眼节点，以在支付 API 开放后无缝切换到直单链路。</p>
            <button type="button" onClick={() => setDialogOpen(true)} className="monolith-button mt-6 inline-flex h-14 items-center justify-center px-7 text-xs font-medium tracking-[0.34em]">
              REQUEST ALLOCATION / 申请配额
            </button>
          </div>
        </div>
      </section>

      <AllocationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </main>
  );
}

function ConnectedShowroomPage() {
  const showroomQuery = trpc.retail.galleryObjects.useQuery({});
  const products = useMemo(() => {
    const queryProducts = showroomQuery.data?.products ?? [];
    if (queryProducts.length === 0) {
      return SHOWROOM_PRODUCTS;
    }
    return queryProducts.map((product, index) => mapManagedProductToShowroom(product, index, showroomQuery.data?.source ?? "fallback"));
  }, [showroomQuery.data]);

  const sourceLabel = SOURCE_LABELS[showroomQuery.data?.source ?? "mock"];

  if (showroomQuery.isLoading && !showroomQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#000000] px-6 text-[#f3efe6]">
        <div className="monolith-panel flex items-center gap-3 px-5 py-4 text-sm tracking-[0.24em] text-[#c7c0b5]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          正在同步零售档案
        </div>
      </main>
    );
  }

  return <ShowroomPage products={products} sourceLabel={sourceLabel} isSyncing={showroomQuery.isFetching} />;
}

function ConnectedProductDetailPage({ id }: { id: string }) {
  const detailQuery = trpc.retail.objectDetail.useQuery(
    { slug: id },
    {
      retry: false,
    },
  );
  const fallbackProduct = getShowroomProductById(id);
  const mappedProduct = detailQuery.data ? mapManagedProductToShowroom(detailQuery.data, 0, "database") : fallbackProduct;
  const sourceLabel = detailQuery.data ? "database" : fallbackProduct?.source ?? "mock";

  if (detailQuery.isLoading && !mappedProduct) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#000000] px-6 text-[#f3efe6]">
        <div className="monolith-panel flex items-center gap-3 px-5 py-4 text-sm tracking-[0.24em] text-[#c7c0b5]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          正在同步对象档案
        </div>
      </main>
    );
  }

  return <ProductDetailPage id={id} product={mappedProduct} sourceLabel={sourceLabel} />;
}

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#000000] px-6 text-[#f3efe6]">
      <div className="monolith-panel max-w-xl p-8 text-center">
        <p className="micro-copy text-[#7f7f7f]">404</p>
        <h1 className="display-subtitle mt-4 text-[#f3efe6]">未知对象</h1>
        <p className="mt-4 font-zh-serif text-sm leading-8 text-[#a89f94]">该对象未在当前零售祭坛中登记。你可以返回数字展柜继续检索空气净域与织物护理单品。</p>
        <Link href="/showroom" className="monolith-button mt-6 inline-flex h-12 items-center justify-center px-6 text-[11px] font-medium tracking-[0.3em]">
          返回数字展柜
        </Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={ConnectedShowroomPage} />
      <Route path="/gallery" component={ConnectedShowroomPage} />
      <Route path="/showroom" component={ConnectedShowroomPage} />
      <Route path="/object/:id">{(params) => <ConnectedProductDetailPage id={params.id} />}</Route>
      <Route path="/product/:id">{(params) => <ConnectedProductDetailPage id={params.id} />}</Route>
      <Route component={NotFoundPage} />
    </Switch>
  );
}
