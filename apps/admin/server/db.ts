import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  brandMemberships,
  brands,
  leads,
  orders,
  productCategories,
  productSkus,
  products,
  users,
} from "../../../packages/database/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export type PlatformSiteKey = "shop" | "lab" | "tech" | "care";

export type PlatformSiteSummary = {
  siteKey: PlatformSiteKey;
  title: string;
  brandName: string;
  brandCodes: string[];
  productCount: number;
  categoryCount: number;
  orderCount: number;
  pipelineOrderCount: number;
  leadCount: number;
  highlightNames: string[];
};

export type PlatformSnapshot = {
  generatedAt: string;
  totals: {
    siteCount: number;
    brandCount: number;
    capabilityCount: number;
    productCount: number;
    categoryCount: number;
    orderCount: number;
    leadCount: number;
  };
  siteSummaries: PlatformSiteSummary[];
  accountSummary: {
    orderCount: number;
    pendingOrderCount: number;
    pendingReviewCount: number;
    actionCount: number;
  };
  adminSummary: {
    brandCount: number;
    reviewQueueCount: number;
    leadCount: number;
    moduleCount: number;
  };
};

export type PublicCatalogCategory = {
  id: number;
  slug: string;
  name: string;
  brandId: number | null;
  brandCode: string | null;
  brandName: string | null;
  productCount: number;
};

export type PublicCatalogProduct = {
  id: number;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  productType: string;
  status: string;
  brandId: number;
  brandCode: string | null;
  brandName: string;
  categoryId: number | null;
  categorySlug: string | null;
  categoryName: string;
  unit: string | null;
  updatedAt: string | null;
  priceLabel: string;
  priceValue: number | null;
  specLabel: string;
  minimumOrderLabel: string;
  leadTimeLabel: string;
  badges: string[];
};

export type PublicCatalogSnapshot = {
  generatedAt: string;
  source: "database" | "fallback";
  categories: PublicCatalogCategory[];
  products: PublicCatalogProduct[];
};

export type AdminScopeSummary = {
  brandId: number | null;
  brandCode: string | null;
  brandName: string;
  isGlobal: boolean;
};

export type AdminProductOverviewItem = {
  id: number;
  brandId: number;
  brandName: string;
  categoryName: string;
  name: string;
  subtitle: string | null;
  productType: string;
  status: string;
  seoReady: boolean;
  contentReady: boolean;
  updatedAt: string | null;
};

export type AdminBrandProductView = {
  brandId: number;
  brandName: string;
  productCount: number;
  activeCount: number;
  categoryCount: number;
  seoReadyCount: number;
  productTypeMix: string[];
};

export type AdminProductsSnapshot = {
  totals: {
    productCount: number;
    activeCount: number;
    draftCount: number;
    categoryCount: number;
    seoReadyCount: number;
    contentReadyCount: number;
  };
  products: AdminProductOverviewItem[];
  brandViews: AdminBrandProductView[];
  alerts: string[];
};

export type AdminCustomerOverviewItem = {
  membershipId: number;
  brandId: number;
  brandName: string;
  userId: number;
  displayName: string;
  enterpriseName: string | null;
  contactName: string | null;
  memberType: string;
  status: string;
  email: string | null;
  mobile: string | null;
  accountType: string;
  globalRole: string;
  lastSignedIn: string | null;
};

export type AdminLeadOverviewItem = {
  id: number;
  brandId: number;
  brandName: string;
  sourceSite: string;
  sourcePage: string | null;
  companyName: string | null;
  contactName: string;
  leadStatus: string;
  email: string | null;
  mobile: string | null;
  createdAt: string | null;
};

export type AdminCustomerBrandView = {
  brandId: number;
  brandName: string;
  membershipCount: number;
  activeMembershipCount: number;
  enterpriseAccountCount: number;
  leadCount: number;
  qualifiedLeadCount: number;
};

export type AdminCustomersSnapshot = {
  totals: {
    membershipCount: number;
    activeMembershipCount: number;
    pendingMembershipCount: number;
    enterpriseAccountCount: number;
    leadCount: number;
    qualifiedLeadCount: number;
  };
  customers: AdminCustomerOverviewItem[];
  leads: AdminLeadOverviewItem[];
  brandViews: AdminCustomerBrandView[];
  alerts: string[];
};

export type AdminContentSiteEntry = {
  siteKey: PlatformSiteKey;
  title: string;
  brandName: string;
  domain: string | null;
  storyReady: boolean;
  seoReady: boolean;
  leadCount: number;
  featuredNames: string[];
  statusLabel: string;
};

export type AdminContentQueueItem = {
  title: string;
  channel: string;
  reason: string;
  priority: "high" | "medium";
};

export type AdminContentSnapshot = {
  totals: {
    siteCount: number;
    storyReadyCount: number;
    seoReadySiteCount: number;
    productStoryCount: number;
    leadCaptureCount: number;
  };
  siteEntries: AdminContentSiteEntry[];
  queue: AdminContentQueueItem[];
  alerts: string[];
};

export type AdminSeoSiteEntry = {
  siteKey: PlatformSiteKey;
  title: string;
  brandName: string;
  domain: string | null;
  activeProductCount: number;
  seoReadyProductCount: number;
  siteMetaReady: boolean;
  statusLabel: string;
};

export type AdminSeoOpportunity = {
  title: string;
  impact: string;
  action: string;
  severity: "high" | "medium";
};

export type AdminSeoSnapshot = {
  totals: {
    siteMetaReadyCount: number;
    productMetaReadyCount: number;
    activeProductCount: number;
    missingMetaCount: number;
  };
  siteEntries: AdminSeoSiteEntry[];
  opportunities: AdminSeoOpportunity[];
  alerts: string[];
};

export type AdminOperationsSnapshot = {
  generatedAt: string;
  scope: AdminScopeSummary;
  products: AdminProductsSnapshot;
  customers: AdminCustomersSnapshot;
  content: AdminContentSnapshot;
  seo: AdminSeoSnapshot;
};

const ACTIVE_ORDER_STATUSES = new Set([
  "pending_payment",
  "paid",
  "under_review",
  "processing",
  "shipped",
]);

const REVIEW_ORDER_STATUSES = new Set(["under_review"]);
const ACTIVE_PRODUCT_STATUSES = new Set(["active"]);
const QUALIFIED_LEAD_STATUSES = new Set(["contacted", "qualified", "closed"]);

const SITE_CONFIGS: Array<{
  siteKey: PlatformSiteKey;
  title: string;
  brandName: string;
  brandCodes: string[];
  aggregateAll?: boolean;
  fallbackHighlights: string[];
}> = [
  {
    siteKey: "shop",
    title: "B2B 商城系统",
    brandName: "统一商城",
    brandCodes: [],
    aggregateAll: true,
    fallbackHighlights: ["高浓缩织物洁净剂", "玻璃与硬表面专业清洁剂"],
  },
  {
    siteKey: "lab",
    title: "iCloush LAB.",
    brandName: "iCloush LAB.",
    brandCodes: ["icloush-lab"],
    fallbackHighlights: ["配方研发能力", "布草柔护增艳剂"],
  },
  {
    siteKey: "tech",
    title: "环洗朵科技",
    brandName: "环洗朵科技",
    brandCodes: ["huanxiduo", "tech", "icloush-tech"],
    fallbackHighlights: ["酒店布草与客房织物清洁方案", "高浓缩织物洁净剂"],
  },
  {
    siteKey: "care",
    title: "iCloush Care",
    brandName: "iCloush Care",
    brandCodes: ["icloush-care", "care"],
    fallbackHighlights: ["需求沟通与现状评估", "酒店织物奢护组合"],
  },
];

const FALLBACK_BRAND_RECORDS = [
  {
    id: 1,
    code: "huanxiduo",
    name: "环洗朵科技",
    shortName: "环洗朵",
    businessType: "b2b",
    domain: "tech.icloush.com",
    siteTitle: "环洗朵科技 · 酒店织物与布草清洁解决方案",
    siteDescription: "酒店布草、客房织物与专业清洁场景的解决方案品牌站点。",
    status: "active",
  },
  {
    id: 2,
    code: "icloush-lab",
    name: "iCloush LAB.",
    shortName: "LAB",
    businessType: "hybrid",
    domain: "lab.icloush.com",
    siteTitle: "iCloush LAB. · 配方研发与产品实验室",
    siteDescription: "承接研发背书、样品试用与高附加值产品说明。",
    status: "active",
  },
  {
    id: 3,
    code: "icloush-care",
    name: "iCloush Care",
    shortName: "Care",
    businessType: "hybrid",
    domain: "care.icloush.com",
    siteTitle: "iCloush Care · 织物奢护与高端服务方案",
    siteDescription: "偏服务型解决方案、顾问咨询与项目制履约入口。",
    status: "active",
  },
] as const;

const fallbackPublicCatalog: PublicCatalogSnapshot = {
  generatedAt: new Date("2026-04-11T00:00:00.000Z").toISOString(),
  source: "fallback",
  categories: [
    {
      id: 201,
      slug: "hotel-laundry",
      name: "酒店布草清洁",
      brandId: 1,
      brandCode: "huanxiduo",
      brandName: "环洗朵科技",
      productCount: 2,
    },
    {
      id: 202,
      slug: "lab-formulation",
      name: "研发与配方支持",
      brandId: 2,
      brandCode: "icloush-lab",
      brandName: "iCloush LAB.",
      productCount: 2,
    },
    {
      id: 203,
      slug: "care-service",
      name: "织物奢护服务",
      brandId: 3,
      brandCode: "icloush-care",
      brandName: "iCloush Care",
      productCount: 1,
    },
  ],
  products: [
    {
      id: 301,
      slug: "hx-wash-pro",
      name: "高浓缩织物洁净剂",
      subtitle: "适用于酒店布草与高频周转洗涤场景",
      description: "兼顾去渍力、低泡与机器兼容性，适合集中化洗衣房。",
      productType: "physical",
      status: "active",
      brandId: 1,
      brandCode: "huanxiduo",
      brandName: "环洗朵科技",
      categoryId: 201,
      categorySlug: "hotel-laundry",
      categoryName: "酒店布草清洁",
      unit: "桶",
      updatedAt: new Date("2026-04-10T09:00:00.000Z").toISOString(),
      priceLabel: "商务询价",
      priceValue: null,
      specLabel: "20kg / 桶",
      minimumOrderLabel: "1 桶起订",
      leadTimeLabel: "支持项目制交付排期",
      badges: ["酒店场景", "低泡配方", "企业采购"],
    },
    {
      id: 302,
      slug: "hx-surface-cleaner",
      name: "玻璃与硬表面专业清洁剂",
      subtitle: "适合客房与公区多表面维护",
      description: "针对玻璃、镜面与硬质台面形成高效快干清洁流程。",
      productType: "physical",
      status: "active",
      brandId: 1,
      brandCode: "huanxiduo",
      brandName: "环洗朵科技",
      categoryId: 201,
      categorySlug: "hotel-laundry",
      categoryName: "酒店布草清洁",
      unit: "箱",
      updatedAt: new Date("2026-04-10T10:00:00.000Z").toISOString(),
      priceLabel: "商务询价",
      priceValue: null,
      specLabel: "6 瓶 / 箱",
      minimumOrderLabel: "1 箱起订",
      leadTimeLabel: "华东仓 3-5 个工作日",
      badges: ["快干", "客房保洁", "企业采购"],
    },
    {
      id: 303,
      slug: "lab-soft-care",
      name: "布草柔护增艳剂",
      subtitle: "LAB 配方研发与柔护升级方案",
      description: "面向高端酒店布草柔顺、增艳与触感优化。",
      productType: "physical",
      status: "active",
      brandId: 2,
      brandCode: "icloush-lab",
      brandName: "iCloush LAB.",
      categoryId: 202,
      categorySlug: "lab-formulation",
      categoryName: "研发与配方支持",
      unit: "桶",
      updatedAt: new Date("2026-04-10T11:00:00.000Z").toISOString(),
      priceLabel: "¥1,280 / 桶",
      priceValue: 128000,
      specLabel: "25kg / 桶",
      minimumOrderLabel: "2 桶起订",
      leadTimeLabel: "样品可先行测试",
      badges: ["研发背书", "样品试用", "柔护升级"],
    },
    {
      id: 304,
      slug: "lab-pilot-service",
      name: "配方打样与场景验证",
      subtitle: "为新项目提供样品测试与配方验证流程",
      description: "支持场景访谈、样品打样与现场验证，帮助品牌快速形成可复制方案。",
      productType: "service",
      status: "active",
      brandId: 2,
      brandCode: "icloush-lab",
      brandName: "iCloush LAB.",
      categoryId: 202,
      categorySlug: "lab-formulation",
      categoryName: "研发与配方支持",
      unit: null,
      updatedAt: new Date("2026-04-10T12:00:00.000Z").toISOString(),
      priceLabel: "按项目报价",
      priceValue: null,
      specLabel: "顾问服务包",
      minimumOrderLabel: "支持需求沟通后定制",
      leadTimeLabel: "1 个工作日内响应",
      badges: ["服务型", "顾问支持", "项目制"],
    },
    {
      id: 305,
      slug: "care-premium-program",
      name: "酒店织物奢护组合",
      subtitle: "面向高端住客体验的织物奢护服务",
      description: "提供织物现状评估、护理建议与服务方案落地。",
      productType: "service",
      status: "active",
      brandId: 3,
      brandCode: "icloush-care",
      brandName: "iCloush Care",
      categoryId: 203,
      categorySlug: "care-service",
      categoryName: "织物奢护服务",
      unit: null,
      updatedAt: new Date("2026-04-10T13:00:00.000Z").toISOString(),
      priceLabel: "顾问报价",
      priceValue: null,
      specLabel: "项目制服务",
      minimumOrderLabel: "支持现场评估后报价",
      leadTimeLabel: "预约后 48 小时内回访",
      badges: ["奢护服务", "高端酒店", "顾问交付"],
    },
  ],
};

function formatMoneyLabel(amount: number | null | undefined, unit: string | null | undefined) {
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return "商务询价";
  }

  const value = amount / 100;
  const formatted = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

  return unit ? `¥${formatted} / ${unit}` : `¥${formatted}`;
}

function summarizeDescription(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

function buildCatalogBadges(params: { productType: string; brandName: string; categoryName: string; hasPrice: boolean }) {
  const badges = new Set<string>();
  badges.add(params.brandName);
  badges.add(params.categoryName);
  badges.add(params.productType === "service" ? "方案服务" : "在售产品");
  if (params.hasPrice) {
    badges.add("价格已同步");
  } else {
    badges.add("支持商务询价");
  }

  return Array.from(badges).slice(0, 3);
}

const fallbackPlatformSnapshot: PlatformSnapshot = {
  generatedAt: new Date("2026-04-11T00:00:00.000Z").toISOString(),
  totals: {
    siteCount: 4,
    brandCount: 3,
    capabilityCount: 6,
    productCount: 6,
    categoryCount: 4,
    orderCount: 4,
    leadCount: 3,
  },
  siteSummaries: [
    {
      siteKey: "shop",
      title: "B2B 商城系统",
      brandName: "统一商城",
      brandCodes: ["icloush-lab", "huanxiduo", "icloush-care"],
      productCount: 6,
      categoryCount: 4,
      orderCount: 4,
      pipelineOrderCount: 3,
      leadCount: 3,
      highlightNames: ["高浓缩织物洁净剂", "玻璃与硬表面专业清洁剂"],
    },
    {
      siteKey: "lab",
      title: "iCloush LAB.",
      brandName: "iCloush LAB.",
      brandCodes: ["icloush-lab"],
      productCount: 2,
      categoryCount: 2,
      orderCount: 1,
      pipelineOrderCount: 1,
      leadCount: 1,
      highlightNames: ["配方研发能力", "布草柔护增艳剂"],
    },
    {
      siteKey: "tech",
      title: "环洗朵科技",
      brandName: "环洗朵科技",
      brandCodes: ["huanxiduo"],
      productCount: 2,
      categoryCount: 2,
      orderCount: 2,
      pipelineOrderCount: 1,
      leadCount: 1,
      highlightNames: ["酒店布草与客房织物清洁方案", "高浓缩织物洁净剂"],
    },
    {
      siteKey: "care",
      title: "iCloush Care",
      brandName: "iCloush Care",
      brandCodes: ["icloush-care"],
      productCount: 2,
      categoryCount: 1,
      orderCount: 1,
      pipelineOrderCount: 1,
      leadCount: 1,
      highlightNames: ["需求沟通与现状评估", "酒店织物奢护组合"],
    },
  ],
  accountSummary: {
    orderCount: 4,
    pendingOrderCount: 3,
    pendingReviewCount: 1,
    actionCount: 4,
  },
  adminSummary: {
    brandCount: 3,
    reviewQueueCount: 1,
    leadCount: 3,
    moduleCount: 6,
  },
};

function uniqNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function resolveBrandIds(
  brandRecords: Array<{ id: number; code: string }>,
  brandCodes: string[],
) {
  const codeSet = new Set(brandCodes.map((code) => code.toLowerCase()));
  return brandRecords
    .filter((record) => codeSet.has(record.code.toLowerCase()))
    .map((record) => record.id);
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

function compactSummary(parts: Array<string | null | undefined>) {
  const items = parts.filter((part): part is string => Boolean(part && part.trim()));
  return items.length > 0 ? items.join(" · ") : null;
}

function getScopedBrandContext<T extends { id: number; code: string; name: string }>(brandRecords: T[], brandId?: number) {
  if (brandRecords.length === 0) {
    return {
      scope: {
        brandId: null,
        brandCode: null,
        brandName: "全部品牌",
        isGlobal: true,
      } satisfies AdminScopeSummary,
      scopedBrandIds: [] as number[],
    };
  }

  const resolved = brandId ? brandRecords.find((record) => record.id === brandId) : undefined;
  if (!resolved) {
    return {
      scope: {
        brandId: null,
        brandCode: null,
        brandName: "全部品牌",
        isGlobal: true,
      } satisfies AdminScopeSummary,
      scopedBrandIds: brandRecords.map((record) => record.id),
    };
  }

  return {
    scope: {
      brandId: resolved.id,
      brandCode: resolved.code,
      brandName: resolved.name,
      isGlobal: false,
    } satisfies AdminScopeSummary,
    scopedBrandIds: [resolved.id],
  };
}

function buildFallbackAdminOperationsSnapshot(brandId?: number): AdminOperationsSnapshot {
  const { scope } = getScopedBrandContext(FALLBACK_BRAND_RECORDS as unknown as Array<{ id: number; code: string; name: string }>, brandId);
  const scopedBrand = scope.brandId
    ? FALLBACK_BRAND_RECORDS.find((record) => record.id === scope.brandId) ?? FALLBACK_BRAND_RECORDS[0]
    : FALLBACK_BRAND_RECORDS[0];

  return {
    generatedAt: new Date("2026-04-11T00:00:00.000Z").toISOString(),
    scope: {
      brandId: scopedBrand.id,
      brandCode: scopedBrand.code,
      brandName: scopedBrand.name,
      isGlobal: false,
    },
    products: {
      totals: {
        productCount: 2,
        activeCount: 1,
        draftCount: 1,
        categoryCount: scopedBrand.id === 3 ? 1 : 2,
        seoReadyCount: 1,
        contentReadyCount: 2,
      },
      products: [
        {
          id: scopedBrand.id * 10 + 1,
          brandId: scopedBrand.id,
          brandName: scopedBrand.name,
          categoryName: scopedBrand.id === 2 ? "研发方案" : scopedBrand.id === 3 ? "奢护服务" : "酒店布草清洁",
          name: scopedBrand.id === 2 ? "布草柔护增艳剂" : scopedBrand.id === 3 ? "酒店织物奢护组合" : "高浓缩织物洁净剂",
          subtitle: "支持多站点同步展示",
          productType: scopedBrand.id === 3 ? "service" : "physical",
          status: "active",
          seoReady: true,
          contentReady: true,
          updatedAt: new Date("2026-04-10T12:00:00.000Z").toISOString(),
        },
        {
          id: scopedBrand.id * 10 + 2,
          brandId: scopedBrand.id,
          brandName: scopedBrand.name,
          categoryName: "专题方案",
          name: scopedBrand.id === 2 ? "配方研发能力" : scopedBrand.id === 3 ? "需求沟通与现状评估" : "玻璃与硬表面专业清洁剂",
          subtitle: null,
          productType: scopedBrand.id === 2 ? "service" : "physical",
          status: "draft",
          seoReady: false,
          contentReady: true,
          updatedAt: new Date("2026-04-09T08:00:00.000Z").toISOString(),
        },
      ],
      brandViews: FALLBACK_BRAND_RECORDS.map((record, index) => ({
        brandId: record.id,
        brandName: record.name,
        productCount: 2,
        activeCount: index === 1 ? 2 : 1,
        categoryCount: record.id === 3 ? 1 : 2,
        seoReadyCount: index === 1 ? 2 : 1,
        productTypeMix: record.id === 3 ? ["service"] : ["physical", "service"],
      })),
      alerts: ["当前为回退数据，建议检查数据库连通性后再进行商品治理决策。"],
    },
    customers: {
      totals: {
        membershipCount: 2,
        activeMembershipCount: 1,
        pendingMembershipCount: 1,
        enterpriseAccountCount: 2,
        leadCount: 1,
        qualifiedLeadCount: 1,
      },
      customers: [
        {
          membershipId: scopedBrand.id * 100 + 1,
          brandId: scopedBrand.id,
          brandName: scopedBrand.name,
          userId: scopedBrand.id * 1000 + 1,
          displayName: "杭州某酒店集团采购部",
          enterpriseName: "杭州某酒店集团",
          contactName: "王经理",
          memberType: "b2b_customer",
          status: "active",
          email: "buyer@example.com",
          mobile: "13800000000",
          accountType: "enterprise",
          globalRole: "user",
          lastSignedIn: new Date("2026-04-10T09:00:00.000Z").toISOString(),
        },
        {
          membershipId: scopedBrand.id * 100 + 2,
          brandId: scopedBrand.id,
          brandName: scopedBrand.name,
          userId: scopedBrand.id * 1000 + 2,
          displayName: "门店筹备项目组",
          enterpriseName: null,
          contactName: "李女士",
          memberType: "ops",
          status: "pending",
          email: null,
          mobile: "13900000000",
          accountType: "personal",
          globalRole: "ops",
          lastSignedIn: new Date("2026-04-08T11:30:00.000Z").toISOString(),
        },
      ],
      leads: [
        {
          id: scopedBrand.id * 1000 + 9,
          brandId: scopedBrand.id,
          brandName: scopedBrand.name,
          sourceSite: scope.brandCode ?? scopedBrand.code,
          sourcePage: "/contact",
          companyName: "华东酒店管理公司",
          contactName: "陈先生",
          leadStatus: "qualified",
          email: "lead@example.com",
          mobile: "13700000000",
          createdAt: new Date("2026-04-10T06:00:00.000Z").toISOString(),
        },
      ],
      brandViews: FALLBACK_BRAND_RECORDS.map((record) => ({
        brandId: record.id,
        brandName: record.name,
        membershipCount: 2,
        activeMembershipCount: 1,
        enterpriseAccountCount: 1,
        leadCount: 1,
        qualifiedLeadCount: 1,
      })),
      alerts: ["当前为回退数据，客户与线索状态仅用于界面连通验证。"],
    },
    content: {
      totals: {
        siteCount: 4,
        storyReadyCount: 3,
        seoReadySiteCount: 3,
        productStoryCount: 5,
        leadCaptureCount: 3,
      },
      siteEntries: fallbackPlatformSnapshot.siteSummaries.map((entry, index) => ({
        siteKey: entry.siteKey,
        title: entry.title,
        brandName: entry.brandName,
        domain:
          entry.siteKey === "shop"
            ? "shop.icloush.com"
            : FALLBACK_BRAND_RECORDS[index === 0 ? 1 : entry.siteKey === "tech" ? 0 : 2]?.domain ?? null,
        storyReady: entry.siteKey !== "care",
        seoReady: entry.siteKey !== "care",
        leadCount: entry.leadCount,
        featuredNames: entry.highlightNames,
        statusLabel: entry.siteKey === "care" ? "待补故事线" : "可发布",
      })),
      queue: [
        {
          title: `${scopedBrand.name} 首页主叙事待补齐`,
          channel: "品牌官网",
          reason: "建议补充站点标题、价值主张与产品亮点之间的统一叙事。",
          priority: "high",
        },
        {
          title: "商城 Banner 与优势卖点需和品牌页同步",
          channel: "B2B 商城",
          reason: "避免商城首屏与品牌站点的术语不一致。",
          priority: "medium",
        },
      ],
      alerts: ["当前为回退数据，内容治理结果基于预设示例生成。"],
    },
    seo: {
      totals: {
        siteMetaReadyCount: 3,
        productMetaReadyCount: 4,
        activeProductCount: 5,
        missingMetaCount: 2,
      },
      siteEntries: fallbackPlatformSnapshot.siteSummaries.map((entry, index) => ({
        siteKey: entry.siteKey,
        title: entry.title,
        brandName: entry.brandName,
        domain:
          entry.siteKey === "shop"
            ? "shop.icloush.com"
            : FALLBACK_BRAND_RECORDS[index === 0 ? 1 : entry.siteKey === "tech" ? 0 : 2]?.domain ?? null,
        activeProductCount: entry.productCount,
        seoReadyProductCount: Math.max(entry.productCount - (entry.siteKey === "care" ? 1 : 0), 0),
        siteMetaReady: entry.siteKey !== "care",
        statusLabel: entry.siteKey === "care" ? "待补 Meta" : "Meta 就绪",
      })),
      opportunities: [
        {
          title: `${scopedBrand.name} 仍有商品缺少 SEO 标题`,
          impact: "会影响商城与品牌站点搜索展示一致性。",
          action: "优先为在售商品补齐 seoTitle 与 seoDescription。",
          severity: "high",
        },
        {
          title: "统一商城与官网需形成站点地图节奏",
          impact: "便于搜索引擎抓取多个入口页。",
          action: "后续可增加 sitemap 与结构化数据导出流程。",
          severity: "medium",
        },
      ],
      alerts: ["当前为回退数据，SEO 优先级仅供前台界面验证。"],
    },
  };
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.globalRole !== undefined) {
      values.globalRole = user.globalRole;
      updateSet.globalRole = user.globalRole;
    } else if (user.openId === ENV.ownerOpenId) {
      values.globalRole = "super_admin";
      updateSet.globalRole = "super_admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getPublicCatalog(): Promise<PublicCatalogSnapshot> {
  const db = await getDb();
  if (!db) {
    return fallbackPublicCatalog;
  }

  try {
    const [brandRecords, categoryRecords, productRecords, skuRecords] = await Promise.all([
      db
        .select({
          id: brands.id,
          code: brands.code,
          name: brands.name,
          status: brands.status,
        })
        .from(brands),
      db
        .select({
          id: productCategories.id,
          brandId: productCategories.brandId,
          slug: productCategories.slug,
          name: productCategories.name,
          status: productCategories.status,
        })
        .from(productCategories),
      db
        .select({
          id: products.id,
          brandId: products.brandId,
          categoryId: products.categoryId,
          slug: products.slug,
          name: products.name,
          subtitle: products.subtitle,
          description: products.description,
          productType: products.productType,
          status: products.status,
          unit: products.unit,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .orderBy(desc(products.updatedAt))
        .limit(240),
      db
        .select({
          productId: productSkus.productId,
          basePrice: productSkus.basePrice,
          specName: productSkus.specName,
          packSize: productSkus.packSize,
          minOrderQty: productSkus.minOrderQty,
          stockQty: productSkus.stockQty,
          status: productSkus.status,
          updatedAt: productSkus.updatedAt,
        })
        .from(productSkus)
        .orderBy(desc(productSkus.updatedAt))
        .limit(360),
    ]);

    const activeBrands = brandRecords.filter((record) => record.status === "active");
    const usableBrands = activeBrands.length > 0 ? activeBrands : brandRecords;
    const brandMap = new Map(usableBrands.map((record) => [record.id, record]));

    const activeCategories = categoryRecords.filter(
      (record) => record.status === "active" && brandMap.has(record.brandId),
    );
    const activeProducts = productRecords.filter(
      (record) => ACTIVE_PRODUCT_STATUSES.has(record.status) && brandMap.has(record.brandId),
    );

    if (activeProducts.length === 0) {
      return fallbackPublicCatalog;
    }

    const categoryMap = new Map(activeCategories.map((record) => [record.id, record]));
    const skuMap = new Map<number, (typeof skuRecords)[number]>();
    for (const sku of skuRecords) {
      if (sku.status !== "active" || skuMap.has(sku.productId)) {
        continue;
      }
      skuMap.set(sku.productId, sku);
    }

    const categorizedCounts = new Map<number, number>();
    for (const product of activeProducts) {
      if (product.categoryId && categoryMap.has(product.categoryId)) {
        categorizedCounts.set(product.categoryId, (categorizedCounts.get(product.categoryId) ?? 0) + 1);
      }
    }

    const categories: PublicCatalogCategory[] = activeCategories
      .map((record) => ({
        id: record.id,
        slug: record.slug,
        name: record.name,
        brandId: record.brandId,
        brandCode: brandMap.get(record.brandId)?.code ?? null,
        brandName: brandMap.get(record.brandId)?.name ?? null,
        productCount: categorizedCounts.get(record.id) ?? 0,
      }))
      .filter((record) => record.productCount > 0)
      .sort((left, right) => right.productCount - left.productCount || left.name.localeCompare(right.name, "zh-CN"));

    const uncategorizedCount = activeProducts.filter(
      (record) => !record.categoryId || !categoryMap.has(record.categoryId),
    ).length;
    if (uncategorizedCount > 0) {
      categories.push({
        id: 0,
        slug: "uncategorized",
        name: "未分类方案",
        brandId: null,
        brandCode: null,
        brandName: null,
        productCount: uncategorizedCount,
      });
    }

    const productsSnapshot: PublicCatalogProduct[] = activeProducts
      .map((record) => {
        const brand = brandMap.get(record.brandId);
        const category = record.categoryId ? categoryMap.get(record.categoryId) : null;
        const sku = skuMap.get(record.id);
        const unitLabel = record.unit?.trim() || sku?.packSize?.trim() || sku?.specName?.trim() || null;
        const priceValue = typeof sku?.basePrice === "number" ? sku.basePrice : null;
        const specLabel = sku?.packSize?.trim() || sku?.specName?.trim() || unitLabel || "标准规格";
        const minimumOrderLabel = `${Math.max(sku?.minOrderQty ?? 1, 1)} ${record.unit?.trim() || "件"}起订`;
        const leadTimeLabel =
          record.productType === "service"
            ? "顾问确认后安排交付节奏"
            : (sku?.stockQty ?? 0) > 0
              ? "库存可售，预计 3-5 个工作日发货"
              : "排产与物流时效需业务确认";

        return {
          id: record.id,
          slug: record.slug,
          name: record.name,
          subtitle: record.subtitle,
          description: summarizeDescription(record.description),
          productType: record.productType,
          status: record.status,
          brandId: record.brandId,
          brandCode: brand?.code ?? null,
          brandName: brand?.name ?? "未命名品牌",
          categoryId: category?.id ?? null,
          categorySlug: category?.slug ?? "uncategorized",
          categoryName: category?.name ?? "未分类方案",
          unit: record.unit,
          updatedAt: toIsoString(record.updatedAt),
          priceLabel: formatMoneyLabel(priceValue, record.unit),
          priceValue,
          specLabel,
          minimumOrderLabel,
          leadTimeLabel,
          badges: buildCatalogBadges({
            productType: record.productType,
            brandName: brand?.name ?? "未命名品牌",
            categoryName: category?.name ?? "未分类方案",
            hasPrice: typeof priceValue === "number" && priceValue > 0,
          }),
        } satisfies PublicCatalogProduct;
      })
      .sort((left, right) => {
        if (!left.updatedAt || !right.updatedAt) {
          return right.id - left.id;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      });

    return {
      generatedAt: new Date().toISOString(),
      source: "database",
      categories,
      products: productsSnapshot,
    };
  } catch (error) {
    console.warn("[Database] Failed to build public catalog:", error);
    return fallbackPublicCatalog;
  }
}

export async function getPlatformSnapshot(): Promise<PlatformSnapshot> {
  const db = await getDb();
  if (!db) {
    return fallbackPlatformSnapshot;
  }

  try {
    const [brandRecords, categoryRecords, productRecords, orderRecords, leadRecords] = await Promise.all([
      db
        .select({
          id: brands.id,
          code: brands.code,
          name: brands.name,
          status: brands.status,
        })
        .from(brands),
      db
        .select({
          id: productCategories.id,
          brandId: productCategories.brandId,
          status: productCategories.status,
        })
        .from(productCategories),
      db
        .select({
          id: products.id,
          brandId: products.brandId,
          name: products.name,
          status: products.status,
        })
        .from(products),
      db
        .select({
          id: orders.id,
          brandId: orders.brandId,
          status: orders.status,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(120),
      db
        .select({
          id: leads.id,
          brandId: leads.brandId,
        })
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(120),
    ]);

    if (brandRecords.length === 0) {
      return fallbackPlatformSnapshot;
    }

    const activeBrandRecords = brandRecords.filter((record) => record.status === "active");
    const scopedBrandRecords = activeBrandRecords.length > 0 ? activeBrandRecords : brandRecords;
    const activeProductRecords = productRecords.filter((record) => record.status === "active");
    const activeCategoryRecords = categoryRecords.filter((record) => record.status === "active");

    const siteSummaries = SITE_CONFIGS.map<PlatformSiteSummary>((site) => {
      const scopedBrandIds = site.aggregateAll
        ? scopedBrandRecords.map((record) => record.id)
        : resolveBrandIds(scopedBrandRecords, site.brandCodes);
      const scopedBrandIdSet = new Set(scopedBrandIds);
      const scopedProducts = activeProductRecords.filter((record) => scopedBrandIdSet.has(record.brandId));
      const scopedCategories = activeCategoryRecords.filter((record) => scopedBrandIdSet.has(record.brandId));
      const scopedOrders = orderRecords.filter((record) => scopedBrandIdSet.has(record.brandId));
      const scopedLeads = leadRecords.filter((record) => scopedBrandIdSet.has(record.brandId));
      const matchedBrandCodes = site.aggregateAll
        ? scopedBrandRecords.map((record) => record.code)
        : scopedBrandRecords
            .filter((record) => scopedBrandIdSet.has(record.id))
            .map((record) => record.code);
      const highlightNames = uniqNonEmpty(scopedProducts.map((record) => record.name)).slice(0, 2);

      return {
        siteKey: site.siteKey,
        title: site.title,
        brandName: site.brandName,
        brandCodes: matchedBrandCodes.length > 0 ? matchedBrandCodes : site.brandCodes,
        productCount: scopedProducts.length,
        categoryCount: scopedCategories.length,
        orderCount: scopedOrders.length,
        pipelineOrderCount: scopedOrders.filter((record) => ACTIVE_ORDER_STATUSES.has(record.status)).length,
        leadCount: scopedLeads.length,
        highlightNames: highlightNames.length > 0 ? highlightNames : site.fallbackHighlights,
      };
    });

    const pendingReviewCount = orderRecords.filter((record) => REVIEW_ORDER_STATUSES.has(record.status)).length;
    const pendingOrderCount = orderRecords.filter((record) => ACTIVE_ORDER_STATUSES.has(record.status)).length;

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        siteCount: SITE_CONFIGS.length,
        brandCount: scopedBrandRecords.length,
        capabilityCount: 6,
        productCount: activeProductRecords.length,
        categoryCount: activeCategoryRecords.length,
        orderCount: orderRecords.length,
        leadCount: leadRecords.length,
      },
      siteSummaries,
      accountSummary: {
        orderCount: orderRecords.length,
        pendingOrderCount,
        pendingReviewCount,
        actionCount: pendingOrderCount + pendingReviewCount,
      },
      adminSummary: {
        brandCount: scopedBrandRecords.length,
        reviewQueueCount: pendingReviewCount,
        leadCount: leadRecords.length,
        moduleCount: 6,
      },
    };
  } catch (error) {
    console.warn("[Database] Failed to build platform snapshot:", error);
    return fallbackPlatformSnapshot;
  }
}

export async function getAdminOperationsSnapshot(params?: { brandId?: number }): Promise<AdminOperationsSnapshot> {
  const db = await getDb();
  if (!db) {
    return buildFallbackAdminOperationsSnapshot(params?.brandId);
  }

  try {
    const [
      brandRecords,
      categoryRecords,
      productRecords,
      membershipRecords,
      userRecords,
      leadRecords,
    ] = await Promise.all([
      db
        .select({
          id: brands.id,
          code: brands.code,
          name: brands.name,
          shortName: brands.shortName,
          businessType: brands.businessType,
          domain: brands.domain,
          siteTitle: brands.siteTitle,
          siteDescription: brands.siteDescription,
          status: brands.status,
        })
        .from(brands),
      db
        .select({
          id: productCategories.id,
          brandId: productCategories.brandId,
          name: productCategories.name,
          status: productCategories.status,
        })
        .from(productCategories),
      db
        .select({
          id: products.id,
          brandId: products.brandId,
          categoryId: products.categoryId,
          name: products.name,
          subtitle: products.subtitle,
          description: products.description,
          productType: products.productType,
          status: products.status,
          seoTitle: products.seoTitle,
          seoDescription: products.seoDescription,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .orderBy(desc(products.updatedAt))
        .limit(240),
      db
        .select({
          id: brandMemberships.id,
          brandId: brandMemberships.brandId,
          userId: brandMemberships.userId,
          memberType: brandMemberships.memberType,
          enterpriseName: brandMemberships.enterpriseName,
          contactName: brandMemberships.contactName,
          isDefaultBrand: brandMemberships.isDefaultBrand,
          status: brandMemberships.status,
          createdAt: brandMemberships.createdAt,
        })
        .from(brandMemberships)
        .orderBy(desc(brandMemberships.createdAt))
        .limit(240),
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          mobile: users.mobile,
          accountType: users.accountType,
          globalRole: users.globalRole,
          status: users.status,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .limit(240),
      db
        .select({
          id: leads.id,
          brandId: leads.brandId,
          sourceSite: leads.sourceSite,
          sourcePage: leads.sourcePage,
          companyName: leads.companyName,
          contactName: leads.contactName,
          mobile: leads.mobile,
          email: leads.email,
          leadStatus: leads.leadStatus,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(240),
    ]);

    if (brandRecords.length === 0) {
      return buildFallbackAdminOperationsSnapshot(params?.brandId);
    }

    const activeBrandRecords = brandRecords.filter((record) => record.status === "active");
    const usableBrandRecords = activeBrandRecords.length > 0 ? activeBrandRecords : brandRecords;
    const { scope, scopedBrandIds } = getScopedBrandContext(usableBrandRecords, params?.brandId);
    const scopedBrandIdSet = new Set(scopedBrandIds);
    const brandMap = new Map(brandRecords.map((record) => [record.id, record]));
    const categoryMap = new Map(categoryRecords.map((record) => [record.id, record]));
    const userMap = new Map(userRecords.map((record) => [record.id, record]));
    const activeCategoryRecords = categoryRecords.filter((record) => record.status === "active");
    const scopedProducts = productRecords.filter((record) => scopedBrandIdSet.has(record.brandId));
    const scopedCategoryRecords = activeCategoryRecords.filter((record) => scopedBrandIdSet.has(record.brandId));
    const scopedMemberships = membershipRecords.filter((record) => scopedBrandIdSet.has(record.brandId));
    const scopedLeads = leadRecords.filter((record) => scopedBrandIdSet.has(record.brandId));
    const activeScopedProducts = scopedProducts.filter((record) => ACTIVE_PRODUCT_STATUSES.has(record.status));

    const productsSnapshot: AdminProductsSnapshot = {
      totals: {
        productCount: scopedProducts.length,
        activeCount: activeScopedProducts.length,
        draftCount: scopedProducts.filter((record) => record.status === "draft").length,
        categoryCount: scopedCategoryRecords.length,
        seoReadyCount: scopedProducts.filter((record) => hasText(record.seoTitle) && hasText(record.seoDescription)).length,
        contentReadyCount: scopedProducts.filter(
          (record) => hasText(record.description) || hasText(record.subtitle),
        ).length,
      },
      products: scopedProducts.slice(0, 8).map((record) => ({
        id: record.id,
        brandId: record.brandId,
        brandName: brandMap.get(record.brandId)?.name ?? "未命名品牌",
        categoryName: record.categoryId ? categoryMap.get(record.categoryId)?.name ?? "未分类" : "未分类",
        name: record.name,
        subtitle: record.subtitle,
        productType: record.productType,
        status: record.status,
        seoReady: hasText(record.seoTitle) && hasText(record.seoDescription),
        contentReady: hasText(record.description) || hasText(record.subtitle),
        updatedAt: toIsoString(record.updatedAt),
      })),
      brandViews: usableBrandRecords.map((brand) => {
        const brandProducts = productRecords.filter((record) => record.brandId === brand.id);
        const brandCategories = activeCategoryRecords.filter((record) => record.brandId === brand.id);
        return {
          brandId: brand.id,
          brandName: brand.name,
          productCount: brandProducts.length,
          activeCount: brandProducts.filter((record) => ACTIVE_PRODUCT_STATUSES.has(record.status)).length,
          categoryCount: brandCategories.length,
          seoReadyCount: brandProducts.filter((record) => hasText(record.seoTitle) && hasText(record.seoDescription)).length,
          productTypeMix: uniqNonEmpty(brandProducts.map((record) => record.productType)),
        };
      }),
      alerts: uniqNonEmpty([
        scopedProducts.some((record) => record.status === "draft") ? `${scope.brandName} 仍有草稿商品未上架。` : null,
        scopedProducts.some((record) => !hasText(record.seoTitle) || !hasText(record.seoDescription))
          ? "部分商品尚未补齐 SEO 标题或描述。"
          : null,
        scopedProducts.some((record) => !hasText(record.description) && !hasText(record.subtitle))
          ? "部分商品缺少前台可直接复用的卖点文案。"
          : null,
      ]),
    };

    const customersSnapshot: AdminCustomersSnapshot = {
      totals: {
        membershipCount: scopedMemberships.length,
        activeMembershipCount: scopedMemberships.filter((record) => record.status === "active" || record.status === "approved").length,
        pendingMembershipCount: scopedMemberships.filter((record) => record.status === "pending").length,
        enterpriseAccountCount: scopedMemberships.filter((record) => {
          const user = userMap.get(record.userId);
          return record.memberType === "b2b_customer" || user?.accountType === "enterprise" || hasText(record.enterpriseName);
        }).length,
        leadCount: scopedLeads.length,
        qualifiedLeadCount: scopedLeads.filter((record) => QUALIFIED_LEAD_STATUSES.has(record.leadStatus)).length,
      },
      customers: scopedMemberships.slice(0, 8).map((record) => {
        const user = userMap.get(record.userId);
        return {
          membershipId: record.id,
          brandId: record.brandId,
          brandName: brandMap.get(record.brandId)?.name ?? "未命名品牌",
          userId: record.userId,
          displayName:
            record.enterpriseName ?? record.contactName ?? user?.name ?? user?.email ?? `用户 #${record.userId}`,
          enterpriseName: record.enterpriseName,
          contactName: record.contactName,
          memberType: record.memberType,
          status: record.status,
          email: user?.email ?? null,
          mobile: user?.mobile ?? null,
          accountType: user?.accountType ?? "personal",
          globalRole: user?.globalRole ?? "user",
          lastSignedIn: toIsoString(user?.lastSignedIn ?? null),
        };
      }),
      leads: scopedLeads.slice(0, 8).map((record) => ({
        id: record.id,
        brandId: record.brandId,
        brandName: brandMap.get(record.brandId)?.name ?? "未命名品牌",
        sourceSite: record.sourceSite,
        sourcePage: record.sourcePage,
        companyName: record.companyName,
        contactName: record.contactName,
        leadStatus: record.leadStatus,
        email: record.email,
        mobile: record.mobile,
        createdAt: toIsoString(record.createdAt),
      })),
      brandViews: usableBrandRecords.map((brand) => {
        const brandMembershipRecords = membershipRecords.filter((record) => record.brandId === brand.id);
        const brandLeadRecords = leadRecords.filter((record) => record.brandId === brand.id);
        return {
          brandId: brand.id,
          brandName: brand.name,
          membershipCount: brandMembershipRecords.length,
          activeMembershipCount: brandMembershipRecords.filter(
            (record) => record.status === "active" || record.status === "approved",
          ).length,
          enterpriseAccountCount: brandMembershipRecords.filter((record) => {
            const user = userMap.get(record.userId);
            return record.memberType === "b2b_customer" || user?.accountType === "enterprise" || hasText(record.enterpriseName);
          }).length,
          leadCount: brandLeadRecords.length,
          qualifiedLeadCount: brandLeadRecords.filter((record) => QUALIFIED_LEAD_STATUSES.has(record.leadStatus)).length,
        };
      }),
      alerts: uniqNonEmpty([
        scopedMemberships.some((record) => record.status === "pending") ? "仍有客户归属申请待审批。" : null,
        scopedLeads.some((record) => record.leadStatus === "new") ? "存在新线索尚未分派。" : null,
        scopedLeads.length === 0 ? `${scope.brandName} 暂无新线索，可继续观察官网表单转化。` : null,
      ]),
    };

    const platformSiteSummaries = SITE_CONFIGS.map((site) => {
      const siteBrandIds = site.aggregateAll ? usableBrandRecords.map((record) => record.id) : resolveBrandIds(usableBrandRecords, site.brandCodes);
      const siteBrandIdSet = new Set(siteBrandIds);
      const siteBrands = usableBrandRecords.filter((record) => siteBrandIdSet.has(record.id));
      const siteProducts = productRecords.filter((record) => siteBrandIdSet.has(record.brandId));
      const siteActiveProducts = siteProducts.filter((record) => ACTIVE_PRODUCT_STATUSES.has(record.status));
      const siteLeads = leadRecords.filter((record) => siteBrandIdSet.has(record.brandId));
      const siteMetaReady = siteBrands.some((record) => hasText(record.siteTitle) && hasText(record.siteDescription));
      const siteStoryReady = siteBrands.some(
        (record) => hasText(record.siteDescription) || siteActiveProducts.some((product) => product.brandId === record.id && hasText(product.description)),
      );
      const featuredNames = uniqNonEmpty(siteActiveProducts.map((record) => record.name)).slice(0, 3);
      const primaryBrand = siteBrands[0];

      return {
        siteKey: site.siteKey,
        title: site.title,
        brandName: site.aggregateAll ? "统一商城" : primaryBrand?.name ?? site.brandName,
        domain: site.aggregateAll ? "shop.icloush.com" : primaryBrand?.domain ?? null,
        storyReady: siteStoryReady,
        seoReady: siteMetaReady,
        leadCount: siteLeads.length,
        featuredNames: featuredNames.length > 0 ? featuredNames : site.fallbackHighlights,
        activeProductCount: siteActiveProducts.length,
        seoReadyProductCount: siteProducts.filter((record) => hasText(record.seoTitle) && hasText(record.seoDescription)).length,
        statusLabel: siteStoryReady && siteMetaReady ? "可发布" : siteStoryReady ? "待补 SEO" : "待补叙事",
      };
    });

    const contentQueue: AdminContentQueueItem[] = [];
    usableBrandRecords.forEach((brand) => {
      const brandProducts = productRecords.filter((record) => record.brandId === brand.id);
      const activeBrandProducts = brandProducts.filter((record) => ACTIVE_PRODUCT_STATUSES.has(record.status));
      if (!hasText(brand.siteTitle) || !hasText(brand.siteDescription)) {
        contentQueue.push({
          title: `${brand.name} 官网首屏故事线待补齐`,
          channel: `${brand.name} 官网`,
          reason: "品牌标题或站点简介缺失，无法形成清晰的首屏叙事。",
          priority: "high",
        });
      }
      if (activeBrandProducts.some((record) => !hasText(record.description) && !hasText(record.subtitle))) {
        contentQueue.push({
          title: `${brand.name} 仍有在售商品缺少卖点文案`,
          channel: "商城 / 品牌站点",
          reason: "前台页无法直接复用商品亮点，会影响详情页与专题页转化。",
          priority: "medium",
        });
      }
    });

    const seoOpportunities: AdminSeoOpportunity[] = [];
    usableBrandRecords.forEach((brand) => {
      const brandProducts = productRecords.filter((record) => record.brandId === brand.id);
      const missingMetaProducts = brandProducts.filter((record) => !hasText(record.seoTitle) || !hasText(record.seoDescription));
      if (!hasText(brand.siteTitle) || !hasText(brand.siteDescription)) {
        seoOpportunities.push({
          title: `${brand.name} 缺少站点级 Meta 信息`,
          impact: "品牌官网首页难以形成稳定的搜索展示摘要。",
          action: "优先补齐品牌级标题、简介与首页核心关键词。",
          severity: "high",
        });
      }
      if (missingMetaProducts.length > 0) {
        seoOpportunities.push({
          title: `${brand.name} 有 ${missingMetaProducts.length} 个商品缺少 SEO 字段`,
          impact: "商城与品牌页商品详情的搜索结果表现不稳定。",
          action: "为在售商品统一补齐 seoTitle 与 seoDescription。",
          severity: "medium",
        });
      }
    });

    return {
      generatedAt: new Date().toISOString(),
      scope,
      products: productsSnapshot,
      customers: customersSnapshot,
      content: {
        totals: {
          siteCount: platformSiteSummaries.length,
          storyReadyCount: platformSiteSummaries.filter((entry) => entry.storyReady).length,
          seoReadySiteCount: platformSiteSummaries.filter((entry) => entry.seoReady).length,
          productStoryCount: productRecords.filter((record) => hasText(record.description) || hasText(record.subtitle)).length,
          leadCaptureCount: leadRecords.filter((record) => hasText(record.sourcePage)).length,
        },
        siteEntries: platformSiteSummaries.map((entry) => ({
          siteKey: entry.siteKey,
          title: entry.title,
          brandName: entry.brandName,
          domain: entry.domain,
          storyReady: entry.storyReady,
          seoReady: entry.seoReady,
          leadCount: entry.leadCount,
          featuredNames: entry.featuredNames,
          statusLabel: entry.statusLabel,
        })),
        queue: contentQueue.slice(0, 6),
        alerts: uniqNonEmpty([
          contentQueue.length > 0 ? `当前共识别出 ${contentQueue.length} 个内容治理待办。` : "当前品牌与站点暂无明显内容缺口。",
          leadRecords.some((record) => !hasText(record.sourcePage)) ? "部分线索缺少来源页面，建议后续完善归因字段。" : null,
        ]),
      },
      seo: {
        totals: {
          siteMetaReadyCount: platformSiteSummaries.filter((entry) => entry.seoReady).length,
          productMetaReadyCount: productRecords.filter((record) => hasText(record.seoTitle) && hasText(record.seoDescription)).length,
          activeProductCount: productRecords.filter((record) => ACTIVE_PRODUCT_STATUSES.has(record.status)).length,
          missingMetaCount: productRecords.filter((record) => !hasText(record.seoTitle) || !hasText(record.seoDescription)).length,
        },
        siteEntries: platformSiteSummaries.map((entry) => ({
          siteKey: entry.siteKey,
          title: entry.title,
          brandName: entry.brandName,
          domain: entry.domain,
          activeProductCount: entry.activeProductCount,
          seoReadyProductCount: entry.seoReadyProductCount,
          siteMetaReady: entry.seoReady,
          statusLabel: entry.seoReady ? "Meta 就绪" : "待补 Meta",
        })),
        opportunities: seoOpportunities.slice(0, 6),
        alerts: uniqNonEmpty([
          seoOpportunities.length > 0 ? `当前共识别出 ${seoOpportunities.length} 个 SEO 优先项。` : "当前站点级 SEO 字段整体较完整。",
          compactSummary([
            scope.isGlobal ? "当前为全局视图" : `当前聚焦 ${scope.brandName}`,
            "后续可继续扩展 sitemap、结构化数据与专题页模板",
          ]),
        ]),
      },
    };
  } catch (error) {
    console.warn("[Database] Failed to build admin operations snapshot:", error);
    return buildFallbackAdminOperationsSnapshot(params?.brandId);
  }
}
