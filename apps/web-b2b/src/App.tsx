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

function extractRetailAccessFromSpecs(specs: Array<{ key: string; value: string }>) {
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

function buildQrUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payload)}`;
}

function mapManagedProductToShowroom(product: ManagedProductQueryRecord, index: number, source: "database" | "fallback"): ShowroomProduct {
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

function CutlineArrow() {
  return (
    <Link
      href="/showroom"
      aria-label="进入数字展柜"
      className="cutline-arrow group inline-flex items-center gap-5 text-[#f3efe6]"
    >
      <span className="micro-copy text-[#c8c1b6] transition-colors duration-300 group-hover:text-[#f3efe6]">ENTER /SHOWROOM</span>
      <span className="cutline-arrow-line" aria-hidden="true" />
      <ArrowRight className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

export function MonolithicHeroPage({ featured }: { featured: ShowroomProduct }) {
  const [depthShift, setDepthShift] = useState({ x: 0, y: 0 });
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

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const gamma = typeof event.gamma === "number" ? event.gamma / 45 : 0;
      const beta = typeof event.beta === "number" ? (event.beta - 45) / 45 : 0;
      updateShift(gamma, beta);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    window.addEventListener("deviceorientation", handleOrientation as EventListener, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("deviceorientation", handleOrientation as EventListener);
    };
  }, []);

  const primaryTransform = `translate3d(${(depthShift.x * 30).toFixed(1)}px, ${(depthShift.y * 18).toFixed(1)}px, 0)`;
  const secondaryTransform = `translate3d(${(depthShift.x * -14).toFixed(1)}px, ${(depthShift.y * -10).toFixed(1)}px, 0)`;
  const tertiaryTransform = `translate3d(${(depthShift.x * 8).toFixed(1)}px, ${(depthShift.y * 6).toFixed(1)}px, 0)`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#000000] text-[#f3efe6]">
      <section className="hero-stage relative isolate min-h-screen border-b border-[#101010]">
        <div className="noise-layer absolute inset-0 opacity-30" />
        <div className="hero-grid-lines absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 top-0 h-px bg-[#151515]" />
        <div className="absolute inset-y-0 left-[10%] w-px bg-[#101010]" />
        <div className="absolute inset-y-0 right-[12%] w-px bg-[#111111]" />

        <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 py-8 md:px-10 lg:px-14 xl:px-16">
          <header className="flex items-start justify-between gap-8 border-b border-[#121212] pb-6">
            <BrandMark />
            <div className="hidden text-right md:block">
              <p className="micro-copy text-[#7d7d7d]">RETAIL STRONGHOLD / MONOLITHIC HERO</p>
              <p className="orbital-caption mt-3 text-[#b6aea2]">// 3026 ORBITAL JEWELER //</p>
            </div>
          </header>

          <div className="grid flex-1 gap-12 py-10 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div className="relative z-10 max-w-3xl">
              <p className="micro-copy text-[#7f7f7f]">ATTRACTION ENGINE / 流量集散中心 / 零售堡垒</p>
              <h1 className="brand-hero-title mt-8 text-[#f3efe6]">ICLOUSH LAB.</h1>
              <p className="orbital-caption mt-6 text-[#d6d0c6]">// 3026 ORBITAL JEWELER //</p>
              <p className="mt-10 max-w-2xl font-zh-serif text-base leading-9 text-[#aba396] md:text-lg">
                这是品牌转型的前线阵地：不解释组织结构，不分散注意力，只用巨物、轨道、留白与硬边切口在第一秒完成心理掠夺，然后把所有视线推向数字展柜。
              </p>
              <div className="mt-14">
                <CutlineArrow />
              </div>
            </div>

            <div className="hero-depth-stage relative min-h-[26rem] xl:min-h-[42rem]">
              <Crosshair className="left-[8%] top-[10%]" />
              <Crosshair className="bottom-[12%] right-[10%]" />
              <div className="hero-depth-silhouette absolute left-[4%] top-[6%] h-[72%] w-[22%]" style={{ transform: secondaryTransform }} />
              <div className="hero-depth-frame absolute inset-x-[8%] top-[8%] bottom-[10%]" style={{ transform: tertiaryTransform }} />
              <div className="hero-depth-axis absolute left-[16%] top-[14%] bottom-[14%] w-px bg-[#171717]" />
              <div className="hero-depth-axis absolute right-[12%] top-[18%] bottom-[12%] w-px" style={{ backgroundColor: `${signal}55` }} />
              <div className="hero-depth-caption absolute left-[12%] top-[12%] z-20">
                <p className="micro-copy text-[#7f7f7f]">FEATURED MASS</p>
                <p className="mt-3 font-zh-sans text-[1.4rem] font-semibold tracking-[0.18em] text-[#f3efe6] md:text-[2rem]">{featured.code}</p>
              </div>
              <div className="hero-depth-object absolute inset-x-[20%] bottom-[8%] top-[14%] z-10" style={{ transform: primaryTransform }}>
                {featured.imageUrl ? (
                  <img src={featured.imageUrl} alt={featured.name} className="hero-depth-image h-full w-full object-contain" />
                ) : (
                  <>
                    <div className="hero-depth-monolith absolute left-1/2 top-[7%] h-[78%] w-[34%] -translate-x-1/2" />
                    <div className="hero-depth-crown absolute left-1/2 top-[2%] h-[10%] w-[14%] -translate-x-1/2" />
                    <div className="hero-depth-ring absolute inset-x-[12%] top-[28%] h-[22%]" />
                    <div className="hero-depth-ring absolute inset-x-[18%] bottom-[18%] h-[18%]" />
                  </>
                )}
              </div>
              <div className="hero-depth-copy absolute bottom-[10%] left-[8%] z-20 max-w-xs">
                <p className="micro-copy" style={{ color: signal }}>
                  {featured.series === "AP" ? "ATMOSPHERIC PURIFICATION" : "FABRIC CARE"}
                </p>
                <p className="mt-4 font-zh-serif text-sm leading-8 text-[#9e968a]">{featured.heroLine}</p>
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

function InteractiveCartDock(props: {
  cart: ReturnType<typeof useRetailCart>;
  checkoutLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<{ orderId: number; orderNo: string } | null>(null);
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
      refetchInterval: (query) => (query.state.data?.terminal ? false : 2500),
    },
  );
  const canSubmitRetailOrder =
    props.cart.items.length > 0 &&
    props.cart.items.every((item) => typeof item.backendProductId === "number" && typeof item.backendSkuId === "number");

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
                          <p className="mt-4 font-zh-sans text-xl font-semibold tracking-[0.18em] text-[#f3efe6]">// TRANSACTION SUCCESSFUL //</p>
                          <p className="mt-3 font-zh-serif text-sm leading-8 text-[#a89f94]">订单 {retailOrderStatus.data.summary.orderNo} 已完成支付确认，前台轮询链路已捕获成功状态。</p>
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
    </>
  );
}

export function ShowroomPage(props?: { products?: ShowroomProduct[]; sourceLabel?: string; isSyncing?: boolean; interactiveCart?: boolean }) {
  const products = props?.products ?? SHOWROOM_PRODUCTS;
  const sourceLabel = props?.sourceLabel ?? (products.every((product) => product.source === "database") ? "数据库" : "原型档案");
  const [scrollY, setScrollY] = useState(0);
  const cart = useRetailCart();

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
            const primarySku = getRetailSkuOptions(product)[0];

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
                        <p className="mt-3 text-sm leading-7 text-[#8f877c]">首推 SKU：{primarySku.label}</p>
                      </div>
                      <div className="flex flex-col gap-3 md:flex-row">
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
                          className="monolith-button inline-flex h-12 items-center justify-center px-5 text-[11px] font-medium tracking-[0.3em]"
                        >
                          加入购物袋
                        </button>
                        <Link href={`/object/${product.id}`} className="monolith-button inline-flex h-12 items-center justify-center px-5 text-[11px] font-medium tracking-[0.3em]">
                          查看对象档案
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </div>
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
              "官网前台现在以零售转化为主，购物袋承担 SKU 暂存，后续将衔接支付参数轮询与二维码扫码成交。",
              "PDP 将同时暴露外部入口桥接层，用于导向淘宝 / 天猫与小程序矩阵，缩短顾客跳转成本。",
              "按钮继续保持透明边框与硬切反白反馈，不使用阴影、玻璃、液态过渡或温和亲和的填充块。",
            ].map((item) => (
              <div key={item} className="monolith-panel p-5 font-zh-serif text-sm leading-8 text-[#a89f94]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      <CartDock cart={cart} interactive={props?.interactiveCart} checkoutLabel="下一步将连接零售下单 JSON API，并在网页端轮询支付状态。" />
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
      <Route path="/" component={ConnectedMonolithicHeroPage} />
      <Route path="/gallery" component={ConnectedShowroomPage} />
      <Route path="/showroom" component={ConnectedShowroomPage} />
      <Route path="/object/:id">{(params) => <ConnectedProductDetailPage id={params.id} />}</Route>
      <Route path="/product/:id">{(params) => <ConnectedProductDetailPage id={params.id} />}</Route>
      <Route component={NotFoundPage} />
    </Switch>
  );
}
