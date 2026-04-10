
import React, { useMemo, useState } from "react";
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
import { getLoginUrl } from "@/const";
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
              当前页面已从简单订单列表扩展为结算资料、待办动作与订单跟踪的统一承接页，下一步可直接接入真实客户资料、地址簿与订单数据源。
            </p>
            <div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
              <p className="font-medium text-slate-950">账户状态</p>
              <p className="mt-2">{loading ? "正在检查登录状态" : isAuthenticated ? "已登录" : "未登录"}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">当前用户</p>
              <p className="mt-2 text-sm font-medium text-slate-950">{user?.name || "访客演示模式"}</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">企业资料</p>
                <p className="mt-2 font-medium text-slate-950">待接入企业名称、税号、联系人、地址簿与默认发票信息</p>
              </div>
              <div className="rounded-3xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">支付偏好</p>
                <p className="mt-2 font-medium text-slate-950">支持线上支付草稿、对公转账审核与后续分期扩展</p>
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
              {demoOrders.map((order) => (
                <div key={order.code} className="rounded-3xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">订单编号</p>
                      <p className="mt-1 font-medium text-slate-950">{order.code}</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{order.status}</div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{order.items}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-500">订单金额</p>
                      <p className="mt-1 font-medium text-slate-950">{order.amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">归属品牌</p>
                      <p className="mt-1 font-medium text-slate-950">{order.brand}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">当前待办</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {[
                  "待补开票资料",
                  "待上传付款凭证",
                  "待确认发货与签收",
                ].map((item) => (
                  <div key={item} className="rounded-3xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function AdminContent() {
  const [location] = useLocation();
  const section = location.startsWith("/admin/orders")
    ? "订单处理"
    : location.startsWith("/admin/customers")
      ? "客户管理"
      : location.startsWith("/admin/content")
        ? "内容发布"
        : location.startsWith("/admin/seo")
          ? "SEO 配置"
          : location.startsWith("/admin/products")
            ? "产品管理"
            : "后台总览";
  const isOrdersSection = location.startsWith("/admin/orders");

  const statCards = [
    { label: "产品库", value: "128", hint: "待接入真实商品数据", icon: Package },
    { label: "订单数", value: "36", hint: "已具备交易链路骨架", icon: ShoppingBag },
    { label: "客户数", value: "64", hint: "待接入 B2B 身份体系", icon: Users },
    { label: "内容条目", value: "42", hint: "覆盖商城与三个官网", icon: FileText },
  ];

  const moduleCards = [
    {
      title: "产品管理",
      description: "统一维护品牌、分类、价格与上架状态，后续接入真实商品编辑能力。",
      icon: Package,
    },
    {
      title: "订单处理",
      description: "查看订单状态、线下打款凭证与审核结果，串联 OMS 工作流。",
      icon: WalletCards,
    },
    {
      title: "客户管理",
      description: "统一管理 B2B 客户资料、权限与归属品牌，形成多租户客户视图。",
      icon: Building2,
    },
    {
      title: "内容发布",
      description: "为商城、LAB、科技站与 Care 站点提供统一内容与 SEO 运营入口。",
      icon: BookOpenText,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">iCloush Console</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{section}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          当前后台已接入 DashboardLayout 结构，并作为统一管理商城与三个官网的运营入口。本轮继续补足了订单、客户、内容与产品模块的运营说明卡片，下一步将逐步接入真实数据与操作能力。
        </p>
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

      <section className="grid gap-6 md:grid-cols-2">
        {moduleCards.map((module) => (
          <div key={module.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
              <module.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{module.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{module.description}</p>
          </div>
        ))}
      </section>

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
              {adminReviewQueue.map((item) => (
                <div key={item.code} className="rounded-3xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">订单编号</p>
                      <p className="mt-1 font-medium text-slate-950">{item.code}</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{item.status}</div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-slate-500">品牌</p>
                      <p className="mt-1 font-medium text-slate-950">{item.brand}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">金额</p>
                      <p className="mt-1 font-medium text-slate-950">{item.amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">运营动作</p>
                      <p className="mt-1 font-medium text-slate-950">{item.task}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">履约阶段</p>
              <div className="mt-6 space-y-4">
                {fulfillmentStages.map((stage, index) => (
                  <div key={stage.title} className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Stage {index + 1}</p>
                    <p className="mt-2 font-medium text-slate-950">{stage.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{stage.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">运营提示</p>
              <div className="mt-4 space-y-3">
                {[
                  "对公转账订单需校验付款主体与开票主体是否一致。",
                  "顾问型方案单要同步报价单、排期和客户确认记录。",
                  "发货后应在客户中心同步更新物流或服务执行进度。",
                ].map((item) => (
                  <div key={item} className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">运营提醒</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">当前多站点运营重点</h2>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">统一中台，多品牌前台</div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            "优先接通商城真实购物车、结算与订单创建接口。",
            "将询价表单、品牌线索与后台通知流串联起来。",
            "逐步为各站点补齐 SEO 元信息与内容可配置能力。",
          ].map((item) => (
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
