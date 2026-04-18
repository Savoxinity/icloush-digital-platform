
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgePercent,
  Beaker,
  BookOpenText,
  Building2,
  ChevronRight,
  CircleCheckBig,
  Factory,
  FileText,
  FlaskConical,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { Link, Route, Switch, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast as sonnerToast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "./lib/trpc";
import { useAuth } from "./_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotFound from "./pages/NotFound";
import type { PublicCatalogSnapshot } from "../server/db";

type SiteEntry = {
  title: string;
  href: string;
  description: string;
  tags: string[];
  tone: string;
  icon: typeof ShoppingBag;
};

type ShopCategory = {
  id: string;
  label: string;
  note: string;
};

type ShopProduct = {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  spec: string;
  usage: string;
  moq: string;
  leadTime: string;
  price: string;
  pricingHint: string;
  badges: readonly string[];
};

type PlatformSiteKey = "shop" | "lab" | "tech" | "care";

type PlatformSiteSummary = {
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

type PlatformSnapshot = {
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

type AdminScopeSummary = {
  brandId: number | null;
  brandCode: string | null;
  brandName: string;
  isGlobal: boolean;
};

type AdminProductOverviewItem = {
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

type AdminBrandProductView = {
  brandId: number;
  brandName: string;
  productCount: number;
  activeCount: number;
  categoryCount: number;
  seoReadyCount: number;
  productTypeMix: string[];
};

type AdminCustomerOverviewItem = {
  membershipId: number;
  brandId: number;
  brandName: string;
  userId: number;
  displayName: string;
  enterpriseName: string | null;
  contactName: string | null;
  memberType: string;
  status: string;
  priceLevel: string | null;
  email: string | null;
  mobile: string | null;
  accountType: string;
  globalRole: string;
  lastSignedIn: string | null;
};

type AdminLeadOverviewItem = {
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

type AdminCustomerBrandView = {
  brandId: number;
  brandName: string;
  membershipCount: number;
  activeMembershipCount: number;
  enterpriseAccountCount: number;
  leadCount: number;
  qualifiedLeadCount: number;
};

type AdminContentSiteEntry = {
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

type AdminContentQueueItem = {
  title: string;
  channel: string;
  reason: string;
  priority: "high" | "medium";
};

type AdminSeoSiteEntry = {
  siteKey: PlatformSiteKey;
  title: string;
  brandName: string;
  domain: string | null;
  activeProductCount: number;
  seoReadyProductCount: number;
  siteMetaReady: boolean;
  statusLabel: string;
};

type AdminSeoOpportunity = {
  title: string;
  impact: string;
  action: string;
  severity: "high" | "medium";
};

type AdminOperationsSnapshot = {
  generatedAt: string;
  scope: AdminScopeSummary;
  products: {
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
  customers: {
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
  content: {
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
  seo: {
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
};

type EnterpriseApplicationSummaryRecord = {
  brandId: number;
  brandCode: string;
  brandName: string;
  memberType: string;
  enterpriseName: string | null;
  contactName: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type EnterpriseApplicationFormState = {
  enterpriseName: string;
  contactName: string;
  mobile: string;
  email: string;
  message: string;
};

const emptyEnterpriseApplicationForm = (): EnterpriseApplicationFormState => ({
  enterpriseName: "",
  contactName: "",
  mobile: "",
  email: "",
  message: "",
});

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) {
    return "待同步";
  }

  return new Date(value).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
};

const siteEntries: SiteEntry[] = [
  {
    title: "B2B 商城系统",
    href: "/shop",
    description: "面向酒店、物业、渠道与企业采购的在线选品、询价、下单与订单追踪入口。",
    tags: ["分类浏览", "购物车", "订单管理"],
    icon: ShoppingBag,
    tone: "from-sky-600 to-cyan-500",
  },
  {
    title: "iCloush LAB.",
    href: "/lab",
    description: "承接品牌介绍、产品线说明、研发能力展示与商务联系转化。",
    tags: ["品牌官网", "技术背书", "联系方式"],
    icon: FlaskConical,
    tone: "from-violet-600 to-indigo-500",
  },
  {
    title: "环洗朵科技",
    href: "/tech",
    description: "聚焦专业化学品清洗剂、行业解决方案与客户案例的 B2B 官网。",
    tags: ["企业介绍", "解决方案", "客户案例"],
    icon: ShieldCheck,
    tone: "from-emerald-600 to-teal-500",
  },
  {
    title: "富朵朵 iCloush Care",
    href: "/care",
    description: "面向酒店奢护洗涤服务的品牌展示、服务流程与咨询入口。",
    tags: ["服务介绍", "流程展示", "酒店合作"],
    icon: Building2,
    tone: "from-amber-500 to-orange-500",
  },
];

const capabilityNotes = [
  "统一商品、订单、客户、内容与 SEO 底座，支撑商城与三大品牌官网协同运营。",
  "前台保持各品牌独立气质与访问路径，后台承接统一数据管理与运营工作流。",
  "当前首页已从模板占位页升级为真实业务总入口，下一步继续接入真实商品、客户与订单数据。",
];

const platformMetrics = [
  {
    label: "统一品牌矩阵",
    value: "4 个站点",
    detail: "商城、iCloush LAB.、环洗朵科技与 iCloush Care 已纳入统一平台入口。",
    icon: Sparkles,
  },
  {
    label: "经营能力底座",
    value: "6 类能力",
    detail: "商品、订单、支付、客户、内容与 SEO 共享同一套业务底座。",
    icon: CircleCheckBig,
  },
  {
    label: "当前核心场景",
    value: "酒店与企业采购",
    detail: "优先服务酒店布草、物业清洁、高端织物护理与顾问式方案销售。",
    icon: Building2,
  },
];

const brandStoryCards = [
  {
    title: "B2B 商城系统",
    audience: "酒店、物业、渠道与企业采购",
    summary: "承接标准品采购、组合方案下单与订单追踪，是统一交易入口。",
    icon: ShoppingBag,
    tone: "from-sky-500/20 via-white to-cyan-500/10",
    accent: "text-sky-700",
    highlights: ["分类浏览", "购物车结算", "订单闭环"],
  },
  {
    title: "iCloush LAB.",
    audience: "高端香氛护理与研发合作客户",
    summary: "强调研发能力、配方方法与产品线逻辑，负责品牌背书与高价值转化。",
    icon: Beaker,
    tone: "from-violet-500/20 via-white to-indigo-500/10",
    accent: "text-violet-700",
    highlights: ["老钱工业风", "研发能力", "产品方法论"],
  },
  {
    title: "环洗朵科技",
    audience: "化学品清洁剂 B2B 决策者",
    summary: "聚焦专业化学品清洗剂、解决方案与案例证明，面向高频复购业务。",
    icon: Factory,
    tone: "from-emerald-500/20 via-white to-teal-500/10",
    accent: "text-emerald-700",
    highlights: ["行业方案", "客户案例", "规模供货"],
  },
  {
    title: "iCloush Care",
    audience: "高端酒店与奢护洗涤项目客户",
    summary: "呈现高端酒店织物护理与服务流程，承担高客单服务型转化。",
    icon: Building2,
    tone: "from-amber-500/20 via-white to-orange-500/10",
    accent: "text-amber-700",
    highlights: ["服务流程", "合作酒店", "顾问咨询"],
  },
];

const operatingLoop = [
  {
    title: "前台获客",
    detail: "通过商城、品牌官网与客户中心承接搜索流量、品牌认知与采购线索。",
  },
  {
    title: "中台协同",
    detail: "后台统一治理产品、订单、客户、内容与 SEO，避免多站点重复运营。",
  },
  {
    title: "数据闭环",
    detail: "线索、订单、审核与履约结果回流到统一平台，为下一轮转化优化提供依据。",
  },
];

const homepageActionCards = [
  {
    title: "快速进入交易链路",
    detail: "适合直接查看分类、加入购物车、填写采购资料并进入订单流程。",
    href: "/shop",
    cta: "进入商城",
    icon: WalletCards,
  },
  {
    title: "查看品牌能力矩阵",
    detail: "从不同品牌站点理解研发、化学品解决方案与高端服务之间的分工。",
    href: "/lab",
    cta: "查看品牌站点",
    icon: BookOpenText,
  },
  {
    title: "进入客户与运营视图",
    detail: "进入客户中心或后台查看订单状态、审核队列与跨品牌运营结构。",
    href: "/admin",
    cta: "进入后台",
    icon: Users,
  },
];

const mobileQuickLinks = [
  { label: "商城", href: "/shop" },
  { label: "LAB", href: "/lab" },
  { label: "环洗朵科技", href: "/tech" },
  { label: "iCloush Care", href: "/care" },
  { label: "客户中心", href: "/account" },
  { label: "后台", href: "/admin" },
];

const routeSeoMap: Record<
  string,
  {
    title: string;
    description: string;
    keywords: string;
    robots?: string;
    ogType?: "website" | "article";
  }
> = {
  "/": {
    title: "iCloush Digital Platform｜统一平台总入口",
    description: "iCloush Digital Platform 统一承接 B2B 商城、iCloush LAB.、环洗朵科技、iCloush Care 与后台中台入口。",
    keywords: "iCloush, B2B商城, 品牌官网, 酒店洗护, 企业采购",
    robots: "index, follow",
    ogType: "website",
  },
  "/shop": {
    title: "B2B 商城系统｜iCloush Digital Platform",
    description: "浏览专业化学品清洗剂、酒店布草方案与商业空间护理产品，完成企业采购选品、结算与订单跟踪。",
    keywords: "B2B商城, 企业采购, 酒店布草, 化学品清洗剂, iCloush",
    robots: "index, follow",
    ogType: "website",
  },
  "/lab": {
    title: "iCloush LAB.｜研发能力与产品线展示",
    description: "了解 iCloush LAB. 的研发能力、配方验证流程、产品线方法与商务联系入口。",
    keywords: "iCloush LAB, 研发能力, 配方验证, 酒店洗护, 品牌官网",
    robots: "index, follow",
    ogType: "website",
  },
  "/tech": {
    title: "环洗朵科技｜专业化学品清洗剂与行业方案",
    description: "环洗朵科技聚焦专业化学品清洗剂、行业解决方案与客户案例，服务酒店、物业与企业场景。",
    keywords: "环洗朵科技, 化学品清洗剂, 行业解决方案, 酒店清洁, B2B官网",
    robots: "index, follow",
    ogType: "website",
  },
  "/care": {
    title: "iCloush Care｜酒店奢护洗涤服务",
    description: "查看 iCloush Care 的高端酒店洗护服务介绍、合作流程、服务包与在线咨询入口。",
    keywords: "iCloush Care, 奢护洗涤, 酒店服务, 高端布草护理, 在线咨询",
    robots: "index, follow",
    ogType: "website",
  },
  "/account": {
    title: "客户中心｜iCloush Digital Platform",
    description: "客户中心提供订单进度、结算信息、待办动作与品牌业务跟踪视图。",
    keywords: "客户中心, 订单跟踪, 结算信息, B2B客户, iCloush",
    robots: "noindex, nofollow",
    ogType: "website",
  },
  "/admin": {
    title: "后台总览｜iCloush Console",
    description: "iCloush Console 统一管理产品、订单、客户、内容与 SEO 的运营入口。",
    keywords: "iCloush Console, 后台管理, 订单处理, 客户管理, SEO配置",
    robots: "noindex, nofollow",
    ogType: "website",
  },
  "/admin/products": {
    title: "产品管理｜iCloush Console",
    description: "集中维护商品主数据、品牌归属、阶梯定价与上架节奏。",
    keywords: "产品管理, 商品主数据, 阶梯定价, PIM, iCloush Console",
    robots: "noindex, nofollow",
    ogType: "website",
  },
  "/admin/orders": {
    title: "订单处理｜iCloush Console",
    description: "查看真实订单、审核回单、履约阶段与运营提示，构建后台交易闭环。",
    keywords: "订单处理, 回单审核, 履约阶段, 后台中台, iCloush Console",
    robots: "noindex, nofollow",
    ogType: "website",
  },
  "/admin/customers": {
    title: "客户管理｜iCloush Console",
    description: "管理企业档案、采购主体、品牌归属与客户跟进动作。",
    keywords: "客户管理, 企业档案, 品牌归属, 销售跟进, iCloush Console",
    robots: "noindex, nofollow",
    ogType: "website",
  },
  "/admin/content": {
    title: "内容发布｜iCloush Console",
    description: "统一编排商城内容位、品牌官网专题、案例内容与活动落地页。",
    keywords: "内容发布, 官网专题, 商城内容位, 品牌内容, iCloush Console",
    robots: "noindex, nofollow",
    ogType: "website",
  },
  "/admin/seo": {
    title: "SEO 配置｜iCloush Console",
    description: "统一治理商城与官网的标题模板、结构化内容、robots 与 sitemap 基线。",
    keywords: "SEO配置, sitemap, robots, 标题模板, iCloush Console",
    robots: "noindex, nofollow",
    ogType: "website",
  },
  "/404": {
    title: "页面未找到｜iCloush Digital Platform",
    description: "请求的页面不存在，请返回 iCloush Digital Platform 的有效站点入口。",
    keywords: "404, 页面未找到, iCloush",
    robots: "noindex, nofollow",
    ogType: "website",
  },
};

function upsertMetaTag(attribute: "name" | "property", key: string, content: string) {
  if (typeof document === "undefined") {
    return;
  }

  let meta = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function upsertLinkTag(rel: string, href: string) {
  if (typeof document === "undefined") {
    return;
  }

  let link = document.head.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export function resolveSeoConfig(location: string) {
  return routeSeoMap[location] ?? (location.startsWith("/admin") ? routeSeoMap["/admin"] : routeSeoMap["/404"]);
}

function SeoController() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const seo = resolveSeoConfig(location);
    const canonicalPath = location === "/" ? "/" : location.replace(/\/$/, "");
    const canonicalUrl = `${window.location.origin}${canonicalPath}`;

    document.title = seo.title;
    upsertMetaTag("name", "description", seo.description);
    upsertMetaTag("name", "keywords", seo.keywords);
    upsertMetaTag("name", "robots", seo.robots ?? "index, follow");
    upsertMetaTag("property", "og:title", seo.title);
    upsertMetaTag("property", "og:description", seo.description);
    upsertMetaTag("property", "og:type", seo.ogType ?? "website");
    upsertMetaTag("property", "og:url", canonicalUrl);
    upsertMetaTag("property", "og:site_name", "iCloush Digital Platform");
    upsertMetaTag("name", "twitter:card", "summary_large_image");
    upsertMetaTag("name", "twitter:title", seo.title);
    upsertMetaTag("name", "twitter:description", seo.description);
    upsertLinkTag("canonical", canonicalUrl);
  }, [location]);

  return null;
}

const shopCategories: ShopCategory[] = [
  {
    id: "chemicals",
    label: "专业化学品清洗剂",
    note: "覆盖玻璃、硬表面、厨房与公共区域清洁场景。",
  },
  {
    id: "linen",
    label: "酒店布草清洁",
    note: "面向布草房、制服与高频洗涤场景的标准化配方。",
  },
  {
    id: "space-care",
    label: "商业空间护理",
    note: "面向物业、商办与连锁空间的日常护理与提效产品。",
  },
  {
    id: "luxury-care",
    label: "高端奢护洗涤方案",
    note: "结合产品与服务交付的高信任度护理解决方案。",
  },
];

const shopProducts: ShopProduct[] = [
  {
    id: "linen-cleaner-20l",
    name: "高浓缩织物洁净剂",
    brand: "环洗朵科技",
    categoryId: "linen",
    spec: "20L / 桶",
    usage: "酒店布草与制服洗护",
    moq: "6 桶起订",
    leadTime: "3-5 个工作日",
    price: "¥680 起",
    pricingHint: "支持阶梯价与渠道价",
    badges: ["高频复购", "大包装", "B2B 主销"],
  },
  {
    id: "glass-cleaner-5l",
    name: "玻璃与硬表面专业清洁剂",
    brand: "环洗朵科技",
    categoryId: "chemicals",
    spec: "5L / 桶",
    usage: "物业与商办空间清洁",
    moq: "12 桶起订",
    leadTime: "48 小时内发货",
    price: "¥128 起",
    pricingHint: "支持批量折扣",
    badges: ["高毛利", "标准品", "适合渠道铺货"],
  },
  {
    id: "odor-control-kit",
    name: "客房异味控制组合",
    brand: "iCloush LAB.",
    categoryId: "space-care",
    spec: "组合装",
    usage: "客房、走廊与软装织物护理",
    moq: "方案起订",
    leadTime: "需顾问确认",
    price: "方案定价",
    pricingHint: "支持项目报价",
    badges: ["顾问型销售", "场景方案", "支持试用"],
  },
  {
    id: "luxury-service-pack",
    name: "酒店织物奢护组合",
    brand: "iCloush Care",
    categoryId: "luxury-care",
    spec: "服务套餐",
    usage: "高端酒店布草护理",
    moq: "按项目签约",
    leadTime: "项目排期制",
    price: "方案定价",
    pricingHint: "可含驻场服务",
    badges: ["服务型产品", "高客单", "适合旗舰客户"],
  },
  {
    id: "kitchen-degreaser",
    name: "厨房重油污清洁剂",
    brand: "环洗朵科技",
    categoryId: "chemicals",
    spec: "10L / 桶",
    usage: "后厨、排烟与设备重污场景",
    moq: "8 桶起订",
    leadTime: "3 个工作日",
    price: "¥258 起",
    pricingHint: "可按年度协议价供货",
    badges: ["强场景", "复购稳定", "适配连锁酒店"],
  },
  {
    id: "linen-soft-care",
    name: "布草柔护增艳剂",
    brand: "iCloush LAB.",
    categoryId: "linen",
    spec: "15L / 桶",
    usage: "高端布草柔护与色泽管理",
    moq: "4 桶起订",
    leadTime: "5-7 个工作日",
    price: "¥420 起",
    pricingHint: "可配订阅制补货",
    badges: ["订阅潜力", "高复购", "适合高端酒店"],
  },
];

const labCapabilities = [
  "面向清洗与护理场景的配方研发能力，强调从问题定义到样品验证的完整链路。",
  "建立原料筛选、配方验证、稳定性测试与场景实验室记录机制，为品牌故事提供证据。",
  "为专业化学品与高端护理品牌输出可转化的技术卖点、产品线方法与商业沟通素材。",
];

const techSolutions = [
  "酒店布草与客房织物清洁方案",
  "物业与商业空间硬表面清洁方案",
  "机构日常洗护标准化配方方案",
  "企业定制行业应用方案",
];

const careProcess = [
  "需求沟通与现状评估",
  "服务方案制定与试运行",
  "标准执行与品质验收",
  "长期服务与持续优化",
];

const demoOrders = [
  {
    code: "IC-2026-0018",
    status: "待发货",
    amount: "¥2,460",
    items: "高浓缩织物洁净剂 × 3，厨房重油污清洁剂 × 2",
    brand: "环洗朵科技",
  },
  {
    code: "IC-2026-0011",
    status: "已完成",
    amount: "¥980",
    items: "玻璃与硬表面专业清洁剂 × 5",
    brand: "环洗朵科技",
  },
  {
    code: "IC-2026-0007",
    status: "待审核",
    amount: "方案报价",
    items: "酒店织物奢护组合 × 1",
    brand: "iCloush Care",
  },
];

const checkoutChecklist = [
  {
    title: "采购主体信息",
    detail: "沉淀企业名称、联系人、手机号、收货地与开票信息，作为统一结算单基础资料。",
  },
  {
    title: "支付方式选择",
    detail: "支持对公转账审核闭环，并为微信支付、支付宝与信用卡分期预留支付意图扩展。",
  },
  {
    title: "订单创建与追踪",
    detail: "提交后同步进入客户中心与后台订单页，便于审核、履约与后续客服协同。",
  },
];

const paymentPlans = [
  {
    title: "对公转账",
    status: "当前可走审核闭环",
    detail: "打款后上传回单，后台进入待审核队列并等待财务复核。",
  },
  {
    title: "微信支付 JSAPI",
    status: "待联调",
    detail: "已完成接口清单与预下单草稿结构，待商户参数与回调联调后接入。",
  },
  {
    title: "支付宝 / 信用卡分期",
    status: "待联调",
    detail: "已预留支付意图、分期与信用卡偏好字段，便于后续扩展。",
  },
];

const customerActionCards = [
  {
    title: "补齐企业资料",
    detail: "完善采购联系人、发票抬头与默认收货地址，减少人工回填。",
  },
  {
    title: "上传付款凭证",
    detail: "对公转账订单可在客户中心补交回单，订单自动进入后台审核。",
  },
  {
    title: "确认履约节点",
    detail: "审核通过后继续跟踪发货、签收与售后处理进度。",
  },
];

const adminReviewQueue = [
  {
    code: "IC-2026-0021",
    brand: "环洗朵科技",
    amount: "¥4,820",
    status: "待审核",
    task: "核验对公转账凭证与采购主体是否一致。",
  },
  {
    code: "IC-2026-0019",
    brand: "iCloush LAB.",
    amount: "方案报价",
    status: "待补资料",
    task: "补充项目报价单与联系人确认记录。",
  },
  {
    code: "IC-2026-0016",
    brand: "iCloush Care",
    amount: "¥8,600",
    status: "待发货排期",
    task: "确认服务排期与驻场交付窗口。",
  },
];

const fulfillmentStages = [
  {
    title: "待支付 / 待上传回单",
    detail: "订单创建后等待线上支付完成，或由客户补交线下付款凭证。",
  },
  {
    title: "财务审核",
    detail: "核验付款主体、金额与凭证有效性，通过后进入履约队列。",
  },
  {
    title: "履约与售后",
    detail: "安排发货、到货签收、项目执行与售后回访，形成完整服务闭环。",
  },
];

type BrandOption = {
  id: number;
  code: string;
  name: string;
  shortName?: string | null;
  businessType?: string | null;
  status?: string | null;
};

type OrderSummaryRecord = {
  id: number;
  orderNo: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  payableAmount: number;
  itemPreview?: Array<{
    productName: string;
    skuLabel?: string | null;
    quantity: number;
    lineAmount?: number;
  }>;
  latestPayment?: {
    provider?: string | null;
    status?: string | null;
  } | null;
  latestReceipt?: {
    reviewStatus?: string | null;
  } | null;
};

const orderStatusLabelMap: Record<string, string> = {
  pending_payment: "待支付",
  under_review: "待审核",
  paid: "已付款",
  processing: "处理中",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
  closed: "已关闭",
};

const paymentStatusLabelMap: Record<string, string> = {
  unpaid: "未支付",
  paid: "已支付",
  part_paid: "部分支付",
  offline_review: "线下审核中",
  refunded: "已退款",
};

const fulfillmentStatusLabelMap: Record<string, string> = {
  unfulfilled: "待履约",
  processing: "履约处理中",
  partial_shipped: "部分发货",
  shipped: "已发货",
  delivered: "已送达",
};

const reviewStatusLabelMap: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

function formatCurrencyFen(value?: number | null) {
  if (typeof value !== "number") {
    return "方案报价";
  }

  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function getOrderStatusLabel(status?: string | null) {
  return status ? orderStatusLabelMap[status] ?? status : "待确认";
}

function getPaymentStatusLabel(status?: string | null) {
  return status ? paymentStatusLabelMap[status] ?? status : "待确认";
}

function getFulfillmentStatusLabel(status?: string | null) {
  return status ? fulfillmentStatusLabelMap[status] ?? status : "待确认";
}

function getReviewStatusLabel(status?: string | null) {
  return status ? reviewStatusLabelMap[status] ?? status : "待确认";
}

const enterpriseApplicationStatusLabelMap: Record<string, string> = {
  pending: "待审核",
  approved: "审核通过",
  rejected: "已驳回",
  active: "已激活",
  disabled: "已停用",
};

function getEnterpriseApplicationStatusLabel(status?: string | null) {
  return status ? enterpriseApplicationStatusLabelMap[status] ?? status : "待确认";
}

function getEnterpriseApplicationStatusClassName(status?: string | null) {
  if (status === "approved" || status === "active") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected" || status === "disabled") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-amber-50 text-amber-700";
}

function summarizeOrderItems(order: OrderSummaryRecord) {
  if (!order.itemPreview || order.itemPreview.length === 0) {
    return "订单商品明细待补充";
  }

  return order.itemPreview
    .map(item => `${item.productName}${item.skuLabel ? `（${item.skuLabel}）` : ""} × ${item.quantity}`)
    .join("，");
}

function SiteNav() {
  return (
    <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
      <Link href="/shop" className="hover:text-slate-950">
        商城
      </Link>
      <Link href="/lab" className="hover:text-slate-950">
        LAB
      </Link>
      <Link href="/tech" className="hover:text-slate-950">
        环洗朵科技
      </Link>
      <Link href="/care" className="hover:text-slate-950">
        iCloush Care
      </Link>
      <Link href="/account" className="hover:text-slate-950">
        客户中心
      </Link>
      <Link href="/admin" className="hover:text-slate-950">
        后台
      </Link>
    </nav>
  );
}

const homepageEntrySnapshots = [
  {
    title: "B2B 商城系统",
    href: "/shop",
    kicker: "真实商品摘要",
    icon: ShoppingBag,
    tone: "from-sky-500/25 via-sky-50 to-cyan-500/10",
    metrics: [`${shopProducts.length} 个在售样例`, `${shopCategories.length} 个采购分类`],
    summary: `已汇总 ${Array.from(new Set(shopProducts.map((product) => product.brand))).join("、")} 的标准品与方案型产品，示例订单 ${demoOrders[0]?.code ?? "IC-2026-0018"} 已进入 ${demoOrders[0]?.status ?? "待发货"}。`,
    highlights: [shopProducts[0]?.name ?? "高浓缩织物洁净剂", shopProducts.find(product => product.categoryId === "chemicals")?.name ?? "玻璃与硬表面专业清洁剂"],
    cta: "进入商城选品",
  },
  {
    title: "iCloush LAB.",
    href: "/lab",
    kicker: "品牌与研发摘要",
    icon: Beaker,
    tone: "from-violet-500/25 via-violet-50 to-indigo-500/10",
    metrics: [`${labCapabilities.length} 条研发能力`, `${shopProducts.filter(product => product.brand === "iCloush LAB.").length} 个顾问型样例`],
    summary: "站点已不再停留于品牌口号，而是直接引用研发能力、配方验证与产品方法论素材来承接商务沟通。",
    highlights: [labCapabilities[0] ?? "配方研发能力", shopProducts.find(product => product.brand === "iCloush LAB.")?.name ?? "布草柔护增艳剂"],
    cta: "查看 LAB 站点",
  },
  {
    title: "环洗朵科技",
    href: "/tech",
    kicker: "行业方案摘要",
    icon: ShieldCheck,
    tone: "from-emerald-500/25 via-emerald-50 to-teal-500/10",
    metrics: [`${techSolutions.length} 类行业方案`, `${shopProducts.filter(product => product.brand === "环洗朵科技").length} 个主销样例`],
    summary: "围绕酒店布草、商业空间与机构洗护的方案型表达已经与商品样例打通，便于从行业场景直接下钻到采购链路。",
    highlights: [techSolutions[0] ?? "酒店布草与客房织物清洁方案", shopProducts.find(product => product.brand === "环洗朵科技")?.name ?? "高浓缩织物洁净剂"],
    cta: "查看行业方案",
  },
  {
    title: "iCloush Care",
    href: "/care",
    kicker: "服务履约摘要",
    icon: Building2,
    tone: "from-amber-500/25 via-amber-50 to-orange-500/10",
    metrics: [`${careProcess.length} 步服务流程`, `${demoOrders.filter(order => order.brand === "iCloush Care").length} 笔高端服务样例订单`],
    summary: "高端酒店织物护理入口已接入服务流程与项目型订单样例，能够展示从需求评估到长期优化的完整服务链。",
    highlights: [careProcess[0] ?? "需求沟通与现状评估", shopProducts.find(product => product.brand === "iCloush Care")?.name ?? "酒店织物奢护组合"],
    cta: "查看服务站点",
  },
];

const homepageOperationalSnapshots = [
  {
    title: "客户中心",
    href: "/account",
    detail: `当前已沉淀 ${demoOrders.length} 笔示例订单与 ${customerActionCards.length} 个客户待办动作，便于把首页入口延伸到订单跟踪与资料补齐。`,
    icon: Users,
  },
  {
    title: "后台总览",
    href: "/admin",
    detail: `后台已统一承接 ${platformMetrics[1]?.value ?? "6 类能力"}，并为订单审核、产品、客户、内容与 SEO 提供运营入口。`,
    icon: WalletCards,
  },
];

function getSiteSnapshot(snapshot: PlatformSnapshot | undefined, siteKey: PlatformSiteKey) {
  return snapshot?.siteSummaries.find((item) => item.siteKey === siteKey);
}

type SnapshotState = "loading" | "error" | "empty" | "ready";

export function resolveSnapshotState(snapshot: unknown, isLoading: boolean, isError: boolean): SnapshotState {
  if (isLoading) {
    return "loading";
  }

  if (isError) {
    return "error";
  }

  return snapshot ? "ready" : "empty";
}

export function formatMetricValue(value: number | undefined, suffix: string, state: SnapshotState, emptyLabel = "等待同步") {
  if (state === "loading") {
    return "同步中";
  }

  if (state === "error") {
    return "暂不可用";
  }

  if (typeof value === "number") {
    return `${value} ${suffix}`;
  }

  return emptyLabel;
}

export function resolveCatalogState(
  snapshot: PublicCatalogSnapshot | undefined,
  isLoading: boolean,
  isError: boolean,
): SnapshotState {
  if (isLoading) {
    return "loading";
  }

  if (isError) {
    return "error";
  }

  if (!snapshot) {
    return "empty";
  }

  return snapshot.categories.length === 0 && snapshot.products.length === 0 ? "empty" : "ready";
}

type CatalogSourceCode = PublicCatalogSnapshot["source"] | "loading" | "error";

export function getCatalogSourceCode(snapshot: PublicCatalogSnapshot | undefined, state: SnapshotState): CatalogSourceCode {
  if (snapshot?.source) {
    return snapshot.source;
  }

  if (state === "loading") {
    return "loading";
  }

  return state === "error" ? "error" : "database";
}

export function mapCatalogCategories(snapshot: PublicCatalogSnapshot | undefined): ShopCategory[] {
  return (snapshot?.categories ?? []).map((category) => ({
    id: category.slug,
    label: category.name,
    note: category.brandName
      ? `${category.brandName} · ${category.productCount} 个可浏览商品`
      : `${category.productCount} 个可浏览商品`,
  }));
}

export function mapCatalogProducts(snapshot: PublicCatalogSnapshot | undefined): ShopProduct[] {
  return (snapshot?.products ?? []).map((product) => ({
    id: product.slug || String(product.id),
    name: product.name,
    brand: product.brandName,
    categoryId: product.categorySlug ?? "uncategorized",
    spec: product.specLabel,
    usage: product.description ?? product.subtitle ?? `${product.categoryName} · ${product.productType}`,
    moq: product.minimumOrderLabel,
    leadTime: product.leadTimeLabel,
    price: product.priceLabel,
    pricingHint:
      product.subtitle ??
      (product.priceValue !== null ? "支持企业协议价与按量报价" : "支持项目报价与顾问跟进"),
    badges: product.badges.length > 0 ? product.badges : [product.productType, product.status],
  }));
}

export type LabContactDraft = {
  headline: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  contactEmail: string;
  contactPhone: string;
  contactWechat: string;
  contactAddress: string;
  serviceHours: string;
  responseSla: string;
};

export type TechSolutionDraft = {
  title: string;
  summary: string;
  audience: string;
  sortOrder: string;
};

export type TechCaseStudyDraft = {
  title: string;
  subtitle: string;
  summary: string;
  location: string;
  segment: string;
  partnerName: string;
  sortOrder: string;
};

export type TechClientLogoDraft = {
  clientName: string;
  logoText: string;
  tagline: string;
  accentColor: string;
  sortOrder: string;
};

export function createEmptyTechSolutionDraft(): TechSolutionDraft {
  return {
    title: "",
    summary: "",
    audience: "",
    sortOrder: "",
  };
}

export function createEmptyTechCaseStudyDraft(): TechCaseStudyDraft {
  return {
    title: "",
    subtitle: "",
    summary: "",
    location: "",
    segment: "",
    partnerName: "",
    sortOrder: "",
  };
}

export function createEmptyTechClientLogoDraft(): TechClientLogoDraft {
  return {
    clientName: "",
    logoText: "",
    tagline: "",
    accentColor: "",
    sortOrder: "",
  };
}

export function buildLabContactConfigPayload(draft: LabContactDraft) {
  return {
    siteKey: "lab" as const,
    contactScene: "business" as const,
    headline: draft.headline,
    description: draft.description,
    primaryCtaLabel: draft.primaryCtaLabel,
    primaryCtaHref: draft.primaryCtaHref,
    secondaryCtaLabel: draft.secondaryCtaLabel,
    secondaryCtaHref: draft.secondaryCtaHref,
    contactEmail: draft.contactEmail,
    contactPhone: draft.contactPhone,
    contactWechat: draft.contactWechat,
    contactAddress: draft.contactAddress,
    serviceHours: draft.serviceHours,
    responseSla: draft.responseSla,
  };
}

export function mapTechSolutionDrafts(
  items:
    | Array<{ title: string; summary: string; audience?: string | null; sortOrder?: number | null }>
    | null
    | undefined,
) {
  if (!items || items.length === 0) {
    return [createEmptyTechSolutionDraft()];
  }

  return items.map((item, index) => ({
    title: item.title ?? "",
    summary: item.summary ?? "",
    audience: item.audience ?? "",
    sortOrder: String(item.sortOrder ?? index + 1),
  }));
}

export function mapTechCaseStudyDrafts(
  items:
    | Array<{
        title: string;
        subtitle?: string | null;
        summary: string;
        location?: string | null;
        segment?: string | null;
        partnerName?: string | null;
        sortOrder?: number | null;
      }>
    | null
    | undefined,
) {
  if (!items || items.length === 0) {
    return [createEmptyTechCaseStudyDraft()];
  }

  return items.map((item, index) => ({
    title: item.title ?? "",
    subtitle: item.subtitle ?? "",
    summary: item.summary ?? "",
    location: item.location ?? "",
    segment: item.segment ?? "",
    partnerName: item.partnerName ?? "",
    sortOrder: String(item.sortOrder ?? index + 1),
  }));
}

export function buildTechSolutionModulesPayload(drafts: ReadonlyArray<TechSolutionDraft>) {
  return {
    siteKey: "tech" as const,
    items: drafts
      .map((draft, index) => ({
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        audience: draft.audience.trim(),
        sortOrder: Number(draft.sortOrder || index + 1),
      }))
      .filter((item) => item.title && item.summary),
  };
}

export function buildTechCaseStudiesPayload(drafts: ReadonlyArray<TechCaseStudyDraft>) {
  return {
    siteKey: "tech" as const,
    items: drafts
      .map((draft, index) => ({
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        summary: draft.summary.trim(),
        location: draft.location.trim(),
        segment: draft.segment.trim(),
        partnerName: draft.partnerName.trim(),
        sortOrder: Number(draft.sortOrder || index + 1),
      }))
      .filter((item) => item.title && item.summary),
  };
}

export function mapTechClientLogoDrafts(
  items:
    | Array<{
        clientName: string;
        logoText: string;
        tagline?: string | null;
        accentColor?: string | null;
        sortOrder?: number | null;
      }>
    | null
    | undefined,
) {
  if (!items || items.length === 0) {
    return [createEmptyTechClientLogoDraft()];
  }

  return items.map((item, index) => ({
    clientName: item.clientName ?? "",
    logoText: item.logoText ?? "",
    tagline: item.tagline ?? "",
    accentColor: item.accentColor ?? "",
    sortOrder: String(item.sortOrder ?? index + 1),
  }));
}

export function buildTechClientLogosPayload(drafts: ReadonlyArray<TechClientLogoDraft>) {
  return {
    siteKey: "tech" as const,
    items: drafts
      .map((draft, index) => ({
        clientName: draft.clientName.trim(),
        logoText: draft.logoText.trim(),
        tagline: draft.tagline.trim(),
        accentColor: draft.accentColor.trim(),
        sortOrder: Number(draft.sortOrder || index + 1),
      }))
      .filter((item) => item.clientName && item.logoText),
  };
}

export function getLabContactUpdateSuccessMessage() {
  return "LAB 联系配置已更新，前台联系入口会同步展示最新内容。";
}

export function getLabContactUpdateErrorMessage(error: { message?: string | null } | null | undefined) {
  return error?.message || "联系配置更新失败，请稍后重试。";
}

export function getTechContentUpdateSuccessMessage(kind: "solution" | "case" | "logo") {
  return kind === "solution"
    ? "环洗朵科技行业解决方案已更新，前台方案卡片会同步展示最新内容。"
    : kind === "case"
      ? "环洗朵科技客户案例已更新，前台案例模块会同步展示最新内容。"
      : "环洗朵科技客户 Logo 墙已更新，前台品牌背书模块会同步展示最新内容。";
}

export function getTechContentUpdateErrorMessage(error: { message?: string | null } | null | undefined, kind: "solution" | "case" | "logo") {
  return error?.message || (kind === "solution" ? "行业解决方案保存失败，请稍后重试。" : kind === "case" ? "客户案例保存失败，请稍后重试。" : "客户 Logo 墙保存失败，请稍后重试。");
}

export async function syncLabContactConfigAfterSave(refetchers: ReadonlyArray<() => Promise<unknown> | unknown>) {
  await Promise.all(refetchers.map((refetch) => refetch()));
}

export async function syncEnterpriseApplicationReviewAfterSave(
  refreshers: ReadonlyArray<() => Promise<unknown> | unknown>,
) {
  await Promise.all(refreshers.map((refresh) => refresh()));
}

export function submitLabContactConfigUpdate(
  mutate: (payload: ReturnType<typeof buildLabContactConfigPayload>) => unknown,
  draft: LabContactDraft,
) {
  return mutate(buildLabContactConfigPayload(draft));
}

export function submitTechSolutionModulesUpdate(
  mutate: (payload: ReturnType<typeof buildTechSolutionModulesPayload>) => unknown,
  drafts: ReadonlyArray<TechSolutionDraft>,
) {
  return mutate(buildTechSolutionModulesPayload(drafts));
}

export function submitTechCaseStudiesUpdate(
  mutate: (payload: ReturnType<typeof buildTechCaseStudiesPayload>) => unknown,
  drafts: ReadonlyArray<TechCaseStudyDraft>,
) {
  return mutate(buildTechCaseStudiesPayload(drafts));
}

export function submitTechClientLogosUpdate(
  mutate: (payload: ReturnType<typeof buildTechClientLogosPayload>) => unknown,
  drafts: ReadonlyArray<TechClientLogoDraft>,
) {
  return mutate(buildTechClientLogosPayload(drafts));
}

function buildHomepageMetrics(snapshot: PlatformSnapshot | undefined, snapshotState: SnapshotState) {
  if (snapshotState === "loading") {
    return [
      {
        label: "统一品牌矩阵",
        value: "同步中",
        detail: "正在汇总商城、LAB、环洗朵科技与 Care 的站点与品牌归属。",
        icon: Sparkles,
      },
      {
        label: "经营能力底座",
        value: "同步中",
        detail: "商品、分类、订单与线索摘要正在从统一平台拉取。",
        icon: CircleCheckBig,
      },
      {
        label: "当前核心场景",
        value: "酒店与企业采购",
        detail: "订单在途量与待审核动作正在刷新，稍后可看到最新聚合结果。",
        icon: Building2,
      },
    ];
  }

  if (snapshotState === "error") {
    return [
      {
        label: "统一品牌矩阵",
        value: "暂不可用",
        detail: "平台聚合摘要读取失败，但各站点入口仍可访问。",
        icon: Sparkles,
      },
      {
        label: "经营能力底座",
        value: "等待重试",
        detail: "请重新触发摘要同步，以恢复商品、订单与线索指标。",
        icon: CircleCheckBig,
      },
      {
        label: "当前核心场景",
        value: "酒店与企业采购",
        detail: "当前仅保留入口结构与业务说明，不再展示伪造统计数值。",
        icon: Building2,
      },
    ];
  }

  if (snapshotState === "empty") {
    return [
      {
        label: "统一品牌矩阵",
        value: "等待首批数据",
        detail: "平台入口已就绪，但尚未生成首批站点聚合摘要。",
        icon: Sparkles,
      },
      {
        label: "经营能力底座",
        value: "待接入",
        detail: "商品、分类、订单与线索将会在首批业务数据落库后展示。",
        icon: CircleCheckBig,
      },
      {
        label: "当前核心场景",
        value: "酒店与企业采购",
        detail: "当前重点仍围绕采购与履约链路，待数据接入后会同步更新指标。",
        icon: Building2,
      },
    ];
  }

  return [
    {
      label: "统一品牌矩阵",
      value: `${snapshot?.totals.siteCount ?? 0} 个站点`,
      detail: `商城、iCloush LAB.、环洗朵科技与 iCloush Care 已纳入统一平台入口，当前对应 ${snapshot?.totals.brandCount ?? 0} 个品牌主体。`,
      icon: Sparkles,
    },
    {
      label: "经营能力底座",
      value: `${snapshot?.totals.capabilityCount ?? 0} 类能力`,
      detail: `商品 ${snapshot?.totals.productCount ?? 0}、分类 ${snapshot?.totals.categoryCount ?? 0}、订单 ${snapshot?.totals.orderCount ?? 0}、线索 ${snapshot?.totals.leadCount ?? 0} 等摘要已纳入统一视图。`,
      icon: CircleCheckBig,
    },
    {
      label: "当前核心场景",
      value: "酒店与企业采购",
      detail: `当前平台已可同时观察 ${snapshot?.accountSummary.pendingOrderCount ?? 0} 笔在途订单与 ${snapshot?.adminSummary.reviewQueueCount ?? 0} 笔待审核动作。`,
      icon: Building2,
    },
  ];
}

export function buildHomepageEntrySnapshots(snapshot: PlatformSnapshot | undefined, snapshotState: SnapshotState) {
  const shopSnapshot = getSiteSnapshot(snapshot, "shop");
  const labSnapshot = getSiteSnapshot(snapshot, "lab");
  const techSnapshot = getSiteSnapshot(snapshot, "tech");
  const careSnapshot = getSiteSnapshot(snapshot, "care");

  const fallbackByTitle = {
    loading: {
      metrics: ["摘要同步中", "入口可访问"],
      summary: "当前正在汇总站点侧的商品、订单与线索信息，页面先保留入口结构与场景说明，方便继续浏览。",
      highlights: ["支持进入对应站点", "刷新后查看最新聚合摘要"],
    },
    error: {
      metrics: ["摘要读取失败", "支持重试"],
      summary: "平台聚合接口暂时不可用，当前不再伪装真实统计，只保留入口说明与后续动作提示。",
      highlights: ["站点入口仍可访问", "可手动重试摘要同步"],
    },
    empty: {
      metrics: ["等待首批数据", "入口已就绪"],
      summary: "该站点已纳入统一入口，但首批业务摘要尚未生成，后续会自动补充真实指标。",
      highlights: ["可先浏览站点结构", "数据落库后自动更新"],
    },
  } as const;

  return homepageEntrySnapshots.map((entry) => {
    if (entry.title === "B2B 商城系统" && shopSnapshot) {
      return {
        ...entry,
        metrics: [`${shopSnapshot.productCount} 个真实商品`, `${shopSnapshot.categoryCount} 个采购分类`],
        summary: `商城入口已接入 ${shopSnapshot.productCount} 个真实商品、${shopSnapshot.orderCount} 笔订单与 ${shopSnapshot.leadCount} 条线索摘要，覆盖 ${Math.max(shopSnapshot.brandCodes.length, 1)} 个品牌主体，当前有 ${shopSnapshot.pipelineOrderCount} 笔订单仍在执行链路中。`,
        highlights: shopSnapshot.highlightNames.slice(0, 2),
      };
    }

    if (entry.title === "iCloush LAB." && labSnapshot) {
      return {
        ...entry,
        metrics: [`${labSnapshot.productCount} 个真实商品`, `${labSnapshot.leadCount} 条商务线索`],
        summary: `LAB 站点已可映射 ${labSnapshot.productCount} 个商品与 ${labSnapshot.orderCount} 笔订单摘要，使研发能力、产品方法论与商务转化之间形成更明确的业务对应关系。`,
        highlights: labSnapshot.highlightNames.slice(0, 2),
      };
    }

    if (entry.title === "环洗朵科技" && techSnapshot) {
      return {
        ...entry,
        metrics: [`${techSnapshot.productCount} 个真实商品`, `${techSnapshot.orderCount} 笔方案型订单`],
        summary: `环洗朵科技站点当前引用 ${techSnapshot.productCount} 个真实商品与 ${techSnapshot.leadCount} 条线索摘要，方便从行业方案直接下钻到采购和客户跟进动作。`,
        highlights: techSnapshot.highlightNames.slice(0, 2),
      };
    }

    if (entry.title === "iCloush Care" && careSnapshot) {
      return {
        ...entry,
        metrics: [`${careSnapshot.pipelineOrderCount} 笔在途服务订单`, `${careSnapshot.leadCount} 条高端服务线索`],
        summary: `Care 站点已接入 ${careSnapshot.orderCount} 笔服务型订单摘要与 ${careSnapshot.leadCount} 条咨询线索，能够更直观地展示从咨询、评估到履约优化的服务闭环。`,
        highlights: careSnapshot.highlightNames.slice(0, 2),
      };
    }

    if (snapshotState === "ready") {
      return {
        ...entry,
        metrics: ["等待站点摘要", "入口已开放"],
        summary: "统一平台已更新首页快照，但该站点的站点级摘要尚未返回，因此暂不展示任何静态统计数值。",
        highlights: ["可继续浏览站点入口", "稍后刷新查看站点侧指标"],
      };
    }

    const fallback = fallbackByTitle[snapshotState];
    return {
      ...entry,
      metrics: fallback.metrics,
      summary: fallback.summary,
      highlights: fallback.highlights,
    };
  });
}

export function buildHomepageOperationalSnapshots(snapshot: PlatformSnapshot | undefined) {
  return homepageOperationalSnapshots.map((entry) => {
    if (entry.title === "客户中心" && snapshot?.accountSummary) {
      return {
        ...entry,
        detail: `当前已沉淀 ${snapshot.accountSummary.orderCount} 笔真实订单摘要，其中 ${snapshot.accountSummary.pendingOrderCount} 笔仍在推进，另有 ${snapshot.accountSummary.pendingReviewCount} 笔待审核动作需要跟进。`,
      };
    }

    if (entry.title === "后台总览" && snapshot?.adminSummary) {
      return {
        ...entry,
        detail: `后台当前覆盖 ${snapshot.adminSummary.moduleCount} 类运营能力，已可统一查看 ${snapshot.adminSummary.brandCount} 个品牌主体、${snapshot.adminSummary.leadCount} 条线索与 ${snapshot.adminSummary.reviewQueueCount} 笔审核队列。`,
      };
    }

    return entry;
  });
}

export function PlatformHome() {
  const platformSnapshotQuery = trpc.platform.snapshot.useQuery();
  const platformSnapshot = platformSnapshotQuery.data as PlatformSnapshot | undefined;
  const homepageSnapshotState = resolveSnapshotState(platformSnapshot, platformSnapshotQuery.isLoading, platformSnapshotQuery.isError);
  const resolvedPlatformMetrics = buildHomepageMetrics(platformSnapshot, homepageSnapshotState);
  const resolvedHomepageEntrySnapshots = buildHomepageEntrySnapshots(platformSnapshot, homepageSnapshotState);
  const resolvedHomepageOperationalSnapshots = buildHomepageOperationalSnapshots(platformSnapshot);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_35%,#ffffff_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="container py-3">
          <div className="flex min-h-10 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                iC
              </div>
              <div>
                <p className="text-sm text-slate-500">iCloush Digital Platform</p>
                <p className="font-semibold tracking-tight">统一平台总入口</p>
              </div>
            </Link>
            <SiteNav />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {mobileQuickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main>
        <section className="container grid gap-8 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-700">
              Unified commerce + brand system
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 md:text-6xl">
              把自有商城、品牌官网、客户中心与后台中台收束到同一条经营链路里。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              当前首页已不再是模板占位页，而是面向真实业务场景的统一总入口。它清晰区分商城交易、品牌背书、行业解决方案与高端服务路径，并把客户中心与后台中台纳入同一套运营视图。
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                进入商城系统
              </Link>
              <Link
                href="/admin"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                查看统一后台
              </Link>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {resolvedPlatformMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur"
                >
                  <metric.icon className="h-5 w-5 text-sky-600" />
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{metric.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">平台结构概览</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">从获客、交易到履约与复购的统一视图</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Monorepo Ready</div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-white/5 p-5">
                <p className="text-sm text-slate-400">统一底座</p>
                <p className="mt-2 text-lg font-medium">用户、商品、订单、支付、内容、SEO</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">所有站点共享一套品牌、租户、内容与交易能力，便于后续接入真实数据与自动化流程。</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {capabilityNotes.map((item) => (
                  <div key={item} className="rounded-3xl bg-white/5 p-5 text-sm leading-7 text-slate-200">
                    <Sparkles className="h-5 w-5 text-sky-300" />
                    <p className="mt-4">{item}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">推荐访问路径</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {homepageActionCards.map((card) => (
                    <Link key={card.title} href={card.href} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                      <card.icon className="h-5 w-5 text-sky-300" />
                      <p className="mt-4 text-sm font-medium text-white">{card.title}</p>
                      <p className="mt-2 text-xs leading-6 text-slate-300">{card.detail}</p>
                      <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-sky-300">
                        {card.cta}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-6 md:py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Live business snapshots</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">每个站点入口都开始承接真实业务摘要，而不再只是静态文案。</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                首页现在直接引用商品样例、行业方案、研发能力、服务流程与订单示例，让用户在进入各站点前就能看到各自的业务边界与下一步动作。
              </p>
            </div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              查看后台结构
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div
            className={`mt-8 rounded-[1.75rem] border px-5 py-4 text-sm leading-7 ${
              homepageSnapshotState === "error"
                ? "border-amber-200 bg-amber-50/90 text-amber-800"
                : homepageSnapshotState === "ready"
                  ? "border-emerald-200 bg-emerald-50/90 text-emerald-800"
                  : "border-sky-200 bg-sky-50/80 text-sky-800"
            }`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p>
                {homepageSnapshotState === "loading"
                  ? "首页正在同步真实品牌、商品、订单与线索摘要，当前仅展示入口结构与同步状态。"
                  : homepageSnapshotState === "error"
                    ? "真实平台摘要暂时不可用，首页已停止回退伪造统计数值；请重试同步以恢复最新业务聚合结果。"
                    : homepageSnapshotState === "empty"
                      ? "统一平台尚未生成首批首页摘要，当前会优先展示入口结构与后续动作提示。"
                      : `当前首页摘要已切换为真实业务聚合数据，最近更新时间为 ${new Date(platformSnapshot?.generatedAt ?? Date.now()).toLocaleString()}。`}
              </p>
              {homepageSnapshotState === "error" ? (
                <button
                  type="button"
                  onClick={() => platformSnapshotQuery.refetch()}
                  className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/50"
                >
                  重试同步
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {resolvedHomepageEntrySnapshots.map((snapshot) => (
              <Link
                key={snapshot.title}
                href={snapshot.href}
                className={`group rounded-[2rem] border border-slate-200 bg-gradient-to-br ${snapshot.tone} p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_30px_100px_rgba(15,23,42,0.12)] md:p-7`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
                      <snapshot.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{snapshot.kicker}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{snapshot.title}</h3>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:max-w-[14rem] sm:justify-end">
                    {snapshot.metrics.map((metric) => (
                      <span key={metric} className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700">
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-700">{snapshot.summary}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {snapshot.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-700">
                      {highlight}
                    </div>
                  ))}
                </div>
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                  {snapshot.cta}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            {brandStoryCards.map((card, index) => (
              <Link
                key={card.title}
                href={siteEntries[index]?.href ?? "/"}
                className={`group rounded-[2rem] border border-slate-200 bg-gradient-to-br ${card.tone} p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_30px_100px_rgba(15,23,42,0.12)] md:p-8`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <span className={`rounded-full bg-white px-3 py-1 text-xs font-medium ${card.accent}`}>{card.audience}</span>
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-700">{card.summary}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {card.highlights.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs text-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                  进入该站点
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="container pb-14 pt-8 md:pb-20 md:pt-12">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)] md:p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Operating loop</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">统一平台真正要解决的是经营协同，而不是页面拼接。</h2>
              <div className="mt-8 space-y-4">
                {operatingLoop.map((item, index) => (
                  <div key={item.title} className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                        0{index + 1}
                      </div>
                      <p className="font-medium text-slate-950">{item.title}</p>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 px-8 py-10 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Entry matrix</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">从首页可以直接进入采购、品牌认知、客户跟踪与运营动作。</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {siteEntries.map((entry) => (
                  <Link key={entry.title} href={entry.href} className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
                    <div className="flex items-center justify-between gap-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${entry.tone} text-white`}>
                        <entry.icon className="h-5 w-5" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="mt-5 text-lg font-medium text-white">{entry.title}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{entry.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {resolvedHomepageOperationalSnapshots.map((snapshot) => (
                  <Link key={snapshot.title} href={snapshot.href} className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
                        <snapshot.icon className="h-5 w-5" />
                      </div>
                      <p className="text-base font-medium text-white">{snapshot.title}</p>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-300">{snapshot.detail}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function ShopPage({ initialCategory }: { initialCategory?: string } = {}) {
  const platformSnapshotQuery = trpc.platform.snapshot.useQuery();
  const catalogQuery = trpc.platform.catalog.useQuery();
  const platformSnapshot = platformSnapshotQuery.data as PlatformSnapshot | undefined;
  const catalogSnapshot = catalogQuery.data as PublicCatalogSnapshot | undefined;
  const shopSnapshot = getSiteSnapshot(platformSnapshot, "shop");
  const shopSnapshotState = resolveSnapshotState(shopSnapshot, platformSnapshotQuery.isLoading, platformSnapshotQuery.isError);
  const catalogState = resolveCatalogState(catalogSnapshot, catalogQuery.isLoading, catalogQuery.isError);
  const catalogSourceCode = getCatalogSourceCode(catalogSnapshot, catalogState);
  const catalogCategories = useMemo<ShopCategory[]>(() => mapCatalogCategories(catalogSnapshot), [catalogSnapshot]);
  const catalogProducts = useMemo<ShopProduct[]>(() => mapCatalogProducts(catalogSnapshot), [catalogSnapshot]);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory ?? catalogCategories[0]?.id ?? "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!catalogCategories.some((category) => category.id === activeCategory)) {
      setActiveCategory(catalogCategories[0]?.id ?? "");
    }
  }, [activeCategory, catalogCategories]);

  const filteredProducts = useMemo(
    () => (activeCategory ? catalogProducts.filter((product) => product.categoryId === activeCategory) : catalogProducts),
    [activeCategory, catalogProducts],
  );

  const cartCount = useMemo(() => Object.values(cart).reduce((sum, count) => sum + count, 0), [cart]);

  const selectedProducts = useMemo(
    () => catalogProducts.filter((product) => (cart[product.id] ?? 0) > 0),
    [cart, catalogProducts],
  );

  const activeCategoryMeta = useMemo(
    () => catalogCategories.find((category) => category.id === activeCategory) ?? catalogCategories[0],
    [activeCategory, catalogCategories],
  );

  const catalogSourceBadgeClassName =
    catalogSourceCode === "database"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
      : catalogSourceCode === "fallback"
        ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
        : "border-slate-300/20 bg-slate-300/10 text-slate-200";

  const addToCart = (productId: string) => {
    setCart((current) => ({
      ...current,
      [productId]: (current[productId] ?? 0) + 1,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="text-sm text-slate-300">
            ← 返回统一平台
          </Link>
          <SiteNav />
        </div>
      </header>

      <main className="container py-16 md:py-20">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
              B2B Commerce
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              专业化学品与酒店奢护服务的统一采购入口。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              本轮已将商城首页升级为可浏览的 B2B 采购页面，支持分类切换、产品卡片浏览、购物车预览与客户中心导流，为后续接入真实订单与支付接口做好页面承接。
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { label: "采购场景", value: "酒店 / 物业 / 商办 / 渠道" },
                { label: "价格策略", value: "支持阶梯价与协议价" },
                { label: "交付方式", value: "标准品 + 顾问型方案" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                { label: "真实商品", value: formatMetricValue(shopSnapshot?.productCount, "个已接入", shopSnapshotState, "等待商品同步") },
                { label: "采购分类", value: formatMetricValue(shopSnapshot?.categoryCount, "类可浏览", shopSnapshotState, "等待分类同步") },
                { label: "进行中订单", value: formatMetricValue(shopSnapshot?.pipelineOrderCount, "笔待推进", shopSnapshotState, "等待订单同步") },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-200/80">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-sky-50">{item.value}</p>
                </div>
              ))}
            </div>
            <div
              className={`mt-4 rounded-3xl border px-4 py-3 text-sm leading-7 ${
                shopSnapshotState === "error"
                  ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                  : shopSnapshotState === "ready"
                    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                    : "border-sky-300/30 bg-sky-300/10 text-sky-100"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {shopSnapshotState === "loading"
                    ? "商城摘要正在同步，首屏指标会在真实商品、分类与订单快照返回后自动更新。"
                    : shopSnapshotState === "error"
                      ? "商城摘要读取失败，页面仅保留可浏览的采购结构与商品信息，不再冒充真实统计。"
                      : shopSnapshotState === "empty"
                        ? "商城已开放访问，但当前品牌下尚未生成可展示的站点级业务摘要。"
                        : "商城顶部统计已接入平台真实摘要，可用于快速校验产品、分类与订单链路是否贯通。"}
                </p>
                {shopSnapshotState === "error" ? (
                  <button
                    type="button"
                    onClick={() => platformSnapshotQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/10"
                  >
                    重试同步
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">采购闭环</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">商城首页与登录承接</h2>
              </div>
              <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                {loading ? "Checking" : isAuthenticated ? "Signed in" : "Guest"}
              </div>
            </div>
            <div className="mt-6 rounded-[1.75rem] border border-sky-400/25 bg-sky-400/10 p-5 text-sm leading-7 text-sky-50">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200/80">登录状态</p>
              <p className="mt-3 text-base font-medium text-white">
                {loading
                  ? "正在检查当前账号登录状态。"
                  : isAuthenticated
                    ? `已登录为 ${user?.name ?? "当前客户账号"}，可以直接进入客户中心继续采购、查看订单与履约状态。`
                    : "未登录访客可先浏览目录、加入购物车预览，再通过客户中心完成登录并继续采购。"}
              </p>
            </div>
            <div className="mt-6 space-y-4">
              {[
                "按行业、品牌与场景浏览分类并查看阶梯定价说明。",
                "将产品加入购物车，确认企业采购信息与支付偏好。",
                "完成下单后在客户中心或后台持续跟踪订单状态。",
              ].map((step, index) => (
                <div key={step} className="rounded-3xl border border-white/10 bg-black/10 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step {index + 1}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link
                  href="/account"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  进入客户中心
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = getLoginUrl("/account");
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  登录后继续采购
                </button>
              )}
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition hover:border-white/40"
              >
                浏览商城目录
              </Link>
              <Link
                href="/tech"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition hover:border-white/40"
              >
                查看行业解决方案
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Category browser</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">分类浏览与产品选品</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className={`rounded-full border px-4 py-2 text-sm ${catalogSourceBadgeClassName}`}>
                  目录来源：{catalogSourceCode}
                </div>
                <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
                  当前分类：{activeCategoryMeta?.label ?? (catalogState === "empty" ? "暂无可选分类" : "等待分类同步")}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-slate-300">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {catalogState === "loading"
                    ? "商城目录正在同步，分类与商品列表会在公开查询返回后自动刷新。"
                    : catalogState === "error"
                      ? "商城目录读取失败，当前不会再用本地静态样例冒充真实在线商品，请使用重试按钮重新拉取目录。"
                      : catalogSnapshot?.source === "fallback"
                        ? "当前展示的是 fallback 样例目录，用于在数据库不可用时维持可浏览结构；恢复后会自动切回真实数据。"
                        : catalogState === "empty"
                          ? "目录查询已命中 database，但当前品牌下还没有可浏览的真实目录数据，待商品与分类建档后会自动出现。"
                          : "商城目录已接入真实公开查询，分类、商品与品牌信息会随数据库内容同步更新。"}
                </p>
                {catalogState === "error" ? (
                  <button
                    type="button"
                    onClick={() => catalogQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white transition hover:border-white/40 hover:bg-white/10"
                  >
                    重试目录同步
                  </button>
                ) : null}
              </div>
            </div>

            {catalogCategories.length === 0 ? (
              <div className="mt-6 rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 p-6 text-sm leading-7 text-slate-300">
                {catalogState === "loading"
                  ? "分类目录仍在准备中，稍后会自动展示可切换的分类卡片。"
                  : catalogState === "error"
                    ? "本次目录读取失败，因此暂不展示分类按钮；请先重试目录同步。"
                    : "当前还没有可浏览的真实目录分类。完成品牌、分类与商品建档后，这里会自动出现可切换目录。"}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {catalogCategories.map((category) => {
                  const isActive = category.id === activeCategory;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveCategory(category.id)}
                      className={`rounded-[1.75rem] border p-5 text-left transition ${
                        isActive
                          ? "border-sky-400/60 bg-sky-400/12 shadow-[0_20px_60px_rgba(14,165,233,0.16)]"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                      }`}
                    >
                      <p className="font-medium text-white">{category.label}</p>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{category.note}</p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {filteredProducts.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/5 p-8 text-sm leading-7 text-slate-300 lg:col-span-2">
                  当前分类下暂时没有可展示的商品。
                  {catalogState === "error"
                    ? " 请先重试目录同步，确认公开查询恢复后再继续选品。"
                    : catalogState === "empty"
                      ? " 当前还没有可浏览的真实目录数据，待商品建档完成后会自动出现在这里。"
                      : catalogState === "ready"
                        ? " 你可以切换其他分类，或等待后台完成该品类的商品建档与上架。"
                        : " 商品目录正在准备中，稍后重试即可看到可浏览条目。"}
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.18)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{product.brand}</p>
                        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{product.name}</h3>
                      </div>
                      <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{product.spec}</div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-300">适用场景：{product.usage}</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl bg-black/10 p-4 text-sm text-slate-300">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">起订量</p>
                        <p className="mt-2 font-medium text-white">{product.moq}</p>
                      </div>
                      <div className="rounded-3xl bg-black/10 p-4 text-sm text-slate-300">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">交期</p>
                        <p className="mt-2 font-medium text-white">{product.leadTime}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {product.badges.map((badge) => (
                        <span key={badge} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                          {badge}
                        </span>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">{product.pricingHint}</p>
                        <p className="mt-1 text-xl font-semibold text-white">{product.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(product.id)}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                      >
                        加入购物车
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-8 xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Cart preview</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">购物车预览</h3>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">{cartCount} 件</div>
            </div>
            <div className="mt-6 space-y-4">
              {selectedProducts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 bg-black/10 p-5 text-sm leading-7 text-slate-400">
                  购物车为空。你可以先从左侧分类中挑选产品，右侧结算单已预留企业采购信息、支付方式与订单创建说明。
                </div>
              ) : (
                selectedProducts.map((product) => (
                  <div key={product.id} className="rounded-3xl border border-white/10 bg-black/10 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                        <p className="mt-2 text-sm text-slate-400">{product.brand}</p>
                      </div>
                      <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                        × {cart[product.id]}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">{product.price}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-8 rounded-3xl bg-black/10 p-5">
              <p className="text-sm text-slate-400">采购结算单</p>
              <div className="mt-4 space-y-4">
                {checkoutChecklist.map((item) => (
                  <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-3xl bg-black/10 p-5">
              <p className="text-sm text-slate-400">支付方式选择</p>
              <div className="mt-4 space-y-3">
                {paymentPlans.map((plan) => (
                  <div key={plan.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{plan.title}</p>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{plan.status}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{plan.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/account"
                className="inline-flex h-12 items-center justify-center rounded-full bg-sky-400 px-6 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
              >
                前往客户中心结算
              </Link>
              <Link
                href="/admin/orders"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-medium text-white transition hover:border-white/30"
              >
                查看后台订单入口
              </Link>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

export function LabPage() {
  const platformSnapshotQuery = trpc.platform.snapshot.useQuery();
  const labContactQuery = trpc.site.contactConfig.useQuery({ siteKey: "lab", contactScene: "business" });
  const platformSnapshot = platformSnapshotQuery.data as PlatformSnapshot | undefined;
  const labSnapshot = getSiteSnapshot(platformSnapshot, "lab");
  const labSnapshotState = resolveSnapshotState(labSnapshot, platformSnapshotQuery.isLoading, platformSnapshotQuery.isError);
  const labContact = labContactQuery.data as
    | {
        source: "database" | "fallback";
        headline: string;
        description: string;
        primaryCtaLabel: string | null;
        primaryCtaHref: string | null;
        secondaryCtaLabel: string | null;
        secondaryCtaHref: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        contactWechat: string | null;
        contactAddress: string | null;
        serviceHours: string | null;
        responseSla: string | null;
      }
    | undefined;
  const labContactCards = [
    { label: "联系邮箱", value: labContact?.contactEmail },
    { label: "联系电话", value: labContact?.contactPhone },
    { label: "微信沟通", value: labContact?.contactWechat },
    { label: "响应承诺", value: labContact?.responseSla },
  ].filter(item => Boolean(item.value));

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0f172a_0%,#111827_45%,#f8fafc_45%,#f8fafc_100%)] text-white">
      <header className="container flex h-16 items-center justify-between text-sm text-slate-300">
        <Link href="/" className="hover:text-white">
          ← 返回统一平台
        </Link>
        <SiteNav />
      </header>

      <main>
        <section className="container py-16 md:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-violet-200">
              iCloush LAB.
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              以研发可信度构建品牌壁垒，让实验能力成为商业说服力。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              LAB 站点承担品牌介绍、研发能力展示、产品线认知与商务联系入口。本轮已将联系方式从静态占位改为可配置内容，方便后续在后台维护商务与研发沟通入口。
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { label: "真实商品", value: formatMetricValue(labSnapshot?.productCount, "个", labSnapshotState, "等待商品同步") },
                { label: "品牌订单", value: formatMetricValue(labSnapshot?.orderCount, "笔", labSnapshotState, "等待订单同步") },
                { label: "商务线索", value: formatMetricValue(labSnapshot?.leadCount, "条", labSnapshotState, "等待线索同步") },
              ].map(item => (
                <div key={item.label} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-violet-200/70">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
            <div
              className={`mt-4 rounded-[1.75rem] border px-4 py-3 text-sm leading-7 ${
                labSnapshotState === "error"
                  ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                  : labSnapshotState === "ready"
                    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                    : "border-violet-300/20 bg-violet-300/10 text-violet-100"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {labSnapshotState === "loading"
                    ? "LAB 摘要正在同步，研发能力与商务转化指标会在真实站点快照返回后自动更新。"
                    : labSnapshotState === "error"
                      ? "LAB 摘要读取失败，当前保留品牌结构说明，但不再回退为伪造统计。"
                      : labSnapshotState === "empty"
                        ? "LAB 站点已纳入统一入口，但当前还没有可展示的品牌级业务摘要。"
                        : "首屏补充了来自统一平台的真实品牌摘要，可用于校验研发展示与商务转化链路。"}
                </p>
                {labSnapshotState === "error" ? (
                  <button
                    type="button"
                    onClick={() => platformSnapshotQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/10"
                  >
                    重试同步
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {labCapabilities.map(item => (
              <div key={item} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
                <Beaker className="h-6 w-6 text-violet-300" />
                <p className="mt-4 text-sm leading-7 text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 py-16 text-slate-900 md:py-20">
          <div className="container grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">产品线展示</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">从技术平台到品牌产品的统一表达</h2>
              <div className="mt-8 space-y-4">
                {[
                  {
                    title: "专业清洗剂产品线",
                    desc: "面向酒店、物业与商业空间的标准化清洁剂矩阵。",
                  },
                  {
                    title: "酒店织物护理方案",
                    desc: "结合配方、流程与服务要求的高端布草护理产品。",
                  },
                  {
                    title: "高端消费洗护延展产品线",
                    desc: "承接未来会员复购、订阅与品牌延展的消费级产品。",
                  },
                ].map(line => (
                  <div key={line.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="font-medium text-slate-950">{line.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{line.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">联系入口</p>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                    {labContact?.headline ?? "为合作、研发共创与技术交流提供可执行的咨询路径"}
                  </h3>
                </div>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                  {labContactQuery.isLoading ? "联系方式同步中" : labContact?.source === "database" ? "已接入配置化数据" : "使用默认联系信息"}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {labContact?.description ??
                  "当前统一通过客户中心承接商务合作与研发共创需求，提交后可进入后台线索与客户档案模块继续跟进，避免官网停留在仅展示邮箱的静态阶段。"}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">商务合作</p>
                  <p className="mt-2 font-medium text-slate-950">{labContact?.primaryCtaLabel ?? "客户中心合作需求单"}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">适合经销合作、品牌联名、渠道引入与批量采购场景。</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">研发沟通</p>
                  <p className="mt-2 font-medium text-slate-950">{labContact?.secondaryCtaLabel ?? "LAB 共创需求单"}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">适合新品打样、配方验证、场景测试与技术资料沟通。</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {labContactCards.map(item => (
                  <div key={item.label} className="rounded-3xl border border-slate-200 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
              {labContact?.contactAddress || labContact?.serviceHours ? (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
                  {labContact?.contactAddress ? <p>联系地址：{labContact.contactAddress}</p> : null}
                  {labContact?.serviceHours ? <p>服务时段：{labContact.serviceHours}</p> : null}
                </div>
              ) : null}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={labContact?.primaryCtaHref ?? "/account"}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  {labContact?.primaryCtaLabel ?? "提交合作需求"}
                </a>
                <a
                  href={labContact?.secondaryCtaHref ?? "/shop"}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                >
                  {labContact?.secondaryCtaLabel ?? "查看产品采购入口"}
                </a>
              </div>
              {labContactQuery.isError ? (
                <div className="mt-4 flex items-center justify-between rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p>联系配置读取失败，当前仍保留默认联系入口。</p>
                  <button
                    type="button"
                    onClick={() => labContactQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/60"
                  >
                    重试读取
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function TechPage() {
  const platformSnapshotQuery = trpc.platform.snapshot.useQuery();
  const techSolutionsQuery = trpc.site.solutionModules.useQuery({ siteKey: "tech", limit: 6 });
  const techCaseStudiesQuery = trpc.site.caseStudies.useQuery({ siteKey: "tech", limit: 6 });
  const techClientLogosQuery = trpc.site.clientLogos.useQuery({ siteKey: "tech", limit: 8 });
  const platformSnapshot = platformSnapshotQuery.data as PlatformSnapshot | undefined;
  const techSnapshot = getSiteSnapshot(platformSnapshot, "tech");
  const techSnapshotState = resolveSnapshotState(techSnapshot, platformSnapshotQuery.isLoading, platformSnapshotQuery.isError);
  const techSolutionItems = (techSolutionsQuery.data?.items ?? []) as Array<{
    id: number;
    title: string;
    summary: string;
    audience?: string | null;
  }>;
  const techCaseItems = (techCaseStudiesQuery.data?.items ?? []) as Array<{
    id: number;
    title: string;
    subtitle?: string | null;
    summary: string;
    segment?: string | null;
    location?: string | null;
    partnerName?: string | null;
  }>;
  const techClientLogoItems = (techClientLogosQuery.data?.items ?? []) as Array<{
    id: number;
    clientName: string;
    logoText: string;
    tagline?: string | null;
    accentColor?: string | null;
  }>;

  return (
    <div className="min-h-screen bg-[#f3f7f7] text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-950">
            ← 返回统一平台
          </Link>
          <SiteNav />
        </div>
      </header>

      <main className="container py-16 md:py-20">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs uppercase tracking-[0.2em] text-emerald-700">
              环洗朵科技
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              围绕专业化学品清洗剂与行业方案建立更强的 B2B 说服力。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              官网首屏已切换为统一内容治理模式，行业解决方案与客户案例可直接从后台维护并同步到前台展示。
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { label: "真实商品", value: formatMetricValue(techSnapshot?.productCount, "个", techSnapshotState, "等待商品同步") },
                { label: "方案订单", value: formatMetricValue(techSnapshot?.orderCount, "笔", techSnapshotState, "等待订单同步") },
                { label: "项目线索", value: formatMetricValue(techSnapshot?.leadCount, "条", techSnapshotState, "等待线索同步") },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.75rem] border border-emerald-200 bg-white/80 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-700/80">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.value}</p>
                </div>
              ))}
            </div>
            <div
              className={`mt-4 rounded-[1.75rem] border px-4 py-3 text-sm leading-7 ${
                techSnapshotState === "error"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : techSnapshotState === "ready"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white/85 text-slate-600"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {techSnapshotState === "loading"
                    ? "环洗朵科技站点摘要正在同步，方案订单与项目线索会在真实快照返回后更新。"
                    : techSnapshotState === "error"
                      ? "环洗朵科技摘要读取失败，当前仅保留站点结构与内容治理入口，不再展示静态统计。"
                      : techSnapshotState === "empty"
                        ? "环洗朵科技站点已接入统一入口，但目前暂无可展示的品牌级摘要。"
                        : "首屏统计已接入统一平台摘要，可辅助校验行业方案、订单和线索是否形成同一条经营链路。"}
                </p>
                {techSnapshotState === "error" ? (
                  <button
                    type="button"
                    onClick={() => platformSnapshotQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                  >
                    重试同步
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                查看商城产品
              </Link>
              <Link
                href="/care"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                查看服务品牌
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.07)]">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">企业介绍模块</p>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">展示企业实力、资质背书与方案能力。</p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              环洗朵科技当前聚焦酒店、物业与商办空间的专业清洁剂与标准化应用方案，企业介绍卡片会和后台内容治理一起校验内容是否已切换为可维护源。
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">行业覆盖</p>
                <p className="mt-2 font-medium text-slate-950">酒店、物业、商办、连锁空间</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">合作模式</p>
                <p className="mt-2 font-medium text-slate-950">标准供货、年度协议、项目定制</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">方案内容源</p>
                <p className="mt-2 font-medium text-slate-950">{techSolutionsQuery.data?.source === "database" ? "后台已接管" : "默认内容回退中"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">案例内容源</p>
                <p className="mt-2 font-medium text-slate-950">{techCaseStudiesQuery.data?.source === "database" ? "后台已接管" : "默认内容回退中"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5 sm:col-span-2">
                <p className="text-sm text-slate-500">客户 Logo 墙内容源</p>
                <p className="mt-2 font-medium text-slate-950">{techClientLogosQuery.data?.source === "database" ? "后台已接管" : "默认内容回退中"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">行业解决方案</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">优先展示来自后台内容治理的数据；若暂无正式内容，则回退为默认方案说明。</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${techSolutionsQuery.data?.source === "database" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {techSolutionsQuery.data?.source === "database" ? "数据库内容" : "默认内容"}
              </span>
            </div>
            {techSolutionsQuery.isLoading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-500">
                正在同步行业解决方案内容。
              </div>
            ) : techSolutionsQuery.isError ? (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>行业解决方案读取失败，请稍后重试。</p>
                  <button
                    type="button"
                    onClick={() => techSolutionsQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                  >
                    重试读取
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {techSolutionItems.length > 0 ? (
                  techSolutionItems.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-medium text-slate-950">{item.title}</p>
                        {item.audience ? <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">适用对象：{item.audience}</span> : null}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.summary}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-500">
                    暂无可展示的行业解决方案，可在后台内容治理面板补充后同步到前台。
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">客户案例</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">后台保存后会优先展示数据库案例，并保留项目类型、地点与客户类型等说明字段。</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${techCaseStudiesQuery.data?.source === "database" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {techCaseStudiesQuery.data?.source === "database" ? "数据库内容" : "默认内容"}
              </span>
            </div>
            {techCaseStudiesQuery.isLoading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-500">
                正在同步客户案例内容。
              </div>
            ) : techCaseStudiesQuery.isError ? (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>客户案例读取失败，请稍后重试。</p>
                  <button
                    type="button"
                    onClick={() => techCaseStudiesQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                  >
                    重试读取
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {techCaseItems.length > 0 ? (
                  techCaseItems.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-slate-200 p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-medium text-slate-950">{item.title}</p>
                        {item.subtitle ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">{item.subtitle}</span> : null}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        {item.segment ? <span className="rounded-full bg-slate-100 px-3 py-1">项目类型：{item.segment}</span> : null}
                        {item.location ? <span className="rounded-full bg-slate-100 px-3 py-1">项目地点：{item.location}</span> : null}
                        {item.partnerName ? <span className="rounded-full bg-slate-100 px-3 py-1">合作对象：{item.partnerName}</span> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-500">
                    暂无可展示的客户案例，可在后台内容治理面板补充后同步到前台。
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">合作品牌背书</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">客户 Logo 墙同样接入后台内容治理，可用于展示重点客户、合作品牌与场景覆盖面。</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs ${techClientLogosQuery.data?.source === "database" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {techClientLogosQuery.data?.source === "database" ? "数据库内容" : "默认内容"}
            </span>
          </div>
          {techClientLogosQuery.isLoading ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-500">
              正在同步客户 Logo 墙内容。
            </div>
          ) : techClientLogosQuery.isError ? (
            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>客户 Logo 墙读取失败，请稍后重试。</p>
                <button
                  type="button"
                  onClick={() => techClientLogosQuery.refetch()}
                  className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                >
                  重试读取
                </button>
              </div>
            </div>
          ) : techClientLogoItems.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {techClientLogoItems.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div
                    className="inline-flex min-h-12 items-center rounded-2xl px-4 py-3 text-base font-semibold tracking-[0.24em]"
                    style={{
                      backgroundColor: item.accentColor ? `${item.accentColor}18` : "#e2e8f0",
                      color: item.accentColor || "#0f172a",
                    }}
                  >
                    {item.logoText}
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-950">{item.clientName}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.tagline || "已纳入重点客户与场景合作名单。"}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-500">
              暂无可展示的客户 Logo 墙内容，可在后台内容治理面板补充后同步到前台。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export function CarePage() {
  const platformSnapshotQuery = trpc.platform.snapshot.useQuery();
  const careContactQuery = trpc.site.contactConfig.useQuery({ siteKey: "care", contactScene: "consulting" });
  const careCaseStudiesQuery = trpc.site.caseStudies.useQuery({ siteKey: "care", limit: 3 });
  const [careInquiryForm, setCareInquiryForm] = useState({
    contactName: "",
    companyName: "",
    mobile: "",
    email: "",
    roomCount: "",
    laundryVolume: "",
    message: "",
  });
  const submitCareLeadMutation = trpc.site.submitLead.useMutation({
    onSuccess: async () => {
      setCareInquiryForm({
        contactName: "",
        companyName: "",
        mobile: "",
        email: "",
        roomCount: "",
        laundryVolume: "",
        message: "",
      });
      await Promise.all([
        platformSnapshotQuery.refetch(),
        careContactQuery.refetch(),
        careCaseStudiesQuery.refetch(),
      ]);
      sonnerToast("咨询需求已提交，运营团队将尽快联系您。");
    },
    onError: error => {
      sonnerToast(error.message || "提交失败，请稍后重试。");
    },
  });

  const platformSnapshot = platformSnapshotQuery.data as PlatformSnapshot | undefined;
  const careSnapshot = getSiteSnapshot(platformSnapshot, "care");
  const careSnapshotState = resolveSnapshotState(careSnapshot, platformSnapshotQuery.isLoading, platformSnapshotQuery.isError);
  const careContact = careContactQuery.data as
    | {
        source: "database" | "fallback";
        headline: string;
        description: string;
        primaryCtaLabel: string | null;
        primaryCtaHref: string | null;
        secondaryCtaLabel: string | null;
        secondaryCtaHref: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        contactWechat: string | null;
        contactAddress: string | null;
        serviceHours: string | null;
        responseSla: string | null;
      }
    | undefined;
  const careCaseStudies = (careCaseStudiesQuery.data?.items ?? []) as Array<{
    id: number;
    title: string;
    subtitle: string | null;
    summary: string;
    location: string | null;
    segment: string | null;
    partnerName: string | null;
  }>;
  const careContactCards = [
    { label: "联系电话", value: careContact?.contactPhone },
    { label: "联系邮箱", value: careContact?.contactEmail },
    { label: "微信咨询", value: careContact?.contactWechat },
    { label: "服务时段", value: careContact?.serviceHours },
    { label: "响应时效", value: careContact?.responseSla },
  ].filter(item => Boolean(item.value));

  const handleCareFieldChange = (field: keyof typeof careInquiryForm, value: string) => {
    setCareInquiryForm(current => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCareInquirySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!careInquiryForm.mobile.trim() && !careInquiryForm.email.trim()) {
      sonnerToast("请至少填写手机号或邮箱中的一项，方便后续联系。");
      return;
    }

    const normalizedRoomCount = careInquiryForm.roomCount.trim();
    const roomCountValue = normalizedRoomCount ? Number(normalizedRoomCount) : null;

    if (normalizedRoomCount && (!Number.isFinite(roomCountValue ?? Number.NaN) || (roomCountValue ?? 0) <= 0)) {
      sonnerToast("房量请填写为正整数。");
      return;
    }

    submitCareLeadMutation.mutate({
      siteKey: "care",
      sourcePage: "/care",
      contactName: careInquiryForm.contactName.trim(),
      companyName: careInquiryForm.companyName.trim() || undefined,
      mobile: careInquiryForm.mobile.trim() || undefined,
      email: careInquiryForm.email.trim() || undefined,
      roomCount: roomCountValue ?? undefined,
      laundryVolume: careInquiryForm.laundryVolume.trim() || undefined,
      message: careInquiryForm.message.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf2_0%,#fffdf9_45%,#ffffff_100%)] text-slate-900">
      <header className="border-b border-amber-100 bg-white/90 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-950">
            ← 返回统一平台
          </Link>
          <SiteNav />
        </div>
      </header>

      <main className="container py-16 md:py-20">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs uppercase tracking-[0.2em] text-amber-700">
              富朵朵 iCloush Care
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              为酒店奢护洗涤服务构建更高信任度的品牌官网体验。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              Care 站点已从占位型服务页升级为可承接真实咨询的品牌页面，合作酒店案例、联系方式与咨询提交入口均可直接对接后端数据闭环。
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { label: "服务商品", value: formatMetricValue(careSnapshot?.productCount, "个", careSnapshotState, "等待商品同步") },
                { label: "在途服务订单", value: formatMetricValue(careSnapshot?.pipelineOrderCount, "笔", careSnapshotState, "等待订单同步") },
                { label: "咨询线索", value: formatMetricValue(careSnapshot?.leadCount, "条", careSnapshotState, "等待线索同步") },
              ].map(item => (
                <div key={item.label} className="rounded-[1.75rem] border border-amber-200 bg-white/85 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-700/80">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.value}</p>
                </div>
              ))}
            </div>
            <div
              className={`mt-4 rounded-[1.75rem] border px-4 py-3 text-sm leading-7 ${
                careSnapshotState === "error"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : careSnapshotState === "ready"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white/90 text-slate-600"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {careSnapshotState === "loading"
                    ? "Care 站点摘要正在同步，服务型订单与咨询线索会在真实快照返回后更新。"
                    : careSnapshotState === "error"
                      ? "Care 摘要读取失败，当前仅保留服务结构与咨询路径，不再回退为静态统计。"
                      : careSnapshotState === "empty"
                        ? "Care 站点已纳入统一入口，但当前暂无可展示的服务型业务摘要。"
                        : "首屏新增统一平台摘要，可直接观察服务型订单和咨询线索是否开始沉淀。"}
                </p>
                {careSnapshotState === "error" ? (
                  <button
                    type="button"
                    onClick={() => platformSnapshotQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                  >
                    重试同步
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                查看相关产品
              </Link>
              <a
                href="#care-inquiry"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                发起在线咨询
              </a>
            </div>
          </div>
          <div className="rounded-[2rem] border border-amber-100 bg-white p-8 shadow-[0_24px_80px_rgba(146,64,14,0.08)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">服务介绍</p>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{careContact?.headline ?? "强调精细护理、服务标准与酒店场景适配能力。"}</p>
              </div>
              <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                {careContactQuery.isLoading ? "咨询配置同步中" : careContact?.source === "database" ? "已接入数据库配置" : "使用默认服务文案"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {careContact?.description ??
                "页面当前以酒店布草奢护、驻场服务配合与周期维护三类核心能力为主轴，直接说明服务对象、交付方式与项目推进节奏，便于采购与运营团队快速判断合作可行性。"}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-amber-50/60 p-5">
                <p className="text-sm text-slate-500">服务对象</p>
                <p className="mt-2 font-medium text-slate-950">高端酒店、服务式公寓、精品度假场景</p>
              </div>
              <div className="rounded-3xl bg-amber-50/60 p-5">
                <p className="text-sm text-slate-500">交付方式</p>
                <p className="mt-2 font-medium text-slate-950">项目制、驻场协作、周期维护</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {careContactCards.map(item => (
                <div key={item.label} className="rounded-3xl border border-amber-100 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
            {careContact?.contactAddress ? (
              <div className="mt-6 rounded-3xl border border-amber-100 bg-amber-50/40 px-5 py-4 text-sm leading-7 text-slate-600">
                服务联络地址：{careContact.contactAddress}
              </div>
            ) : null}
            {careContactQuery.isError ? (
              <div className="mt-4 flex items-center justify-between rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p>咨询配置读取失败，当前仍保留默认内容。</p>
                <button
                  type="button"
                  onClick={() => careContactQuery.refetch()}
                  className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/60"
                >
                  重试读取
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-amber-100 bg-white p-8 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">服务流程</p>
            <div className="mt-6 space-y-4">
              {careProcess.map((item, index) => (
                <div key={item} className="rounded-3xl border border-amber-100 bg-amber-50/40 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Phase {index + 1}</p>
                  <p className="mt-2 font-medium text-slate-950">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-amber-100 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">合作酒店展示</p>
              <span className="text-xs text-slate-500">{careCaseStudiesQuery.isLoading ? "案例同步中" : `${careCaseStudies.length} 条案例`}</span>
            </div>
            <div className="mt-6 space-y-4">
              {careCaseStudies.map(item => (
                <div key={item.id} className="rounded-3xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {item.partnerName ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.partnerName}</span> : null}
                    {item.location ? <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{item.location}</span> : null}
                    {item.segment ? <span className="rounded-full bg-slate-100 px-3 py-1">{item.segment}</span> : null}
                  </div>
                  <p className="mt-3 font-medium text-slate-950">{item.title}</p>
                  {item.subtitle ? <p className="mt-2 text-sm text-slate-500">{item.subtitle}</p> : null}
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.summary}</p>
                </div>
              ))}
              {!careCaseStudiesQuery.isLoading && careCaseStudies.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 px-5 py-6 text-sm leading-7 text-slate-500">
                  当前暂无可展示的合作案例，后续可在后台补充项目案例后同步到此处。
                </div>
              ) : null}
            </div>
            {careCaseStudiesQuery.isError ? (
              <div className="mt-4 flex items-center justify-between rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p>合作酒店案例读取失败，请稍后重试。</p>
                <button
                  type="button"
                  onClick={() => careCaseStudiesQuery.refetch()}
                  className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/60"
                >
                  重试读取
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section id="care-inquiry" className="mt-16 rounded-[2rem] border border-amber-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">在线咨询入口</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {careContact?.primaryCtaLabel ?? "让酒店合作沟通、护理咨询与项目排期都能快速落点。"}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                提交后将自动写入统一线索库，并同步通知运营负责人，便于继续推进试点沟通、排期确认与项目跟进。
              </p>
            </div>
            <a
              href={careContact?.secondaryCtaHref ?? "/account"}
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {careContact?.secondaryCtaLabel ?? "前往客户中心查看跟进"}
            </a>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={handleCareInquirySubmit} className="space-y-4 rounded-[2rem] border border-amber-100 bg-amber-50/30 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">联系人姓名</span>
                  <input
                    required
                    value={careInquiryForm.contactName}
                    onChange={event => handleCareFieldChange("contactName", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-amber-100 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    placeholder="请输入联系人姓名"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">酒店 / 公司名称</span>
                  <input
                    value={careInquiryForm.companyName}
                    onChange={event => handleCareFieldChange("companyName", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-amber-100 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    placeholder="例如：某精品度假酒店"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">联系电话</span>
                  <input
                    value={careInquiryForm.mobile}
                    onChange={event => handleCareFieldChange("mobile", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-amber-100 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    placeholder="手机号 / 座机"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">邮箱地址</span>
                  <input
                    type="email"
                    value={careInquiryForm.email}
                    onChange={event => handleCareFieldChange("email", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-amber-100 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    placeholder="用于接收方案与回访"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">房量</span>
                  <input
                    value={careInquiryForm.roomCount}
                    onChange={event => handleCareFieldChange("roomCount", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-amber-100 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    placeholder="例如：180"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">预计洗涤量</span>
                  <input
                    value={careInquiryForm.laundryVolume}
                    onChange={event => handleCareFieldChange("laundryVolume", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-amber-100 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    placeholder="例如：每周 3 吨布草"
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">合作需求说明</span>
                <textarea
                  rows={5}
                  value={careInquiryForm.message}
                  onChange={event => handleCareFieldChange("message", event.target.value)}
                  className="w-full rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  placeholder="请描述酒店类型、布草现状、期望的护理标准或试点安排。"
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-7 text-slate-500">提交后系统会自动记录来源页面，并将咨询同步到后台线索与运营通知。</p>
                <button
                  type="submit"
                  disabled={submitCareLeadMutation.isPending}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitCareLeadMutation.isPending ? "提交中..." : "提交咨询需求"}
                </button>
              </div>
            </form>
            <div className="space-y-4">
              <div className="rounded-[2rem] border border-amber-100 bg-amber-50/40 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">咨询承接说明</p>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      title: "酒店合作咨询",
                      detail: "面向采购、客房与洗衣房团队，沟通现有布草情况、交付频次与试点范围。",
                    },
                    {
                      title: "护理方案沟通",
                      detail: "梳理酒店定位、布草等级、护理标准与项目目标，形成前置服务建议。",
                    },
                    {
                      title: "排期与交付确认",
                      detail: "提交后可继续在客户中心推进驻场排期、验收节点与长期维护安排。",
                    },
                  ].map(item => (
                    <div key={item.title} className="rounded-3xl border border-amber-100 bg-white px-5 py-4">
                      <p className="font-medium text-slate-950">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">人工联系渠道</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  {careContactCards.map(item => (
                    <div key={item.label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                      <span className="text-slate-500">{item.label}</span>
                      <span className="text-right font-medium text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function AccountPage() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const brandsQuery = trpc.brands.list.useQuery();
  const availableBrands = (brandsQuery.data ?? []) as BrandOption[];
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [enterpriseApplicationForm, setEnterpriseApplicationForm] = useState<EnterpriseApplicationFormState>(
    emptyEnterpriseApplicationForm(),
  );
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!selectedBrandId && availableBrands.length > 0) {
      setSelectedBrandId(availableBrands[0].id);
    }
  }, [availableBrands, selectedBrandId]);

  const activeBrandId = selectedBrandId ?? availableBrands[0]?.id ?? null;
  const selectedBrand = useMemo(
    () => availableBrands.find(brand => brand.id === activeBrandId) ?? null,
    [activeBrandId, availableBrands],
  );

  const myEnterpriseApplicationsQuery = trpc.site.myEnterpriseApplications.useQuery(
    activeBrandId ? { brandId: activeBrandId } : {},
    {
      enabled: isAuthenticated && Boolean(activeBrandId),
    },
  );

  useEffect(() => {
    const userName = user?.name?.trim();

    if (userName) {
      setEnterpriseApplicationForm(current =>
        current.contactName
          ? current
          : {
              ...current,
              contactName: userName,
            },
      );
    }
  }, [user?.name]);

  const submitEnterpriseApplicationMutation = trpc.site.submitEnterpriseApplication.useMutation({
    onSuccess: async receipt => {
      await Promise.all([
        utils.site.myEnterpriseApplications.invalidate(),
        utils.admin.operations.invalidate(),
      ]);
      setEnterpriseApplicationForm(current => ({
        ...emptyEnterpriseApplicationForm(),
        contactName: current.contactName,
        mobile: current.mobile,
        email: current.email,
      }));
      sonnerToast(
        receipt.membershipStatus === "approved" || receipt.membershipStatus === "active"
          ? "企业入驻申请已接收并通过当前品牌准入校验，可继续推进采购协同。"
          : "企业入驻申请已提交，后台客户管理队列会同步出现待审核记录。",
      );
    },
    onError: error => {
      sonnerToast(error.message || "企业入驻申请提交失败，请稍后重试。");
    },
  });

  const myOrdersQuery = trpc.orders.myList.useQuery(
    {
      brandId: activeBrandId ?? 1,
      limit: 5,
    },
    {
      enabled: isAuthenticated && Boolean(activeBrandId),
    },
  );

  const myOrderRecords = (myOrdersQuery.data?.records ?? []) as OrderSummaryRecord[];
  const featuredOrderNo = myOrderRecords[0]?.orderNo;
  const orderDetailQuery = trpc.orders.detail.useQuery(
    {
      brandId: activeBrandId ?? 1,
      orderNo: featuredOrderNo ?? "",
    },
    {
      enabled: isAuthenticated && Boolean(activeBrandId && featuredOrderNo),
    },
  );

  const pendingSettlementCount = myOrderRecords.filter(
    order => order.paymentStatus === "unpaid" || order.paymentStatus === "offline_review",
  ).length;
  const inFulfillmentCount = myOrderRecords.filter(
    order => order.status === "paid" || order.status === "processing" || order.fulfillmentStatus === "shipped",
  ).length;
  const deliveredCount = myOrderRecords.filter(
    order => order.fulfillmentStatus === "delivered" || order.status === "completed",
  ).length;

  const currentTodos = useMemo(() => {
    if (!isAuthenticated) {
      return ["待补开票资料", "待上传付款凭证", "待确认发货与签收"];
    }

    const todos: string[] = [];

    if (myOrderRecords.some(order => order.paymentStatus === "unpaid" || order.paymentStatus === "offline_review")) {
      todos.push("待上传付款凭证或等待财务审核");
    }

    if (myOrderRecords.some(order => order.status === "paid" || order.status === "processing")) {
      todos.push("待确认发货排期与履约窗口");
    }

    if (myOrderRecords.some(order => order.fulfillmentStatus === "shipped" || order.fulfillmentStatus === "delivered")) {
      todos.push("待确认签收并反馈售后结果");
    }

    return todos.length > 0 ? todos : ["当前品牌暂无待办，可继续采购或查看历史订单"];
  }, [isAuthenticated, myOrderRecords]);

  const enterpriseApplicationRecords = (myEnterpriseApplicationsQuery.data ?? []) as EnterpriseApplicationSummaryRecord[];
  const latestEnterpriseApplication = enterpriseApplicationRecords[0] ?? null;
  const pendingEnterpriseApplicationCount = enterpriseApplicationRecords.filter(record => record.status === "pending").length;

  const accountSummaryCards = [
    {
      label: "我的订单",
      value: isAuthenticated ? String(myOrderRecords.length) : "--",
      detail: isAuthenticated ? "基于当前品牌与账号查询最近订单" : "登录后可查看真实订单数量",
    },
    {
      label: "待结算 / 待审核",
      value: isAuthenticated ? String(pendingSettlementCount) : "--",
      detail: isAuthenticated ? "包含待付款与线下回单待审核订单" : "登录后展示真实结算待办",
    },
    {
      label: "履约进行中",
      value: isAuthenticated ? String(inFulfillmentCount) : "--",
      detail: isAuthenticated ? "已付款或已进入发货履约排期的订单" : "登录后展示真实履约阶段",
    },
    {
      label: "已完成 / 已签收",
      value: isAuthenticated ? String(deliveredCount) : "--",
      detail: isAuthenticated ? "用于回访复购与售后跟踪" : "登录后展示历史完成订单",
    },
  ];

  const featuredOrderSummary = orderDetailQuery.data?.summary;
  const featuredActionMessage = !isAuthenticated
    ? "请先登录以查看真实订单、审核结论与履约状态。"
    : !featuredOrderSummary
      ? "当前品牌下暂无可展示的订单摘要，可继续采购创建订单。"
      : featuredOrderSummary.paymentStatus === "offline_review"
        ? "该订单已进入线下付款审核阶段，客户中心与后台会同步显示审核进度。"
        : featuredOrderSummary.paymentStatus === "unpaid"
          ? "该订单尚未完成付款，可上传回单或切换支付方式后继续推进。"
          : featuredOrderSummary.fulfillmentStatus === "shipped"
            ? "该订单已发货，请在收货后及时确认并反馈履约结果。"
            : featuredOrderSummary.fulfillmentStatus === "delivered"
              ? "该订单已进入签收完成阶段，可继续发起复购或售后协同。"
              : "该订单已进入履约流程，建议继续关注排期、发货与签收节点。";

  const handleEnterpriseApplicationSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/account");
      return;
    }

    if (!activeBrandId) {
      sonnerToast("请先选择需要申请入驻的品牌，再提交企业资料。");
      return;
    }

    if (!enterpriseApplicationForm.enterpriseName.trim() || !enterpriseApplicationForm.contactName.trim()) {
      sonnerToast("请至少填写企业名称与联系人姓名后再提交申请。");
      return;
    }

    if (!enterpriseApplicationForm.mobile.trim() && !enterpriseApplicationForm.email.trim()) {
      sonnerToast("请至少填写手机号或邮箱中的一项，方便后台审核后回访。");
      return;
    }

    submitEnterpriseApplicationMutation.mutate({
      brandId: activeBrandId,
      sourcePage: "/account",
      enterpriseName: enterpriseApplicationForm.enterpriseName.trim(),
      contactName: enterpriseApplicationForm.contactName.trim(),
      mobile: enterpriseApplicationForm.mobile.trim() || undefined,
      email: enterpriseApplicationForm.email.trim() || undefined,
      message: enterpriseApplicationForm.message.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex h-16 items-center justify-between text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-950">
            ← 返回统一平台
          </Link>
          <SiteNav />
        </div>
      </header>

      <main className="container py-16 md:py-20">
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">B2B Customer Center</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">客户账户与采购协同入口</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              当前页面已切换为真实订单查询驱动，可按品牌查看我的订单、付款审核状态与最近一笔订单的履约摘要；企业资料与地址簿仍保留为下一步补充项。
            </p>
            <div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">账户状态</p>
                  <p className="mt-2">{loading ? "正在检查登录状态" : isAuthenticated ? "已登录" : "未登录"}</p>
                </div>
                <label className="text-sm text-slate-500">
                  当前品牌
                  <select
                    className="mt-2 block rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                    value={activeBrandId ?? ""}
                    onChange={event => setSelectedBrandId(Number(event.target.value))}
                  >
                    {availableBrands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">当前用户</p>
              <p className="mt-2 text-sm font-medium text-slate-950">{user?.name || "访客演示模式"}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">当前品牌视图</p>
              <p className="mt-2 text-sm font-medium text-slate-950">{selectedBrand?.name || "等待品牌数据"}</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {accountSummaryCards.map((card) => (
                <div key={card.label} className="rounded-3xl border border-slate-200 p-5">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{card.value}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4">
              {customerActionCards.map((card) => (
                <div key={card.title} className="rounded-3xl bg-slate-50 p-5">
                  <p className="font-medium text-slate-950">{card.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{card.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {!isAuthenticated ? (
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
                  onClick={() => {
                    window.location.href = getLoginUrl("/account");
                  }}
                >
                  登录账户
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
                  onClick={logout}
                >
                  退出登录
                </button>
              )}
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                继续采购
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">订单跟踪</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">订单与结算待办</h2>
              </div>
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
              >
                跳转后台订单入口
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {!isAuthenticated ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm leading-7 text-slate-600">
                  登录后可查看当前账号在所选品牌下的真实订单记录、支付审核状态与履约进度。
                </div>
              ) : myOrdersQuery.isLoading ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm leading-7 text-slate-600">
                  正在拉取该品牌下的订单记录与结算状态。
                </div>
              ) : myOrdersQuery.error ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm leading-7 text-rose-700">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p>{myOrdersQuery.error.message}</p>
                    <button
                      type="button"
                      onClick={() => myOrdersQuery.refetch()}
                      className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                    >
                      重试同步
                    </button>
                  </div>
                </div>
              ) : (myOrdersQuery.data?.records.length ?? 0) === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm leading-7 text-slate-600">
                  当前品牌下还没有可展示的订单，可继续采购创建新订单。
                </div>
              ) : (
                myOrderRecords.map((order) => (
                  <div key={order.orderNo} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">订单编号</p>
                        <p className="mt-1 font-medium text-slate-950">{order.orderNo}</p>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                        {getOrderStatusLabel(order.status)} / {getPaymentStatusLabel(order.paymentStatus)}
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{summarizeOrderItems(order)}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm text-slate-500">订单金额</p>
                        <p className="mt-1 font-medium text-slate-950">{formatCurrencyFen(order.payableAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">归属品牌</p>
                        <p className="mt-1 font-medium text-slate-950">{selectedBrand?.name || "待确认"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">履约状态</p>
                        <p className="mt-1 font-medium text-slate-950">{getFulfillmentStatusLabel(order.fulfillmentStatus)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">回单审核</p>
                        <p className="mt-1 font-medium text-slate-950">{getReviewStatusLabel(order.latestReceipt?.reviewStatus)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">当前待办</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {currentTodos.map((item) => (
                  <div key={item} className="rounded-3xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">最近一笔订单摘要</p>
                    <p className="mt-2 font-medium text-slate-950">{featuredOrderSummary?.orderNo ?? "等待真实订单"}</p>
                  </div>
                  <Link
                    href="/admin/orders"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    在后台查看审核闭环
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {featuredOrderSummary
                    ? `支付状态：${getPaymentStatusLabel(featuredOrderSummary.paymentStatus)}；履约状态：${getFulfillmentStatusLabel(featuredOrderSummary.fulfillmentStatus)}；回单审核：${getReviewStatusLabel(featuredOrderSummary.latestReceipt?.reviewStatus)}。`
                    : "当前品牌暂无订单摘要，客户中心会在创建订单后同步展示最新状态。"}
                </p>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-900">下一步建议：{featuredActionMessage}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Enterprise onboarding</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">企业入驻申请</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              客户中心现已支持直接提交企业入驻申请。提交后会同时写入客户档案与线索闭环，后台客户管理页会同步进入待审核队列。
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleEnterpriseApplicationSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">企业名称</span>
                  <input
                    value={enterpriseApplicationForm.enterpriseName}
                    onChange={event => setEnterpriseApplicationForm(current => ({ ...current, enterpriseName: event.target.value }))}
                    placeholder="例如：上海某酒店管理集团"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">联系人姓名</span>
                  <input
                    value={enterpriseApplicationForm.contactName}
                    onChange={event => setEnterpriseApplicationForm(current => ({ ...current, contactName: event.target.value }))}
                    placeholder="例如：王经理"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">手机号</span>
                  <input
                    value={enterpriseApplicationForm.mobile}
                    onChange={event => setEnterpriseApplicationForm(current => ({ ...current, mobile: event.target.value }))}
                    placeholder="例如：13800000000"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">邮箱</span>
                  <input
                    value={enterpriseApplicationForm.email}
                    onChange={event => setEnterpriseApplicationForm(current => ({ ...current, email: event.target.value }))}
                    placeholder="例如：procurement@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>
              <label className="block space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">合作说明</span>
                <textarea
                  rows={5}
                  value={enterpriseApplicationForm.message}
                  onChange={event => setEnterpriseApplicationForm(current => ({ ...current, message: event.target.value }))}
                  placeholder="可补充采购场景、合作品牌、预算区间、落地时间与所需支持。"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
              <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                你当前提交的是 <span className="font-medium text-slate-950">{selectedBrand?.name || "待选择品牌"}</span> 的企业入驻申请；审核通过后，客户档案状态与线索优先级会一并更新。
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitEnterpriseApplicationMutation.isPending}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitEnterpriseApplicationMutation.isPending ? "提交中..." : "提交企业入驻申请"}
                </button>
                {!isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = getLoginUrl("/account");
                    }}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                  >
                    登录后提交
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Application status</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">我的企业入驻状态</h2>
              </div>
              <span className={`rounded-full px-4 py-2 text-sm ${pendingEnterpriseApplicationCount > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                {pendingEnterpriseApplicationCount > 0 ? `${pendingEnterpriseApplicationCount} 条待审核` : "无待审核申请"}
              </span>
            </div>
            {!isAuthenticated ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-6 text-sm leading-7 text-slate-600">
                登录后即可查看当前品牌下的企业入驻审核进度、最近一次申请状态与历史提交记录。
              </div>
            ) : myEnterpriseApplicationsQuery.isLoading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-6 text-sm leading-7 text-slate-600">
                正在同步你的企业入驻申请状态。
              </div>
            ) : myEnterpriseApplicationsQuery.error ? (
              <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm leading-7 text-rose-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>{myEnterpriseApplicationsQuery.error.message}</p>
                  <button
                    type="button"
                    onClick={() => myEnterpriseApplicationsQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                  >
                    重试同步
                  </button>
                </div>
              </div>
            ) : enterpriseApplicationRecords.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-6 text-sm leading-7 text-slate-600">
                当前品牌下还没有企业入驻申请记录。你可以直接在左侧提交企业资料，后台会自动进入审核闭环。
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">最近申请状态</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      {getEnterpriseApplicationStatusLabel(latestEnterpriseApplication?.status)}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {latestEnterpriseApplication?.updatedAt
                        ? `最近更新时间：${formatDateLabel(latestEnterpriseApplication.updatedAt)}`
                        : "等待后台同步处理时间。"}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">当前品牌申请记录</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{enterpriseApplicationRecords.length}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      审核通过后，你的企业身份会在客户中心与后台客户管理中同时可见。
                    </p>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {enterpriseApplicationRecords.slice(0, 4).map((record) => (
                    <div key={`${record.brandId}-${record.createdAt ?? record.updatedAt ?? record.enterpriseName ?? record.contactName}`} className="rounded-3xl border border-slate-200 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-slate-950">{record.enterpriseName ?? record.contactName ?? "企业入驻申请"}</p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            品牌：{record.brandName}；联系人：{record.contactName ?? "待补联系人"}；类型：{record.memberType}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${getEnterpriseApplicationStatusClassName(record.status)}`}>
                          {getEnterpriseApplicationStatusLabel(record.status)}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">提交时间 {formatDateLabel(record.createdAt)}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">最近更新 {formatDateLabel(record.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export function AdminContent() {
  const [location, setLocation] = useLocation();
  const isOverviewSection = location === "/admin";
  const isOrdersSection = location.startsWith("/admin/orders");
  const isProductsSection = location.startsWith("/admin/products");
  const isCustomersSection = location.startsWith("/admin/customers");
  const isContentSection = location.startsWith("/admin/content");
  const isSeoSection = location.startsWith("/admin/seo");

  const section = isOrdersSection
    ? "订单处理"
    : isCustomersSection
      ? "客户管理"
      : isContentSection
        ? "内容发布"
        : isSeoSection
          ? "SEO 配置"
          : isProductsSection
            ? "产品管理"
            : "后台总览";

  const sectionMeta = isOrdersSection
    ? {
        kicker: "交易履约中台",
        title: "订单处理",
        description: "围绕真实订单列表、审核队列与审核动作展开运营协同，确保 B2B 线下回单、财务审核与履约状态持续闭环。",
      }
    : isProductsSection
      ? {
          kicker: "商品与价格中台",
          title: "产品管理",
          description: "统一规划专业清洗剂、日化消费品与服务型产品的商品资料、阶梯定价、上架节奏与跨品牌目录结构。",
        }
      : isCustomersSection
        ? {
            kicker: "客户经营中台",
            title: "客户管理",
            description: "面向 B2B 客户账户、采购主体、品牌归属与运营分层，承接企业入驻申请、审核动作与后续客户中心联动所需的后台闭环。",
          }
        : isContentSection
          ? {
              kicker: "内容与站点中台",
              title: "内容发布",
              description: "为商城系统与三个品牌官网建立统一内容编排入口，支撑品牌叙事、产品转化与咨询线索的协同发布。",
            }
          : isSeoSection
            ? {
                kicker: "增长基础设施",
                title: "SEO 配置",
                description: "围绕商城与三个官网的元信息、结构化内容、站点地图与投放落地页建立统一治理面板。",
              }
            : {
                kicker: "iCloush Console",
                title: "后台总览",
                description: "当前后台已从单一订单页升级为统一运营控制台，可串联商城、官网、客户与增长模块，为后续 Sprint 接入真实数据预留清晰入口。",
              };

  const brandsQuery = trpc.brands.list.useQuery();
  const availableBrands = (brandsQuery.data ?? []) as BrandOption[];
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!selectedBrandId && availableBrands.length > 0) {
      setSelectedBrandId(availableBrands[0].id);
    }
  }, [availableBrands, selectedBrandId]);

  const activeBrandId = selectedBrandId ?? availableBrands[0]?.id ?? null;
  const selectedBrand = useMemo(
    () => availableBrands.find((brand) => brand.id === activeBrandId) ?? null,
    [activeBrandId, availableBrands],
  );

  const shouldLoadOrderInsights = (isOverviewSection || isOrdersSection) && Boolean(activeBrandId);
  const shouldLoadAdminOperations = Boolean(activeBrandId);

  const adminOperationsQuery = trpc.admin.operations.useQuery(
    activeBrandId ? { brandId: activeBrandId } : {},
    {
      enabled: shouldLoadAdminOperations,
    },
  );

  const adminOperations = adminOperationsQuery.data as AdminOperationsSnapshot | undefined;
  const productSnapshot = adminOperations?.products;
  const customerSnapshot = adminOperations?.customers;
  const contentSnapshot = adminOperations?.content;
  const seoSnapshot = adminOperations?.seo;
  const labContactConfigQuery = trpc.site.contactConfig.useQuery(
    { siteKey: "lab", contactScene: "business" },
    { enabled: isContentSection },
  );
  const techSolutionModulesQuery = trpc.site.solutionModules.useQuery(
    { siteKey: "tech", limit: 6 },
    { enabled: isContentSection },
  );
  const techCaseStudiesQuery = trpc.site.caseStudies.useQuery(
    { siteKey: "tech", limit: 6 },
    { enabled: isContentSection },
  );
  const techClientLogosQuery = trpc.site.clientLogos.useQuery(
    { siteKey: "tech", limit: 8 },
    { enabled: isContentSection },
  );
  const [labContactDraft, setLabContactDraft] = useState<LabContactDraft>({
    headline: "",
    description: "",
    primaryCtaLabel: "",
    primaryCtaHref: "",
    secondaryCtaLabel: "",
    secondaryCtaHref: "",
    contactEmail: "",
    contactPhone: "",
    contactWechat: "",
    contactAddress: "",
    serviceHours: "",
    responseSla: "",
  });
  const [techSolutionDrafts, setTechSolutionDrafts] = useState<TechSolutionDraft[]>([createEmptyTechSolutionDraft()]);
  const [techCaseDrafts, setTechCaseDrafts] = useState<TechCaseStudyDraft[]>([createEmptyTechCaseStudyDraft()]);
  const [techClientLogoDrafts, setTechClientLogoDrafts] = useState<TechClientLogoDraft[]>([createEmptyTechClientLogoDraft()]);
  const [enterpriseReviewNotes, setEnterpriseReviewNotes] = useState<Record<number, string>>({});

  const pendingEnterpriseApplications = useMemo(
    () => (customerSnapshot?.customers ?? []).filter(customer => customer.status === "pending"),
    [customerSnapshot],
  );

  const reviewEnterpriseApplicationMutation = trpc.admin.reviewEnterpriseApplication.useMutation({
    onSuccess: async (_, variables) => {
      await syncEnterpriseApplicationReviewAfterSave([
        utils.admin.operations.invalidate,
        utils.site.myEnterpriseApplications.invalidate,
      ]);
      setEnterpriseReviewNotes(current => ({
        ...current,
        [variables.membershipId]: "",
      }));
      sonnerToast(
        variables.approved
          ? "企业入驻申请已审核通过，客户档案与线索状态已完成刷新。"
          : "企业入驻申请已驳回，客户管理与线索闭环状态已完成刷新。",
      );
    },
    onError: error => {
      sonnerToast(error.message || "企业入驻审核失败，请稍后重试。");
    },
  });

  useEffect(() => {
    const nextContact = labContactConfigQuery.data;

    if (!nextContact) {
      return;
    }

    setLabContactDraft({
      headline: nextContact.headline ?? "",
      description: nextContact.description ?? "",
      primaryCtaLabel: nextContact.primaryCtaLabel ?? "",
      primaryCtaHref: nextContact.primaryCtaHref ?? "",
      secondaryCtaLabel: nextContact.secondaryCtaLabel ?? "",
      secondaryCtaHref: nextContact.secondaryCtaHref ?? "",
      contactEmail: nextContact.contactEmail ?? "",
      contactPhone: nextContact.contactPhone ?? "",
      contactWechat: nextContact.contactWechat ?? "",
      contactAddress: nextContact.contactAddress ?? "",
      serviceHours: nextContact.serviceHours ?? "",
      responseSla: nextContact.responseSla ?? "",
    });
  }, [labContactConfigQuery.data]);

  useEffect(() => {
    setTechSolutionDrafts(mapTechSolutionDrafts(techSolutionModulesQuery.data?.items));
  }, [techSolutionModulesQuery.data]);

  useEffect(() => {
    setTechCaseDrafts(mapTechCaseStudyDrafts(techCaseStudiesQuery.data?.items));
  }, [techCaseStudiesQuery.data]);

  useEffect(() => {
    setTechClientLogoDrafts(mapTechClientLogoDrafts(techClientLogosQuery.data?.items));
  }, [techClientLogosQuery.data]);

  const updateLabContactConfigMutation = trpc.site.updateContactConfig.useMutation({
    onSuccess: async () => {
      await syncLabContactConfigAfterSave([labContactConfigQuery.refetch, adminOperationsQuery.refetch]);
      sonnerToast(getLabContactUpdateSuccessMessage());
    },
    onError: error => {
      sonnerToast(getLabContactUpdateErrorMessage(error));
    },
  });

  const updateTechSolutionModulesMutation = trpc.site.updateSolutionModules.useMutation({
    onSuccess: async () => {
      await syncLabContactConfigAfterSave([techSolutionModulesQuery.refetch, adminOperationsQuery.refetch]);
      sonnerToast(getTechContentUpdateSuccessMessage("solution"));
    },
    onError: error => {
      sonnerToast(getTechContentUpdateErrorMessage(error, "solution"));
    },
  });

  const updateTechCaseStudiesMutation = trpc.site.updateCaseStudies.useMutation({
    onSuccess: async () => {
      await syncLabContactConfigAfterSave([techCaseStudiesQuery.refetch, adminOperationsQuery.refetch]);
      sonnerToast(getTechContentUpdateSuccessMessage("case"));
    },
    onError: error => {
      sonnerToast(getTechContentUpdateErrorMessage(error, "case"));
    },
  });

  const updateTechClientLogosMutation = trpc.site.updateClientLogos.useMutation({
    onSuccess: async () => {
      await syncLabContactConfigAfterSave([techClientLogosQuery.refetch, adminOperationsQuery.refetch]);
      sonnerToast(getTechContentUpdateSuccessMessage("logo"));
    },
    onError: error => {
      sonnerToast(getTechContentUpdateErrorMessage(error, "logo"));
    },
  });

  const adminOrdersQuery = trpc.orders.list.useQuery(
    {
      brandId: activeBrandId ?? 1,
      limit: 6,
    },
    {
      enabled: shouldLoadOrderInsights,
    },
  );

  const reviewQueueQuery = trpc.orders.reviewQueue.useQuery(
    {
      brandId: activeBrandId ?? 1,
      limit: 6,
    },
    {
      enabled: shouldLoadOrderInsights,
    },
  );

  const [lastReviewMessage, setLastReviewMessage] = useState<string | null>(null);

  const reviewPaymentMutation = trpc.orders.reviewPayment.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.orders.list.invalidate(), utils.orders.reviewQueue.invalidate()]);
      sonnerToast("审核结果已回写，订单与审核队列已刷新。");
    },
  });

  const orderRecords = (adminOrdersQuery.data?.records ?? []) as OrderSummaryRecord[];
  const reviewRecords = reviewQueueQuery.data?.records ?? [];
  const pendingReviewCount = reviewRecords.filter((record) => record.reviewStatus === "pending").length;
  const activeFulfillmentCount = orderRecords.filter((order) => ["paid", "processing", "shipped", "completed"].includes(order.status)).length;
  const customerVisibleIssues = orderRecords.filter(
    (order) => order.paymentStatus === "offline_review" || order.paymentStatus === "unpaid",
  ).length;
  const completedOrderCount = orderRecords.filter(
    (order) => order.fulfillmentStatus === "delivered" || order.status === "completed",
  ).length;
  const overviewFocusItems = [
    productSnapshot?.alerts[0],
    customerSnapshot?.alerts[0],
    contentSnapshot?.alerts[0],
    seoSnapshot?.alerts[0],
  ].filter((item): item is string => Boolean(item));

  const statCards = [
    {
      label: "商品主数据",
      value: String(productSnapshot?.totals.productCount ?? 0),
      hint: productSnapshot
        ? `已同步 ${productSnapshot.totals.activeCount} 个在售条目与 ${productSnapshot.totals.categoryCount} 个分类。`
        : "商品总览正在同步。",
      icon: Package,
    },
    {
      label: "客户与线索",
      value: String((customerSnapshot?.totals.membershipCount ?? 0) + (customerSnapshot?.totals.leadCount ?? 0)),
      hint: customerSnapshot
        ? `客户档案 ${customerSnapshot.totals.membershipCount} 条，线索 ${customerSnapshot.totals.leadCount} 条。`
        : "客户与线索总览正在同步。",
      icon: Users,
    },
    {
      label: "内容 / SEO 就绪",
      value: `${contentSnapshot?.totals.storyReadyCount ?? 0}/${contentSnapshot?.totals.siteCount ?? siteEntries.length}`,
      hint: seoSnapshot
        ? `已有 ${seoSnapshot.totals.productMetaReadyCount} 个商品具备 SEO 元信息。`
        : "站点内容与 SEO 就绪度正在同步。",
      icon: BadgePercent,
    },
    {
      label: "当前品牌",
      value: adminOperations?.scope.brandName ?? selectedBrand?.shortName ?? selectedBrand?.name ?? "待同步",
      hint: adminOperations?.scope.isGlobal
        ? "当前为全局运营视图。"
        : selectedBrand
          ? `多租户视图已切换至 ${selectedBrand.name}。`
          : "品牌主数据读取中。",
      icon: Building2,
    },
  ];

  const moduleCards = [
    {
      title: "产品管理",
      path: "/admin/products",
      status: productSnapshot ? "真实数据" : "同步中",
      description: productSnapshot
        ? `覆盖 ${productSnapshot.totals.productCount} 个商品、${productSnapshot.totals.categoryCount} 个分类与 ${productSnapshot.totals.seoReadyCount} 个已补齐元信息条目。`
        : "围绕商品资料、分类结构、阶梯定价与上架节奏搭建统一产品工作台。",
      icon: Package,
    },
    {
      title: "订单处理",
      path: "/admin/orders",
      status: "真实数据",
      description: "订单列表、审核队列与审核动作已切换为真实查询，适合作为运营闭环主入口。",
      icon: WalletCards,
    },
    {
      title: "客户管理",
      path: "/admin/customers",
      status: customerSnapshot ? "真实数据" : "同步中",
      description: customerSnapshot
        ? `覆盖 ${customerSnapshot.totals.membershipCount} 条客户档案与 ${customerSnapshot.totals.qualifiedLeadCount} 条高意向线索。`
        : "聚焦 B2B 账户、采购主体、跟进动作与客户中心权限的统一管理。",
      icon: Users,
    },
    {
      title: "内容发布",
      path: "/admin/content",
      status: contentSnapshot ? "真实数据" : "同步中",
      description: contentSnapshot
        ? `当前已纳管 ${contentSnapshot.totals.siteCount} 个站点，${contentSnapshot.totals.storyReadyCount} 个站点已具备品牌叙事基础。`
        : "为商城与官网提供选题、页面位、栏目层级与品牌素材的一体化入口。",
      icon: BookOpenText,
    },
    {
      title: "SEO 配置",
      path: "/admin/seo",
      status: seoSnapshot ? "真实数据" : "同步中",
      description: seoSnapshot
        ? `当前仍有 ${seoSnapshot.totals.missingMetaCount} 项元信息待补齐，可直接进入治理面板排查。`
        : "统一管理标题、描述、结构化信息、站点地图与推广落地页基线。",
      icon: BadgePercent,
    },
  ];

  const productWorkstreams = [
    {
      title: "商品主数据",
      detail: "沉淀 SKU、规格、适用场景、MOQ 与交付周期，形成前台商城与官网的一致商品语言。",
      tag: "PIM 骨架",
    },
    {
      title: "分层定价",
      detail: "对接已实现的 B2B 阶梯定价逻辑，预留协议价、渠道价与项目报价的后台维护入口。",
      tag: "Pricing",
    },
    {
      title: "上架协同",
      detail: "区分商城销售品、官网展示品与服务型方案品，避免多品牌前台信息混淆。",
      tag: "Launch",
    },
  ];

  const customerWorkstreams = [
    {
      title: "企业档案",
      detail: "维护公司名称、采购主体、开票与联系人信息，为对公转账审核和后续客户中心打基础。",
      action: "创建客户档案模板",
    },
    {
      title: "品牌归属",
      detail: "将客户与 LAB、环洗朵科技、iCloush Care 的业务线绑定，便于线索流转与复购分析。",
      action: "梳理品牌归属规则",
    },
    {
      title: "跟进动作",
      detail: "记录样品寄送、报价、合同推进、履约回访等动作，为销售运营留出统一记录入口。",
      action: "定义跟进字段",
    },
  ];

  const contentWorkstreams = [
    {
      title: "商城内容位",
      detail: "管理首页 banner、品类导购、案例位与促销说明，强化选品效率与转化。",
      path: "/shop",
    },
    {
      title: "品牌官网",
      detail: "围绕品牌故事、技术背书、行业方案、服务流程与联系入口建立站点内容矩阵。",
      path: "/lab",
    },
    {
      title: "运营素材池",
      detail: "沉淀品牌图、卖点文案、下载资料与案例素材，减少多站点重复维护。",
      path: "/tech",
    },
  ];

  const seoWorkstreams = [
    {
      title: "站点元信息",
      detail: "为商城与三个官网补齐标题模板、描述模板与社交分享信息。",
    },
    {
      title: "结构化内容",
      detail: "为产品页、品牌页与服务页预留 FAQ、产品说明、组织信息等结构化字段。",
    },
    {
      title: "索引治理",
      detail: "规划 sitemap、robots 与专题页层级，避免多品牌内容互相稀释。",
    },
  ];

  const fulfillmentMetrics = [
    {
      title: fulfillmentStages[0].title,
      detail: fulfillmentStages[0].detail,
      count: orderRecords.filter((order) => order.status === "pending_payment" || order.paymentStatus === "offline_review").length,
    },
    {
      title: fulfillmentStages[1].title,
      detail: fulfillmentStages[1].detail,
      count: pendingReviewCount,
    },
    {
      title: fulfillmentStages[2].title,
      detail: fulfillmentStages[2].detail,
      count: activeFulfillmentCount,
    },
  ];

  const operationalHints = isProductsSection
    ? [
        "优先把专业化学品、酒店奢护服务与消费型日化商品拆分为清晰目录，减少前台混淆。",
        "阶梯定价已在后端具备基础逻辑，下一步应补齐后台配置入口与价格回显。",
        "服务型商品与标准品需采用不同的上架与询价策略。",
      ]
    : isCustomersSection
      ? [
          "客户档案应优先覆盖采购主体、联系人、所属品牌与合作阶段四类字段。",
          "对公转账审核、报价单与回访记录后续应统一归入客户时间线。",
          "建议先完成 B2B 客户最小资料集，再扩展会员与积分等消费品牌字段。",
        ]
      : isContentSection
        ? [
            "商城与官网内容需要共享素材池，但保留各品牌独立语气与叙事框架。",
            "LAB 更偏研发背书，环洗朵科技偏方案与案例，Care 偏高端服务信任感。",
            "内容运营面板后续可衔接 SEO、线索收集与站内推荐位。",
          ]
        : isSeoSection
          ? [
              "应优先建立多站点标题与描述模板，保证品牌词和行业词不相互冲突。",
              "产品页与服务页适合后续补充结构化数据与 FAQ 模块。",
              "商城搜索页、分类页与专题页需要明确索引策略。",
            ]
          : [
              pendingReviewCount > 0
                ? "当前仍有对公转账回单待审核，需优先核对付款主体、金额与回单图片。"
                : "当前没有待审核回单，可优先跟进履约与客户回访。",
              activeFulfillmentCount > 0
                ? "已付款订单需同步发货排期或服务执行窗口，避免客户中心状态滞后。"
                : "当新增已付款订单后，应同步推进入库、拣货或项目排期。",
              "发货后需回写物流或服务进度，确保客户中心与后台状态一致。",
            ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{sectionMeta.kicker}</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{sectionMeta.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              {sectionMeta.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {moduleCards.map((module) => (
                <button
                  key={module.path}
                  type="button"
                  onClick={() => setLocation(module.path)}
                  className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition ${location === module.path || (module.path === "/admin/orders" && isOrdersSection) || (module.path === "/admin/products" && isProductsSection) || (module.path === "/admin/customers" && isCustomersSection) || (module.path === "/admin/content" && isContentSection) || (module.path === "/admin/seo" && isSeoSection)
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950"
                  }`}
                >
                  {module.title}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50/70 p-8 xl:border-l xl:border-t-0">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">多租户上下文</p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                {selectedBrand?.name ?? "正在同步品牌清单"}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                后台当前通过统一控制台管理商城与三个品牌门户；产品、订单、客户、内容与 SEO 面板均已切换到同一品牌上下文的真实运营快照。
              </p>
              <label className="mt-5 block text-sm text-slate-500">
                当前品牌
                <select
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  value={activeBrandId ?? ""}
                  onChange={(event) => setSelectedBrandId(Number(event.target.value))}
                >
                  {availableBrands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-5 flex flex-wrap gap-2">
                {siteEntries.map((entry) => (
                  <span key={entry.title} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {entry.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {moduleCards.map((module) => (
          <div key={module.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
                <module.icon className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-600">{module.status}</span>
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{module.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{module.description}</p>
            <button
              type="button"
              onClick={() => setLocation(module.path)}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              进入模块
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>

      {isOverviewSection ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">站点矩阵</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">商城与官网统一运营入口</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">多品牌前台，多租户后台</div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {siteEntries.map((entry) => (
                <div key={entry.title} className="rounded-3xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${entry.tone} text-white`}>
                      <entry.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">{entry.title}</p>
                      <p className="text-sm text-slate-500">{entry.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Sprint 1 焦点</p>
              <div className="mt-5 space-y-3">
                {(overviewFocusItems.length > 0
                  ? overviewFocusItems
                  : [
                      "后台四个核心模块正在同步真实运营快照。",
                      "订单、产品、客户、内容与 SEO 已围绕同一品牌上下文联动。",
                      "当前仍可按品牌切换查看不同站点的经营状态。",
                    ]
                ).map((item) => (
                  <div key={item} className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">建议下一步</p>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setLocation("/admin/products")}
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-200 px-5 py-4 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  继续补齐商品管理主数据与价格配置入口
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLocation("/admin/customers")}
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-200 px-5 py-4 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  规划客户中心与后台客户档案的字段映射
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLocation("/admin/content")}
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-200 px-5 py-4 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  梳理三个官网与商城的内容编排矩阵
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isProductsSection ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">商品治理工位</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">真实商品、分类与内容就绪度</h2>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm ${adminOperationsQuery.isError ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                {adminOperationsQuery.isError ? "快照回退中" : adminOperations?.scope.isGlobal ? "全局品牌视图" : adminOperations?.scope.brandName ?? "品牌视图"}
              </div>
            </div>
            {adminOperationsQuery.isLoading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
                正在同步真实商品与分类摘要。
              </div>
            ) : adminOperationsQuery.isError || !productSnapshot ? (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>商品运营快照暂时不可用，稍后重试即可恢复品牌级商品治理视图。</p>
                  <button
                    type="button"
                    onClick={() => adminOperationsQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                  >
                    重试同步
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  {[
                    { label: "商品总量", value: `${productSnapshot.totals.productCount} 个` },
                    { label: "在售商品", value: `${productSnapshot.totals.activeCount} 个` },
                    { label: "草稿商品", value: `${productSnapshot.totals.draftCount} 个` },
                    { label: "内容就绪", value: `${productSnapshot.totals.contentReadyCount} 个` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-3xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 space-y-4">
                  {productSnapshot.products.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
                      当前品牌下暂无商品，建议先在数据库中补充最小商品主数据。
                    </div>
                  ) : (
                    productSnapshot.products.slice(0, 6).map((product) => (
                      <div key={product.id} className="rounded-3xl border border-slate-200 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-medium text-slate-950">{product.name}</p>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{product.brandName}</span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{product.categoryName}</span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-slate-600">{product.subtitle ?? "当前条目尚未补充副标题，适合在内容模块中继续完善转化文案。"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white">{product.productType}</span>
                            <span className={`rounded-full px-3 py-1 text-xs ${product.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {product.status === "active" ? "在售中" : "草稿中"}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs ${product.seoReady ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"}`}>
                              {product.seoReady ? "SEO 已就绪" : "SEO 待补齐"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className={`rounded-full px-3 py-1 ${product.contentReady ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {product.contentReady ? "内容已就绪" : "内容待补齐"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">最近更新 {formatDateLabel(product.updatedAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">品牌商品分布</p>
              <div className="mt-5 space-y-4">
                {(productSnapshot?.brandViews.length ? productSnapshot.brandViews : []).map((item) => (
                  <div key={item.brandId} className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{item.brandName}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">{item.productCount} 个商品</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      在售 {item.activeCount} 个，分类 {item.categoryCount} 个，SEO 就绪 {item.seoReadyCount} 个。
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.productTypeMix.map((mix) => (
                        <span key={mix} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">{mix}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">治理提醒</p>
              <div className="mt-5 space-y-3">
                {(productSnapshot?.alerts.length ? productSnapshot.alerts : productWorkstreams.map((item) => item.detail)).map((item) => (
                  <div key={item} className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isCustomersSection ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">客户经营总览</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">真实客户档案与线索状态</h2>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm ${adminOperationsQuery.isError ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                {adminOperationsQuery.isError ? "快照回退中" : `${customerSnapshot?.totals.qualifiedLeadCount ?? 0} 条高意向线索`}
              </div>
            </div>
            {adminOperationsQuery.isLoading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
                正在同步客户档案与线索列表。
              </div>
            ) : adminOperationsQuery.isError || !customerSnapshot ? (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>客户运营快照暂时不可用，稍后重试即可恢复客户与线索视图。</p>
                  <button
                    type="button"
                    onClick={() => adminOperationsQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                  >
                    重试同步
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  {[
                    { label: "客户档案", value: `${customerSnapshot.totals.membershipCount} 条` },
                    { label: "活跃账户", value: `${customerSnapshot.totals.activeMembershipCount} 条` },
                    { label: "企业主体", value: `${customerSnapshot.totals.enterpriseAccountCount} 个` },
                    { label: "待跟进线索", value: `${customerSnapshot.totals.leadCount - customerSnapshot.totals.qualifiedLeadCount} 条` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-3xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">企业入驻审核</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">待处理企业入驻申请</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        当前品牌 {selectedBrand?.name || "待确认品牌"} 下的企业入驻申请会同步影响客户档案状态与线索意向等级，建议优先处理待审核记录。
                      </p>
                    </div>
                    <div className={`rounded-full px-4 py-2 text-sm ${pendingEnterpriseApplications.length > 0 ? "bg-amber-100 text-amber-800" : "bg-white text-slate-700"}`}>
                      {pendingEnterpriseApplications.length > 0 ? `${pendingEnterpriseApplications.length} 条待审核` : "暂无待审核申请"}
                    </div>
                  </div>
                  {pendingEnterpriseApplications.length === 0 ? (
                    <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
                      当前品牌暂无待审核企业入驻申请，可继续维护客户档案、线索分层与销售跟进动作。
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {pendingEnterpriseApplications.slice(0, 5).map((customer) => {
                        const reviewNote = enterpriseReviewNotes[customer.membershipId] ?? "";

                        return (
                          <div key={customer.membershipId} className="rounded-3xl border border-slate-200 bg-white p-5">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-slate-950">{customer.enterpriseName ?? customer.displayName}</p>
                                  <span className={`rounded-full px-3 py-1 text-xs ${getEnterpriseApplicationStatusClassName(customer.status)}`}>
                                    {getEnterpriseApplicationStatusLabel(customer.status)}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{customer.brandName}</span>
                                </div>
                                <p className="mt-3 text-sm leading-7 text-slate-600">
                                  联系人：{customer.contactName ?? "待补联系人"}；账号：{customer.displayName}；身份：{customer.memberType}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                  {customer.email ? <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">邮箱 {customer.email}</span> : null}
                                  {customer.mobile ? <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">电话 {customer.mobile}</span> : null}
                                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                                    价格等级 {customer.priceLevel === "tier_pending_assignment" ? "待配置阶梯价" : customer.priceLevel ?? "未配置"}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">最近登录 {formatDateLabel(customer.lastSignedIn)}</span>
                                </div>
                              </div>
                            </div>
                            <label className="mt-4 block space-y-2 text-sm text-slate-600">
                              <span className="font-medium text-slate-900">审核说明</span>
                              <textarea
                                rows={3}
                                value={reviewNote}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  setEnterpriseReviewNotes(current => ({
                                    ...current,
                                    [customer.membershipId]: nextValue,
                                  }));
                                }}
                                placeholder="例如：已确认采购主体与合作范围，可进入企业客户档案。"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-slate-400"
                              />
                            </label>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                disabled={reviewEnterpriseApplicationMutation.isPending}
                                onClick={() => {
                                  reviewEnterpriseApplicationMutation.mutate({
                                    brandId: customer.brandId,
                                    membershipId: customer.membershipId,
                                    approved: true,
                                    reviewNote: reviewNote.trim() || undefined,
                                  });
                                }}
                                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                              >
                                审核通过
                              </button>
                              <button
                                type="button"
                                disabled={reviewEnterpriseApplicationMutation.isPending}
                                onClick={() => {
                                  reviewEnterpriseApplicationMutation.mutate({
                                    brandId: customer.brandId,
                                    membershipId: customer.membershipId,
                                    approved: false,
                                    reviewNote: reviewNote.trim() || undefined,
                                  });
                                }}
                                className="inline-flex h-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                驳回并回写说明
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  <div className="space-y-4">
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">客户档案</p>
                    {customerSnapshot.customers.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
                        当前品牌下暂无客户档案记录。
                      </div>
                    ) : (
                      customerSnapshot.customers.slice(0, 5).map((customer) => (
                        <div key={customer.membershipId} className="rounded-3xl border border-slate-200 p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-950">{customer.displayName}</p>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{customer.brandName}</span>
                            <span className={`rounded-full px-3 py-1 text-xs ${getEnterpriseApplicationStatusClassName(customer.status)}`}>
                              {getEnterpriseApplicationStatusLabel(customer.status)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-slate-600">{customer.enterpriseName ?? customer.contactName ?? "当前仅同步到基础用户身份，可继续补充采购主体与联系人。"}</p>
                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{customer.memberType}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{customer.accountType}</span>
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                              价格等级 {customer.priceLevel === "tier_pending_assignment" ? "待配置阶梯价" : customer.priceLevel ?? "未配置"}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">最近登录 {formatDateLabel(customer.lastSignedIn)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">最新线索</p>
                    {customerSnapshot.leads.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
                        当前品牌下暂无线索记录。
                      </div>
                    ) : (
                      customerSnapshot.leads.slice(0, 5).map((lead) => (
                        <div key={lead.id} className="rounded-3xl border border-slate-200 p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-950">{lead.contactName}</p>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{lead.brandName}</span>
                            <span className={`rounded-full px-3 py-1 text-xs ${lead.leadStatus === "qualified" || lead.leadStatus === "closed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {lead.leadStatus}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-slate-600">{lead.companyName ?? lead.sourcePage ?? `${lead.sourceSite} 来源线索`}</p>
                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">来源 {lead.sourceSite}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">创建于 {formatDateLabel(lead.createdAt)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">品牌客户分布</p>
              <div className="mt-5 space-y-4">
                {(customerSnapshot?.brandViews.length ? customerSnapshot.brandViews : []).map((item) => (
                  <div key={item.brandId} className="rounded-3xl bg-slate-50 p-5">
                    <p className="font-medium text-slate-950">{item.brandName}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      档案 {item.membershipCount} 条，活跃 {item.activeMembershipCount} 条，企业账户 {item.enterpriseAccountCount} 个，线索 {item.leadCount} 条。
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">客户经营提醒</p>
              <div className="mt-5 space-y-3">
                {(customerSnapshot?.alerts.length ? customerSnapshot.alerts : customerWorkstreams.map((item) => item.detail)).map((item) => (
                  <div key={item} className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isContentSection ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">内容编排矩阵</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">商城与多品牌站点内容治理</h2>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm ${adminOperationsQuery.isError ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                {adminOperationsQuery.isError ? "快照回退中" : `${contentSnapshot?.totals.storyReadyCount ?? 0} 个站点已具备品牌叙事`}
              </div>
            </div>
            {adminOperationsQuery.isLoading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
                正在同步站点内容治理视图。
              </div>
            ) : adminOperationsQuery.isError || !contentSnapshot ? (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>内容运营快照暂时不可用，稍后重试即可恢复站点级内容治理面板。</p>
                  <button
                    type="button"
                    onClick={() => adminOperationsQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                  >
                    重试同步
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {contentSnapshot.siteEntries.map((entry) => (
                  <div key={entry.siteKey} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{entry.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.brandName}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${entry.storyReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {entry.statusLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">域名 {entry.domain ?? "待配置"}，已沉淀 {entry.leadCount} 条线索，可直接回看站点内容承接效果。</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(entry.featuredNames.length > 0 ? entry.featuredNames : ["待补充代表性商品或专题"]).map((item) => (
                        <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">内容工作队列</p>
              <div className="mt-5 space-y-4">
                {((contentSnapshot?.queue.length ? contentSnapshot.queue : contentWorkstreams.map((item) => ({ title: item.title, channel: item.path ?? "后台", reason: item.detail, priority: "medium" as const })))).map((item) => (
                  <div key={item.title} className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{item.title}</p>
                      <span className={`rounded-full px-3 py-1 text-xs ${item.priority === "high" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`}>
                        {item.priority === "high" ? "高优先级" : "中优先级"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.reason}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">渠道：{item.channel}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">LAB 联系配置</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  当前维护的是 LAB 站点商务联系场景，保存后会同步更新官网联系卡片、CTA 与响应承诺文案。
                </div>
                {labContactConfigQuery.isLoading ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-4 text-sm leading-7 text-slate-500">
                    正在载入 LAB 联系配置。
                  </div>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitLabContactConfigUpdate(updateLabContactConfigMutation.mutate, labContactDraft);
                    }}
                  >
                    <div className="grid gap-4">
                      {[
                        { key: "headline", label: "主标题", placeholder: "例如：为合作、研发共创与技术交流提供可执行的咨询路径" },
                        { key: "primaryCtaLabel", label: "主 CTA 文案", placeholder: "例如：联系客户经理" },
                        { key: "primaryCtaHref", label: "主 CTA 跳转", placeholder: "例如：/account" },
                        { key: "secondaryCtaLabel", label: "次 CTA 文案", placeholder: "例如：查看产品采购入口" },
                        { key: "secondaryCtaHref", label: "次 CTA 跳转", placeholder: "例如：/shop" },
                        { key: "contactEmail", label: "联系邮箱", placeholder: "例如：lab@icloush.com" },
                        { key: "contactPhone", label: "联系电话", placeholder: "例如：400-800-2026" },
                        { key: "contactWechat", label: "微信沟通", placeholder: "例如：iCloushLAB" },
                        { key: "contactAddress", label: "联系地址", placeholder: "例如：上海市闵行区研发协同中心 3F" },
                        { key: "serviceHours", label: "服务时段", placeholder: "例如：周一至周五 09:00-18:00" },
                        { key: "responseSla", label: "响应承诺", placeholder: "例如：1 个工作日内答复" },
                      ].map((field) => (
                        <label key={field.key} className="grid gap-2 text-sm text-slate-600">
                          <span className="font-medium text-slate-900">{field.label}</span>
                          <input
                            value={labContactDraft[field.key as keyof typeof labContactDraft]}
                            onChange={(event) =>
                              setLabContactDraft((current) => ({
                                ...current,
                                [field.key]: event.target.value,
                              }))
                            }
                            placeholder={field.placeholder}
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                          />
                        </label>
                      ))}
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-900">说明文案</span>
                        <textarea
                          value={labContactDraft.description}
                          onChange={(event) =>
                            setLabContactDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          rows={4}
                          placeholder="说明 LAB 站点将承接哪些合作、打样或技术沟通需求。"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-slate-400"
                        />
                      </label>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs leading-6 text-slate-500">
                        {labContactConfigQuery.isError ? "当前读取的是缓存或默认配置，建议保存前先重试读取。" : "保存后 LAB 前台联系卡片会使用最新配置。"}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const current = labContactConfigQuery.data;
                            if (!current) {
                              return;
                            }
                            setLabContactDraft({
                              headline: current.headline ?? "",
                              description: current.description ?? "",
                              primaryCtaLabel: current.primaryCtaLabel ?? "",
                              primaryCtaHref: current.primaryCtaHref ?? "",
                              secondaryCtaLabel: current.secondaryCtaLabel ?? "",
                              secondaryCtaHref: current.secondaryCtaHref ?? "",
                              contactEmail: current.contactEmail ?? "",
                              contactPhone: current.contactPhone ?? "",
                              contactWechat: current.contactWechat ?? "",
                              contactAddress: current.contactAddress ?? "",
                              serviceHours: current.serviceHours ?? "",
                              responseSla: current.responseSla ?? "",
                            });
                          }}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                        >
                          重置为当前配置
                        </button>
                        <button
                          type="submit"
                          disabled={updateLabContactConfigMutation.isPending}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {updateLabContactConfigMutation.isPending ? "保存中..." : "保存 LAB 联系配置"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                {labContactConfigQuery.isError ? (
                  <div className="flex items-center justify-between rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p>LAB 联系配置读取失败，当前仍可编辑并重新保存。</p>
                    <button
                      type="button"
                      onClick={() => labContactConfigQuery.refetch()}
                      className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/60"
                    >
                      重试读取
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">环洗朵科技行业解决方案</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  当前维护的是环洗朵科技官网的行业解决方案模块，保存后前台会优先展示后台内容；若数据库为空，则自动回退默认内容。
                </div>
                {techSolutionModulesQuery.isLoading ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-4 text-sm leading-7 text-slate-500">
                    正在载入环洗朵科技行业解决方案。
                  </div>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitTechSolutionModulesUpdate(updateTechSolutionModulesMutation.mutate, techSolutionDrafts);
                    }}
                  >
                    <div className="space-y-4">
                      {techSolutionDrafts.map((draft, index) => (
                        <div key={`tech-solution-${index}`} className="rounded-3xl border border-slate-200 p-4">
                          <div className="grid gap-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">方案标题</span>
                                <input
                                  value={draft.title}
                                  onChange={(event) =>
                                    setTechSolutionDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, title: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：酒店布草与客房织物清洁方案"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">适用对象</span>
                                <input
                                  value={draft.audience}
                                  onChange={(event) =>
                                    setTechSolutionDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, audience: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：酒店后勤、外包洗涤团队"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">排序</span>
                                <input
                                  value={draft.sortOrder}
                                  onChange={(event) =>
                                    setTechSolutionDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, sortOrder: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="1"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">方案说明</span>
                                <textarea
                                  value={draft.summary}
                                  onChange={(event) =>
                                    setTechSolutionDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, summary: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  rows={4}
                                  placeholder="说明方案覆盖场景、导入方式、执行重点与交付口径。"
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs leading-6 text-slate-500">
                        {techSolutionModulesQuery.isError ? "当前读取的是默认或缓存内容，建议先重试读取后再保存。" : `当前内容源：${techSolutionModulesQuery.data?.source === "database" ? "数据库" : "默认内容"}`}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setTechSolutionDrafts((current) => [...current, createEmptyTechSolutionDraft()])}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                        >
                          新增方案卡片
                        </button>
                        <button
                          type="button"
                          onClick={() => setTechSolutionDrafts(mapTechSolutionDrafts(techSolutionModulesQuery.data?.items))}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                        >
                          重置为当前内容
                        </button>
                        <button
                          type="submit"
                          disabled={updateTechSolutionModulesMutation.isPending}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {updateTechSolutionModulesMutation.isPending ? "保存中..." : "保存行业解决方案"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                {techSolutionModulesQuery.isError ? (
                  <div className="flex items-center justify-between rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p>环洗朵科技行业解决方案读取失败，当前仍可编辑并重新保存。</p>
                    <button
                      type="button"
                      onClick={() => techSolutionModulesQuery.refetch()}
                      className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/60"
                    >
                      重试读取
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">环洗朵科技客户案例</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  当前维护的是环洗朵科技官网客户案例模块，支持项目标题、案例摘要、项目类型、地点与合作对象等真实字段。
                </div>
                {techCaseStudiesQuery.isLoading ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-4 text-sm leading-7 text-slate-500">
                    正在载入环洗朵科技客户案例。
                  </div>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitTechCaseStudiesUpdate(updateTechCaseStudiesMutation.mutate, techCaseDrafts);
                    }}
                  >
                    <div className="space-y-4">
                      {techCaseDrafts.map((draft, index) => (
                        <div key={`tech-case-${index}`} className="rounded-3xl border border-slate-200 p-4">
                          <div className="grid gap-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">案例标题</span>
                                <input
                                  value={draft.title}
                                  onChange={(event) =>
                                    setTechCaseDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, title: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：高星级酒店布草体系升级"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">副标题</span>
                                <input
                                  value={draft.subtitle}
                                  onChange={(event) =>
                                    setTechCaseDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, subtitle: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：客房织物洗护升级项目"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">项目类型</span>
                                <input
                                  value={draft.segment}
                                  onChange={(event) =>
                                    setTechCaseDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, segment: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：酒店 / 物业"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">项目地点</span>
                                <input
                                  value={draft.location}
                                  onChange={(event) =>
                                    setTechCaseDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, location: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：上海 / 华东"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">合作对象</span>
                                <input
                                  value={draft.partnerName}
                                  onChange={(event) =>
                                    setTechCaseDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, partnerName: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：高端酒店集团"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">排序</span>
                                <input
                                  value={draft.sortOrder}
                                  onChange={(event) =>
                                    setTechCaseDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, sortOrder: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="1"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">案例摘要</span>
                                <textarea
                                  value={draft.summary}
                                  onChange={(event) =>
                                    setTechCaseDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, summary: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  rows={4}
                                  placeholder="说明客户痛点、方案动作、执行成效与协作方式。"
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs leading-6 text-slate-500">
                        {techCaseStudiesQuery.isError ? "当前读取的是默认或缓存内容，建议先重试读取后再保存。" : `当前内容源：${techCaseStudiesQuery.data?.source === "database" ? "数据库" : "默认内容"}`}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setTechCaseDrafts((current) => [...current, createEmptyTechCaseStudyDraft()])}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                        >
                          新增案例卡片
                        </button>
                        <button
                          type="button"
                          onClick={() => setTechCaseDrafts(mapTechCaseStudyDrafts(techCaseStudiesQuery.data?.items))}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                        >
                          重置为当前内容
                        </button>
                        <button
                          type="submit"
                          disabled={updateTechCaseStudiesMutation.isPending}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {updateTechCaseStudiesMutation.isPending ? "保存中..." : "保存客户案例"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                {techCaseStudiesQuery.isError ? (
                  <div className="flex items-center justify-between rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p>环洗朵科技客户案例读取失败，当前仍可编辑并重新保存。</p>
                    <button
                      type="button"
                      onClick={() => techCaseStudiesQuery.refetch()}
                      className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/60"
                    >
                      重试读取
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">环洗朵科技客户 Logo 墙</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  当前维护的是环洗朵科技官网合作品牌背书模块，支持客户名称、Logo 文案、标签语、品牌色与排序等字段。
                </div>
                {techClientLogosQuery.isLoading ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-4 text-sm leading-7 text-slate-500">
                    正在载入环洗朵科技客户 Logo 墙。
                  </div>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitTechClientLogosUpdate(updateTechClientLogosMutation.mutate, techClientLogoDrafts);
                    }}
                  >
                    <div className="space-y-4">
                      {techClientLogoDrafts.map((draft, index) => (
                        <div key={`tech-logo-${index}`} className="rounded-3xl border border-slate-200 p-4">
                          <div className="grid gap-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">客户名称</span>
                                <input
                                  value={draft.clientName}
                                  onChange={(event) =>
                                    setTechClientLogoDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, clientName: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：洲际酒店集团"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">Logo 文案</span>
                                <input
                                  value={draft.logoText}
                                  onChange={(event) =>
                                    setTechClientLogoDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, logoText: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：IHG"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm uppercase tracking-[0.24em] text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">标签语</span>
                                <input
                                  value={draft.tagline}
                                  onChange={(event) =>
                                    setTechClientLogoDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, tagline: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="例如：酒店与高端布草场景合作"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">品牌色</span>
                                <input
                                  value={draft.accentColor}
                                  onChange={(event) =>
                                    setTechClientLogoDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, accentColor: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="#0f766e"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                              <label className="grid gap-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">排序</span>
                                <input
                                  value={draft.sortOrder}
                                  onChange={(event) =>
                                    setTechClientLogoDrafts((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index ? { ...item, sortOrder: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  placeholder="1"
                                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-500">
                                前台会优先展示已填写客户名称与 Logo 文案的条目；品牌色用于渲染品牌背书卡片的视觉强调。
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs leading-6 text-slate-500">
                        {techClientLogosQuery.isError ? "当前读取的是默认或缓存内容，建议先重试读取后再保存。" : `当前内容源：${techClientLogosQuery.data?.source === "database" ? "数据库" : "默认内容"}`}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setTechClientLogoDrafts((current) => [...current, createEmptyTechClientLogoDraft()])}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                        >
                          新增 Logo 卡片
                        </button>
                        <button
                          type="button"
                          onClick={() => setTechClientLogoDrafts(mapTechClientLogoDrafts(techClientLogosQuery.data?.items))}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                        >
                          重置为当前内容
                        </button>
                        <button
                          type="submit"
                          disabled={updateTechClientLogosMutation.isPending}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {updateTechClientLogosMutation.isPending ? "保存中..." : "保存客户 Logo 墙"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                {techClientLogosQuery.isError ? (
                  <div className="flex items-center justify-between rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p>环洗朵科技客户 Logo 墙读取失败，当前仍可编辑并重新保存。</p>
                    <button
                      type="button"
                      onClick={() => techClientLogosQuery.refetch()}
                      className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/60"
                    >
                      重试读取
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">内容治理提醒</p>
              <div className="mt-5 space-y-3">
                {(contentSnapshot?.alerts.length ? contentSnapshot.alerts : contentWorkstreams.map((item) => item.detail)).map((item) => (
                  <div key={item} className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isSeoSection ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">SEO 治理清单</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">站点元信息与商品元字段覆盖率</h2>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm ${adminOperationsQuery.isError ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                {adminOperationsQuery.isError ? "快照回退中" : `${seoSnapshot?.totals.missingMetaCount ?? 0} 项待补齐`}
              </div>
            </div>
            {adminOperationsQuery.isLoading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
                正在同步 SEO 运营快照。
              </div>
            ) : adminOperationsQuery.isError || !seoSnapshot ? (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>SEO 运营快照暂时不可用，稍后重试即可恢复站点治理面板。</p>
                  <button
                    type="button"
                    onClick={() => adminOperationsQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-medium transition hover:bg-white/70"
                  >
                    重试同步
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {seoSnapshot.siteEntries.map((entry) => (
                  <div key={entry.siteKey} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{entry.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.brandName}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${entry.siteMetaReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {entry.statusLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">域名 {entry.domain ?? "待配置"}，已激活商品 {entry.activeProductCount} 个，其中 {entry.seoReadyProductCount} 个已补齐 SEO 字段。</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">优化机会</p>
              <div className="mt-5 space-y-4">
                {((seoSnapshot?.opportunities.length ? seoSnapshot.opportunities : seoWorkstreams.map((item) => ({ title: item.title, impact: item.detail, action: "补齐站点基线", severity: "medium" as const })))).map((item) => (
                  <div key={item.title} className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{item.title}</p>
                      <span className={`rounded-full px-3 py-1 text-xs ${item.severity === "high" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`}>
                        {item.severity === "high" ? "高影响" : "中影响"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.impact}</p>
                    <p className="mt-3 text-sm font-medium text-slate-900">建议动作：{item.action}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">SEO 治理提醒</p>
              <div className="mt-5 space-y-3">
                {(seoSnapshot?.alerts.length ? seoSnapshot.alerts : seoWorkstreams.map((item) => item.detail)).map((item) => (
                  <div key={item} className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isOrdersSection ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">审核队列</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">待审核与待履约订单</h2>
              </div>
              <div className="rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-700">聚焦高优先级异常单</div>
            </div>
            <div className="mt-6 space-y-4">
              {lastReviewMessage ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-700">
                  {lastReviewMessage}
                </div>
              ) : null}
              {reviewQueueQuery.isLoading ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
                  正在同步真实审核队列。
                </div>
              ) : reviewQueueQuery.error ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
                  {reviewQueueQuery.error.message}
                </div>
              ) : reviewRecords.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
                  当前品牌暂无待审核回单，可切换品牌或继续跟进履约。
                </div>
              ) : (
                reviewRecords.map((record) => (
                  <div key={record.receipt.id} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">订单编号</p>
                        <p className="mt-1 font-medium text-slate-950">{record.order.orderNo}</p>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                        {getReviewStatusLabel(record.reviewStatus)}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-slate-500">品牌</p>
                        <p className="mt-1 font-medium text-slate-950">{selectedBrand?.name || "待确认"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">金额</p>
                        <p className="mt-1 font-medium text-slate-950">{formatCurrencyFen(record.order.payableAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">运营动作</p>
                        <p className="mt-1 font-medium text-slate-950">
                          {record.reviewStatus === "pending"
                            ? "核验回单、付款主体与订单金额"
                            : record.reviewStatus === "approved"
                              ? "通知履约开始排期"
                              : "联系客户补交回单或修正付款信息"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{summarizeOrderItems(record.order as OrderSummaryRecord)}</p>
                    {record.reviewStatus === "pending" ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={reviewPaymentMutation.isPending || !activeBrandId}
                          className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
                          onClick={() => {
                            if (!activeBrandId) return;
                            reviewPaymentMutation.mutate(
                              {
                                brandId: activeBrandId,
                                orderId: record.order.id,
                                paymentId: record.payment?.id,
                                receiptId: record.receipt.id,
                                approved: true,
                                reviewNote: "后台审核通过",
                              },
                              {
                                onSuccess: () => {
                                  setLastReviewMessage(`${record.order.orderNo} 已审核通过，客户中心将同步显示为已完成付款审核并进入履约排期。`);
                                },
                              },
                            );
                          }}
                        >
                          审核通过
                        </button>
                        <button
                          type="button"
                          disabled={reviewPaymentMutation.isPending || !activeBrandId}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          onClick={() => {
                            if (!activeBrandId) return;
                            reviewPaymentMutation.mutate(
                              {
                                brandId: activeBrandId,
                                orderId: record.order.id,
                                paymentId: record.payment?.id,
                                receiptId: record.receipt.id,
                                approved: false,
                                reviewNote: "需补充付款主体或回单信息",
                              },
                              {
                                onSuccess: () => {
                                  setLastReviewMessage(`${record.order.orderNo} 已退回补资料，客户中心会继续提示客户补充付款主体或回单信息。`);
                                },
                              },
                            );
                          }}
                        >
                          驳回并补资料
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">客户中心联动</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">客户侧将看到的最新状态</h2>
                </div>
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                >
                  切换到客户中心
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                当前品牌 {selectedBrand?.name || "待确认品牌"} 下，客户中心将同步展示 {customerVisibleIssues} 条待结算 / 待审核提示、
                {activeFulfillmentCount} 条履约进行中订单，以及 {completedOrderCount} 条已完成或已签收订单。
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">客户待办</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{customerVisibleIssues}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">包括待付款与待审核回单，适合客服主动提醒。</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">履约进行中</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{activeFulfillmentCount}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">已付款或进入履约排期的订单，需要同步排产与发货进度。</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">已完成闭环</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{completedOrderCount}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">可转入复购、售后回访或品牌运营动作。</p>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">履约阶段</p>
              <div className="mt-6 space-y-4">
                {fulfillmentMetrics.map((stage, index) => (
                  <div key={stage.title} className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Stage {index + 1}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{stage.count} 单</span>
                    </div>
                    <p className="mt-2 font-medium text-slate-950">{stage.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{stage.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">近期订单</p>
              <div className="mt-4 space-y-3">
                {adminOrdersQuery.isLoading ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-4 text-sm leading-7 text-slate-600">正在同步订单列表。</div>
                ) : orderRecords.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-4 text-sm leading-7 text-slate-600">当前品牌暂无订单记录。</div>
                ) : (
                  orderRecords.map((order) => (
                    <div key={order.id} className="rounded-3xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-950">{order.orderNo}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">{order.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{summarizeOrderItems(order)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">运营提醒</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">当前模块的执行重点</h2>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">统一中台，多品牌前台</div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {operationalHints.map((item) => (
            <div key={item} className="rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              <CircleCheckBig className="h-5 w-5 text-slate-900" />
              <p className="mt-4">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminRoute() {
  return (
    <DashboardLayout>
      <AdminContent />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={PlatformHome} />
      <Route path="/shop" component={() => <ShopPage />} />
      <Route path="/lab" component={LabPage} />
      <Route path="/tech" component={TechPage} />
      <Route path="/care" component={CarePage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/admin" component={AdminRoute} />
      <Route path="/admin/products" component={AdminRoute} />
      <Route path="/admin/orders" component={AdminRoute} />
      <Route path="/admin/customers" component={AdminRoute} />
      <Route path="/admin/content" component={AdminRoute} />
      <Route path="/admin/seo" component={AdminRoute} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <SeoController />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
