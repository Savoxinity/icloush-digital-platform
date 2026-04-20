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
  const signal = getProductSignalColor(featured);

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

  const objectTransform = `translate3d(${(depthShift.x * 14).toFixed(1)}px, ${(depthShift.y * 10).toFixed(1)}px, 0)`;
  const mistTransform = `translate3d(${(depthShift.x * -10).toFixed(1)}px, ${(depthShift.y * -8).toFixed(1)}px, 0)`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#000000] text-[#f3efe6]">
      <LabVaultMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <section className="relative isolate min-h-screen border-b border-[#0c0c0c] bg-[#000000]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.08),transparent_16%),radial-gradient(circle_at_50%_58%,rgba(255,255,255,0.04),transparent_28%),linear-gradient(180deg,#020202_0%,#000000_48%,#020202_100%)]" />
        <div className="noise-layer absolute inset-0 opacity-20" />
        <div className="absolute inset-x-0 top-0 h-px bg-[#111111]" />
        <div className="absolute inset-y-0 left-[8%] hidden w-px bg-[#0f0f0f] md:block" />
        <div className="absolute inset-y-0 right-[8%] hidden w-px bg-[#0f0f0f] md:block" />

        <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#111111] pb-5 text-[#f3efe6]">
            <div className="justify-self-start">
              <button type="button" aria-label="打开菜单" onClick={() => setMenuOpen(true)} className="group inline-flex items-center gap-4 text-left">
                <span className="flex flex-col gap-[6px]" aria-hidden="true">
                  <span className="block h-px w-7 bg-[#f3efe6] transition group-hover:w-9" />
                  <span className="block h-px w-5 bg-[#8d857a] transition group-hover:w-7 group-hover:bg-[#f3efe6]" />
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-full w-full overflow-hidden border border-[#0d0d0d] bg-[#020202]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.78))]" />
                <div className="absolute inset-0 opacity-60" style={{ transform: mistTransform }}>
                  <div
                    className="absolute left-1/2 top-[14%] h-[58%] w-[34%] -translate-x-1/2 border border-[#121212] bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.16),rgba(255,255,255,0.02)_34%,transparent_58%),linear-gradient(180deg,#050505_0%,#000000_100%)]"
                    style={{ clipPath: "polygon(18% 0, 82% 0, 100% 12%, 100% 100%, 0 100%, 0 12%)" }}
                  />
                  <div className="absolute left-1/2 top-[8%] h-[12%] w-[12%] -translate-x-1/2 border border-[#121212] bg-[#050505]" />
                </div>
                <div className="absolute inset-0" style={{ transform: objectTransform }}>
                  {featured.imageUrl ? <img src={featured.imageUrl} alt={featured.name} className="h-full w-full object-cover opacity-60 grayscale contrast-125" /> : null}
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.68),transparent_32%,transparent_68%,rgba(0,0,0,0.68)),linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.68))]" />
              </div>
            </div>

            <div className="relative z-10 flex w-full flex-col items-center justify-center text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.72em] text-[#8f877b]">3026 Orbital Jeweler</p>
              <h1 className="mt-8 max-w-5xl font-zh-sans text-[2.5rem] font-light uppercase tracking-[0.28em] text-[#f3efe6] md:text-[4.8rem] md:tracking-[0.38em] xl:text-[6rem]">ICLOUSH LAB.</h1>
              <p className="mt-6 max-w-xl font-mono text-[10px] uppercase tracking-[0.5em] text-[#b2aa9f]">{featured.series === "AP" ? "Atmospheric Purification" : "Fabric Care"}</p>
              <div className="mt-8 h-px w-24" style={{ backgroundColor: signal }} />
              <p className="mt-10 max-w-2xl font-zh-serif text-sm leading-8 text-[#9b9388] md:text-base">
                安静，但具有压迫力。像一部科幻电影片头一样，只在画面中央切入一行标题，让对象、材质、黑场和留白代替所有喧闹界面。
              </p>
              <div className="mt-12">
                <CutlineArrow />
              </div>
            </div>

            <div className="absolute bottom-8 left-0 right-0 z-10 hidden items-end justify-between md:flex">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#646464]">Featured Object</p>
                <p className="mt-3 font-zh-sans text-sm uppercase tracking-[0.24em] text-[#f3efe6]">{featured.code}</p>
              </div>
              <div className="max-w-sm text-right">
                <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#646464]">Silent Pressure</p>
                <p className="mt-3 font-zh-serif text-sm leading-8 text-[#8f877b]">{featured.heroLine}</p>
              </div>
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
              <QrCode className="h-5 w-5 text-[#9c7a31]" />
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
  const [hoveredProductId, setHoveredProductId] = useState(products[0]?.id ?? SHOWROOM_PRODUCTS[0]?.id ?? "");

  useEffect(() => {
    if (!products.some((product) => product.id === hoveredProductId)) {
      setHoveredProductId(products[0]?.id ?? SHOWROOM_PRODUCTS[0]?.id ?? "");
    }
  }, [hoveredProductId, products]);

  const featured = products.find((product) => product.id === hoveredProductId) ?? products[0] ?? SHOWROOM_PRODUCTS[0];
  const featuredSku = getRetailSkuOptions(featured)[0];
  const featuredSignal = getProductSignalColor(featured);

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

          <div className="grid gap-10 py-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:py-14">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.52em] text-[#7f7f7f]">Object Index / Silent Catalogue</p>
              <h1 className="mt-6 font-zh-sans text-[2.2rem] font-light uppercase tracking-[0.24em] text-[#f3efe6] md:text-[3.4rem]">Objects</h1>
              <p className="mt-8 max-w-md font-zh-serif text-sm leading-8 text-[#9b9388] md:text-base">
                卖场不再做成卡片货架，而是一份被严格编辑过的名录。对象作为条目出现，图像只有在悬停或聚焦时才显现，像服装与香水品牌的目录而不是热闹电商列表。
              </p>
              <div className="mt-10 border-t border-[#111111]">
                {products.map((product, index) => {
                  const active = featured.id === product.id;
                  const primarySku = getRetailSkuOptions(product)[0];

                  return (
                    <div
                      key={product.id}
                      onMouseEnter={() => setHoveredProductId(product.id)}
                      onFocus={() => setHoveredProductId(product.id)}
                      className="group border-b border-[#111111]"
                    >
                      <div className="grid gap-4 py-5 md:grid-cols-[84px_1fr_auto] md:items-end">
                        <p className={`font-mono text-[10px] uppercase tracking-[0.44em] ${active ? "text-[#f3efe6]" : "text-[#5f5f5f]"}`}>
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <div>
                          <p className={`font-zh-sans text-lg uppercase tracking-[0.18em] md:text-[1.6rem] ${active ? "text-[#f3efe6]" : "text-[#c2bbb0] group-hover:text-[#f3efe6]"}`}>
                            {product.code} / {product.name}
                          </p>
                          <p className="mt-2 font-zh-serif text-sm leading-7 text-[#8f877b]">{product.subtitle}</p>
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
                <div className="relative aspect-[4/5] overflow-hidden border-b border-[#111111] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_22%),linear-gradient(180deg,#040404_0%,#000000_100%)]">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.7),transparent_30%,transparent_70%,rgba(0,0,0,0.7))]" />
                  {featured.imageUrl ? (
                    <img src={featured.imageUrl} alt={featured.name} className="absolute inset-0 h-full w-full object-cover grayscale contrast-125 opacity-70" />
                  ) : (
                    <>
                      <div className="absolute left-1/2 top-[15%] h-[60%] w-[34%] -translate-x-1/2 border border-[#151515] bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_38%,transparent_62%),linear-gradient(180deg,#050505_0%,#010101_100%)]" style={{ clipPath: "polygon(18% 0, 82% 0, 100% 12%, 100% 100%, 0 100%, 0 12%)" }} />
                      <div className="absolute left-1/2 top-[9%] h-[10%] w-[12%] -translate-x-1/2 border border-[#151515] bg-[#040404]" />
                    </>
                  )}
                  <div className="absolute bottom-8 left-8 right-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#6f6f6f]">Preview</p>
                    <p className="mt-3 font-zh-sans text-[1.6rem] font-light uppercase tracking-[0.18em] text-[#f3efe6] md:text-[2.2rem]">{featured.code}</p>
                  </div>
                </div>

                <div className="grid gap-6 p-6 md:p-8">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.42em]" style={{ color: featuredSignal }}>
                      {featured.series === "AP" ? "Atmospheric Purification" : "Fabric Care"}
                    </p>
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
                    ? "真实商品池正在同步，目录结构保持不变，只更新对象与 SKU 数据。"
                    : "卖场负责把对象与欲望压缩成最少的字句，真正的技术解释、外部桥接与申请动作交给对象详情页继续承接。"}
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

export function ProductDetailPage(props: { id: string; product?: ShowroomProduct | null; sourceLabel?: string; interactiveCart?: boolean }) {
  const product = props.product ?? getShowroomProductById(props.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const cart = useRetailCart();

  if (!product) {
    return <NotFoundPage />;
  }

  const signal = getProductSignalColor(product);
  const archiveSource = SOURCE_LABELS[(props.sourceLabel?.toLowerCase() as ShowroomProduct["source"]) ?? product.source] ?? props.sourceLabel ?? SOURCE_LABELS[product.source];
  const skuOptions = getRetailSkuOptions(product);
  const [selectedSkuId, setSelectedSkuId] = useState(skuOptions[0]?.id ?? "");
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
          <ExternalAccessPanel product={product} />
          <div className="monolith-panel p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="micro-copy text-[#7f7f7f]">主转化入口</p>
                <h3 className="display-subtitle mt-3 text-[#f3efe6]">零售下单</h3>
              </div>
              <p className="font-zh-sans text-[1.8rem] font-semibold leading-none tracking-[0.16em] text-[#f3efe6]">{formatCurrency(selectedSku?.price ?? product.price)}</p>
            </div>
            <p className="mt-5 font-zh-serif text-sm leading-8 text-[#a89f94]">先选择 SKU 并加入购物袋；支付 API 正式接入前，仍可通过申请配额层与外部入口桥接完成导购和顾问式成交。</p>
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
                ADD TO CART / 加入购物袋
              </button>
              <button type="button" onClick={() => setDialogOpen(true)} className="monolith-button inline-flex h-14 items-center justify-center px-7 text-xs font-medium tracking-[0.34em]">
                REQUEST ALLOCATION / 申请配额
              </button>
            </div>
          </div>
        </div>
      </section>

      <AllocationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <CartDock cart={cart} interactive={props.interactiveCart} checkoutLabel="购物袋中的 SKU 将作为零售订单草稿，下一阶段会对接支付 JSON API 与支付状态轮询。" />
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
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-6 md:px-10 xl:px-14">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#0047AB]">HUANXIDUO TECH / CLEAN SCIENCE</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">次时代清洁解决方案</h1>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <Link href="/" className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">返回平台总入口</Link>
              <Link href="/lab" className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">查看 LAB</Link>
              <Link href="/shop" className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:border-slate-300 hover:text-slate-950">进入商城</Link>
            </div>
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                环洗朵科技聚焦工业洗涤、后厨清洁与住房卫生三大场景，以军规级洁净、实验室可信度与生态可持续配方，承接 iCloush 统一数字底座里最靠近 B2B 商业转化的品牌官网表达。
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#sample" className="inline-flex h-12 items-center justify-center rounded-full bg-[#0047AB] px-6 text-sm font-medium text-white transition hover:bg-[#003b8e]">REQUEST SAMPLE / 申请试样</a>
                <a href="#products" className="inline-flex h-12 items-center justify-center rounded-full border border-[#0047AB] px-6 text-sm font-medium text-[#0047AB] transition hover:bg-[#eaf1ff]">查看产品矩阵</a>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">实验室可信</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">CMA / CNAS</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">以实验室与检测逻辑建立参数级信任。</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">行业经验</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">30 年</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">面向酒店、餐饮与居住空间的方案沉淀。</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">核心动作</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">TDS / 试样</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">下载技术规格书并推进样板申领与采购桥接。</p>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#dbe5f0] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] md:p-8">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-[#10B981]">导航结构</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ["#technology", "洁净科技"],
                  ["#solutions", "解决方案"],
                  ["#products", "产品矩阵"],
                  ["#sample", "申领样板"],
                ].map(([href, label]) => (
                  <a key={href} href={href} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-[#0047AB] hover:text-[#0047AB]">
                    {label}
                  </a>
                ))}
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#10B981] bg-[#ecfdf5] p-5 text-sm leading-7 text-slate-600">
                Hero 视频位已按环洗朵官网 PRD 预留为“活性酶分解污垢 3D 模拟背景”的视觉入口，后续可替换为真实视频或科学可视化素材。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="technology" className="mx-auto max-w-7xl px-6 py-14 md:px-10 xl:px-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Clean Science</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">洁净科技</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            这一部分用于解释为什么环洗朵有效：从活性酶、自动分配到软水净化与可持续闭环，页面语言强调可验证、可部署、可复制，而不是泛化品牌口号。
          </p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            ["军规级洁净技术", "以高标准去污、织物友好与流程稳定性承接工业级清洁需求。"],
            ["自动分配与软水系统", "把分配器、蠕动泵与软水净化装置纳入同一系统叙事，体现方案能力而非单品售卖。"],
            ["生态可持续", "无磷、生物降解、循环包装与浓缩配方共同构成环保承诺的技术化表达。"],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-[2rem] border border-slate-200 bg-white p-6">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#0047AB]">TECH MODULE</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="solutions" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-10 xl:px-14">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Solutions</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">解决方案</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {HUANXIDUO_SOLUTIONS.map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#10B981]">SCENARIO</p>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#0047AB]">
                  获取行业方案
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-6 py-14 md:px-10 xl:px-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Product Matrix</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">产品矩阵</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            当前页面先展示品类级矩阵，后续可继续下钻到 PDP，并为每个产品提供 TDS 技术规格书下载与常驻浮窗的样板申请入口。
          </p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {HUANXIDUO_PRODUCTS.map((item) => (
            <div key={item.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">{item.specs}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">{item.title}</h3>
                </div>
                <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-medium text-[#047857]">TDS READY</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#sample" className="inline-flex h-11 items-center justify-center rounded-full border border-[#0047AB] px-5 text-sm font-medium text-[#0047AB] transition hover:bg-[#eaf1ff]">REQUEST SAMPLE / 申请试样</a>
                <button type="button" className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300">DOWNLOAD TDS / 下载 TDS</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="sample" className="border-y border-slate-200 bg-[#eff6ff]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:px-10 lg:grid-cols-[0.92fr_1.08fr] xl:px-14">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Sample Request</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">申领样板</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
              这是环洗朵官网的核心转化钩子。后续正式接入时，可把表单提交到统一线索库，并同步触发企业微信或运营通知，让样板申请、技术咨询与采购桥接形成一条完整链路。
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white bg-white p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">企业微信</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">页脚与申样区均可放置二维码，由后台配置实际图片资源。</p>
              </div>
              <div className="rounded-[1.5rem] border border-white bg-white p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">技术总监直连</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">保留“技术总监直连频段”作为高价值客户的加速联系通道。</p>
              </div>
              <div className="rounded-[1.5rem] border border-white bg-white p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">采购小程序</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">扫码进入环洗朵 B2B 采购小程序，承接后续下单与支付 JSON API。</p>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-[#dbe5f0] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                "企业名称",
                "联系人",
                "手机 / 微信",
                "所属行业",
                "使用场景",
                "预计月用量",
              ].map((label) => (
                <label key={label} className="block text-sm text-slate-600">
                  <span className="mb-2 block">{label}</span>
                  <div className="h-12 rounded-2xl border border-slate-200 bg-slate-50" />
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm text-slate-600">
              <span className="mb-2 block">备注</span>
              <div className="h-28 rounded-2xl border border-slate-200 bg-slate-50" />
            </label>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="inline-flex h-12 items-center justify-center rounded-full bg-[#0047AB] px-6 text-sm font-medium text-white transition hover:bg-[#003b8e]">提交样板申请</button>
              <button type="button" className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-medium text-slate-700 transition hover:border-slate-300">扫码进入 B2B 采购小程序</button>
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
