import React, { useEffect, useMemo, useState, useRef } from "react";
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
  detailImages?: string[];
  paymentMode?: "sandbox" | "production_ready" | "production_live";
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
  detailImageUrls: "__retail_detail_image_urls",
} as const;

function normalizeStatLabel(label: string) {
  return label.replace(/_/g, " ");
}

export function extractRetailAccessFromSpecs(specs: Array<{ key: string; value: string }>) {
  const externalAccess: NonNullable<ShowroomProduct["externalAccess"]> = {};
  let detailImages: string[] = [];
  let paymentMode: ShowroomProduct["paymentMode"] = "sandbox";
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
    if (item.key === RETAIL_META_SPEC_KEYS.detailImageUrls) {
      detailImages = item.value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      return false;
    }
    if (item.key === RETAIL_META_SPEC_KEYS.paymentMode) {
      paymentMode = item.value === "production_live" || item.value === "production_ready" ? item.value : "sandbox";
      return false;
    }
    return true;
  });

  return {
    cleanSpecs,
    externalAccess,
    detailImages,
    paymentMode,
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
    detailImages: extracted.detailImages,
    paymentMode: extracted.paymentMode,
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

const ASTRO_HERO_MEDIA = "/manus-storage/BD-01-电商封面图（1080-1920）_19cf7f90.png";
const ASTRO_DETAIL_MEDIA = "/manus-storage/AP_Detail_Screen04_OlfactoryArchive_Raw_v5_228eed76.webp";
const ASTRO_SUPPORT_MEDIA = "/manus-storage/AP_Detail_Screen03_VoidSetting_Raw_v3_e5514ed6.webp";

const ASTRO_EXHIBITION_OBJECTS = [
  {
    code: "AST-01",
    title: "夜行香幕",
    subtitle: "Tempting Product Imagery / Exhibition Object",
    imageUrl: ASTRO_HERO_MEDIA,
    detail: "把产品图像做成压迫式电影海报，不解释功效，先制造靠近、停留与拥有的欲望。",
    metrics: [
      ["SCENT PRESSURE", "92"],
      ["LOOKBOOK", "4K"],
    ],
  },
  {
    code: "AST-02",
    title: "冷焰织雾",
    subtitle: "Silent Luxury / Textile Perfume Study",
    imageUrl: ASTRO_DETAIL_MEDIA,
    detail: "用冷白标题、低照度瓶身与深空留白，把 Astro 放在介于香氛、陈列与礼物对象之间的地带。",
    metrics: [
      ["MATERIAL INDEX", "08"],
      ["AFTERGLOW", "T+6H"],
    ],
  },
  {
    code: "AST-03",
    title: "黑曜携行盒",
    subtitle: "Giftable Object / Midnight Carry Ritual",
    imageUrl: ASTRO_SUPPORT_MEDIA,
    detail: "既可当作产品，也像一件可被拍摄、可被转赠、可被收藏的黑色器物，承担社交传播的第一视觉。",
    metrics: [
      ["GIFT SCORE", "A/A"],
      ["DROP FORMAT", "SET"],
    ],
  },
] as const;

const ASTRO_PROTOCOL_METRICS = [
  ["IMAGE-FIRST COMMERCE", "先看图，再读字，再决定进入商品页。"],
  ["SCROLL SNAP", "整屏吸附滚动继续保留，让浏览像进入展厅隔间。"],
  ["BRAND POSITION", "浣星司先以第 5 个品牌站点进入数字底座，再接后台商品发布器。"],
] as const;

export function AstroPage() {
  return (
    <main className="min-h-screen snap-y snap-mandatory overflow-y-auto bg-[#050505] text-[#f4efe6]">
      <section className="relative min-h-screen snap-start overflow-hidden border-b border-[#111111] bg-black">
        <div className="absolute inset-0 bg-black" />
        <img src={ASTRO_HERO_MEDIA} alt="浣星司首屏展陈对象" className="absolute inset-0 h-full w-full object-cover opacity-50 grayscale contrast-125 brightness-[0.45]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.34)_42%,rgba(0,0,0,0.82)_100%),linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.82))]" />
        <div className="noise-layer absolute inset-0 opacity-20" />
        <div className="absolute inset-y-0 left-[8%] hidden w-px bg-[#111111] md:block" />
        <div className="absolute inset-y-0 right-[8%] hidden w-px bg-[#111111] md:block" />

        <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#111111] pb-5">
            <div className="justify-self-start">
              <Link href="/" className="font-mono text-[10px] uppercase tracking-[0.48em] text-[#948b80] transition hover:text-[#f4efe6]">
                Archive
              </Link>
            </div>
            <div className="justify-self-center text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.72em] text-[#f4efe6]">ASTRO</p>
              <p className="mt-1 font-zh-serif text-[11px] tracking-[0.36em] text-[#7e776d]">浣星司</p>
            </div>
            <div className="justify-self-end flex items-center gap-6">
              <Link href="#astro-catalogue" className="font-mono text-[10px] uppercase tracking-[0.48em] text-[#8a8175] transition hover:text-[#f4efe6]">
                Objects
              </Link>
              <Link href="/shop" className="font-mono text-[10px] uppercase tracking-[0.48em] text-[#8a8175] transition hover:text-[#f4efe6]">
                Shop
              </Link>
            </div>
          </header>

          <div className="relative flex flex-1 items-center py-10 md:py-12">
            <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <div className="max-w-3xl">
                <p className="font-mono text-[10px] uppercase tracking-[0.62em] text-[#8f867a]">Tempting Product Imagery / Exhibition Index</p>
                <h1 className="mt-8 font-zh-sans text-[2.8rem] font-light uppercase tracking-[0.28em] text-[#f4efe6] md:text-[4.8rem] md:tracking-[0.34em] xl:text-[6rem]">
                  浣星司 ASTRO
                </h1>
                <p className="mt-8 max-w-2xl font-zh-serif text-sm leading-8 text-[#a49a8f] md:text-base">
                  浣星司先不把自己做成热闹商城，而是先像一间黑场展厅。首页只负责悬挂诱人的产品图像、把对象放大到接近电影海报的尺度，再把浏览者缓慢导向商品与购买链路。
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-5">
                  <Link href="#astro-catalogue" className="inline-flex items-center gap-4 text-[#f4efe6] transition hover:text-white">
                    <span className="h-px w-16 bg-[#f4efe6]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.56em]">View exhibition</span>
                  </Link>
                  <Link href="/shop" className="font-mono text-[10px] uppercase tracking-[0.48em] text-[#8d8478] transition hover:text-[#f4efe6]">
                    Enter commerce layer
                  </Link>
                </div>
              </div>

              <div className="justify-self-end max-w-xl border border-[#151515] bg-black/60 p-6 md:p-8" style={{ clipPath: "polygon(0 0, calc(100% - 2rem) 0, 100% 2rem, 100% 100%, 2rem 100%, 0 calc(100% - 2rem))" }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.46em] text-[#6d655a]">Launch Intent</p>
                <p className="mt-5 font-zh-sans text-[1.2rem] uppercase tracking-[0.24em] text-[#f4efe6] md:text-[1.6rem]">Image before explanation. Desire before specification.</p>
                <p className="mt-5 font-zh-serif text-sm leading-8 text-[#9b9288]">
                  这一版 `/astro` 的任务，是让浣星司先成为生态中的正式品牌入口，并形成可浏览、可停留、可继续接商品页的展陈首页。后台长图发布器与品牌隔离会在下一阶段继续补齐。
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-[#101010] py-5 md:grid-cols-3">
            {ASTRO_PROTOCOL_METRICS.map(([label, detail]) => (
              <div key={label} className="flex items-start gap-4 border-l border-[#111111] pl-4 first:border-l-0 first:pl-0 md:first:pl-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7a7268]">{label}</p>
                <p className="text-sm leading-7 text-[#9c948a]">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="astro-catalogue" className="relative min-h-screen snap-start border-b border-[#101010] bg-[#030303]">
        <div className="noise-layer absolute inset-0 opacity-15" />
        <div className="relative mx-auto max-w-[1600px] px-6 py-16 md:px-10 lg:px-14 xl:px-16">
          <div className="grid gap-8 lg:grid-cols-[0.58fr_1.42fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.52em] text-[#7e7568]">Exhibition Stack</p>
              <h2 className="mt-5 font-zh-sans text-[2.2rem] font-light uppercase tracking-[0.24em] text-[#f4efe6] md:text-[3.6rem]">
                用图像浏览，
                <br />
                而不是用货架浏览。
              </h2>
            </div>
            <p className="max-w-2xl font-zh-serif text-sm leading-8 text-[#988f84] md:text-base">
              三个对象并不是标准 SKU 卡片，而是三个正在逼近用户视线的展陈镜头。每个镜头都预留了之后接入商品详情、长图发布和短链分发的位置，让 `/astro` 从第一天开始就具备商城化扩展余地。
            </p>
          </div>

          <div className="mt-12 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="group relative min-h-[36rem] overflow-hidden border border-[#141414] bg-black" style={{ clipPath: "polygon(0 0, calc(100% - 2.2rem) 0, 100% 2.2rem, 100% 100%, 0 100%)" }}>
              <img src={ASTRO_EXHIBITION_OBJECTS[0].imageUrl} alt={ASTRO_EXHIBITION_OBJECTS[0].title} className="absolute inset-0 h-full w-full object-cover opacity-70 grayscale contrast-125 brightness-[0.52] transition duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.86)_76%,rgba(0,0,0,0.96)_100%)]" />
              <div className="absolute inset-x-7 top-7 flex items-center justify-between text-[#857c70]">
                <span className="font-mono text-[10px] uppercase tracking-[0.42em]">{ASTRO_EXHIBITION_OBJECTS[0].code}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.42em]">Hero Frame</span>
              </div>
              <div className="absolute inset-x-7 bottom-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#6e665c]">{ASTRO_EXHIBITION_OBJECTS[0].subtitle}</p>
                <h3 className="mt-4 font-zh-sans text-[2rem] uppercase tracking-[0.22em] text-[#f4efe6] md:text-[3rem]">{ASTRO_EXHIBITION_OBJECTS[0].title}</h3>
                <p className="mt-4 max-w-xl font-zh-serif text-sm leading-8 text-[#a49a8f] md:text-base">{ASTRO_EXHIBITION_OBJECTS[0].detail}</p>
                <div className="mt-6 flex flex-wrap gap-6 text-[#d8d1c8]">
                  {ASTRO_EXHIBITION_OBJECTS[0].metrics.map(([label, value]) => (
                    <div key={label}>
                      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#6f675c]">{label}</p>
                      <p className="mt-2 text-lg tracking-[0.18em]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <div className="grid gap-6">
              {ASTRO_EXHIBITION_OBJECTS.slice(1).map((item) => (
                <article key={item.code} className="group relative min-h-[17rem] overflow-hidden border border-[#141414] bg-[#060606] p-6 md:p-7" style={{ clipPath: "polygon(0 0, calc(100% - 1.6rem) 0, 100% 1.6rem, 100% 100%, 1.6rem 100%, 0 calc(100% - 1.6rem))" }}>
                  <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden border-l border-[#111111]">
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover opacity-58 grayscale contrast-125 brightness-[0.52] transition duration-500 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.76)_0%,rgba(0,0,0,0.2)_32%,rgba(0,0,0,0.72)_100%)]" />
                  </div>
                  <div className="relative z-10 flex h-full max-w-[60%] flex-col justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f665c]">{item.code}</p>
                      <h3 className="mt-4 font-zh-sans text-[1.6rem] uppercase tracking-[0.2em] text-[#f4efe6]">{item.title}</h3>
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.38em] text-[#80776c]">{item.subtitle}</p>
                    </div>
                    <div>
                      <p className="font-zh-serif text-sm leading-8 text-[#9f968a]">{item.detail}</p>
                      <div className="mt-5 flex flex-wrap gap-5">
                        {item.metrics.map(([label, value]) => (
                          <div key={label}>
                            <p className="font-mono text-[10px] uppercase tracking-[0.38em] text-[#6e665b]">{label}</p>
                            <p className="mt-2 text-sm tracking-[0.18em] text-[#f4efe6]">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="snap-start bg-black">
        <div className="mx-auto grid min-h-screen max-w-[1600px] gap-8 px-6 py-16 md:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-14 xl:px-16">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.52em] text-[#7b7368]">Route Bridge</p>
            <h2 className="mt-6 font-zh-sans text-[2.2rem] font-light uppercase tracking-[0.24em] text-[#f4efe6] md:text-[3.8rem]">
              先把浣星司接进生态，
              <br />
              再把商品系统接进浣星司。
            </h2>
            <p className="mt-6 max-w-xl font-zh-serif text-sm leading-8 text-[#9e9589] md:text-base">
              这一版 Astro 不抢做复杂电商交互，而是优先承担品牌占位、对象展陈与图像浏览。下一阶段可以在不推翻当前视觉结构的前提下，继续补上长图详情发布、品牌隔离后台、二维码和短链生成器。
            </p>
          </div>

          <div className="grid gap-5">
            <div className="border border-[#141414] bg-[#050505] p-6 md:p-8" style={{ clipPath: "polygon(0 0, calc(100% - 2rem) 0, 100% 2rem, 100% 100%, 0 100%)" }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#776f63]">Immediate Links</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  ["/", "Platform Entry"],
                  ["/shop", "Commerce Layer"],
                  ["/showroom", "LAB Showroom"],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="border border-[#171717] px-4 py-4 font-mono text-[10px] uppercase tracking-[0.42em] text-[#d6cfc5] transition hover:border-[#2b2b2b] hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="border border-[#141414] bg-[#050505] p-6 md:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#776f63]">Launch Note</p>
              <p className="mt-5 font-zh-serif text-sm leading-8 text-[#9f968a] md:text-base">
                当前 `/astro` 已具备 scroll-snap、高清商品图展陈、品牌化首屏与生态入口语义，可以先作为浣星司的展厅首页上线预览，并等待后台商品详情发布系统接入。
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
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
  const detailImages = product.detailImages?.filter(Boolean) ?? [];
  const paymentModeLabel =
    product.paymentMode === "production_live"
      ? "PRODUCTION LIVE / 已切正式支付"
      : product.paymentMode === "production_ready"
        ? "PRODUCTION READY / 备案后可切正式"
        : "SANDBOX / 当前为测试支付";
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
          {detailImages.length > 0 ? (
            <section className="border border-[#111111] bg-[#020202] p-6 md:p-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">Rich Content / 商品详情长图</p>
                  <h3 className="mt-3 font-zh-sans text-[2rem] font-light uppercase tracking-[0.16em] text-[#f3efe6] md:text-[2.6rem]">沉浸详情浏览</h3>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#8c8378]">{detailImages.length} Frames</p>
              </div>
              <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">这些长图由管理端按序维护，可用于承接品牌概念图、实验细节图与淘宝式纵向详情页，在不改代码的情况下持续更新。</p>
              <div className="mt-6 space-y-4">
                {detailImages.map((imageUrl, index) => (
                  <figure key={`${imageUrl}-${index}`} className="overflow-hidden border border-[#111111] bg-[#050505]">
                    <img src={imageUrl} alt={`${product.name} 详情图 ${index + 1}`} className="h-full w-full object-cover" />
                    <figcaption className="border-t border-[#111111] px-5 py-4 font-mono text-[10px] uppercase tracking-[0.42em] text-[#7f7f7f]">
                      Detail Frame {String(index + 1).padStart(2, "0")}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
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
              <div className="mt-5 rounded-2xl border border-[#111111] bg-[#050505] px-4 py-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[#8c8378]">
                {paymentModeLabel}
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
    href: "/astro",
    kicker: "TEMPTING OBJECTS",
    title: "浣星司 / ASTRO",
    description: "作为新的诱人商品图展厅入口，先承接黑场图像浏览与品牌占位，再逐步接入完整商品详情发布系统。",
    accent: "#d4b483",
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
              <Link href="/astro" className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">浣星司 / ASTRO</Link>
              <Link href="/care" className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">iCloush Care</Link>
              <Link href="/shop" className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">商城系统</Link>
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                当前预览已切回统一数字底座视角：根路径用于展示品牌矩阵与站点分工，`/lab` 承接 iCloush LAB. 的零售堡垒，`/tech` 承接环洗朵科技官网，`/astro` 承接浣星司的图像展厅入口，`/care` 承接服务品牌页，`/shop` 承接商城入口。这样你进入预览后，不会再只看到单一 LAB 首页。
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/astro" className="inline-flex h-12 items-center justify-center rounded-full bg-[#111111] px-6 text-sm font-medium text-white transition hover:bg-[#1b1b1b]">
                  查看浣星司 / ASTRO
                </Link>
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
                <p className="mt-3 text-3xl font-semibold tracking-tight">5 个</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">商城、LAB、环洗朵科技、浣星司与 Care 已纳入同一预览入口。</p>
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
              ["/astro", "浣星司图像展厅"],
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

function IndustrialSignalField({ posterUrl }: { posterUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = Array.from({ length: 18 }, (_, index) => ({
      anchorX: 0.12 + (index % 6) * 0.15,
      anchorY: 0.18 + Math.floor(index / 6) * 0.22,
      radius: 1.5 + (index % 4),
      speed: 0.00014 + (index % 5) * 0.00005,
      phase: index * 0.9,
    }));

    let animationFrame = 0;
    let cssWidth = 0;
    let cssHeight = 0;

    const resize = () => {
      cssWidth = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth;
      cssHeight = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawFrame = (time: number) => {
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.fillStyle = "#030508";
      context.fillRect(0, 0, cssWidth, cssHeight);

      const bloom = context.createRadialGradient(cssWidth * 0.72, cssHeight * 0.24, 0, cssWidth * 0.72, cssHeight * 0.24, cssWidth * 0.7);
      bloom.addColorStop(0, "rgba(13, 103, 255, 0.26)");
      bloom.addColorStop(0.4, "rgba(0, 155, 255, 0.12)");
      bloom.addColorStop(1, "rgba(3, 5, 8, 0)");
      context.fillStyle = bloom;
      context.fillRect(0, 0, cssWidth, cssHeight);

      context.strokeStyle = "rgba(255,255,255,0.06)";
      context.lineWidth = 1;
      for (let x = 0; x <= cssWidth; x += Math.max(cssWidth / 8, 96)) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, cssHeight);
        context.stroke();
      }
      for (let y = 0; y <= cssHeight; y += Math.max(cssHeight / 7, 84)) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(cssWidth, y);
        context.stroke();
      }

      const timeFactor = reduceMotion ? 0.2 : 1;
      for (let band = 0; band < 4; band += 1) {
        context.beginPath();
        for (let x = 0; x <= cssWidth; x += 18) {
          const normalized = x / cssWidth;
          const y =
            cssHeight * (0.18 + band * 0.16) +
            Math.sin(normalized * 12 + time * 0.0012 * timeFactor + band) * (18 + band * 4) +
            Math.cos(normalized * 7 - time * 0.00085 * timeFactor + band) * 14;
          if (x === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = band % 2 === 0 ? "rgba(89, 164, 255, 0.35)" : "rgba(255,255,255,0.16)";
        context.lineWidth = band === 0 ? 2.2 : 1.2;
        context.stroke();
      }

      for (const particle of particles) {
        const x = cssWidth * particle.anchorX + Math.sin(time * particle.speed * timeFactor + particle.phase) * cssWidth * 0.08;
        const y = cssHeight * particle.anchorY + Math.cos(time * particle.speed * 1.35 * timeFactor + particle.phase) * cssHeight * 0.09;

        for (const target of particles) {
          if (target === particle) continue;
          const tx = cssWidth * target.anchorX + Math.sin(time * target.speed * timeFactor + target.phase) * cssWidth * 0.08;
          const ty = cssHeight * target.anchorY + Math.cos(time * target.speed * 1.35 * timeFactor + target.phase) * cssHeight * 0.09;
          const dx = tx - x;
          const dy = ty - y;
          const distance = Math.hypot(dx, dy);
          if (distance < 180) {
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(tx, ty);
            context.strokeStyle = `rgba(93, 177, 255, ${0.16 - distance / 1800})`;
            context.lineWidth = 0.8;
            context.stroke();
          }
        }

        context.beginPath();
        context.fillStyle = "rgba(255,255,255,0.9)";
        context.arc(x, y, particle.radius, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.strokeStyle = "rgba(79, 158, 255, 0.26)";
        context.arc(x, y, particle.radius * 4.5, 0, Math.PI * 2);
        context.stroke();
      }

      context.fillStyle = "rgba(255,255,255,0.05)";
      for (let row = 0; row < cssHeight; row += 3) {
        context.fillRect(0, row, cssWidth, 1);
      }

      animationFrame = window.requestAnimationFrame(drawFrame);
    };

    resize();
    animationFrame = window.requestAnimationFrame(drawFrame);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#030508]" aria-hidden="true">
      <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-30 mix-blend-screen" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_22%,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(180deg,_rgba(2,6,10,0.18)_0%,_rgba(2,6,10,0.72)_82%,_rgba(2,6,10,0.94)_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.11] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.16) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 6px)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(2,6,10,0.12)_46%,_rgba(2,6,10,0.72)_100%)]" />
    </div>
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
    ["4K POSTER // REAL ASSET FEED", "首屏改用真实 /manus-storage 高清图，不再依赖 Base64。"],
    ["SNAP STACK // MANDATORY SCROLL", "每个章节以整屏为单位硬切换，建立工业门闸般的节奏。"],
    ["LIVE MOTION // CODE-DRIVEN FIELD", "在缺少正式短片素材前，用动态流体场与噪点遮罩维持压迫感。"],
  ] as const;

  const technologyModules = [
    ["MODULE 01 // CLEAN SCIENCE", "军规级洁净技术", "把活性酶、去污效率与织物友好度组织成可验证的参数蓝图。", "PH VALUE 7.0 | CNAS CERTIFIED | ENZYME SYSTEM"],
    ["MODULE 02 // DOSING LOGIC", "自动分配与软水系统", "用分配器、蠕动泵与软水装置把系统能力而不是单品感受推到前台。", "SOFT WATER | AUTO DOSING | LESS HUMAN ERROR"],
    ["MODULE 03 // SUSTAINABLE LOOP", "低残留可持续闭环", "包装循环、浓缩投放和低残留同屏呈现，避免落回普通环保话术。", "LOW RESIDUE | REUSE PACKAGE | LONG CYCLE"],
  ] as const;

  const sampleChannels = [
    ["企业微信", "页脚与申样区统一展示客服二维码资源位，承接高价值咨询。"],
    ["技术总监直连", "保留大客户的快速评估通道，用于设备与配方方案沟通。"],
    ["采购小程序", "把样板申请、规格书下载与 B2B 采购链路放进一个动作闭环。"],
  ] as const;

  const heroMediaUrl = "/manus-storage/huanxiduo-hero-4k_a47d4dd9.jpg";
  const tdsPlaceholderUrl = "/manus-storage/huanxiduo-tds-placeholder_18e633bb.pdf";

  return (
    <main className="h-screen snap-y snap-mandatory overflow-y-auto bg-[#020406] text-white">
      <section className="relative h-screen snap-start snap-always overflow-hidden">
        <IndustrialSignalField posterUrl={heroMediaUrl} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,4,6,0.18)_0%,rgba(2,4,6,0.42)_42%,rgba(2,4,6,0.9)_100%)]" />
        <div className="relative z-10 mx-auto flex h-full max-w-[1680px] flex-col px-6 md:px-10 xl:px-14">
          <header className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              <span className="inline-block h-2 w-2 bg-[#0b5fff]" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/36">Unified Digital Base / Tech</p>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/82">HUANXIDUO</p>
              </div>
            </div>
            <nav className="hidden items-center gap-3 lg:flex">
              {navigationItems.map(([href, label], index) => (
                <React.Fragment key={href}>
                  <a href={href} className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/52 transition hover:text-white">
                    {label}
                  </a>
                  {index < navigationItems.length - 1 ? <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/18">//</span> : null}
                </React.Fragment>
              ))}
            </nav>
            <div className="flex items-center gap-5">
              <Link href="/" className="hidden text-[11px] uppercase tracking-[0.28em] text-white/44 transition hover:text-white sm:inline-flex">平台总入口</Link>
              <a href="#sample" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white transition hover:text-[#86b4ff]">
                REQUEST SAMPLE
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </header>

          <div className="grid h-full items-end gap-12 py-10 lg:grid-cols-[0.74fr_0.26fr] xl:gap-20">
            <div className="max-w-[980px] pb-12 md:pb-16 xl:pb-20">
              <p className="font-mono text-[11px] uppercase tracking-[0.46em] text-[#8db9ff]">Hyper-Resolution Industrial Terminal</p>
              <h1 className="mt-7 max-w-[1100px] text-5xl font-black leading-[0.86] tracking-[-0.08em] text-white md:text-7xl xl:text-[7.6rem]">
                环洗朵科技
              </h1>
              <p className="mt-5 max-w-3xl text-xl font-medium tracking-[-0.05em] text-white/88 md:text-4xl">
                次时代清洁解决方案
              </p>
              <p className="mt-8 max-w-2xl text-sm leading-9 text-white/58 md:text-base">
                把实验室液滴微距、工业参数板和整屏硬切滚动拼成一块发布终端。画面先建立压迫，参数再建立信任，最后才让样板申请与采购入口接管转化。
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.32em] text-white/38 md:text-[11px]">
                <span>PH VALUE 7.0</span>
                <span>|</span>
                <span>CNAS CERTIFIED</span>
                <span>|</span>
                <span>20L DRUM</span>
                <span>|</span>
                <span>LOW RESIDUE LOOP</span>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <a href="#products" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white transition hover:text-[#86b4ff]">
                  查看产品矩阵
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#solutions" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white/76 transition hover:text-white">
                  查看解决方案
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href={tdsPlaceholderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-[#a8c7ff] transition hover:text-white">
                  DOWNLOAD TDS / 下载 TDS
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="hidden self-end pb-12 lg:block">
              <div className="space-y-10">
                {heroSignals.map(([headline, detail]) => (
                  <div key={headline} className="max-w-[320px]">
                    <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/34">{headline}</p>
                    <p className="mt-4 text-sm leading-8 text-white/56">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-7 left-6 right-6 hidden xl:flex xl:items-center xl:justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/26">HERO FEED // /manus-storage/huanxiduo-hero-4k_a47d4dd9.jpg</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/22">NOISE OVERLAY // CODE-DRIVEN FLOW FIELD // LIVE INDUSTRIAL MOTION</p>
          </div>
        </div>
      </section>

      <section id="technology" className="relative h-screen snap-start snap-always overflow-hidden bg-[#05080d]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(11,95,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.01),transparent_38%)]" />
        <div className="relative mx-auto grid h-full max-w-[1680px] gap-12 px-6 py-10 md:px-10 lg:grid-cols-[0.36fr_0.64fr] xl:px-14">
          <div className="flex flex-col justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-[#8db9ff]">Clean Science / System Logic</p>
              <h2 className="mt-6 text-4xl font-black leading-[0.92] tracking-[-0.06em] text-white md:text-6xl">
                把洁净能力做成可验证的工业系统。
              </h2>
              <p className="mt-8 max-w-xl text-sm leading-9 text-white/58 md:text-base">
                这一屏承担可信度建立。内容必须像高压工业发布终端，而不是 B2B 模板的盒子堆叠。结构越安静，技术越可信。
              </p>
            </div>

            <div className="space-y-8 pb-2">
              {[
                ["TRUST FRAME", "CMA / CNAS 报告位已预留"],
                ["DOSING SYSTEM", "设备参数、配比逻辑与工艺节点同屏"],
                ["SUSTAINABLE LOOP", "低残留、浓缩、循环包装统一进板"],
              ].map(([code, detail]) => (
                <div key={code}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/28">{code}</p>
                  <p className="mt-3 text-base leading-8 text-white/68">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-3 lg:items-end">
            {technologyModules.map(([code, title, detail, footnote]) => (
              <article key={code} className="flex h-full flex-col justify-between gap-14">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#8db9ff]">{code}</p>
                  <h3 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.05em] text-white">{title}</h3>
                  <p className="mt-5 text-sm leading-8 text-white/58">{detail}</p>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/26">{footnote}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="relative h-screen snap-start snap-always overflow-hidden bg-[#04070b]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.015)_0%,transparent_34%,rgba(11,95,255,0.035)_100%)]" />
        <div className="relative mx-auto flex h-full max-w-[1680px] flex-col px-6 py-10 md:px-10 xl:px-14">
          <div className="flex items-end justify-between gap-10">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-[#8db9ff]">Solutions / Dispatch by Scenario</p>
              <h2 className="mt-6 text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">解决方案</h2>
            </div>
            <p className="hidden max-w-2xl text-sm leading-9 text-white/56 lg:block">
              三个场景不再做成普通卡片，而是以留白、字重和动作入口直接分层，让用户每滚一次就硬切到新的工业场景。
            </p>
          </div>

          <div className="mt-12 grid h-full content-start gap-12">
            {HUANXIDUO_SOLUTIONS.map((item, index) => (
              <article key={item.title} className="grid gap-6 lg:grid-cols-[0.18fr_0.46fr_0.36fr] lg:items-end">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/28">SCENARIO {String(index + 1).padStart(2, "0")}</p>
                  <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white md:text-[2.45rem]">{item.title}</p>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[#8db9ff]">LIVE // INDUSTRIAL LAUNDRY | KITCHEN HYGIENE | ROOM CARE</p>
                </div>
                <p className="max-w-3xl text-sm leading-9 text-white/58 md:text-base">{item.detail}</p>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/24">ACTION // SAMPLE | TDS | PROCUREMENT</p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <a href="#sample" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white transition hover:text-[#86b4ff]">
                      获取行业方案
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <a href={tdsPlaceholderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white/62 transition hover:text-white">
                      DOWNLOAD TDS
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="relative h-screen snap-start snap-always overflow-hidden bg-[#020406]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.015)_42%,transparent_100%)]" />
        <div className="relative mx-auto flex h-full max-w-[1680px] flex-col px-6 py-10 md:px-10 xl:px-14">
          <div className="flex items-end justify-between gap-10">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-[#8db9ff]">Product Matrix / Industrial Blueprint</p>
              <h2 className="mt-6 text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">产品矩阵</h2>
            </div>
            <p className="hidden max-w-2xl text-sm leading-9 text-white/56 lg:block">
              这里不再像后台表单，而是让参数直接悬浮在空间里。通过 Label / Value 层级、空气感留白与动作密度控制完成决策加速。
            </p>
          </div>

          <div className="mt-12 grid h-full content-start gap-x-16 gap-y-12 lg:grid-cols-2">
            {HUANXIDUO_PRODUCTS.map((item, index) => (
              <article key={item.title} className="flex flex-col gap-8">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/28">HXD-0{index + 1}</p>
                  <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white md:text-[2.5rem]">{item.title}</h3>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.34em] text-[#8db9ff]">{item.specs} | INDUSTRIAL BLUEPRINT | QUIET SPEC</p>
                  <p className="mt-5 max-w-2xl text-sm leading-8 text-white/58">{item.detail}</p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/26">FORMAT</span>
                    <span className="text-base leading-8 text-white/88">固体、液体、系统设备与终端卫生四类结构。</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/26">USE CASE</span>
                    <span className="text-base leading-8 text-white/72">工业洗涤 | 后厨重油污 | 客房卫生 | 设备协同</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/26">ACTION</span>
                    <span className="text-base leading-8 text-white/72">REQUEST SAMPLE // DOWNLOAD TDS // B2B PROCUREMENT</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
                  <a href="#sample" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white transition hover:text-[#86b4ff]">
                    REQUEST SAMPLE / 申请试样
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a href={tdsPlaceholderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-[#a8c7ff] transition hover:text-white">
                    DOWNLOAD TDS / 下载 TDS
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="sample" className="relative h-screen snap-start snap-always overflow-hidden bg-[#04070b]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.015)_0%,transparent_36%,rgba(2,4,6,0.22)_100%)]" />
        <div className="relative mx-auto grid h-full max-w-[1680px] gap-14 px-6 py-10 md:px-10 lg:grid-cols-[0.38fr_0.62fr] xl:px-14">
          <div className="flex flex-col justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-[#8db9ff]">Sample Request / Conversion Hook</p>
              <h2 className="mt-6 text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">申领样板</h2>
              <p className="mt-8 text-sm leading-9 text-white/58 md:text-base">
                画面保持高压，动作保持直给。留资、扫码、技术直连必须在一屏内全部建立，但不再把文字塞进表格盒子里。
              </p>
            </div>

            <div className="space-y-8 pb-2">
              {sampleChannels.map(([title, detail]) => (
                <div key={title}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/28">{title}</p>
                  <p className="mt-3 text-base leading-8 text-white/68">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex h-full flex-col justify-between gap-10">
            <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
              {[
                ["企业名称", "请输入企业名称"],
                ["联系人", "请输入联系人姓名"],
                ["手机 / 微信", "请输入联系方式"],
                ["所属行业", "请选择工业洗涤 / 后厨清洁 / 住房卫生"],
                ["使用场景", "说明设备、布草或场景需求"],
                ["预计月用量", "如 20L DRUM | 60L SYSTEM | MONTHLY"],
              ].map(([label, placeholder]) => (
                <label key={label} className="block">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.32em] text-white/28">{label}</span>
                  <span className="mt-4 block text-base leading-8 text-white/62">{placeholder}</span>
                </label>
              ))}
            </div>

            <label className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[0.32em] text-white/28">备注</span>
              <span className="mt-4 block text-base leading-8 text-white/62">补充布草类型、厨房体量、设备结构或其他试样要求。</span>
            </label>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2">
              <button type="button" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white transition hover:text-[#86b4ff]">
                提交样板申请
                <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white/72 transition hover:text-white">
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
      <Route path="/astro" component={AstroPage} />
      <Route path="/care" component={CareBrandPage} />
      <Route path="/gallery" component={ConnectedShowroomPage} />
      <Route path="/showroom" component={ConnectedShowroomPage} />
      <Route path="/object/:id">{(params) => <ConnectedProductDetailPage id={params.id} />}</Route>
      <Route path="/product/:id">{(params) => <ConnectedProductDetailPage id={params.id} />}</Route>
      <Route component={NotFoundPage} />
    </Switch>
  );
}
