import React, { useEffect, useMemo, useState } from "react";
import { Link, Route, Switch } from "wouter";
import { ArrowLeft, ArrowRight, ExternalLink, LoaderCircle, Minus, Plus, QrCode, ShoppingBag, X } from "lucide-react";
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
  externalAccess?: {
    taobaoUrl?: string;
    tmallUrl?: string;
    miniProgramPath?: string;
    wechatQrUrl?: string;
    alipayQrUrl?: string;
  };
  managedProductId?: number;
  defaultSkuId?: number | null;
  defaultSkuCode?: string | null;
  defaultSkuLabel?: string | null;
  minOrderQty?: number | null;
  imageUrl?: string | null;
};

export type RetailSkuOption = {
  id: string;
  label: string;
  price: number;
  note: string;
  backendProductId?: number;
  backendSkuId?: number | null;
  minOrderQty?: number | null;
};

type ExternalAccessChannel = {
  key: "taobao" | "tmall" | "mini_program";
  label: string;
  href?: string;
  qrLabel: string;
  qrUrl?: string;
  description: string;
  state: "active" | "reserved";
};

type RetailCartItem = {
  productId: string;
  productCode: string;
  productName: string;
  skuId: string;
  skuLabel: string;
  price: number;
  quantity: number;
  backendProductId?: number;
  backendSkuId?: number | null;
  minOrderQty?: number | null;
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
  AP: "#f3efe6",
  FC: "#8c8c8c",
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
  defaultSkuId?: number | null;
  defaultSkuCode?: string | null;
  defaultSkuLabel?: string | null;
  minOrderQty?: number | null;
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

const RETAIL_META_SPEC_KEYS = {
  taobaoUrl: "__retail_taobao_url",
  tmallUrl: "__retail_tmall_url",
  miniProgramPath: "__retail_mini_program_path",
  wechatQrUrl: "__retail_wechat_qr_url",
  alipayQrUrl: "__retail_alipay_qr_url",
} as const;

function normalizeStatLabel(label: string) {
  return label.replace(/_/g, " ");
}

export function extractRetailAccessFromSpecs(specs: Array<{ key: string; value: string }>) {
  const externalAccess: NonNullable<ShowroomProduct["externalAccess"]> = {};
  const cleanSpecs = specs.filter((item) => {
    if (item.key === RETAIL_META_SPEC_KEYS.taobaoUrl) {
      externalAccess.taobaoUrl = item.value;
      return false;
    }
    if (item.key === RETAIL_META_SPEC_KEYS.tmallUrl) {
      externalAccess.tmallUrl = item.value;
      return false;
    }
    if (item.key === RETAIL_META_SPEC_KEYS.miniProgramPath) {
      externalAccess.miniProgramPath = item.value;
      return false;
    }
    if (item.key === RETAIL_META_SPEC_KEYS.wechatQrUrl) {
      externalAccess.wechatQrUrl = item.value;
      return false;
    }
    if (item.key === RETAIL_META_SPEC_KEYS.alipayQrUrl) {
      externalAccess.alipayQrUrl = item.value;
      return false;
    }
    return true;
  });

  return {
    cleanSpecs,
    externalAccess,
  };
}

export function buildQrUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payload)}`;
}

export function mapManagedProductToShowroom(product: ManagedProductQueryRecord, index: number, source: "database" | "fallback"): ShowroomProduct {
  const series = product.series ?? (product.code.startsWith("FC") ? "FC" : "AP");
  const extracted = extractRetailAccessFromSpecs(product.specs ?? []);
  const effectiveSpecs = extracted.cleanSpecs.length > 0 ? extracted.cleanSpecs : [{ key: "状态", value: product.status.toUpperCase() }];
  const specs = effectiveSpecs.slice(0, 4);

  return {
    id: product.slug || product.code.toLowerCase(),
    code: product.code,
    name: product.name,
    subtitle: product.subtitle || `${getSeriesLabel(series)} / 零售展陈对象`,
    series,
    price: typeof product.price === "number" ? product.price : 0,
    size: product.defaultSkuLabel || (product.imageUrl ? "ARCHIVE ASSET" : "500ML"),
    layout: getLayoutByIndex(index),
    source,
    heroLine: product.description || `${product.name} 已接入真实商品池，并以零售展陈对象而非普通货架 SKU 的方式被陈列。`,
    formulation:
      effectiveSpecs.length > 0
        ? effectiveSpecs
            .slice(0, 3)
            .map((item) => `${normalizeStatLabel(item.key).toUpperCase()} // ${item.value}`)
            .join(" // ")
        : `${getSeriesLabel(series).toUpperCase()} // ${product.code} // ${product.status.toUpperCase()}`,
    discipline: series === "AP" ? "空气净域 · 零售展陈" : "织物护理 · 零售展陈",
    overview: product.description || product.subtitle || "当前条目已进入真实商品池，可继续补充更具零售转化力的实验档案与顾问式陈列文案。",
    notes:
      effectiveSpecs.length > 0
        ? effectiveSpecs.slice(0, 3).map((item) => `${normalizeStatLabel(item.key)}：${item.value}`)
        : ["当前商品已从后台同步", "可继续补充 specs 参数", "PDP 会自动复用这些参数构建设备式数据面板"],
    stats: specs.map((item, itemIndex) => ({
      label: normalizeStatLabel(item.key),
      value: item.value,
      emphasis: itemIndex === 0 ? "primary" : "secondary",
    })),
    externalAccess: extracted.externalAccess,
    managedProductId: product.id,
    defaultSkuId: product.defaultSkuId ?? null,
    defaultSkuCode: product.defaultSkuCode ?? null,
    defaultSkuLabel: product.defaultSkuLabel ?? null,
    minOrderQty: product.minOrderQty ?? 1,
    imageUrl: product.imageUrl,
  };
}

function getProductSignalColor(product: ShowroomProduct) {
  return SIGNAL_COLOR[product.series];
}

export function getShowroomProductById(id: string, products: ShowroomProduct[] = SHOWROOM_PRODUCTS) {
  return products.find((product) => product.id === id || product.code.toLowerCase() === id.toLowerCase()) ?? null;
}

const RETAIL_CART_STORAGE_KEY = "icloush-retail-cart";

const SHOWROOM_SKU_LOOKUP: Record<string, RetailSkuOption[]> = {
  "void-b03": [
    { id: "void-b03-core", label: "500ML CORE BOTTLE", price: 298, note: "零售标准装 / 顾问式主推" },
    { id: "void-b03-dual", label: "2 x 500ML PRIVATE SET", price: 568, note: "双瓶组合 / 私域推荐" },
  ],
  "void-d05": [
    { id: "void-d05-core", label: "500ML MASS UNIT", price: 328, note: "深污染空间 / 主推标准装" },
    { id: "void-d05-dual", label: "2 x 500ML GALLERY SET", price: 628, note: "门店陈列 / 组合补给" },
  ],
  "fc-le": [
    { id: "fc-le-core", label: "500ML TEXTILE CORE", price: 268, note: "高值织物 / 单瓶方案" },
    { id: "fc-le-ritual", label: "500ML + REFILL RITUAL", price: 498, note: "高定衣橱 / 礼盒组合" },
  ],
  "fc-ic": [
    { id: "fc-ic-core", label: "500ML DELICATE CORE", price: 238, note: "贴身场景 / 标准装" },
    { id: "fc-ic-dual", label: "2 x 500ML PRIVATE SET", price: 458, note: "家庭轮换 / 私域导购" },
  ],
};

const SHOWROOM_EXTERNAL_ACCESS_LOOKUP: Record<string, ExternalAccessChannel[]> = {
  "void-b03": [
    {
      key: "taobao",
      label: "淘宝短链",
      href: "https://www.taobao.com",
      qrLabel: "TAOBAO / QR READY",
      description: "适合投放导流与公域流量承接，后续将替换为商品级短链。",
      state: "active",
    },
    {
      key: "tmall",
      label: "天猫旗舰入口",
      href: "https://www.tmall.com",
      qrLabel: "TMALL / QR READY",
      description: "适合旗舰店高信任成交，当前以前台桥接位先行承接。",
      state: "active",
    },
    {
      key: "mini_program",
      label: "微信 / 支付宝小程序",
      qrLabel: "MINI PROGRAM / RESERVED",
      description: "小程序商城二维码与支付调起参数将在支付 JSON API 生效后替换进来。",
      state: "reserved",
    },
  ],
};

function getRetailSkuOptions(product: ShowroomProduct): RetailSkuOption[] {
  if (typeof product.managedProductId === "number" && typeof product.defaultSkuId === "number") {
    return [
      {
        id: `sku-${product.defaultSkuId}`,
        label: product.defaultSkuLabel || product.size || "标准规格",
        price: product.price,
        note: product.defaultSkuCode ? `已映射后台 SKU / ${product.defaultSkuCode}` : "已映射后台 SKU，可直接进入零售下单链路。",
        backendProductId: product.managedProductId,
        backendSkuId: product.defaultSkuId,
        minOrderQty: product.minOrderQty ?? 1,
      },
    ];
  }

  return (
    SHOWROOM_SKU_LOOKUP[product.id] ?? [
      {
        id: `${product.id}-standard`,
        label: `${product.size} STANDARD`,
        price: product.price,
        note: "标准零售装 / 待后台进一步细分 SKU",
      },
    ]
  );
}

function getExternalAccessChannels(product: ShowroomProduct): ExternalAccessChannel[] {
  const configured: ExternalAccessChannel[] = [];
  if (product.externalAccess?.taobaoUrl) {
    configured.push({
      key: "taobao",
      label: "淘宝短链",
      href: product.externalAccess.taobaoUrl,
      qrLabel: "TAOBAO / QR READY",
      qrUrl: buildQrUrl(product.externalAccess.taobaoUrl),
      description: "由管理端维护的淘宝短链已接入，可直接承接公域成交与导流。",
      state: "active",
    });
  }
  if (product.externalAccess?.tmallUrl) {
    configured.push({
      key: "tmall",
      label: "天猫旗舰入口",
      href: product.externalAccess.tmallUrl,
      qrLabel: "TMALL / QR READY",
      qrUrl: buildQrUrl(product.externalAccess.tmallUrl),
      description: "已从后台同步天猫入口，可在高信任成交场景中承接转化。",
      state: "active",
    });
  }
  if (product.externalAccess?.wechatQrUrl || product.externalAccess?.alipayQrUrl || product.externalAccess?.miniProgramPath) {
    configured.push({
      key: "mini_program",
      label: "微信 / 支付宝小程序",
      qrLabel: product.externalAccess?.wechatQrUrl || product.externalAccess?.alipayQrUrl ? "MINI PROGRAM / QR READY" : "MINI PROGRAM / PATH READY",
      qrUrl: product.externalAccess?.wechatQrUrl || product.externalAccess?.alipayQrUrl,
      description: product.externalAccess?.miniProgramPath
        ? `已同步小程序路径：${product.externalAccess.miniProgramPath}`
        : "管理端已预留小程序二维码桥接位，可继续补充真实收款码素材。",
      state: product.externalAccess?.wechatQrUrl || product.externalAccess?.alipayQrUrl ? "active" : "reserved",
    });
  }

  return configured.length > 0
    ? configured
    : (SHOWROOM_EXTERNAL_ACCESS_LOOKUP[product.id] ?? [
        {
          key: "mini_program",
          label: "微信 / 支付宝小程序",
          qrLabel: "CHANNEL / RESERVED",
          description: "后台尚未配置外部入口，当前保留二维码桥接位等待管理端录入。",
          state: "reserved",
        },
      ]);
}

function readRetailCart(): RetailCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RETAIL_CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RetailCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRetailCart(items: RetailCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(RETAIL_CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("retail-cart-updated"));
}

function useRetailCart() {
  const [items, setItems] = useState<RetailCartItem[]>(() => readRetailCart());

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const sync = () => setItems(readRetailCart());
    window.addEventListener("storage", sync);
    window.addEventListener("retail-cart-updated", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("retail-cart-updated", sync as EventListener);
    };
  }, []);

  const applyUpdate = (updater: (current: RetailCartItem[]) => RetailCartItem[]) => {
    setItems((current) => {
      const next = updater(current);
      writeRetailCart(next);
      return next;
    });
  };

  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem: (nextItem: RetailCartItem) => {
      applyUpdate((current) => {
        const existing = current.find((item) => item.productId === nextItem.productId && item.skuId === nextItem.skuId);
        if (!existing) {
          return [...current, nextItem];
        }
        return current.map((item) =>
          item.productId === nextItem.productId && item.skuId === nextItem.skuId
            ? { ...item, quantity: item.quantity + nextItem.quantity }
            : item,
        );
      });
    },
    updateQuantity: (productId: string, skuId: string, quantity: number) => {
      applyUpdate((current) =>
        current
          .map((item) =>
            item.productId === productId && item.skuId === skuId ? { ...item, quantity: Math.max(1, quantity) } : item,
          )
          .filter((item) => item.quantity > 0),
      );
    },
    removeItem: (productId: string, skuId: string) => {
      applyUpdate((current) => current.filter((item) => !(item.productId === productId && item.skuId === skuId)));
    },
    clear: () => {
      writeRetailCart([]);
      setItems([]);
    },
  };
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-[#f3efe6]">
        <span className="font-mono text-[9px] uppercase tracking-[0.72em] text-[#f3efe6]">IC</span>
        <span className="mt-1 h-px w-8 bg-[#2b2b2b]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col text-left text-[#f3efe6]">
      <p className="font-zh-sans text-sm font-semibold tracking-[0.46em] text-[#f3efe6]">ICLOUSH LAB.</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[#6f6f6f]">Archive Protocol / 3026 Orbital Jeweler</p>
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

function CutlineArrow() {
  return (
    <Link href="/showroom" aria-label="进入卖场名录" className="group inline-flex items-center gap-4 text-[#f3efe6]">
      <span className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#b8b1a6] transition-colors duration-300 group-hover:text-[#f3efe6]">Enter showroom</span>
      <span className="h-px w-10 bg-[#2b2b2b] transition-colors duration-300 group-hover:bg-[#f3efe6]" aria-hidden="true" />
      <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

function LabVaultMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = [
    { index: "01", title: "SERIES: AP", subtitle: "大气重组 / Atmospheric Purification", href: "/showroom" },
    { index: "02", title: "SERIES: FC", subtitle: "织物奢护 / Fabric Care", href: "/showroom" },
    { index: "03", title: "OBJECTS", subtitle: "对象名录 / Showroom Index", href: "/showroom" },
    { index: "04", title: "ARCHIVE", subtitle: "品牌档案 / Platform Entry", href: "/" },
  ] as const;

  return (
    <div className={`fixed inset-0 z-[80] transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <button type="button" aria-label="关闭菜单" onClick={onClose} className="absolute inset-0 bg-black/96" />
      <div className="absolute inset-0 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),_transparent_24%),linear-gradient(180deg,_#030303_0%,_#000000_100%)] text-[#f3efe6]">
        <div className="noise-layer absolute inset-0 opacity-20" />
        <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <div className="flex items-center justify-between border-b border-[#111111] pb-5">
            <button type="button" onClick={onClose} className="inline-flex items-center gap-4 text-left text-[#f3efe6]">
              <span className="font-mono text-[10px] uppercase tracking-[0.48em] text-[#9d968c]">Close</span>
              <span className="h-px w-10 bg-[#262626]" />
            </button>
            <BrandMark compact />
            <Link href="/showroom" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#9d968c]">
              Access
            </Link>
          </div>

          <div className="grid flex-1 gap-12 py-12 lg:grid-cols-[0.6fr_1.4fr] lg:gap-20 lg:py-16">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6e6e6e]">The Vault Menu</p>
              <p className="mt-8 max-w-sm font-zh-serif text-sm leading-8 text-[#8f877b]">
                把所有解释性文字、路径与卖场入口收拢到菜单里，让首页只承担情绪与气场。菜单像品牌档案索引，而不是常规导航栏。
              </p>
            </div>
            <div className="flex flex-col justify-center divide-y divide-[#101010] border-y border-[#101010]">
              {items.map((item) => (
                <Link key={item.index} href={item.href} onClick={onClose} className="group grid gap-4 py-6 md:grid-cols-[88px_1fr] md:items-end md:py-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.44em] text-[#6b6b6b]">{item.index}</p>
                  <div className="flex items-end justify-between gap-6 border-l border-[#131313] pl-0 md:pl-8">
                    <div>
                      <p className="font-zh-sans text-[1.1rem] uppercase tracking-[0.24em] text-[#f3efe6] md:text-[1.8rem]">{item.title}</p>
                      <p className="mt-3 font-zh-serif text-sm leading-7 text-[#90887c]">{item.subtitle}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#5d5d5d] transition duration-300 group-hover:translate-x-1 group-hover:text-[#f3efe6]" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonolithicHeroPage({ featured }: { featured: ShowroomProduct }) {
  const [depthShift, setDepthShift] = useState({ x: 0, y: 0 });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateShift = (nextX: number, nextY: number) => {
      setDepthShift({
        x: Math.max(-1, Math.min(1, nextX)),
        y: Math.max(-1, Math.min(1, nextY)),
      });
    };

    const handleMouseMove = (event: MouseEvent) => {
      updateShift(event.clientX / window.innerWidth - 0.5, event.clientY / window.innerHeight - 0.5);
    };

    const handleMouseLeave = () => updateShift(0, 0);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = menuOpen ? "hidden" : previousOverflow;

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const mediaTransform = `translate3d(${(depthShift.x * 16).toFixed(1)}px, ${(depthShift.y * 12).toFixed(1)}px, 0)`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#000000] text-[#f3efe6]">
      <LabVaultMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <section className="relative isolate min-h-screen border-b border-[#0c0c0c] bg-[#000000]">
        <div className="absolute inset-0 bg-[#000000]" />
        <div className="noise-layer absolute inset-0 opacity-15" />
        <div className="absolute inset-x-0 top-0 h-px bg-[#111111]" />
        <div className="absolute inset-y-0 left-[8%] hidden w-px bg-[#0f0f0f] md:block" />
        <div className="absolute inset-y-0 right-[8%] hidden w-px bg-[#0f0f0f] md:block" />

        <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#111111] pb-5 text-[#f3efe6]">
            <div className="justify-self-start">
              <button type="button" aria-label="打开菜单" onClick={() => setMenuOpen(true)} className="group inline-flex items-center gap-4 text-left">
                <span className="flex flex-col gap-[6px]" aria-hidden="true">
                  <span className="block h-px w-7 bg-[#f3efe6] transition group-hover:w-9" />
                  <span className="block h-px w-5 bg-[#5f5f5f] transition group-hover:w-7 group-hover:bg-[#f3efe6]" />
                  <span className="block h-px w-7 bg-[#f3efe6] transition group-hover:w-9" />
                </span>
              </button>
            </div>
            <div className="justify-self-center">
              <BrandMark compact />
            </div>
            <div className="justify-self-end flex items-center gap-6">
              <Link href="/showroom" className="font-mono text-[10px] uppercase tracking-[0.48em] text-[#b2aa9f] transition hover:text-[#f3efe6]">
                Access
              </Link>
              <Link href="/showroom#bag" className="font-mono text-[10px] uppercase tracking-[0.48em] text-[#7f7f7f] transition hover:text-[#f3efe6]">
                Bag
              </Link>
            </div>
          </header>

          <div className="relative flex flex-1 items-center justify-center py-10 md:py-12">
            <div className="absolute inset-0 overflow-hidden border border-[#0d0d0d] bg-[#010101]">
              <div className="absolute inset-0" style={{ transform: mediaTransform }}>
                {featured.imageUrl ? (
                  <img src={featured.imageUrl} alt={featured.name} className="h-full w-full scale-[1.03] object-cover grayscale contrast-[1.18] brightness-[0.58] opacity-70" />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.12),transparent_18%),linear-gradient(180deg,#050505_0%,#000000_100%)]" />
                )}
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.28)_32%,rgba(0,0,0,0.22)_68%,rgba(0,0,0,0.9)_100%),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.78))]" />
              <div className="absolute inset-x-0 top-0 h-[28%] bg-[linear-gradient(180deg,rgba(0,0,0,0.74),transparent)]" />
              <div className="absolute left-6 top-6 flex items-center gap-4 text-[#8b847a] md:left-8 md:top-8">
                <span className="font-mono text-[10px] uppercase tracking-[0.46em]">4K Still</span>
                <span className="h-px w-12 bg-[#2a2a2a]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.46em]">Motion Ready</span>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-4 text-[#b8b1a7] md:bottom-8 md:left-8 md:right-8 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6a6a6a]">Featured Object</p>
                  <p className="mt-3 font-zh-sans text-sm uppercase tracking-[0.24em] text-[#f3efe6]">{featured.code}</p>
                </div>
                <div className="max-w-md text-left md:text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6a6a6a]">Silent Pressure</p>
                  <p className="mt-3 font-zh-serif text-sm leading-8 text-[#9b9388]">{featured.heroLine}</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.72em] text-[#8f877b]">3026 Orbital Jeweler</p>
              <h1 className="mt-8 max-w-5xl font-zh-sans text-[2.5rem] font-light uppercase tracking-[0.32em] text-[#f3efe6] md:text-[4.8rem] md:tracking-[0.42em] xl:text-[6rem]">ICLOUSH LAB.</h1>
              <p className="mt-8 max-w-2xl font-zh-serif text-sm leading-8 text-[#9b9388] md:text-base">
                首页被收敛为一块可承载高清大图或短片的静默黑场。标题像电影片名一样悬停在画面中央，其他信息全部退到边缘，让留白、材质与压迫感先于说明发生。
              </p>
              <div className="mt-10 flex items-center gap-4 text-[#f3efe6]">
                <span className="h-px w-16 bg-[#f3efe6]" />
                <Link href="/showroom" className="font-mono text-[10px] uppercase tracking-[0.56em] text-[#f3efe6] transition hover:text-[#b8b1a7]">
                  Enter showroom
                </Link>
              </div>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.5em] text-[#7f7f7f]">{featured.series === "AP" ? "Atmospheric Purification" : "Fabric Care"}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ConnectedMonolithicHeroPage() {
  const showroomQuery = trpc.retail.galleryObjects.useQuery({});
  const products = useMemo(() => {
    const queryProducts = showroomQuery.data?.products ?? [];
    if (queryProducts.length === 0) {
      return SHOWROOM_PRODUCTS;
    }
    return queryProducts.map((product, index) => mapManagedProductToShowroom(product, index, showroomQuery.data?.source ?? "fallback"));
  }, [showroomQuery.data]);

  return <MonolithicHeroPage featured={products[0] ?? SHOWROOM_PRODUCTS[0]} />;
}

function SkuSelector(props: {
  options: RetailSkuOption[];
  selectedSkuId: string;
  onSelect: (skuId: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {props.options.map((sku) => {
        const active = sku.id === props.selectedSkuId;
        return (
          <button
            key={sku.id}
            type="button"
            onClick={() => props.onSelect(sku.id)}
            className={`monolith-panel p-4 text-left transition ${active ? "border-[#f3efe6]" : "border-[#1a1a1a]"}`}
          >
            <p className="micro-copy text-[#7f7f7f]">SKU OPTION</p>
            <p className="mt-3 font-zh-sans text-base font-semibold tracking-[0.14em] text-[#f3efe6]">{sku.label}</p>
            <p className="mt-3 text-sm leading-7 text-[#a89f94]">{sku.note}</p>
            <p className="mt-4 micro-copy" style={{ color: active ? "#f3efe6" : "#8f877c" }}>
              {formatCurrency(sku.price)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function ExternalAccessPanel({ product }: { product: ShowroomProduct }) {
  const channels = getExternalAccessChannels(product);

  return (
    <div className="monolith-panel p-6 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="micro-copy text-[#7f7f7f]">EXTERNAL ACCESS / 外部入口</p>
          <h3 className="display-subtitle mt-3 text-[#f3efe6]">转化桥接层</h3>
        </div>
        <p className="micro-copy text-[#8c8378]">TAOBAO / TMALL / MINI PROGRAM</p>
      </div>
      <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">
        当前官网作为流量集散中心，负责完成第一眼捕获、SKU 选择与订单意图沉淀；外部入口则承接平台成交与私域缩短路径。
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {channels.map((channel) => (
          <div key={channel.key} className="channel-frame p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="micro-copy text-[#7f7f7f]">{channel.key.replace("_", " ")}</p>
                <h4 className="mt-3 font-zh-sans text-lg font-semibold tracking-[0.16em] text-[#f3efe6]">{channel.label}</h4>
              </div>
              <QrCode className="h-5 w-5 text-[#5f5f5f]" />
            </div>
            <p className="mt-4 font-zh-serif text-sm leading-8 text-[#a89f94]">{channel.description}</p>
            <div className="qr-placeholder mt-6 overflow-hidden" aria-label={`${channel.label} 二维码占位`}>
              {channel.qrUrl ? (
                <img src={channel.qrUrl} alt={`${channel.label} 二维码`} className="h-full w-full object-cover" />
              ) : (
                <span className="micro-copy text-[#7f7f7f]">{channel.qrLabel}</span>
              )}
            </div>
            {channel.href ? (
              <a href={channel.href} target="_blank" rel="noreferrer" className="monolith-button mt-6 inline-flex h-11 items-center justify-center px-5 text-[11px] font-medium tracking-[0.28em]">
                立即跳转
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            ) : (
              <div className="micro-copy mt-6 text-[#8b8377]">CHANNEL RESERVED</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaticCartDock(props: {
  cart: ReturnType<typeof useRetailCart>;
  checkoutLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 border border-[#232323] bg-[#050505] px-4 py-3 text-[#f3efe6] md:bottom-8 md:right-8"
      >
        <ShoppingBag className="h-4 w-4" />
        <span className="micro-copy">CART {String(props.cart.itemCount).padStart(2, "0")}</span>
      </button>

      <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
        <button type="button" aria-label="关闭购物袋" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/92" />
        <aside className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-[#1c1c1c] bg-[#020202] p-6 md:p-8">
          <div className="hairline-grid absolute inset-0 opacity-45" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-[#171717] pb-5">
              <div>
                <p className="micro-copy text-[#7f7f7f]">RETAIL CART</p>
                <h3 className="display-subtitle mt-3 text-[#f3efe6]">购物袋</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="monolith-button inline-flex h-11 w-11 items-center justify-center px-0 text-[#f3efe6]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex-1">
              <div className="monolith-panel p-5">
                <p className="micro-copy text-[#7f7f7f]">STATIC CART PREVIEW</p>
                <p className="mt-4 font-zh-serif text-sm leading-8 text-[#a89f94]">当前导出的展示页未绑定在线下单上下文，因此仅保留购物袋结构与文案，用于样式和回归测试。</p>
              </div>
            </div>
            <div className="mt-6 border-t border-[#171717] pt-6">
              <div className="flex items-center justify-between gap-4">
                <p className="micro-copy text-[#7f7f7f]">TOTAL</p>
                <p className="font-zh-sans text-[1.8rem] font-semibold tracking-[0.14em] text-[#f3efe6]">{formatCurrency(props.cart.totalAmount)}</p>
              </div>
              <p className="mt-4 font-zh-serif text-sm leading-8 text-[#a89f94]">{props.checkoutLabel ?? "下一步将进入零售下单与支付参数获取流程。"}</p>
              <div className="mt-5 flex gap-3">
                <button type="button" className="monolith-button inline-flex h-12 items-center justify-center px-5 text-[11px] font-medium tracking-[0.28em]">
                  清空购物袋
                </button>
                <button type="button" className="monolith-button inline-flex h-12 items-center justify-center px-5 text-[11px] font-medium tracking-[0.28em]">
                  发起零售下单
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function CartDock(props: {
  cart: ReturnType<typeof useRetailCart>;
  checkoutLabel?: string;
  interactive?: boolean;
}) {
  if (!props.interactive) {
    return <StaticCartDock cart={props.cart} checkoutLabel={props.checkoutLabel} />;
  }

  return <InteractiveCartDock cart={props.cart} checkoutLabel={props.checkoutLabel} />;
}

export const RETAIL_ORDER_POLL_INTERVAL_MS = 2000;
export const TRANSACTION_SIGNAL_HEADLINE = "// TRANSACTION SUCCESSFUL //";

export function getRetailOrderStatusRefetchInterval(query: { state: { data?: { terminal?: boolean } | undefined } }) {
  return query.state.data?.terminal ? false : RETAIL_ORDER_POLL_INTERVAL_MS;
}

export function buildTransactionSignalBody(orderNo?: string | null) {
  return orderNo
    ? `配额已确认，等待星际物理投递。订单编号 ${orderNo} 已进入成功态。`
    : "配额已确认，等待星际物理投递。";
}

export function TransactionSignalOverlay(props: {
  open: boolean;
  typedSignalBody: string;
  orderNo?: string | null;
  onAcknowledge: () => void;
  onReturn: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center px-6 transition duration-500 ${
        props.open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <button
        type="button"
        aria-label="关闭交易成功提示"
        onClick={props.onReturn}
        className="absolute inset-0 bg-black/94"
      />
      <div className="relative w-full max-w-2xl overflow-hidden border border-[#2a2417] bg-[#030303] px-6 py-8 shadow-[0_0_80px_rgba(191,145,62,0.14)] md:px-10 md:py-12">
        <div className="hairline-grid absolute inset-0 opacity-35" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ba8a38] to-transparent" />
        <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-[#ba8a38] via-transparent to-transparent opacity-80" />
        <div className="relative">
          <p className="micro-copy text-[#8f846f]">PAYMENT SIGNAL / SANDBOX LOOP CLOSED</p>
          <div className="mt-5 h-px w-24 bg-[#ba8a38]" />
          <p className="mt-6 font-zh-sans text-2xl font-semibold tracking-[0.2em] text-[#f4efe4] md:text-3xl">{TRANSACTION_SIGNAL_HEADLINE}</p>
          <p className="mt-4 font-zh-serif text-sm leading-8 text-[#c8bea8] md:text-base">
            {props.typedSignalBody}
            <span className="ml-1 inline-block h-4 w-px animate-pulse bg-[#d2a658] align-middle" />
          </p>
          <p className="micro-copy mt-5 text-[#7e7466]">{props.orderNo ?? "SIGNAL-PENDING"}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={props.onAcknowledge}
              className="monolith-button inline-flex h-12 items-center justify-center px-5 text-[11px] font-medium tracking-[0.28em]"
            >
              ACKNOWLEDGE SIGNAL
            </button>
            <button
              type="button"
              onClick={props.onReturn}
              className="inline-flex h-12 items-center justify-center border border-[#302617] px-5 text-[11px] font-medium tracking-[0.28em] text-[#cdbb97] transition hover:border-[#ba8a38] hover:text-[#f4efe4]"
            >
              RETURN TO CART
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InteractiveCartDock(props: {
  cart: ReturnType<typeof useRetailCart>;
  checkoutLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<{ orderId: number; orderNo: string } | null>(null);
  const [transactionSignalOpen, setTransactionSignalOpen] = useState(false);
  const [transactionSignalOrderNo, setTransactionSignalOrderNo] = useState<string | null>(null);
  const [typedSignalBody, setTypedSignalBody] = useState("");
  const authQuery = trpc.auth.me.useQuery();
  const createRetailOrder = trpc.retail.createRetailOrder.useMutation({
    onSuccess(data) {
      setCheckoutError(null);
      setActiveOrder({ orderId: data.order.id, orderNo: data.order.orderNo });
    },
    onError(error) {
      setCheckoutError(error.message);
    },
  });
  const retailOrderStatus = trpc.retail.retailOrderStatus.useQuery(
    activeOrder ? { brandId: 2, orderId: activeOrder.orderId } : { brandId: 2, orderId: 1 },
    {
      enabled: Boolean(activeOrder),
      refetchInterval: getRetailOrderStatusRefetchInterval,
    },
  );
  const canSubmitRetailOrder =
    props.cart.items.length > 0 &&
    props.cart.items.every((item) => typeof item.backendProductId === "number" && typeof item.backendSkuId === "number");
  const transactionSignalBody = useMemo(() => buildTransactionSignalBody(transactionSignalOrderNo), [transactionSignalOrderNo]);

  useEffect(() => {
    if (retailOrderStatus.data?.transactionState !== "successful") {
      return;
    }

    const orderNo = retailOrderStatus.data.summary.orderNo;
    if (orderNo === transactionSignalOrderNo) {
      return;
    }

    setTransactionSignalOrderNo(orderNo);
    setTransactionSignalOpen(true);
    props.cart.clear();
  }, [props.cart, retailOrderStatus.data?.summary.orderNo, retailOrderStatus.data?.transactionState, transactionSignalOrderNo]);

  useEffect(() => {
    if (!transactionSignalOpen) {
      setTypedSignalBody("");
      return;
    }

    setTypedSignalBody("");
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor += 1;
      setTypedSignalBody(transactionSignalBody.slice(0, cursor));
      if (cursor >= transactionSignalBody.length) {
        window.clearInterval(timer);
      }
    }, 32);

    return () => window.clearInterval(timer);
  }, [transactionSignalBody, transactionSignalOpen]);

  const handleRetailCheckout = () => {
    if (!authQuery.data) {
      setCheckoutError("当前零售下单链路依赖登录态，以便绑定真实订单与支付回调。请先完成登录后再发起订单。");
      return;
    }

    if (!canSubmitRetailOrder) {
      setCheckoutError("购物袋中仍存在仅用于展陈的占位 SKU。请优先选择已映射后台商品池的对象后再下单。");
      return;
    }

    if (typeof window === "undefined") {
      setCheckoutError("当前环境无法读取站点 origin，请刷新后重试。");
      return;
    }

    setCheckoutError(null);
    createRetailOrder.mutate({
      brandId: 2,
      gateway: "wechat_pay_v3",
      origin: window.location.origin,
      returnUrl: `${window.location.origin}/showroom`,
      items: props.cart.items.map((item) => ({
        productId: item.backendProductId as number,
        skuId: item.backendSkuId as number,
        quantity: item.quantity,
      })),
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 border border-[#232323] bg-[#050505] px-4 py-3 text-[#f3efe6] md:bottom-8 md:right-8"
      >
        <ShoppingBag className="h-4 w-4" />
        <span className="micro-copy">CART {String(props.cart.itemCount).padStart(2, "0")}</span>
      </button>

      <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
        <button type="button" aria-label="关闭购物袋" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/92" />
        <aside className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-[#1c1c1c] bg-[#020202] p-6 md:p-8">
          <div className="hairline-grid absolute inset-0 opacity-45" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-[#171717] pb-5">
              <div>
                <p className="micro-copy text-[#7f7f7f]">RETAIL CART</p>
                <h3 className="display-subtitle mt-3 text-[#f3efe6]">购物袋</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="monolith-button inline-flex h-11 w-11 items-center justify-center px-0 text-[#f3efe6]">
                <X className="h-4 w-4" />
              </button>
            </div>

            {props.cart.items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="monolith-panel max-w-md p-6 text-center">
                  <p className="micro-copy text-[#7f7f7f]">EMPTY BAG</p>
                  <p className="mt-4 font-zh-serif text-sm leading-8 text-[#a89f94]">购物袋目前为空。你可以先从对象序列中选定 SKU，再回到这里发起零售下单。</p>
                </div>
              </div>
            ) : (
              <div className="relative flex flex-1 flex-col overflow-hidden">
                <div className="mt-6 space-y-4 overflow-y-auto pr-1">
                  {props.cart.items.map((item) => (
                    <div key={`${item.productId}-${item.skuId}`} className="monolith-panel p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="micro-copy text-[#7f7f7f]">{item.productCode}</p>
                          <h4 className="mt-3 font-zh-sans text-lg font-semibold tracking-[0.14em] text-[#f3efe6]">{item.productName}</h4>
                          <p className="mt-2 text-sm leading-7 text-[#9f978b]">{item.skuLabel}</p>
                        </div>
                        <button type="button" onClick={() => props.cart.removeItem(item.productId, item.skuId)} className="micro-copy text-[#8b8377] hover:text-[#f3efe6]">
                          REMOVE
                        </button>
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-3 border border-[#232323] px-3 py-2">
                          <button type="button" onClick={() => (item.quantity === 1 ? props.cart.removeItem(item.productId, item.skuId) : props.cart.updateQuantity(item.productId, item.skuId, item.quantity - 1))}>
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="micro-copy text-[#f3efe6]">{String(item.quantity).padStart(2, "0")}</span>
                          <button type="button" onClick={() => props.cart.updateQuantity(item.productId, item.skuId, item.quantity + 1)}>
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="font-zh-sans text-lg font-semibold tracking-[0.12em] text-[#f3efe6]">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-[#171717] pt-6">
                  {(checkoutError || createRetailOrder.data || retailOrderStatus.data) && (
                    <div className="monolith-panel mb-5 p-5">
                      <p className="micro-copy text-[#7f7f7f]">PAYMENT LINK STATUS</p>
                      {checkoutError ? (
                        <p className="mt-4 font-zh-serif text-sm leading-8 text-[#c38c8c]">{checkoutError}</p>
                      ) : retailOrderStatus.data?.transactionState === "successful" ? (
                        <>
                          <p className="mt-4 font-zh-sans text-xl font-semibold tracking-[0.18em] text-[#f3efe6]">{TRANSACTION_SIGNAL_HEADLINE}</p>
                          <p className="mt-3 font-zh-serif text-sm leading-8 text-[#a89f94]">订单 {retailOrderStatus.data.summary.orderNo} 已完成支付确认，前端每 2 秒轮询链路已捕获成功状态并触发交易信号。</p>
                        </>
                      ) : (
                        <>
                          <p className="mt-4 font-zh-sans text-sm tracking-[0.16em] text-[#f3efe6]">{retailOrderStatus.data?.prompt ?? "// PAYMENT GATEWAY STAGED //"}</p>
                          <p className="mt-3 font-zh-serif text-sm leading-8 text-[#a89f94]">
                            {createRetailOrder.data
                              ? `订单 ${createRetailOrder.data.order.orderNo} 已创建，当前支付网关阶段：${createRetailOrder.data.gateway.stage}。`
                              : "正在等待订单创建。"}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <p className="micro-copy text-[#7f7f7f]">TOTAL</p>
                    <p className="font-zh-sans text-[1.8rem] font-semibold tracking-[0.14em] text-[#f3efe6]">{formatCurrency(props.cart.totalAmount)}</p>
                  </div>
                  <p className="mt-4 font-zh-serif text-sm leading-8 text-[#a89f94]">{props.checkoutLabel ?? "下一步将进入零售下单与支付参数获取流程。"}</p>
                  <p className="micro-copy mt-3 text-[#8b8377]">
                    {authQuery.data ? "AUTH LINKED / 已绑定登录态" : "LOGIN REQUIRED / 需先登录后创建真实订单"}
                  </p>
                  <div className="mt-5 flex gap-3">
                    <button type="button" onClick={() => props.cart.clear()} className="monolith-button inline-flex h-12 items-center justify-center px-5 text-[11px] font-medium tracking-[0.28em]">
                      清空购物袋
                    </button>
                    <button
                      type="button"
                      onClick={handleRetailCheckout}
                      disabled={createRetailOrder.isPending}
                      className="monolith-button inline-flex h-12 items-center justify-center px-5 text-[11px] font-medium tracking-[0.28em] disabled:opacity-60"
                    >
                      {createRetailOrder.isPending ? "创建零售订单中..." : "发起零售下单"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <TransactionSignalOverlay
        open={transactionSignalOpen}
        typedSignalBody={typedSignalBody}
        orderNo={retailOrderStatus.data?.summary.orderNo ?? transactionSignalOrderNo ?? activeOrder?.orderNo}
        onAcknowledge={() => {
          setTransactionSignalOpen(false);
          setOpen(false);
        }}
        onReturn={() => setTransactionSignalOpen(false)}
      />
    </>
  );
}

export function ShowroomPage(props?: { products?: ShowroomProduct[]; sourceLabel?: string; isSyncing?: boolean; interactiveCart?: boolean }) {
  const products = props?.products ?? SHOWROOM_PRODUCTS;
  const sourceLabel = props?.sourceLabel ?? (products.every((product) => product.source === "database") ? "数据库" : "原型档案");
  const cart = useRetailCart();
  const [activeSeries, setActiveSeries] = useState<ProductSeries | "all">("all");
  const filteredProducts = useMemo(() => {
    if (activeSeries === "all") {
      return products;
    }
    return products.filter((product) => product.series === activeSeries);
  }, [activeSeries, products]);
  const [hoveredProductId, setHoveredProductId] = useState(filteredProducts[0]?.id ?? products[0]?.id ?? SHOWROOM_PRODUCTS[0]?.id ?? "");
  const [previewShift, setPreviewShift] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!filteredProducts.some((product) => product.id === hoveredProductId)) {
      setHoveredProductId(filteredProducts[0]?.id ?? products[0]?.id ?? SHOWROOM_PRODUCTS[0]?.id ?? "");
    }
  }, [filteredProducts, hoveredProductId, products]);

  const featured = filteredProducts.find((product) => product.id === hoveredProductId) ?? filteredProducts[0] ?? products[0] ?? SHOWROOM_PRODUCTS[0];
  const featuredSku = getRetailSkuOptions(featured)[0];
  const previewTransform = `translate3d(${(previewShift.x * 18).toFixed(1)}px, ${(previewShift.y * 14).toFixed(1)}px, 0)`;
  const seriesFilters = [
    { key: "all" as const, label: "All Objects", meta: `${products.length}` },
    { key: "AP" as const, label: "Atmospheric Purification", meta: `${products.filter((product) => product.series === "AP").length}` },
    { key: "FC" as const, label: "Fabric Care", meta: `${products.filter((product) => product.series === "FC").length}` },
  ];

  return (
    <main className="min-h-screen bg-[#000000] text-[#f3efe6]">
      <section className="border-b border-[#111111]">
        <div className="mx-auto max-w-[1520px] px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#111111] pb-5">
            <div className="justify-self-start">
              <Link href="/lab" className="font-mono text-[10px] uppercase tracking-[0.48em] text-[#9b9388] transition hover:text-[#f3efe6]">
                Back
              </Link>
            </div>
            <div className="justify-self-center">
              <BrandMark compact />
            </div>
            <div className="justify-self-end flex items-center gap-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">{sourceLabel}</span>
              <a href="#bag" className="font-mono text-[10px] uppercase tracking-[0.46em] text-[#9b9388] transition hover:text-[#f3efe6]">
                Bag
              </a>
            </div>
          </header>

          <div className="grid gap-10 py-10 lg:grid-cols-[0.74fr_1.26fr] lg:gap-16 lg:py-14">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.52em] text-[#7f7f7f]">Object Index / Silent Catalogue</p>
              <h1 className="mt-6 font-zh-sans text-[2.2rem] font-light uppercase tracking-[0.24em] text-[#f3efe6] md:text-[3.4rem]">Objects</h1>
              <p className="mt-8 max-w-md font-zh-serif text-sm leading-8 text-[#9b9388] md:text-base">
                卖场像一份被严格编辑过的名录。对象作为条目出现，图像只在悬停与聚焦时放大显现，目录与预览之间形成安静但直接的支配关系。
              </p>

              <div className="mt-10 border-y border-[#111111] py-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {seriesFilters.map((filter) => {
                    const active = activeSeries === filter.key;
                    return (
                      <button
                        key={filter.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setActiveSeries(filter.key)}
                        className={`border px-4 py-4 text-left transition ${active ? "border-[#f3efe6] bg-[#050505] text-[#f3efe6]" : "border-[#161616] bg-[#020202] text-[#8c857b] hover:border-[#303030] hover:text-[#f3efe6]"}`}
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.42em]">{filter.meta}</p>
                        <p className="mt-3 font-zh-sans text-sm uppercase tracking-[0.14em] md:text-base">{filter.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 border-t border-[#111111]">
                {filteredProducts.map((product, index) => {
                  const active = featured.id === product.id;
                  const primarySku = getRetailSkuOptions(product)[0];

                  return (
                    <div
                      key={product.id}
                      onMouseEnter={() => setHoveredProductId(product.id)}
                      onFocus={() => setHoveredProductId(product.id)}
                      className="group border-b border-[#111111]"
                    >
                      <div className="grid gap-4 py-5 md:grid-cols-[72px_1fr_auto] md:items-end">
                        <p className={`font-mono text-[10px] uppercase tracking-[0.44em] ${active ? "text-[#f3efe6]" : "text-[#5f5f5f]"}`}>
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <div>
                          <p className={`font-zh-sans text-lg uppercase tracking-[0.18em] md:text-[1.6rem] ${active ? "text-[#f3efe6]" : "text-[#c2bbb0] group-hover:text-[#f3efe6]"}`}>
                            {product.code} / {product.name}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <p className="font-zh-serif text-sm leading-7 text-[#8f877b]">{product.subtitle}</p>
                            <span className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#5f5f5f]">{product.series}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-3 md:items-end">
                          <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6b6b6b]">{formatCurrency(product.price)}</p>
                          <Link href={`/object/${product.id}`} className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#9b9388] transition hover:text-[#f3efe6]">
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              cart.addItem({
                                productId: product.id,
                                productCode: product.code,
                                productName: product.name,
                                skuId: primarySku.id,
                                skuLabel: primarySku.label,
                                price: primarySku.price,
                                quantity: Math.max(primarySku.minOrderQty ?? 1, 1),
                                backendProductId: primarySku.backendProductId,
                                backendSkuId: primarySku.backendSkuId,
                                minOrderQty: primarySku.minOrderQty ?? 1,
                              })
                            }
                            className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f] transition hover:text-[#f3efe6]"
                          >
                            Add to bag
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:sticky lg:top-8 lg:self-start">
              <div className="border border-[#111111] bg-[#020202]">
                <div
                  className="relative aspect-[4/5] overflow-hidden border-b border-[#111111] bg-[linear-gradient(180deg,#040404_0%,#000000_100%)]"
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setPreviewShift({
                      x: (event.clientX - rect.left) / rect.width - 0.5,
                      y: (event.clientY - rect.top) / rect.height - 0.5,
                    });
                  }}
                  onMouseLeave={() => setPreviewShift({ x: 0, y: 0 })}
                >
                  <div className="absolute inset-0" style={{ transform: previewTransform }}>
                    {featured.imageUrl ? (
                      <img src={featured.imageUrl} alt={featured.name} className="absolute inset-0 h-full w-full scale-[1.06] object-cover grayscale contrast-[1.18] brightness-[0.62]" />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.12),transparent_18%),linear-gradient(180deg,#050505_0%,#000000_100%)]" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.82),transparent_34%,transparent_66%,rgba(0,0,0,0.84)),linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.76))]" />
                  <div className="absolute left-6 top-6 flex items-center gap-3 text-[#7f7f7f] md:left-8 md:top-8">
                    <span className="font-mono text-[10px] uppercase tracking-[0.42em]">Hover Focus</span>
                    <span className="h-px w-10 bg-[#222222]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.42em]">Macro Preview</span>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">Preview</p>
                    <p className="mt-3 font-zh-sans text-[1.6rem] font-light uppercase tracking-[0.18em] text-[#f3efe6] md:text-[2.2rem]">{featured.code}</p>
                  </div>
                </div>

                <div className="grid gap-6 p-6 md:p-8">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">{featured.series === "AP" ? "Atmospheric Purification" : "Fabric Care"}</p>
                    <h2 className="mt-4 max-w-[12ch] font-zh-sans text-[2rem] font-light uppercase tracking-[0.18em] text-[#f3efe6] md:text-[2.8rem]">
                      {featured.name}
                    </h2>
                    <p className="mt-5 max-w-xl font-zh-serif text-sm leading-8 text-[#9b9388] md:text-base">{featured.overview}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {featured.stats.slice(0, 4).map((item) => (
                      <div key={`${featured.id}-${item.label}`} className="border border-[#111111] px-4 py-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">{item.label}</p>
                        <p className="mt-3 font-zh-sans text-[1.5rem] font-light uppercase tracking-[0.12em] text-[#f3efe6]">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#111111] pt-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">Primary SKU</p>
                        <p className="mt-3 font-zh-serif text-sm leading-8 text-[#9b9388]">{featuredSku.label}</p>
                      </div>
                      <p className="font-zh-sans text-[1.8rem] font-light uppercase tracking-[0.12em] text-[#f3efe6]">{formatCurrency(featured.price)}</p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-5">
                      <Link href={`/object/${featured.id}`} className="font-mono text-[10px] uppercase tracking-[0.46em] text-[#f3efe6] transition hover:text-[#cfc7bb]">
                        View object
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          cart.addItem({
                            productId: featured.id,
                            productCode: featured.code,
                            productName: featured.name,
                            skuId: featuredSku.id,
                            skuLabel: featuredSku.label,
                            price: featuredSku.price,
                            quantity: Math.max(featuredSku.minOrderQty ?? 1, 1),
                            backendProductId: featuredSku.backendProductId,
                            backendSkuId: featuredSku.backendSkuId,
                            minOrderQty: featuredSku.minOrderQty ?? 1,
                          })
                        }
                        className="font-mono text-[10px] uppercase tracking-[0.46em] text-[#9b9388] transition hover:text-[#f3efe6]"
                      >
                        Add to bag
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div id="allocation" className="mt-8 border-t border-[#111111] pt-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">Conversion Discipline</p>
                <p className="mt-5 font-zh-serif text-sm leading-8 text-[#8f877b]">
                  {props?.isSyncing
                    ? "真实商品池正在同步，名录结构保持不变，只更新对象与 SKU 数据。"
                    : "目录负责把对象与欲望压缩成最少的字句，技术解释、外部桥接与申请动作则交由对象详情页继续承接。"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div id="bag">
        <CartDock cart={cart} interactive={props?.interactiveCart} checkoutLabel="下一步将连接零售下单 JSON API，并在网页端轮询支付状态。" />
      </div>
    </main>
  );
}

function DataPanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#161616] bg-[#020202] px-4 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">{label}</p>
      <p className="mt-4 font-zh-sans text-[1.8rem] font-light leading-none tracking-[0.12em] text-[#f3efe6]">{value}</p>
    </div>
  );
}

function AllocationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <button type="button" aria-label="关闭提示" onClick={onClose} className="absolute inset-0 bg-black/94" />
      <div className="absolute inset-x-4 bottom-4 mx-auto max-w-3xl border border-[#1a1a1a] bg-[#020202] p-6 md:bottom-8 md:p-8">
        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[0.46em] text-[#7f7f7f]">Private Access</p>
          <h3 className="mt-4 font-zh-sans text-[2rem] font-light uppercase tracking-[0.18em] text-[#f3efe6] md:text-[2.6rem]">申请配额</h3>
          <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">{COMPLIANCE_MESSAGE}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="border border-[#161616] bg-[#030303] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">Consultation Channel</p>
              <h4 className="mt-4 font-zh-sans text-xl font-light uppercase tracking-[0.16em] text-[#f3efe6]">企业微信顾问</h4>
              <p className="mt-4 font-zh-serif text-sm leading-8 text-[#a89f94]">顾问式讲解、成分细聊、门店零售训练与高净值客户私域转化，将优先通过该频道承接。</p>
              <div className="qr-placeholder mt-6" aria-label="企业微信二维码占位">
                <span className="micro-copy text-[#7f7f7f]">Q R / PLACEHOLDER</span>
              </div>
            </div>
            <div className="border border-[#161616] bg-[#030303] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">Program Node</p>
              <h4 className="mt-4 font-zh-sans text-xl font-light uppercase tracking-[0.16em] text-[#f3efe6]">小程序节点预留</h4>
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

export function ProductDetailPage(props: { id: string; product?: ShowroomProduct | null; sourceLabel?: string; interactiveCart?: boolean }) {
  const resolvedProduct = props.product ?? getShowroomProductById(props.id);
  const product = resolvedProduct ?? SHOWROOM_PRODUCTS[0];
  const [dialogOpen, setDialogOpen] = useState(false);
  const cart = useRetailCart();
  const archiveSource = SOURCE_LABELS[(props.sourceLabel?.toLowerCase() as ShowroomProduct["source"]) ?? product.source] ?? props.sourceLabel ?? SOURCE_LABELS[product.source];
  const skuOptions = getRetailSkuOptions(product);
  const [selectedSkuId, setSelectedSkuId] = useState(skuOptions[0]?.id ?? "");

  useEffect(() => {
    if (!skuOptions.some((item) => item.id === selectedSkuId)) {
      setSelectedSkuId(skuOptions[0]?.id ?? "");
    }
  }, [selectedSkuId, skuOptions]);

  if (!resolvedProduct) {
    return <NotFoundPage />;
  }

  const selectedSku = skuOptions.find((item) => item.id === selectedSkuId) ?? skuOptions[0];
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
      <section className="border-b border-[#151515]">
        <div className="mx-auto max-w-[1520px] px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#151515] pb-6">
            <div className="justify-self-start">
              <Link href="/showroom" className="font-mono text-[10px] uppercase tracking-[0.46em] text-[#8a8a8a] transition hover:text-[#f3efe6]">
                Back
              </Link>
            </div>
            <div className="justify-self-center">
              <BrandMark compact />
            </div>
            <div className="justify-self-end">
              <a href="#bag" className="font-mono text-[10px] uppercase tracking-[0.46em] text-[#8a8a8a] transition hover:text-[#f3efe6]">
                Bag
              </a>
            </div>
          </header>

          <div className="grid gap-10 pt-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <figure className="border border-[#111111] bg-[#020202]">
              <div className="relative aspect-[4/5] overflow-hidden bg-[linear-gradient(180deg,#050505_0%,#000000_100%)]">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="absolute inset-0 h-full w-full object-cover grayscale contrast-[1.15] brightness-[0.62]" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(255,255,255,0.12),transparent_20%),linear-gradient(180deg,#050505_0%,#000000_100%)]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.74),transparent_34%,transparent_66%,rgba(0,0,0,0.78)),linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.72))]" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-6 md:bottom-8 md:left-8 md:right-8">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">Object</p>
                    <p className="mt-3 font-zh-sans text-sm uppercase tracking-[0.18em] text-[#f3efe6]">{product.code}</p>
                  </div>
                  <p className="max-w-[18rem] text-right font-zh-serif text-sm leading-7 text-[#9b9388]">{product.subtitle}</p>
                </div>
              </div>
              <figcaption className="grid gap-4 border-t border-[#111111] p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">Archive Source</p>
                  <p className="mt-3 font-zh-serif text-sm leading-8 text-[#9b9388]">{archiveSource}</p>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.46em] text-[#7f7f7f]">{getSeriesLabel(product.series)}</p>
              </figcaption>
            </figure>

            <div className="flex flex-col justify-end">
              <p className="font-mono text-[10px] uppercase tracking-[0.56em] text-[#7f7f7f]">{product.code}</p>
              <h1 className="mt-6 max-w-[8ch] font-zh-sans text-[2.8rem] font-light uppercase tracking-[0.18em] text-[#f3efe6] md:text-[4.6rem] md:tracking-[0.22em]">{product.name}</h1>
              <p className="mt-8 max-w-2xl font-zh-serif text-base leading-9 text-[#a89f94] md:text-lg">{product.heroLine}</p>
              <div className="mt-10 grid gap-4 border-t border-[#151515] pt-6 sm:grid-cols-3">
                <div className="border border-[#111111] bg-[#020202] px-4 py-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">Series</p>
                  <p className="mt-3 font-zh-sans text-lg font-light uppercase tracking-[0.14em] text-[#f3efe6]">{getSeriesLabel(product.series)}</p>
                </div>
                <div className="border border-[#111111] bg-[#020202] px-4 py-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">Format</p>
                  <p className="mt-3 font-zh-sans text-lg font-light uppercase tracking-[0.14em] text-[#f3efe6]">{product.size}</p>
                </div>
                <div className="border border-[#111111] bg-[#020202] px-4 py-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">Retail</p>
                  <p className="mt-3 font-zh-sans text-lg font-light uppercase tracking-[0.14em] text-[#f3efe6]">{formatCurrency(product.price)}</p>
                </div>
              </div>
              <div className="mt-10 border-t border-[#151515] pt-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">Protocol Note</p>
                <p className="mt-4 font-zh-sans text-lg leading-8 text-[#f3efe6]">{product.formulation}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1520px] gap-8 px-6 py-16 md:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-14 xl:px-16">
        <aside className="border border-[#111111] bg-[#020202] p-6 md:p-8">
          <div className="flex items-end justify-between gap-4 border-b border-[#181818] pb-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">实验数据面板</p>
              <h2 className="mt-4 font-zh-sans text-[2rem] font-light uppercase tracking-[0.16em] text-[#f3efe6] md:text-[2.8rem]">成分解构</h2>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">Quiet Spec</p>
          </div>
          <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">参数不再被包装成吵闹的 HUD，而是像品牌档案中的技术索引，以冷白、细字距和充分留白的方式呈现。</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {experimentRows.map((item) => (
              <DataPanelRow key={item.label} label={item.label} value={item.value} />
            ))}
            {product.stats.map((item) => (
              <DataPanelRow key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="border border-[#111111] bg-[#020202] p-6 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">协议注记</p>
            <p className="mt-4 font-zh-sans text-lg leading-8 text-[#f3efe6]">{product.formulation}</p>
            <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">{product.overview}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {product.notes.map((item) => (
              <div key={item} className="border border-[#111111] bg-[#020202] p-5 font-zh-serif text-sm leading-8 text-[#a89f94]">
                {item}
              </div>
            ))}
          </div>
          <ExternalAccessPanel product={product} />
          <div className="border border-[#111111] bg-[#020202] p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">Retail Access</p>
                <h3 className="mt-3 font-zh-sans text-[2rem] font-light uppercase tracking-[0.16em] text-[#f3efe6] md:text-[2.6rem]">零售下单</h3>
              </div>
              <p className="font-zh-sans text-[1.8rem] font-light leading-none tracking-[0.16em] text-[#f3efe6]">{formatCurrency(selectedSku?.price ?? product.price)}</p>
            </div>
            <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">先选择 SKU 并加入购物袋；在支付 API 正式接入前，仍可通过申请配额层与外部入口桥接完成导购和顾问式成交。</p>
            <div className="mt-6">
              <SkuSelector options={skuOptions} selectedSkuId={selectedSkuId} onSelect={setSelectedSkuId} />
            </div>
            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={() =>
                  selectedSku &&
                  cart.addItem({
                    productId: product.id,
                    productCode: product.code,
                    productName: product.name,
                    skuId: selectedSku.id,
                    skuLabel: selectedSku.label,
                    price: selectedSku.price,
                    quantity: Math.max(selectedSku.minOrderQty ?? 1, 1),
                    backendProductId: selectedSku.backendProductId,
                    backendSkuId: selectedSku.backendSkuId,
                    minOrderQty: selectedSku.minOrderQty ?? 1,
                  })
                }
                className="monolith-button inline-flex h-14 items-center justify-center px-7 text-xs font-medium tracking-[0.34em]"
              >
                Add to bag / 加入购物袋
              </button>
              <button type="button" onClick={() => setDialogOpen(true)} className="monolith-button inline-flex h-14 items-center justify-center px-7 text-xs font-medium tracking-[0.34em]">
                Request allocation / 申请配额
              </button>
            </div>
          </div>
        </div>
      </section>

      <AllocationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <div id="bag">
        <CartDock cart={cart} interactive={props.interactiveCart} checkoutLabel="购物袋中的 SKU 将作为零售订单草稿，下一阶段会对接支付 JSON API 与支付状态轮询。" />
      </div>
    </main>
  );
}

const ECOSYSTEM_SITES = [
  {
    href: "/shop",
    kicker: "B2B PROCUREMENT",
    title: "商城系统",
    description: "承接商品浏览、SKU 选择、购物袋与零售/采购桥接，是统一数字底座里的交易入口。",
    accent: "#7a232a",
  },
  {
    href: "/lab",
    kicker: "BRAND LAB",
    title: "iCloush LAB.",
    description: "保留当前高张力零售堡垒首页、展柜与对象详情，用于承接品牌张力与零售陈列体验。",
    accent: "#9c7a31",
  },
  {
    href: "/tech",
    kicker: "CLEAN SCIENCE",
    title: "环洗朵科技",
    description: "聚焦工业洗涤、后厨清洁与住房卫生的专业解决方案，是距离商业转化最近的品牌官网。",
    accent: "#10b981",
  },
  {
    href: "/care",
    kicker: "HOTEL CARE",
    title: "iCloush Care",
    description: "面向酒店奢护与服务交付的品牌触点，承接服务型咨询与合作沟通。",
    accent: "#2563eb",
  },
] as const;

const HUANXIDUO_SOLUTIONS = [
  {
    title: "工业洗涤",
    detail: "围绕酒店布草、制服与高频织物清洁，强调回洗率、织物寿命与自动分配效率。",
  },
  {
    title: "后厨清洁",
    detail: "覆盖灶台、餐具、洗碗机、重油污地面与不锈钢表面的标准化清洁链路。",
  },
  {
    title: "住房卫生",
    detail: "聚焦客房、浴室、地面、香氛洗护与卫生维保，建立易执行的日常清洁方案。",
  },
] as const;

const HUANXIDUO_PRODUCTS = [
  {
    title: "工业固体洗涤剂",
    specs: "10 / 25KG",
    detail: "高效洗衣粉、酸性中和粉、柔顺粉与漂白粉等系统化组合。",
  },
  {
    title: "工业液体洗涤剂",
    specs: "60L",
    detail: "高效洗衣液、中和剂、柔顺剂、乳化剂与漂液，适配自动分配链路。",
  },
  {
    title: "自动分配与设备",
    specs: "SYSTEM",
    detail: "洗涤龙自动分配器、单机分配器、蠕动泵与软水净化装置。",
  },
  {
    title: "后厨与住房卫生",
    specs: "600ML / 5L / 20L",
    detail: "覆盖重油污、玻璃、浴室、地面与日常卫生维保场景。",
  },
] as const;

export function PlatformEcosystemPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-950">
      <section className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 md:px-10 xl:px-14">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Unified Digital Base / Multi-Brand Ecosystem</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">iCloush Digital Platform</h1>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <Link href="/lab" className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">iCloush LAB.</Link>
              <Link href="/tech" className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">环洗朵科技</Link>
              <Link href="/care" className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">iCloush Care</Link>
              <Link href="/shop" className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">商城系统</Link>
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                当前预览已切回统一数字底座视角：根路径用于展示品牌矩阵与站点分工，`/lab` 承接 iCloush LAB. 的零售堡垒，`/tech` 承接环洗朵科技官网，`/care` 承接服务品牌页，`/shop` 承接商城入口。这样你进入预览后，不会再只看到单一 LAB 首页。
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/tech" className="inline-flex h-12 items-center justify-center rounded-full bg-[#0047AB] px-6 text-sm font-medium text-white transition hover:bg-[#003b8e]">
                  查看环洗朵科技
                </Link>
                <Link href="/lab" className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 px-6 text-sm font-medium text-slate-900 transition hover:border-slate-400">
                  返回 iCloush LAB.
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">统一底座</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">1 套</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">共享用户、内容、商品、订单与 SEO 基建。</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">品牌站点</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">4 个</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">商城、LAB、环洗朵科技与 Care 已纳入同一预览入口。</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">主转化动作</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">3 类</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">商品成交、样板申领与私域咨询在同一生态中协同。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-10 xl:px-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Ecosystem Sites</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">多品牌生态平台总览</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            每个站点承担不同商业任务，但都运行在同一套数字底座之上。你现在可以从这里直接进入环洗朵科技，而不必先经过 LAB 的零售展柜。
          </p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {ECOSYSTEM_SITES.map((site) => (
            <Link key={site.href} href={site.href} className="group rounded-[2rem] border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">{site.kicker}</p>
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">{site.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{site.description}</p>
                </div>
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: site.accent }} />
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-950">
                进入站点
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:px-10 lg:grid-cols-[0.9fr_1.1fr] xl:px-14">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Route Guide</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">当前预览可直接访问的关键路径</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["/", "统一数字底座总入口"],
              ["/lab", "iCloush LAB. 品牌首页"],
              ["/tech", "环洗朵科技官网"],
              ["/care", "iCloush Care 服务页"],
              ["/shop", "商城/展柜入口"],
              ["/showroom", "LAB 零售展柜"],
            ].map(([path, detail]) => (
              <div key={path} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="font-mono text-sm text-[#0047AB]">{path}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function HuanxiduoTechPage() {
  const navigationItems = [
    ["#technology", "洁净科技"],
    ["#solutions", "解决方案"],
    ["#products", "产品矩阵"],
    ["#sample", "申领样板"],
  ] as const;

  const heroSignals = [
    ["CMA / CNAS", "实验室可信", "以检测逻辑建立参数级信任。"],
    ["TDS READY", "规格书链路", "把技术规格书、试样申请与采购桥接放进同一动作链。"],
    ["3 SCENARIOS", "场景矩阵", "工业洗涤、后厨清洁与住房卫生同屏呈现。"],
  ] as const;

  const technologyModules = [
    ["MODULE 01", "军规级洁净技术", "将去污效率、织物友好与流程稳定性放进同一张参数化蓝图里，表达方式更像工业系统而不是普通洗涤剂宣传。"],
    ["MODULE 02", "自动分配与软水系统", "把分配器、蠕动泵、软水净化装置和使用现场放进统一终端叙事，突出方案能力。"],
    ["MODULE 03", "可持续闭环配方", "以浓缩、循环包装和低残留逻辑承接环保话语，但视觉上仍保持冷静与技术可信度。"],
  ] as const;

  const sampleChannels = [
    ["企业微信", "页脚与申样区统一放置客服二维码，由后台维护实际资源。"],
    ["技术总监直连", "保留高价值客户的快速响应通道，用于技术咨询和现场评估预约。"],
    ["采购小程序", "扫码进入 B2B 采购链路，承接后续下单、支付与复购。"],
  ] as const;

  const heroMediaUrl = "data:image/jpeg;base64,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";
  const tdsPlaceholderUrl = "data:application/pdf;base64,JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjIgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago0IDAgb2JqCjw8Ci9CYXNlRm9udCAvU1RTb25nLUxpZ2h0IC9EZXNjZW5kYW50Rm9udHMgWyA8PAovQmFzZUZvbnQgL1NUU29uZy1MaWdodCAvQ0lEU3lzdGVtSW5mbyA8PAovT3JkZXJpbmcgKEdCMSkgL1JlZ2lzdHJ5IChBZG9iZSkgL1N1cHBsZW1lbnQgMAo+PiAvRFcgMTAwMCAvRm9udERlc2NyaXB0b3IgPDwKL0FzY2VudCA3NTIgL0NhcEhlaWdodCA3MzcgL0Rlc2NlbnQgLTI3MSAvRmxhZ3MgNiAvRm9udEJCb3ggWyAtMjUgLTI1NCAxMDAwIDg4MCBdIC9Gb250TmFtZSAvU1RTb25nU3RkLUxpZ2h0IAogIC9JdGFsaWNBbmdsZSAwIC9MZWFkaW5nIDE0OCAvTWF4V2lkdGggMTAwMCAvTWlzc2luZ1dpZHRoIDUwMCAvU3RlbUggOTEgL1N0ZW1WIDU4IAogIC9UeXBlIC9Gb250RGVzY3JpcHRvciAvWEhlaWdodCA1NTMKPj4gL1N1YnR5cGUgL0NJREZvbnRUeXBlMCAvVHlwZSAvRm9udCAKICAvVyBbIDEgWyAyMDcgMjcwIDM0MiA0NjcgNDYyIDc5NyA3MTAgMjM5IDM3NCBdIDEwIFsgMzc0IDQyMyA2MDUgMjM4IDM3NSAyMzggMzM0IDQ2MiBdIDE4IDI2IDQ2MiAyNyAyOCAyMzggCiAgMjkgMzEgNjA1IDMyIFsgMzQ0IDc0OCA2ODQgNTYwIDY5NSA3MzkgNTYzIDUxMSA3MjkgNzkzIAogIDMxOCAzMTIgNjY2IDUyNiA4OTYgNzU4IDc3MiA1NDQgNzcyIDYyOCAKICA0NjUgNjA3IDc1MyA3MTEgOTcyIDY0NyA2MjAgNjA3IDM3NCAzMzMgCiAgMzc0IDYwNiA1MDAgMjM5IDQxNyA1MDMgNDI3IDUyOSA0MTUgMjY0IAogIDQ0NCA1MTggMjQxIDIzMCA0OTUgMjI4IDc5MyA1MjcgNTI0IF0gODEgWyA1MjQgNTA0IDMzOCAzMzYgMjc3IDUxNyA0NTAgNjUyIDQ2NiA0NTIgCiAgNDA3IDM3MCAyNTggMzcwIDYwNSBdIF0KPj4gXSAvRW5jb2RpbmcgL1VuaUdCLVVDUzItSCAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUwIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9CYXNlRm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0NvbnRlbnRzIDEwIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTggXSAvUGFyZW50IDkgMCBSIC9SZXNvdXJjZXMgPDwKL0ZvbnQgMSAwIFIgL1Byb2NTZXQgWyAvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJIF0KPj4gL1JvdGF0ZSAwIC9UcmFucyA8PAoKPj4gCiAgL1R5cGUgL1BhZ2UKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyA5IDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKOCAwIG9iago8PAovQXV0aG9yIChhbm9ueW1vdXMpIC9DcmVhdGlvbkRhdGUgKEQ6MjAyNjA0MjEwNTQ1MjgtMDQnMDAnKSAvQ3JlYXRvciAoYW5vbnltb3VzKSAvS2V5d29yZHMgKCkgL01vZERhdGUgKEQ6MjAyNjA0MjEwNTQ1MjgtMDQnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQREYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAodW5zcGVjaWZpZWQpIC9UaXRsZSAoSHVhbnhpZHVvIFREUyBQbGFjZWhvbGRlcikgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNiAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjEwIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDk4MAo+PgpzdHJlYW0KR2F0PSlnSjZLZyY6TWwrYmJMKHFaaEkwaj9YMnEzPDYnYUcuJzljWThzRmk1VGksJ09PQlRCMzFbRHNjTStKKWNEIV5dO1I8LVtBOixqcVRGJEdcXiE6TlM1bTtoK2RhcEUjJS5PXDRkYXFmVmtbaFhRY0NacDddS29BQz8sXnAzSC9tQj1gPklQXmFJQywqMFloRlViU1pwcjxac2JrSVU/LXEwI1kpVT0hSzBmPUJBYlJqUHUxOiIzJmxjIzpQXEkzJVY7cXFuLTckUjshdVBLNEBQPCE3JTk6Jj5VISRvRy44V2omNF46N2BCZlkwIjw9OGNJV0NPSkVSSjJhUVFZIjgvbkpdN25QKlo8RkU7Y3RfWzExWE5YOiczMDpaRzpFbjpXQ1NSaCROPnJGLldvQTQ6TlAyKC8tWGYsRD0namdWaVdPYFZjTUxLSyYiYDxDdDBtPjdrWWNkNmIkRzlyMTBhOUpRMXVwSiVCWk9qWGxXQCtebldWL21bXSFZZVpTXkRdPEAocyUkcWBxR2p0OmRDPUhrPD5gUSxdYz1LKCNKSDlGPSwvMGxeMDZGTiY6TSkmWzhyM1sxY1hXOlxYSGUyJFBVbi1NQDcvLUhmX3UoNTdXKmAoXGgpY3ROJjFhMVJRWVFhcFs9W2dpOHVJSXQ0OU05TzhYXl1rZTlYKmFHL0Bwb0pDbT1QTEM7O0kkc1sjOSdlcix1SnM5QmBQI0NyVD1cZVhpV0ZRcjNkbj5HcCkrc0ZoRTJhJWdQT0Nbbl9YXCw5YWVOUiQ+KlYlMGhkQSYwRmAmJ29Qakg0TlwzYC81ckhObXAuZjdUPmIhc0JsLVBcbEdeME5YNilEW0Y4RFhIczFqPVErbkpxUVthSy03YCdkako+MEYlQiprN2poLUA9M19RSy9vOmhHbjxXbVBrL2VVPCMpdTA+czJMSD5dcChGJT5IZEM2bldsOTEjdU5lYlwkWVRdUmw/S1pCXEJBUjktKFdJb0cvLltyVUlfdGRzLThpZzZtQE00bidzXDksZWVvKDBHSi0pUW04YV1xcSZjaCNuK2klNmBKL11RVVxyTShAPEdmRiwnaW9ZVW4jXEdOOmMuK0JkPjVKXzZhcy9idVQrKFQoLGBERlBYYlwmZzFwRGgyUTtkPTMkWz49ZHI7bU4xLTNPTm02bCw7QlFRTTVGRzxpWkE4NUtCUCJYbnIoIj81Z01OXjVmbGxdcz9EQmNgZHFLRikhYj5PTHRXOG9UTF4mJSxKUSxHYTFWaTBNViZacyEuOSRYQlwmSGVtSCRRclBcfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxMQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDEyMiAwMDAwMCBuIAowMDAwMDAwMjI5IDAwMDAwIG4gCjAwMDAwMDAzNDEgMDAwMDAgbiAKMDAwMDAwMTI3NCAwMDAwMCBuIAowMDAwMDAxMzU3IDAwMDAwIG4gCjAwMDAwMDE1NjEgMDAwMDAgbiAKMDAwMDAwMTYyOSAwMDAwMCBuIAowMDAwMDAxOTA3IDAwMDAwIG4gCjAwMDAwMDE5NjYgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8ZWQ3ZDZjMTFhODI5NzJmMTYyN2E2ZTZmODZlMzUyZjA+PGVkN2Q2YzExYTgyOTcyZjE2MjdhNmU2Zjg2ZTM1MmYwPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyA4IDAgUgovUm9vdCA3IDAgUgovU2l6ZSAxMQo+PgpzdGFydHhyZWYKMzAzNwolJUVPRgo=";

  return (
    <main className="h-screen snap-y snap-mandatory overflow-y-auto bg-[#F3F6F8] text-[#05070B]">
      <section className="relative min-h-screen snap-start overflow-hidden border-b border-black/10 bg-[#F3F6F8]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_#f8fbfd_0%,_#eef3f7_55%,_#dde6ed_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,_rgba(0,47,167,0.18),_transparent_24%),radial-gradient(circle_at_84%_58%,_rgba(0,240,255,0.12),_transparent_18%),linear-gradient(120deg,_transparent_0%,_transparent_52%,_rgba(255,255,255,0.55)_52%,_rgba(255,255,255,0.16)_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 md:px-10 xl:px-14">
          <header className="flex flex-col gap-5 border-b border-black/10 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-block h-4 w-4 border border-[#002FA7] [clip-path:polygon(30%_0,70%_0,100%_30%,100%_70%,70%_100%,30%_100%,0_70%,0_30%)]" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-black/45">Unified Digital Base / Tech</p>
                <p className="text-sm font-semibold uppercase tracking-[0.18em]">HUANXIDUO</p>
              </div>
            </div>
            <nav className="grid gap-px border border-black/10 bg-black/10 sm:grid-cols-4 lg:min-w-[520px]">
              {navigationItems.map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="inline-flex h-12 items-center justify-center bg-white px-4 text-[11px] font-medium uppercase tracking-[0.28em] text-black/66 transition hover:bg-[#002FA7] hover:text-white"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="grid gap-px border border-black/10 bg-black/10 sm:grid-cols-3 lg:min-w-[360px]">
              <Link href="/" className="inline-flex h-12 items-center justify-center bg-white px-4 text-[11px] font-medium uppercase tracking-[0.24em] text-black/72 transition hover:bg-black hover:text-white">平台总入口</Link>
              <Link href="/lab" className="inline-flex h-12 items-center justify-center bg-white px-4 text-[11px] font-medium uppercase tracking-[0.24em] text-black/72 transition hover:bg-black hover:text-white">iCloush LAB.</Link>
              <a href="#sample" className="inline-flex h-12 items-center justify-center bg-[#002FA7] px-4 text-[11px] font-medium uppercase tracking-[0.24em] text-white transition hover:bg-[#001f73]">Request sample</a>
            </div>
          </header>

          <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:py-12 xl:gap-16">
            <div className="relative z-10 max-w-[560px]">
              <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-[#002FA7]">Hyper-Resolution Industrial Terminal</p>
              <h1 className="mt-6 text-5xl font-black leading-[0.92] tracking-[-0.08em] md:text-7xl xl:text-[6.8rem]">
                环洗朵科技
              </h1>
              <p className="mt-4 max-w-xl text-2xl font-medium tracking-[-0.05em] text-black/78 md:text-4xl">
                次时代清洁解决方案
              </p>
              <p className="mt-6 max-w-xl text-base leading-8 text-black/64 md:text-lg">
                这一次不再把环洗朵做成传统 B2B 模板网站，而是把它重置成一块工业科技发布终端。画面先建立震慑，参数再建立信任，最终才让样板申请与采购转化进入同一条动作链。
              </p>
              <div className="mt-8 grid gap-px border border-black/10 bg-black/10 md:grid-cols-3">
                {heroSignals.map(([value, label, detail]) => (
                  <div key={value} className="bg-white px-5 py-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">{label}</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] md:text-[2rem]">{value}</p>
                    <p className="mt-2 text-sm leading-6 text-black/58">{detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 grid gap-px border border-black/10 bg-black/10 sm:grid-cols-3">
                <a href="#products" className="inline-flex h-14 items-center justify-between bg-white px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-black transition hover:bg-black hover:text-white">
                  查看产品矩阵
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#solutions" className="inline-flex h-14 items-center justify-between bg-white px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-black transition hover:bg-black hover:text-white">
                  查看解决方案
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#sample" className="inline-flex h-14 items-center justify-between bg-[#002FA7] px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-white transition hover:bg-[#001f73]">
                  REQUEST SAMPLE / 申请试样
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="relative min-h-[62vh] overflow-hidden border border-white/70 bg-[#E6EDF2] lg:min-h-[78vh]">
              <img
                src={heroMediaUrl}
                alt="环洗朵 Hero 实验室液滴微距图"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(243,246,248,0.9)_0%,_rgba(243,246,248,0.42)_36%,_rgba(4,9,15,0.08)_62%,_rgba(4,9,15,0.24)_100%)]" />
              <div className="absolute inset-[4%] border border-white/70" />
              <div className="absolute left-[8%] right-[26%] top-[12%] h-[18%] border border-white/60 bg-[linear-gradient(90deg,_rgba(255,255,255,0.58)_0%,_rgba(255,255,255,0.06)_100%)]" />
              <div className="absolute right-[9%] top-[18%] h-[52%] w-[30%] border border-white/55 bg-[linear-gradient(180deg,_rgba(0,47,167,0.16)_0%,_rgba(0,47,167,0.03)_100%),linear-gradient(180deg,_rgba(255,255,255,0.35)_0%,_rgba(211,221,230,0.18)_100%)]" />
              <div className="absolute bottom-[12%] left-[10%] h-[34%] w-[52%] border border-white/55 bg-[linear-gradient(180deg,_rgba(255,255,255,0.82)_0%,_rgba(223,231,238,0.35)_100%)]" />
              <div className="absolute left-[11%] top-[16%] h-px w-[22%] bg-[#002FA7]" />
              <div className="absolute left-[11%] top-[18%] h-px w-[12%] bg-black/18" />
              <div className="absolute right-[14%] top-[14%] font-mono text-[10px] uppercase tracking-[0.34em] text-black/56">
                4K HERO / LAB LIQUID MACRO
              </div>
              <div className="absolute bottom-[9%] left-[10%] right-[12%] grid gap-px border border-black/10 bg-black/10 md:grid-cols-3">
                {[
                  ["Surface", "真实液滴微距图已接入，后续可替换为实验室高清短片。"],
                  ["System", "参数板、解决方案和样板申请共同构成工业终端叙事。"],
                  ["Accent", "高光色仅保留克莱因蓝，用于边界和核心 CTA。"],
                ].map(([title, detail]) => (
                  <div key={title} className="bg-white/90 px-4 py-4 backdrop-blur-[2px]">
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/48">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-black/68">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="technology" className="min-h-screen snap-start border-b border-black/10 bg-white">
        <div className="mx-auto grid min-h-screen max-w-[1600px] gap-10 px-6 py-16 md:px-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch xl:px-14">
          <div className="flex flex-col justify-between gap-10">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#002FA7]">Clean Science / System Logic</p>
              <h2 className="mt-5 text-4xl font-black leading-[0.98] tracking-[-0.06em] md:text-6xl">
                不是卖洗涤剂，
                <br />
                而是输出可验证的洁净系统。
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-black/64 md:text-lg">
                环洗朵的页面语言必须更像一块工业控制面板：结构硬、信息准、动作少而强。每个技术模块都应能承接后续真实检测参数、产品规格书和设备配置说明，而不是停留在泛化的品牌标语上。
              </p>
            </div>
            <div className="grid gap-px border border-black/10 bg-black/10">
              {[
                ["TRUST FRAME", "实验室可信", "CMA / CNAS 证据位、检测报告下载与参数来源说明。"],
                ["DOSING SYSTEM", "自动分配", "分配器、蠕动泵、软水净化装置与工艺节点的参数位置。"],
                ["SUSTAINABLE LOOP", "可持续闭环", "浓缩配方、循环包装与低残留逻辑统一进入技术版式。"],
              ].map(([tag, title, detail]) => (
                <div key={tag} className="grid gap-px bg-black/10 md:grid-cols-[0.24fr_0.76fr]">
                  <div className="bg-[#F6F9FB] px-5 py-5 font-mono text-[10px] uppercase tracking-[0.28em] text-black/42">{tag}</div>
                  <div className="bg-white px-5 py-5">
                    <p className="text-lg font-semibold tracking-[-0.03em]">{title}</p>
                    <p className="mt-2 text-sm leading-7 text-black/60">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-px border border-black/10 bg-black/10 lg:grid-cols-3">
            {technologyModules.map(([code, title, detail]) => (
              <div key={code} className="flex min-h-[360px] flex-col justify-between bg-[#F8FBFD] px-6 py-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#002FA7]">{code}</p>
                  <h3 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.05em]">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-black/62">{detail}</p>
                </div>
                <div className="mt-8 border-t border-black/10 pt-4 font-mono text-[10px] uppercase tracking-[0.26em] text-black/42">
                  Parameter grid ready for real test data
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="min-h-screen snap-start border-b border-black/10 bg-[#EEF3F7]">
        <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 py-16 md:px-10 xl:px-14">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#002FA7]">Solutions / Dispatch by Scenario</p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.06em] md:text-6xl">解决方案</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-black/64">
              解决方案区不再是三张普通卡片，而应像工业终端里的任务频道：每个场景既有业务说明，也有可直接进入的方案入口和参数接入位。
            </p>
          </div>

          <div className="mt-10 grid flex-1 gap-px border border-black/10 bg-black/10">
            {HUANXIDUO_SOLUTIONS.map((item, index) => (
              <div key={item.title} className="grid gap-px bg-black/10 lg:grid-cols-[0.18fr_0.44fr_0.38fr]">
                <div className="flex items-start justify-between bg-white px-6 py-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/42">SCENARIO {index + 1}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{item.title}</p>
                  </div>
                  <div className="font-mono text-xs uppercase tracking-[0.28em] text-[#002FA7]">LIVE</div>
                </div>
                <div className="bg-[#F7FAFC] px-6 py-6">
                  <p className="text-base leading-8 text-black/66">{item.detail}</p>
                </div>
                <div className="grid gap-px bg-black/10 sm:grid-cols-2">
                  <div className="bg-white px-6 py-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-black/42">Action</p>
                    <p className="mt-3 text-base leading-7 text-black/66">获取行业方案、下载对应 TDS、触发样板申请或进入小程序采购链路。</p>
                  </div>
                  <a href="#sample" className="flex items-center justify-between bg-[#002FA7] px-6 py-6 text-sm font-medium uppercase tracking-[0.24em] text-white transition hover:bg-[#001f73]">
                    获取行业方案
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="min-h-screen snap-start bg-white">
        <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 py-16 md:px-10 xl:px-14">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#002FA7]">Product Matrix / Industrial Blueprint</p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.06em] md:text-6xl">产品矩阵</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-black/64">
              产品展示不再使用柔软卡片，而改为接近消费电子与工业蓝图混合的陈列方式。每一个对象都应该同时具备产品名、规格、应用、TDS 动作与试样申请入口。
            </p>
          </div>

          <div className="mt-10 grid flex-1 gap-px border border-black/10 bg-black/10 lg:grid-cols-2">
            {HUANXIDUO_PRODUCTS.map((item, index) => (
              <div key={item.title} className="grid gap-px bg-black/10 md:grid-cols-[0.38fr_0.62fr]">
                <div className="flex min-h-[320px] flex-col justify-between bg-[#EDF3F7] px-6 py-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/42">HXD-0{index + 1}</p>
                    <p className="mt-5 text-3xl font-semibold tracking-[-0.05em]">{item.title}</p>
                    <p className="mt-3 font-mono text-sm uppercase tracking-[0.28em] text-[#002FA7]">{item.specs}</p>
                  </div>
                  <div className="border-t border-black/10 pt-4 text-sm leading-7 text-black/62">
                    {item.detail}
                  </div>
                </div>
                <div className="grid gap-px bg-black/10">
                  <div className="bg-white px-6 py-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/42">Quiet Spec</p>
                    <div className="mt-4 grid gap-px border border-black/10 bg-black/10 sm:grid-cols-2">
                      <div className="bg-white px-4 py-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/42">Format</p>
                        <p className="mt-2 text-sm leading-6 text-black/66">固体 / 液体 / 系统设备 / 终端卫生四类架构。</p>
                      </div>
                      <div className="bg-white px-4 py-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/42">Use Case</p>
                        <p className="mt-2 text-sm leading-6 text-black/66">酒店布草、后厨重油污、客房清洁与设备协同。</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-px bg-black/10 sm:grid-cols-2">
                    <a href="#sample" className="flex h-16 items-center justify-between bg-[#002FA7] px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-white transition hover:bg-[#001f73]">
                      REQUEST SAMPLE / 申请试样
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <a href={tdsPlaceholderUrl} target="_blank" rel="noreferrer" className="flex h-16 items-center justify-between bg-white px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-black transition hover:bg-black hover:text-white">
                      DOWNLOAD TDS / 下载 TDS
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sample" className="min-h-screen snap-start border-t border-black/10 bg-[#EAF1F6]">
        <div className="mx-auto grid min-h-screen max-w-[1600px] gap-px px-6 py-16 md:px-10 lg:grid-cols-[0.72fr_1.28fr] xl:px-14">
          <div className="grid gap-px border border-black/10 bg-black/10">
            <div className="bg-white px-6 py-6 md:px-8 md:py-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#002FA7]">Sample Request / Conversion Hook</p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.06em] md:text-6xl">申领样板</h2>
              <p className="mt-6 text-base leading-8 text-black/64">
                这是环洗朵官网真正的转化锚点。画面必须保持高压，但动作必须非常直接：留资、扫码、技术直连，全部围绕一个目标——把意向客户快速送进可追踪的销售链路。
              </p>
            </div>
            {sampleChannels.map(([title, detail]) => (
              <div key={title} className="bg-[#F7FAFC] px-6 py-5 md:px-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/42">{title}</p>
                <p className="mt-3 text-sm leading-7 text-black/64">{detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-px border border-black/10 bg-black/10">
            <div className="grid gap-px bg-black/10 md:grid-cols-2">
              {[
                "企业名称",
                "联系人",
                "手机 / 微信",
                "所属行业",
                "使用场景",
                "预计月用量",
              ].map((label) => (
                <label key={label} className="bg-white px-5 py-5 text-sm text-black/66">
                  <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.24em] text-black/42">{label}</span>
                  <div className="h-12 border border-black/10 bg-[#F7FAFC]" />
                </label>
              ))}
            </div>
            <label className="bg-white px-5 py-5 text-sm text-black/66">
              <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.24em] text-black/42">备注</span>
              <div className="h-32 border border-black/10 bg-[#F7FAFC]" />
            </label>
            <div className="grid gap-px bg-black/10 md:grid-cols-2">
              <button type="button" className="inline-flex h-16 items-center justify-between bg-[#002FA7] px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-white transition hover:bg-[#001f73]">
                提交样板申请
                <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" className="inline-flex h-16 items-center justify-between bg-white px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-black transition hover:bg-black hover:text-white">
                扫码进入 B2B 采购小程序
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function CareBrandPage() {
  return (
    <main className="min-h-screen bg-[#fcfcfd] text-slate-950">
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-10 xl:px-14">
        <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">iCloush Care / Hotel Service</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">酒店奢护服务品牌页</h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
          该页面作为统一数字底座中的服务型品牌触点，用于承接酒店洗护服务、服务流程与合作咨询。当前预览已恢复 `/care` 路由，保证生态平台中的多品牌入口完整可见。
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white">返回平台总入口</Link>
          <Link href="/tech" className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-medium text-slate-700">查看环洗朵科技</Link>
        </div>
      </section>
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

  return <ShowroomPage products={products} sourceLabel={sourceLabel} isSyncing={showroomQuery.isFetching} interactiveCart />;
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

  return <ProductDetailPage id={id} product={mappedProduct} sourceLabel={sourceLabel} interactiveCart />;
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
      <Route path="/" component={PlatformEcosystemPage} />
      <Route path="/lab" component={ConnectedMonolithicHeroPage} />
      <Route path="/shop" component={ConnectedShowroomPage} />
      <Route path="/tech" component={HuanxiduoTechPage} />
      <Route path="/care" component={CareBrandPage} />
      <Route path="/gallery" component={ConnectedShowroomPage} />
      <Route path="/showroom" component={ConnectedShowroomPage} />
      <Route path="/object/:id">{(params) => <ConnectedProductDetailPage id={params.id} />}</Route>
      <Route path="/product/:id">{(params) => <ConnectedProductDetailPage id={params.id} />}</Route>
      <Route component={NotFoundPage} />
    </Switch>
  );
}
