import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLoginUrl } from "@/const";
import {
  ArrowRight,
  Building2,
  FlaskConical,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Route, Switch, Link, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotFound from "./pages/NotFound";

const siteEntries = [
  {
    title: "B2B 商城系统",
    href: "/shop",
    description: "面向酒店、物业、渠道与企业采购的在线选品、下单与订单管理入口。",
    tags: ["产品展示", "购物车", "订单管理"],
    icon: ShoppingBag,
    tone: "from-sky-600 to-cyan-500",
  },
  {
    title: "iCloush LAB.",
    href: "/lab",
    description: "承接品牌介绍、产品线展示、技术研发能力与商务联系入口。",
    tags: ["品牌介绍", "产品线", "技术研发"],
    icon: FlaskConical,
    tone: "from-violet-600 to-indigo-500",
  },
  {
    title: "环洗朵科技",
    href: "/tech",
    description: "聚焦专业化学品清洗剂、行业解决方案与客户案例展示。",
    tags: ["企业介绍", "解决方案", "客户案例"],
    icon: ShieldCheck,
    tone: "from-emerald-600 to-teal-500",
  },
  {
    title: "富朵朵 iCloush Care",
    href: "/care",
    description: "面向酒店奢护洗涤服务的品牌展示、服务流程与在线咨询入口。",
    tags: ["服务介绍", "服务流程", "在线咨询"],
    icon: Building2,
    tone: "from-amber-500 to-orange-500",
  },
];

const capabilityNotes = [
  "统一商品、订单、客户、内容与 SEO 底座，支撑商城与三个官网协同运营。",
  "前台保持多站点独立品牌表达，后台统一管理品牌内容、订单数据与客户信息。",
  "当前版本已完成真实平台入口骨架，下一步继续接入交易流程、支付与后台数据能力。",
];

const shopCategories = [
  "专业化学品清洗剂",
  "酒店布草清洁",
  "商业空间护理",
  "高端奢护洗涤方案",
];

const shopProducts = [
  {
    name: "高浓缩织物洁净剂",
    spec: "20L / 桶",
    usage: "酒店布草与制服洗护",
    price: "¥680 起",
  },
  {
    name: "玻璃与硬表面专业清洁剂",
    spec: "5L / 桶",
    usage: "物业与商办空间清洁",
    price: "¥128 起",
  },
  {
    name: "客房织物奢护组合",
    spec: "服务套餐",
    usage: "高端酒店布草护理",
    price: "方案定价",
  },
];

const labCapabilities = [
  "面向清洗与护理场景的配方研发能力。",
  "从原料筛选、配方验证到稳定性测试的实验体系。",
  "为专业化学品与高端护理品牌输出产品创新能力。",
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
    items: "高浓缩织物洁净剂 × 3",
  },
  {
    code: "IC-2026-0011",
    status: "已完成",
    amount: "¥980",
    items: "玻璃与硬表面专业清洁剂 × 5",
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

function PlatformHome() {
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
        <section className="container grid gap-10 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
          <div>
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-700">
              Unified commerce + brand system
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 md:text-6xl">
              为 iCloush 构建一套统一底座上的商城系统与三大品牌官网。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              当前版本已经替换模板占位首页，建立了统一平台总入口，并打通商城、iCloush LAB.、环洗朵科技、富朵朵 iCloush Care、客户中心与后台入口的多站点骨架。
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
                  <p className="mt-2 text-sm leading-7 text-slate-200">
                    商城、LAB、环洗朵科技、iCloush Care 独立访问。
                  </p>
                </div>
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-slate-400">后台中台</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">
                    统一管理产品、订单、客户、内容与 SEO。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-6 md:py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Platform entry matrix</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                四类前台触点已经具备独立入口
              </h2>
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

function ShopPage() {
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
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
              B2B Commerce
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              专业化学品与酒店奢护服务的统一采购入口。
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              商城首期聚焦 B2B 客户的选品效率、采购便利性与后续订单追踪。当前页面已完成分类、产品卡片、客户中心与后台导流的前台骨架。
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
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
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <p className="text-sm text-slate-400">采购闭环</p>
            <div className="mt-6 space-y-4">
              {[
                "按行业或场景浏览产品",
                "加入购物车并确认采购信息",
                "完成支付后在个人中心跟踪订单",
              ].map((step, index) => (
                <div key={step} className="rounded-3xl border border-white/10 bg-black/10 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step {index + 1}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">采购分类</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {shopCategories.map((category) => (
              <div key={category} className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
                <p className="font-medium text-white">{category}</p>
                <p className="mt-3 leading-7 text-slate-400">后续将接入真实分类页、筛选器与场景化检索能力。</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">精选产品</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                示例内容用于呈现商城首屏结构，后续接入后台产品管理与真实订单流程。
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {shopProducts.map((product) => (
              <div
                key={product.name}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.18)]"
              >
                <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-700 p-10" />
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{product.name}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">适用场景：{product.usage}</p>
                <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
                  <span>{product.spec}</span>
                  <span className="font-medium text-white">{product.price}</span>
                </div>
                <div className="mt-6 flex gap-3">
                  <button className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-slate-950 transition hover:bg-slate-100">
                    加入购物车
                  </button>
                  <button className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-medium text-white transition hover:border-white/30">
                    查看详情
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function LabPage() {
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
              LAB 站点承担品牌介绍、研发能力展示、产品线认知与商务联系入口的角色。当前页面已搭建技术品牌官网的核心结构与内容模块骨架。
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {labCapabilities.map((item) => (
              <div key={item} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
                <p className="text-sm leading-7 text-slate-200">{item}</p>
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
                  "专业清洗剂产品线",
                  "酒店织物护理方案",
                  "高端消费洗护延展产品线",
                ].map((line) => (
                  <div key={line} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="font-medium text-slate-950">{line}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      后续可配置产品线说明、技术标签、代表产品与导流链接。
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)]">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">联系入口</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">为合作、研发共创与技术交流预留清晰联系路径</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                后续这里将接入可配置联系方式、商务咨询表单与内容模块化发布能力。
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
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function TechPage() {
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
              环洗朵科技官网承担企业介绍、产品展示、解决方案与客户案例表达，并与商城形成导流闭环。当前页面已搭建官网结构骨架与内容分区。
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
              后续可接入企业介绍正文、资质图片、行业覆盖范围与核心客户群体说明。
            </p>
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
                    后续将结合具体场景问题、解决方式、推荐产品与案例结果。
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
                    当前为案例占位结构，后续将由后台内容发布模块统一管理。
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

function CarePage() {
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
              Care 站点聚焦服务介绍、服务流程、合作酒店展示与在线咨询入口，当前已完成品牌官网骨架与高端服务感的首屏表达。
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
              后续可接入服务优势、适用场景、交付标准与咨询表单模块。
            </p>
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
                    后续将接入合作酒店 Logo、案例描述与项目成果。
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

function AccountPage() {
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
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">客户账户与订单历史入口</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              当前页面已完成个人中心的结构骨架。后续将接入 B2B 客户注册、企业资料维护、真实订单数据与复购操作。
            </p>
            <div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
              <p className="font-medium text-slate-950">账户状态</p>
              <p className="mt-2">{loading ? "正在检查登录状态" : isAuthenticated ? "已登录" : "未登录"}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {!isAuthenticated ? (
                <button
                  className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
                  onClick={() => {
                    window.location.href = getLoginUrl();
                  }}
                >
                  登录账户
                </button>
              ) : (
                <button
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
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">订单历史</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">示例订单列表</h2>
              </div>
              <div className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600">
                当前用户：{user?.name || "访客演示模式"}
              </div>
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
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-500">订单金额</span>
                    <span className="font-medium text-slate-950">{order.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function AdminContent() {
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

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">iCloush Console</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{section}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          当前后台已接入 DashboardLayout 结构，并作为统一管理商城与三个官网的运营入口。下一步将继续补充产品、订单、客户、内容与 SEO 的真实数据与操作能力。
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "产品库", value: "128", hint: "待接入真实商品数据", icon: Package },
          { label: "订单数", value: "36", hint: "待接入支付与订单状态流转", icon: ShoppingBag },
          { label: "客户数", value: "64", hint: "待接入 B2B 客户体系", icon: Building2 },
          { label: "内容条目", value: "42", hint: "覆盖商城与三个官网", icon: FileTextIcon },
        ].map((card) => (
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
    </div>
  );
}

function FileTextIcon(props: React.ComponentProps<typeof Package>) {
  return <Package {...props} />;
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
