
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
  badges: string[];
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
  "本轮已落下多站点可浏览前台骨架，下一步继续接入真实商品、客户与订单数据。",
];

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

export function PlatformHome() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_35%,#ffffff_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
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
      </header>

      <main>
        <section className="container grid gap-10 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-700">
              Unified commerce + brand system
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 md:text-6xl">
              在统一底座上建设自有商城、品牌官网与后台中台。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              当前版本已经将模板占位首页替换为真实业务入口，覆盖商城、iCloush LAB.、环洗朵科技、富朵朵 iCloush Care、客户中心与后台入口，并开始形成统一采购与品牌转化闭环。
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                进入商城系统
              </Link>
              <Link
                href="/lab"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                浏览品牌矩阵
              </Link>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {capabilityNotes.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur"
                >
                  <Sparkles className="h-5 w-5 text-sky-600" />
                  <p className="mt-4 text-sm leading-7 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-slate-950 p-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
            <p className="text-sm text-slate-400">平台结构概览</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-white/5 p-5">
                <p className="text-sm text-slate-400">统一底座</p>
                <p className="mt-2 text-lg font-medium">用户、商品、订单、支付、内容、SEO</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-slate-400">前台站点</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">商城、LAB、科技站与 Care 独立表达。</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-slate-400">后台中台</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">统一管理产品、订单、客户、内容与 SEO。</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-6 md:py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Platform entry matrix</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">四类前台触点已形成可浏览入口</h2>
            </div>
            <Link href="/admin" className="hidden items-center gap-2 text-sm font-medium text-slate-700 md:inline-flex">
              查看后台结构
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {siteEntries.map((entry) => (
              <Link
                key={entry.title}
                href={entry.href}
                className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_30px_100px_rgba(15,23,42,0.12)]"
              >
                <div className={`h-2 bg-gradient-to-r ${entry.tone}`} />
                <div className="p-8">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
                      <entry.icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:text-slate-700" />
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">{entry.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{entry.description}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<string>(shopCategories[0]?.id ?? "chemicals");
  const [cart, setCart] = useState<Record<string, number>>({});

  const filteredProducts = useMemo(
    () => shopProducts.filter((product) => product.categoryId === activeCategory),
    [activeCategory],
  );

  const cartCount = useMemo(() => Object.values(cart).reduce((sum, count) => sum + count, 0), [cart]);

  const selectedProducts = useMemo(
    () => shopProducts.filter((product) => (cart[product.id] ?? 0) > 0),
    [cart],
  );

  const activeCategoryMeta = useMemo(
    () => shopCategories.find((category) => category.id === activeCategory) ?? shopCategories[0],
    [activeCategory],
  );

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
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <p className="text-sm text-slate-400">采购闭环</p>
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
              <Link
                href="/account"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
              >
                进入客户中心
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
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Category browser</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">分类浏览与产品选品</h2>
              </div>
              <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
                当前分类：{activeCategoryMeta?.label}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {shopCategories.map((category) => {
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

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {filteredProducts.map((product) => (
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
              ))}
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
              LAB 站点承担品牌介绍、研发能力展示、产品线认知与商务联系入口。本轮进一步补齐了研发能力卡片、产品线与商务联系区块，使其更贴近真实官网首页结构。
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {labCapabilities.map((item) => (
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
                ].map((line) => (
                  <div key={line.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="font-medium text-slate-950">{line.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{line.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">联系入口</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">为合作、研发共创与技术交流预留清晰路径</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                后续这里将接入可配置联系方式、商务咨询表单与线索同步后台的工作流。本轮已经形成清晰的信息层次，适合作为后续询价表单承载页。
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">商务合作</p>
                  <p className="mt-2 font-medium text-slate-950">sales@icloush.example</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">研发沟通</p>
                  <p className="mt-2 font-medium text-slate-950">lab@icloush.example</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/shop"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  查看产品采购入口
                </Link>
                <Link
                  href="/account"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                >
                  联系客户经理
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function TechPage() {
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
              本轮将官网首屏升级为更接近真实 ToB 官网的信息结构，强化企业介绍、解决方案、案例与采购入口之间的联动关系。
            </p>
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
              后续可接入企业介绍正文、资质图片、行业覆盖范围与核心客户群体说明。当前版本已预留清晰的品牌说服型结构，适合继续接入证据型内容。
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
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">行业解决方案</p>
            <div className="mt-6 grid gap-4">
              {techSolutions.map((item) => (
                <div key={item} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="font-medium text-slate-950">{item}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    后续将结合具体场景问题、解决方式、推荐产品与案例结果，由后台内容模块统一管理。
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">客户案例</p>
            <div className="mt-6 space-y-4">
              {[
                "高星级酒店布草体系升级",
                "商办空间玻璃与硬表面清洁提效",
                "物业项目标准化清洁剂替换方案",
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-slate-200 p-5">
                  <p className="font-medium text-slate-950">{item}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    当前为案例结构骨架，后续将补充客户类型、痛点、方案与结果数据，形成更强的成交支撑。
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function CarePage() {
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
              Care 站点聚焦服务介绍、流程体验、合作酒店展示与在线咨询入口。本轮进一步强化了高端服务感的结构表达，适合作为后续咨询表单与项目案例承载页。
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                查看相关产品
              </Link>
              <Link
                href="/account"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                进入客户中心
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-amber-100 bg-white p-8 shadow-[0_24px_80px_rgba(146,64,14,0.08)]">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">服务介绍</p>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">强调精细护理、服务标准与酒店场景适配能力。</p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              后续可接入服务优势、适用场景、交付标准与咨询表单模块。当前结构已为“服务卖点 + 证据 + 留资”模式预留足够空间。
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
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">合作酒店展示</p>
            <div className="mt-6 space-y-4">
              {[
                "精品度假酒店合作案例",
                "城市高端商务酒店护理项目",
                "服务式公寓布草奢护方案",
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-slate-200 p-5">
                  <p className="font-medium text-slate-950">{item}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    后续将接入合作酒店 Logo、案例描述与项目成果，形成更完整的信任背书区块。
                  </p>
                </div>
              ))}
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

  const myOrdersQuery = trpc.orders.myList.useQuery(
    {
      brandId: activeBrandId ?? 1,
      limit: 5,
    },
    {
      enabled: isAuthenticated && Boolean(activeBrandId),
    },
  );

  const featuredOrderNo = myOrdersQuery.data?.records[0]?.orderNo;
  const orderDetailQuery = trpc.orders.detail.useQuery(
    {
      brandId: activeBrandId ?? 1,
      orderNo: featuredOrderNo ?? "",
    },
    {
      enabled: isAuthenticated && Boolean(activeBrandId && featuredOrderNo),
    },
  );

  const currentTodos = useMemo(() => {
    if (!isAuthenticated) {
      return ["待补开票资料", "待上传付款凭证", "待确认发货与签收"];
    }

    const orders = (myOrdersQuery.data?.records ?? []) as OrderSummaryRecord[];
    const todos: string[] = [];

    if (orders.some(order => order.paymentStatus === "unpaid" || order.paymentStatus === "offline_review")) {
      todos.push("待上传付款凭证或等待财务审核");
    }

    if (orders.some(order => order.status === "paid" || order.status === "processing")) {
      todos.push("待确认发货排期与履约窗口");
    }

    if (orders.some(order => order.fulfillmentStatus === "shipped" || order.fulfillmentStatus === "delivered")) {
      todos.push("待确认签收并反馈售后结果");
    }

    return todos.length > 0 ? todos : ["当前品牌暂无待办，可继续采购或查看历史订单"];
  }, [isAuthenticated, myOrdersQuery.data?.records]);

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
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">企业资料</p>
                <p className="mt-2 font-medium text-slate-950">待接入企业名称、税号、联系人、地址簿与默认发票信息</p>
              </div>
              <div className="rounded-3xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">支付偏好</p>
                <p className="mt-2 font-medium text-slate-950">优先承接对公转账审核，已保留微信与支付宝扩展字段</p>
              </div>
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
                    window.location.href = getLoginUrl();
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
                  {myOrdersQuery.error.message}
                </div>
              ) : (myOrdersQuery.data?.records.length ?? 0) === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm leading-7 text-slate-600">
                  当前品牌下还没有可展示的订单，可继续采购创建新订单。
                </div>
              ) : (
                ((myOrdersQuery.data?.records ?? []) as OrderSummaryRecord[]).map((order) => (
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
              {orderDetailQuery.data ? (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">最近一笔订单摘要</p>
                  <p className="mt-2 font-medium text-slate-950">{orderDetailQuery.data.summary.orderNo}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    支付状态：{getPaymentStatusLabel(orderDetailQuery.data.summary.paymentStatus)}；履约状态：
                    {getFulfillmentStatusLabel(orderDetailQuery.data.summary.fulfillmentStatus)}。
                  </p>
                </div>
              ) : null}
            </div>
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
            description: "面向 B2B 客户账户、采购主体、品牌归属与运营分层，搭建后续客户中心与销售运营联动所需的后台骨架。",
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

  const statCards = [
    {
      label: "品牌 / 站点",
      value: String(siteEntries.length),
      hint: "1 套商城 + 3 个品牌官网已纳入统一控制台视图。",
      icon: Sparkles,
    },
    {
      label: "订单规模",
      value: shouldLoadOrderInsights ? String(adminOrdersQuery.data?.total ?? 0) : "36",
      hint: shouldLoadOrderInsights ? "总览与订单页已对接真实订单查询。" : "其余模块先复用 Sprint 规划基线。",
      icon: ShoppingBag,
    },
    {
      label: "待审核回单",
      value: shouldLoadOrderInsights ? String(pendingReviewCount) : "3",
      hint: pendingReviewCount > 0 ? "优先处理线下付款凭证与付款主体核验。" : "当前无挂起审核单，可转入履约与客户跟进。",
      icon: WalletCards,
    },
    {
      label: "当前品牌",
      value: selectedBrand?.shortName ?? selectedBrand?.name ?? "待同步",
      hint: selectedBrand ? `多租户视图已可切换至 ${selectedBrand.name}。` : "品牌主数据读取中。",
      icon: Building2,
    },
  ];

  const moduleCards = [
    {
      title: "产品管理",
      path: "/admin/products",
      status: "骨架已建",
      description: "围绕商品资料、分类结构、阶梯定价与上架节奏搭建统一产品工作台。",
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
      status: "待联通",
      description: "聚焦 B2B 账户、采购主体、跟进动作与客户中心权限的统一管理。",
      icon: Users,
    },
    {
      title: "内容发布",
      path: "/admin/content",
      status: "待联通",
      description: "为商城与官网提供选题、页面位、栏目层级与品牌素材的一体化入口。",
      icon: BookOpenText,
    },
    {
      title: "SEO 配置",
      path: "/admin/seo",
      status: "待联通",
      description: "统一管理标题、描述、结构化信息、站点地图与推广落地页基线。",
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

  const placeholderAction = (label: string) => {
    sonnerToast(`${label} 已加入后续 Sprint，本轮先保留统一后台入口与字段骨架。`);
  };

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
                后台当前通过统一控制台管理商城与三个品牌门户；订单页与总览页已接入真实查询，其余模块先建立信息架构与运营骨架。
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
                {[
                  "订单列表、详情与审核闭环已联通真实查询。",
                  "支付身份映射、退款单、回调日志等底层结构已预留。",
                  "产品、客户、内容与 SEO 模块进入后台统一框架阶段。",
                ].map((item) => (
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
        <>
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">商品治理工位</p>
              <div className="mt-6 space-y-4">
                {productWorkstreams.map((item) => (
                  <div key={item.title} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{item.title}</p>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{item.tag}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">品牌商品视角</p>
              <div className="mt-6 space-y-4">
                {[
                  {
                    name: "iCloush LAB.",
                    detail: "更适合承接研发背书、场景方案、顾问型项目报价与样品试用入口。",
                  },
                  {
                    name: "环洗朵科技",
                    detail: "承担专业化学品标准品、批量采购、复购与渠道型商品的主销售阵地。",
                  },
                  {
                    name: "iCloush Care",
                    detail: "偏服务型产品与高客单方案页，商品管理应支持项目制与排期字段。",
                  },
                ].map((item) => (
                  <div key={item.name} className="rounded-3xl bg-slate-50 p-5">
                    <p className="font-medium text-slate-950">{item.name}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">占位动作</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">待接真实商品接口的后台操作位</h2>
              </div>
              <div className="rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-700">当前为 Sprint 骨架，按钮会给出提示</div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                "新建商品模板",
                "导入阶梯价格",
                "配置品牌上架范围",
              ].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => placeholderAction(label)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {isCustomersSection ? (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">客户生命周期骨架</p>
            <div className="mt-6 space-y-4">
              {customerWorkstreams.map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 p-5">
                  <p className="font-medium text-slate-950">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                  <button
                    type="button"
                    onClick={() => placeholderAction(item.action)}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    {item.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">客户中心映射</p>
              <div className="mt-5 space-y-3">
                {[
                  "客户中心订单列表已改为真实查询，可作为客户档案的首个已联通触点。",
                  "后续可在客户详情中补充付款凭证、审核结果、发票状态与履约时间线。",
                  "管理员与客户角色后续需要结合多租户品牌归属做更细分权限控制。",
                ].map((item) => (
                  <div key={item} className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">推荐字段</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "采购主体",
                  "开票信息",
                  "品牌归属",
                  "合作阶段",
                  "销售负责人",
                  "复购频次",
                ].map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isContentSection ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">内容编排矩阵</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {siteEntries.map((entry) => (
                <div key={entry.title} className="rounded-3xl border border-slate-200 p-5">
                  <p className="font-medium text-slate-950">{entry.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{entry.description}</p>
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
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">内容工作流</p>
              <div className="mt-5 space-y-4">
                {contentWorkstreams.map((item) => (
                  <div key={item.title} className="rounded-3xl bg-slate-50 p-5">
                    <p className="font-medium text-slate-950">{item.title}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">占位动作</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  "新建官网专题页",
                  "调整商城 Banner",
                  "上传品牌素材",
                ].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => placeholderAction(label)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isSeoSection ? (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">SEO 治理清单</p>
            <div className="mt-6 space-y-4">
              {seoWorkstreams.map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 p-5">
                  <p className="font-medium text-slate-950">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">站点优先级</p>
              <div className="mt-5 space-y-3">
                {siteEntries.map((entry) => (
                  <div key={entry.title} className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    <p className="font-medium text-slate-950">{entry.title}</p>
                    <p className="mt-2">{entry.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">占位动作</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  "生成标题模板",
                  "规划站点地图",
                  "补齐结构化字段",
                ].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => placeholderAction(label)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                  >
                    {label}
                  </button>
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
                            reviewPaymentMutation.mutate({
                              brandId: activeBrandId,
                              orderId: record.order.id,
                              paymentId: record.payment?.id,
                              receiptId: record.receipt.id,
                              approved: true,
                              reviewNote: "后台审核通过",
                            });
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
                            reviewPaymentMutation.mutate({
                              brandId: activeBrandId,
                              orderId: record.order.id,
                              paymentId: record.payment?.id,
                              receiptId: record.receipt.id,
                              approved: false,
                              reviewNote: "需补充付款主体或回单信息",
                            });
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
      <Route path="/shop" component={ShopPage} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
