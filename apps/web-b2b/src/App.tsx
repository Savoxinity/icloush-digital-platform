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
  accent?: {
    glow: string;
    metal: string;
    liquid: string;
  };
};

export const COMPLIANCE_MESSAGE =
  "// SYSTEM NOTIFICATION：当前空间节点合规接入中（ICP备案审核中）。预计将于本月下旬开放全域配额申请，请保留此通讯频段。";

const OBELISK_ACCENT: Record<ProductSeries, string> = {
  AP: "#8d6b24",
  FC: "#6c0f14",
};

export const SHOWROOM_PRODUCTS: ShowroomProduct[] = [
  {
    id: "void-b03",
    code: "VOID-B03",
    name: "大气重组基质",
    subtitle: "Atmospheric Purification / retail ritual object",
    series: "AP",
    price: 298,
    size: "500ML",
    layout: "full",
    source: "mock",
    heroLine: "像黑色方尖碑一样立于真空，而不是像消费品一样等待被挑选。它先制造敬畏，再触发购买。",
    formulation: "ODOR COLLAPSE // CARBON LATTICE // SULFUR CHANNEL SHUTDOWN",
    discipline: "ATMOSPHERIC PURIFICATION",
    overview: "针对烟味、潮闷织物残留与密闭空间异味链路，以冷黑实验档案和极小参数文本建立可信度，让用户感到自己正在读取一件高维护理器物。",
    notes: ["适用于衣橱、皮具、车内皮饰与密闭空间", "以低饱和黑金高光强调神圣与不可侵犯", "主视觉秩序遵循 6:3:1：巨物粗野 / 绝对材质 / 神性纹章"],
    stats: [
      { label: "SULFIDE COLLAPSE", value: "93.8%", emphasis: "primary" },
      { label: "AMMONIA REDUCTION", value: "89.4%" },
      { label: "TAR RESIDUE SUPPRESS", value: "91.2%" },
      { label: "EXPOSURE WINDOW", value: "15 MIN" },
    ],
    accent: {
      glow: "rgba(141,107,36,0.28)",
      metal: "#0a0a0a",
      liquid: "#050505",
    },
  },
  {
    id: "void-d05",
    code: "VOID-D05",
    name: "暗域除味母体",
    subtitle: "Atmospheric Purification / monolith absorption engine",
    series: "AP",
    price: 328,
    size: "500ML",
    layout: "stacked",
    source: "mock",
    heroLine: "以更沉重、更迟缓的构图来表达污染压制，不做动感潮玩，而做深空吸积。",
    formulation: "VOID CAPTURE // TAR REDUCTION // ABSORBENT MASS",
    discipline: "ATMOSPHERIC PURIFICATION",
    overview: "面向重污染空间与深色场景陈列，通过更大的负空间和更冷的物理边界传递价值密度。",
    notes: ["适用于重污染试香区与高端商业空间入口", "以几乎不可见的金属反射替代夸张渐变", "强化“暗域 / 深空 / 吸积”命名秩序"],
    stats: [
      { label: "ISOVALERIC ACID", value: "90.6%", emphasis: "primary" },
      { label: "METHYL MERCAPTAN", value: "88.1%" },
      { label: "RESPONSE WINDOW", value: "T+8 MIN" },
      { label: "ALLOCATION LOTS", value: "24" },
    ],
    accent: {
      glow: "rgba(141,107,36,0.22)",
      metal: "#090909",
      liquid: "#040404",
    },
  },
  {
    id: "fc-le",
    code: "FC-LE",
    name: "织物精华乳",
    subtitle: "Fabric Care Deluxe / silent textile core",
    series: "FC",
    price: 268,
    size: "500ML",
    layout: "wide",
    source: "mock",
    heroLine: "不把柔顺做成讨好性的闪亮，而把它变成一种冷静、禁欲、近乎宗教器物的织物秩序。",
    formulation: "TEXTILE DISCIPLINE // RL100 VECTOR // CAPSULE-FREE CARE",
    discipline: "FABRIC CARE DELUXE",
    overview: "面向高价值织物和礼服级护理场景，以极简矢量秩序、冷白参数与沉默的材质切面建立高奢可信度。",
    notes: ["强调无微胶囊的克制路线", "适配高端衣橱与贴身纤维护理场景", "不靠玻璃光效，而靠材质本体与边界张力发光"],
    stats: [
      { label: "RL100 VECTOR", value: "ENABLED", emphasis: "primary" },
      { label: "CAPSULE CONTENT", value: "0" },
      { label: "STATIC BALANCE", value: "PHASE IV" },
      { label: "TACTILE GAIN", value: "+27%" },
    ],
    accent: {
      glow: "rgba(108,15,20,0.24)",
      metal: "#090909",
      liquid: "#040404",
    },
  },
  {
    id: "fc-ic",
    code: "FC-IC",
    name: "内衣安净乳",
    subtitle: "Fabric Care Deluxe / intimate silent wash object",
    series: "FC",
    price: 238,
    size: "500ML",
    layout: "stacked",
    source: "mock",
    heroLine: "将“洁净”表达成一块无机黑碑上的极细坐标，而不是任何温吞、圆润、带生活方式滤镜的表情。",
    formulation: "DELICATE SURFACE CARE // COLD WHITE INDEX // QUIET HYGIENE",
    discipline: "FABRIC CARE DELUXE",
    overview: "面向贴身织物与敏感纤维护理场景，强调洁净秩序、冷白参数和安静却锋利的高级感。",
    notes: ["适用于贴身衣物与敏感纤维护理", "通过极小字号和直角分区建立医疗器械级冷静感", "与 FC-LE 形成同系统下的不同触感密度"],
    stats: [
      { label: "CAPSULE CONTENT", value: "0", emphasis: "primary" },
      { label: "PURITY THRESHOLD", value: "98.2" },
      { label: "FIBER BURDEN", value: "LOW" },
      { label: "ALLOCATION LOTS", value: "18" },
    ],
    accent: {
      glow: "rgba(108,15,20,0.18)",
      metal: "#090909",
      liquid: "#040404",
    },
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
  return series === "AP" ? "ATMOSPHERIC PURIFICATION" : "FABRIC CARE DELUXE";
}

function getLayoutByIndex(index: number): ShowroomProduct["layout"] {
  if (index === 0) return "full";
  return index % 3 === 0 ? "wide" : "stacked";
}

function mapManagedProductToShowroom(product: ManagedProductQueryRecord, index: number, source: "database" | "fallback"): ShowroomProduct {
  const series = product.series ?? (product.code.startsWith("FC") ? "FC" : "AP");
  const stats = (product.specs?.length ? product.specs : [{ key: "STATUS", value: product.status.toUpperCase() }])
    .slice(0, 4)
    .map((item, itemIndex) => ({
      label: item.key.toUpperCase(),
      value: item.value,
      emphasis: itemIndex === 0 ? "primary" : "secondary",
    })) as ProductSpec[];

  return {
    id: product.slug || product.code.toLowerCase(),
    code: product.code,
    name: product.name,
    subtitle: product.subtitle || `${getSeriesLabel(series)} / RETAIL RITUAL OBJECT`,
    series,
    price: typeof product.price === "number" ? product.price : 0,
    size: product.imageUrl ? "ARCHIVE ASSET" : "500ML",
    layout: getLayoutByIndex(index),
    source,
    heroLine: product.description || `${product.name} 被陈列为面向高端零售的黑色器物，而不是普通货架 SKU。`,
    formulation:
      product.specs && product.specs.length > 0
        ? product.specs
            .slice(0, 3)
            .map((item) => `${item.key.toUpperCase()} // ${item.value}`)
            .join(" // ")
        : `${getSeriesLabel(series)} // ${product.code} // ${product.status.toUpperCase()}`,
    discipline: getSeriesLabel(series),
    overview: product.description || product.subtitle || "当前条目已接入真实商品池，可继续补充更具零售转化力的器物档案说明。",
    notes:
      product.specs && product.specs.length > 0
        ? product.specs.slice(0, 3).map((item) => `${item.key.toUpperCase()}：${item.value}`)
        : ["当前商品已从后台同步", "可继续补充 specs 参数", "PDP 会自动复用这些参数构建设备式数据面板"],
    stats,
    imageUrl: product.imageUrl,
    accent: {
      glow: `${OBELISK_ACCENT[series]}22`,
      metal: "#090909",
      liquid: "#040404",
    },
  };
}

function getProductSignalColor(product: ShowroomProduct) {
  return OBELISK_ACCENT[product.series];
}

export function getShowroomProductById(id: string, products: ShowroomProduct[] = SHOWROOM_PRODUCTS) {
  return products.find((product) => product.id === id || product.code.toLowerCase() === id.toLowerCase()) ?? null;
}

function BrandMark() {
  return (
    <div className="flex items-center gap-4">
      <div className="monolith-badge flex h-12 w-12 items-center justify-center font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f3efe6]">IC</div>
      <div>
        <p className="font-[Syncopate] text-sm uppercase tracking-[0.3em] text-[#f3efe6]">iCloush LAB.</p>
        <p className="micro-copy mt-1 text-[#7f7f7f]">MONOLITH RETAIL SYSTEM / 06 : 03 : 01</p>
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
    <div className={`relative overflow-hidden border border-[#1e1e1e] bg-black ${isHero ? "h-[32rem] md:h-[42rem]" : "h-[24rem] md:h-[30rem]"}`} style={{ clipPath: "polygon(0 0, calc(100% - 2rem) 0, 100% 2rem, 100% 100%, 2rem 100%, 0 calc(100% - 2rem))" }}>
      <div className="hairline-grid absolute inset-0 opacity-60" />
      <div className="absolute inset-x-6 top-6 flex items-start justify-between">
        <div className="micro-copy text-[#737373]">ARTIFACT // {String(index + 1).padStart(2, "0")}</div>
        <div className="micro-copy text-[#737373]">{product.code}</div>
      </div>
      <Crosshair className="left-6 top-14" />
      <Crosshair className="bottom-10 right-8" />
      <div className="absolute inset-x-[12%] bottom-[12%] top-[12%] border border-[#232323]" style={{ clipPath: "polygon(0 0, calc(100% - 1.5rem) 0, 100% 1.5rem, 100% 100%, 1.5rem 100%, 0 calc(100% - 1.5rem))" }} />
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

      <div className="absolute left-[8%] top-[8%] h-[68%] w-px bg-[#101010]" style={{ transform: `translateY(${Math.min(index * 6, 18)}px)` }} />
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

export function ShowroomPage(props?: { products?: ShowroomProduct[]; sourceLabel?: string; isSyncing?: boolean }) {
  const products = props?.products ?? SHOWROOM_PRODUCTS;
  const sourceLabel = props?.sourceLabel ?? (products.every((product) => product.source === "database") ? "DATABASE" : "ARCHIVE");
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
        <div className="mx-auto max-w-[1520px] px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <header className="flex items-start justify-between gap-8 border-b border-[#151515] pb-6">
            <Link href="/gallery">
              <BrandMark />
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <Link href="/gallery" className="micro-copy text-[#8a8a8a] hover:text-[#f3efe6]">
                RETAIL GALLERY
              </Link>
              <a href="#sequence" className="micro-copy text-[#8a8a8a] hover:text-[#f3efe6]">
                OBJECT SEQUENCE
              </a>
              <a href="#allocation" className="micro-copy text-[#8a8a8a] hover:text-[#f3efe6]">
                PRIVATE ALLOCATION
              </a>
            </nav>
          </header>

          <div className="grid gap-12 py-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <p className="micro-copy text-[#7f7f7f]">PARACAUSAL DISPLAY SYSTEM / LUXURY RETAIL / MONOLITHIC DISCIPLINE</p>
              <h1 className="mt-6 max-w-[8ch] font-[Syncopate] text-[3.5rem] uppercase leading-[0.82] tracking-[0.08em] text-[#f3efe6] md:text-[5.8rem] xl:text-[8.6rem]">
                RETAIL MONOLITH.
              </h1>
              <p className="mt-8 max-w-2xl text-sm leading-8 text-[#b1aaa0] md:text-base">
                我们不做圆润、亲和、日常消费式的商品陈列。这里是面向高端零售与众奢/高奢线下顾问式转化的黑色祭坛：巨物压迫、材质赤裸、纹章稀薄、说明极小，令产品首先被仰望，然后才被询问。
              </p>
              <div className="mt-8 grid max-w-3xl gap-3 md:grid-cols-3">
                {[
                  ["60", "MONOLITHIC MASS"],
                  ["30", "ASCETIC MATERIAL"],
                  ["10", "DIVINE VECTOR"],
                ].map(([value, label]) => (
                  <div key={label} className="monolith-panel px-4 py-5">
                    <p className="font-[Syncopate] text-3xl uppercase leading-none text-[#f3efe6]">{value}</p>
                    <p className="micro-copy mt-3 text-[#7f7f7f]">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a href="#sequence" className="monolith-button inline-flex h-14 items-center justify-center px-7 text-xs font-medium uppercase tracking-[0.28em]">
                  ENTER RETAIL GALLERY
                </a>
                <Link href={`/object/${featured.id}`} className="monolith-button inline-flex h-14 items-center justify-center px-7 text-xs font-medium uppercase tracking-[0.28em]">
                  INSPECT SIGNATURE OBJECT
                </Link>
              </div>
            </div>

            <aside className="monolith-panel p-6 md:p-8">
              <div className="flex items-start justify-between gap-6 border-b border-[#191919] pb-5">
                <div>
                  <p className="micro-copy text-[#7f7f7f]">SOURCE CHANNEL</p>
                  <p className="mt-4 font-[Syncopate] text-[1.8rem] uppercase leading-none tracking-[0.12em] text-[#f3efe6] md:text-[2.4rem]">
                    {sourceLabel}
                  </p>
                </div>
                <div className="micro-pill" style={{ borderColor: "#3a2d10", color: "#9c7a31" }}>
                  FALLBACK SAFE
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "DISPLAY FIELD", value: "PRIVATE RETAIL" },
                  { label: "OBJECT COUNT", value: String(products.length).padStart(2, "0") },
                  { label: "CAMERA ANGLE", value: "ANT VIEW" },
                  { label: "MOTION RULE", value: "DRAGGED MASS" },
                ].map((item) => (
                  <div key={item.label} className="monolith-panel px-4 py-5">
                    <p className="micro-copy text-[#6f6f6f]">{item.label}</p>
                    <p className="mt-3 text-lg font-semibold tracking-[0.06em] text-[#f3efe6]">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm leading-8 text-[#a89f94]">
                {props?.isSyncing
                  ? "真实商品池正在同步。若数据稍后返回，前台会维持当前黑色祭坛结构，而不是闪回普通列表。"
                  : "当前版本优先读取真实商品池，并保留 fallback 状态说明，以在合规过渡阶段持续承接高净值零售转化。"}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section id="sequence" className="mx-auto max-w-[1520px] px-6 py-16 md:px-10 lg:px-14 xl:px-16">
        <div className="mb-12 grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="micro-copy text-[#7f7f7f]">OBJECT SEQUENCE</p>
            <h2 className="mt-4 font-[Syncopate] text-[2.2rem] uppercase leading-[0.9] tracking-[0.1em] text-[#f3efe6] md:text-[3.6rem]">
              AP // FC RITUAL ARRAY
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-8 text-[#a89f94]">
            一行不超过两件对象。核心单品独占整行，其余对象以不对称体块穿插。背景不发光，产品不讨好，只有极细边界、巨大标题与拖拽般的重力位移。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 xl:gap-8">
          {products.map((product, index) => {
            const columnClassName = product.layout === "full" ? "lg:col-span-12" : product.layout === "wide" ? "lg:col-span-7" : "lg:col-span-5";
            const parallaxStyle = { transform: `translateY(${Math.min(scrollY * (0.012 + index * 0.003), 22)}px)` };
            const signal = getProductSignalColor(product);

            return (
              <article key={product.id} style={parallaxStyle} className={`${columnClassName} group relative border border-[#181818] bg-black p-5 md:p-7`}>
                <div className="absolute inset-0 opacity-100" style={{ clipPath: "polygon(0 0, calc(100% - 1.75rem) 0, 100% 1.75rem, 100% 100%, 1.75rem 100%, 0 calc(100% - 1.75rem))", border: "1px solid #181818" }} />
                <div className="absolute inset-0 hairline-grid opacity-50" />
                <div className="relative grid gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
                  <ProductArtifact product={product} index={index} />
                  <div>
                    <ProductMetaBand product={product} />
                    <h3 className="mt-5 max-w-[9ch] font-[Syncopate] text-[2.3rem] uppercase leading-[0.88] tracking-[0.06em] text-[#f3efe6] md:text-[3.6rem]">
                      {product.name}
                    </h3>
                    <p className="micro-copy mt-4" style={{ color: signal }}>
                      {product.subtitle}
                    </p>
                    <p className="mt-6 max-w-2xl text-sm leading-8 text-[#a89f94] md:text-base">{product.overview}</p>
                    <div className="mt-7 grid gap-3 md:grid-cols-2">
                      {product.stats.slice(0, 2).map((item) => (
                        <div key={item.label} className="monolith-panel px-4 py-5">
                          <p className="micro-copy text-[#6f6f6f]">{item.label}</p>
                          <p className={`mt-4 font-[Syncopate] text-[1.7rem] uppercase leading-none tracking-[0.08em] ${item.emphasis === "primary" ? "text-[#f3efe6]" : "text-[#c2b6a0]"}`}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="micro-copy text-[#7f7f7f]">PRIVATE ALLOCATION INDICATION</p>
                        <p className="mt-3 font-[Syncopate] text-[1.9rem] uppercase leading-none tracking-[0.08em] text-[#f3efe6]">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <Link href={`/object/${product.id}`} className="monolith-button inline-flex h-12 items-center justify-center px-5 text-[11px] font-medium uppercase tracking-[0.28em]">
                        INSPECT OBJECT
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
            <h2 className="mt-4 font-[Syncopate] text-[2.2rem] uppercase leading-[0.9] tracking-[0.1em] text-[#f3efe6] md:text-[3.4rem]">
              PRIVATE ALLOCATION GATE.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "前台承担的是高端零售展示与顾问式转化，不再使用企业采购或团体申请的语义。",
              "按钮保持透明边框与硬切反白反馈，不使用阴影、玻璃、液态过渡或亲和性填充块。",
              "在合规完成前，所有主转化动作由系统提示层承接，避免过早暴露交易节点。",
            ].map((item) => (
              <div key={item} className="monolith-panel p-5 text-sm leading-8 text-[#a89f94]">
                {item}
              </div>
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

  const signal = getProductSignalColor(product);

  return (
    <main className="min-h-screen bg-[#000000] text-[#f3efe6]">
      <section className="relative overflow-hidden border-b border-[#151515] pb-20">
        <div className="noise-layer absolute inset-0 opacity-35" />
        <div className="mx-auto max-w-[1520px] px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <div className="flex items-center justify-between gap-5 border-b border-[#151515] pb-6">
            <Link href="/gallery" className="micro-copy inline-flex items-center gap-2 text-[#8a8a8a] hover:text-[#f3efe6]">
              <ArrowLeft className="h-4 w-4" />
              RETURN TO RETAIL GALLERY
            </Link>
            <div className="micro-pill">{getSeriesLabel(product.series)}</div>
          </div>

          <div className="grid gap-10 pt-10 xl:grid-cols-[1.04fr_0.96fr] xl:items-end">
            <div>
              <p className="micro-copy" style={{ color: signal }}>
                {product.discipline}
              </p>
              <h1 className="mt-4 max-w-[7ch] font-[Syncopate] text-[3.2rem] uppercase leading-[0.8] tracking-[0.1em] text-[#f3efe6] md:text-[5.6rem] xl:text-[8.2rem]">
                {product.code}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-[#a89f94] md:text-lg">{product.heroLine}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="micro-pill">{product.name}</span>
                <span className="micro-pill">{formatCurrency(product.price)} / {product.size}</span>
                <span className="micro-pill">SOURCE // {(props.sourceLabel ?? product.source).toUpperCase()}</span>
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
              <p className="micro-copy text-[#7f7f7f]">DATA ALTAR</p>
              <h2 className="mt-4 font-[Syncopate] text-[1.9rem] uppercase leading-none tracking-[0.08em] text-[#f3efe6]">
                SPEC ARCHIVE
              </h2>
            </div>
            <Crosshair />
          </div>
          <p className="mt-5 text-sm leading-8 text-[#a89f94]">像读取高维器物的工程铭文一样去读取参数，而不是使用传统电商卖点堆叠。</p>
          <div className="mt-6 space-y-4">
            {product.stats.map((item) => (
              <div key={item.label} className="monolith-panel px-4 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="micro-copy text-[#6f6f6f]">{item.label}</p>
                    <p className={`mt-4 font-[Syncopate] text-[2rem] uppercase leading-none tracking-[0.08em] ${item.emphasis === "primary" ? "text-[#f3efe6]" : "text-[#c2b6a0]"}`}>
                      {item.value}
                    </p>
                  </div>
                  <div className="micro-copy mt-1" style={{ color: signal }}>
                    +
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="monolith-panel p-6 md:p-8">
            <p className="micro-copy text-[#7f7f7f]">PROTOCOL NOTE</p>
            <p className="mt-4 text-lg leading-8 text-[#f3efe6]">{product.formulation}</p>
            <p className="mt-5 text-sm leading-8 text-[#a89f94]">{product.overview}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {product.notes.map((item) => (
              <div key={item} className="monolith-panel p-5 text-sm leading-8 text-[#a89f94]">
                {item}
              </div>
            ))}
          </div>
          <div className="monolith-panel p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="micro-copy text-[#7f7f7f]">PRIVATE ALLOCATION</p>
                <h3 className="mt-3 font-[Syncopate] text-[1.9rem] uppercase leading-none tracking-[0.08em] text-[#f3efe6]">
                  REQUEST ALLOCATION / 申请配额
                </h3>
              </div>
              <p className="font-[Syncopate] text-[1.7rem] uppercase leading-none tracking-[0.08em] text-[#f3efe6]">{formatCurrency(product.price)}</p>
            </div>
            <p className="mt-5 text-sm leading-8 text-[#a89f94]">当前以前台系统提示层承接高净值零售转化意图，维持高冷、神圣、不可侵犯的黑色祭坛感。</p>
            <button type="button" onClick={() => setDialogOpen(true)} className="monolith-button mt-6 inline-flex h-14 items-center justify-center px-7 text-xs font-medium uppercase tracking-[0.28em]">
              REQUEST ALLOCATION / 申请配额
            </button>
          </div>
        </div>
      </section>

      <div className={`fixed inset-0 z-50 ${dialogOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
        <button type="button" aria-label="关闭提示" onClick={() => setDialogOpen(false)} className="absolute inset-0 bg-black/92" />
        <div className="absolute inset-x-4 bottom-4 mx-auto max-w-2xl border border-[#1f1f1f] bg-[#020202] p-6 md:bottom-8 md:p-8" style={{ clipPath: "polygon(0 0, calc(100% - 2rem) 0, 100% 2rem, 100% 100%, 2rem 100%, 0 calc(100% - 2rem))" }}>
          <div className="hairline-grid absolute inset-0 opacity-45" />
          <div className="relative">
            <p className="micro-copy text-[#7f7f7f]">SYSTEM GATE</p>
            <h3 className="mt-4 font-[Syncopate] text-[2rem] uppercase leading-none tracking-[0.08em] text-[#f3efe6]">ALLOCATION PENDING</h3>
            <p className="mt-5 text-sm leading-8 text-[#a89f94]">{COMPLIANCE_MESSAGE}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setDialogOpen(false)} className="monolith-button inline-flex h-12 items-center justify-center px-6 text-[11px] font-medium uppercase tracking-[0.28em]">
                KEEP CHANNEL OPEN
              </button>
              <Link href="/gallery" className="monolith-button inline-flex h-12 items-center justify-center px-6 text-[11px] font-medium uppercase tracking-[0.28em]">
                RETURN TO GALLERY
              </Link>
            </div>
          </div>
        </div>
      </div>
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

  const sourceLabel = showroomQuery.data?.source === "database" ? "DATABASE" : showroomQuery.data?.source === "fallback" ? "FALLBACK" : "ARCHIVE";

  if (showroomQuery.isLoading && !showroomQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#000000] px-6 text-[#f3efe6]">
        <div className="monolith-panel flex items-center gap-3 px-5 py-4 text-sm uppercase tracking-[0.22em] text-[#c7c0b5]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          SYNCING RETAIL ARCHIVE
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
  const sourceLabel = detailQuery.data ? "DATABASE" : fallbackProduct?.source ?? "ARCHIVE";

  if (detailQuery.isLoading && !mappedProduct) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#000000] px-6 text-[#f3efe6]">
        <div className="monolith-panel flex items-center gap-3 px-5 py-4 text-sm uppercase tracking-[0.22em] text-[#c7c0b5]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          SYNCING OBJECT DOSSIER
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
        <h1 className="mt-4 font-[Syncopate] text-3xl uppercase tracking-[0.1em] text-[#f3efe6]">UNKNOWN OBJECT</h1>
        <p className="mt-4 text-sm leading-8 text-[#a89f94]">该对象未在当前零售祭坛中登记。你可以返回主展陈继续检索 AP / FC 单品。</p>
        <Link href="/gallery" className="monolith-button mt-6 inline-flex h-12 items-center justify-center px-6 text-[11px] font-medium uppercase tracking-[0.28em]">
          RETURN TO GALLERY
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
