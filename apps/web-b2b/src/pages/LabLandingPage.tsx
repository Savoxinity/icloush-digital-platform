import React from "react";
import { ArrowRight, ChevronDown, Orbit, Radar, Sparkles } from "lucide-react";
import { Link } from "wouter";

import { getLoginUrl } from "@/const";

import { trpc } from "../lib/trpc";

type SiteSnapshot = {
  siteKey?: string;
  productCount?: number;
  orderCount?: number;
  leadCount?: number;
};

type PlatformSnapshot = {
  siteSummaries?: SiteSnapshot[];
};

type LabContactConfig = {
  source?: "database" | "fallback";
  headline?: string | null;
  description?: string | null;
  primaryCtaLabel?: string | null;
  primaryCtaHref?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaHref?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactWechat?: string | null;
  responseSla?: string | null;
};

const heroBackgroundImage = "/manus-storage/视觉锤_7a1911d5.webp";
const voidSettingImage = "/manus-storage/AP_Detail_Screen03_VoidSetting_Raw_v3_e5514ed6.webp";
const deploymentMatrixImage = "/manus-storage/AP_Detail_DeploymentMatrix_1x1_Raw_v5_247d70a4.png";
const olfactoryArchiveImage = "/manus-storage/AP_Detail_Screen04_OlfactoryArchive_Raw_v5_228eed76.webp";
const mailerBoxImage = "/manus-storage/Screen06_MailerBox_Square_v2_a041a3ab.png";
const productKeyVisualImage = "/manus-storage/BD-01-电商封面图（1080-1920）_19cf7f90.png";

const navItems = [
  { label: "AP", href: "#ap" },
  { label: "FC", href: "#fc" },
  { label: "ORBITAL ASSETS", href: "#orbital-assets" },
] as const;

const laboratoryCapabilities = [
  {
    title: "TACTICAL DECOMPOSITION",
    value: "93.8%",
    note: "硫化氢解构率 // 中广测报告映射值",
  },
  {
    title: "BIO-SIGNAL SUPPRESSION",
    value: "CONFIRMED",
    note: "异戊酸绞杀确认 // 针对宠物与潮湿织物残留场景",
  },
  {
    title: "ORBITAL ASSETS",
    value: "03",
    note: "首发在轨物资 // AP-01、SK-01、BD-01",
  },
] as const;

const deploymentNotes = [
  "高密度负空间与顶格巨型排版，用压迫感先完成筛选。",
  "使用黑色、枪灰与温暖米白形成 70/20/10 主配比，只保留极少信号色作为系统告警。",
  "交互不使用柔和电商语汇，转为档案员式协议语言与战术物资叙述。",
] as const;

function resolveMetric(value: number | undefined, suffix: string, state: "loading" | "error" | "ready" | "empty", fallback: string) {
  if (state === "loading") {
    return "SYNCING";
  }

  if (state === "error") {
    return "UNAVAILABLE";
  }

  if (typeof value === "number") {
    return `${value}${suffix}`;
  }

  return fallback;
}

function resolveSnapshotState(snapshot: SiteSnapshot | undefined, isLoading: boolean, isError: boolean) {
  if (isLoading) {
    return "loading" as const;
  }

  if (isError) {
    return "error" as const;
  }

  if (!snapshot) {
    return "empty" as const;
  }

  return "ready" as const;
}

function LabBrandMark({ className }: { className?: string }) {
  const rays = Array.from({ length: 28 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 28 - Math.PI / 2;
    const innerX = 50 + Math.cos(angle) * 12;
    const innerY = 50 + Math.sin(angle) * 12;
    const outerX = 50 + Math.cos(angle) * 34;
    const outerY = 50 + Math.sin(angle) * 34;

    return <line key={index} x1={innerX} y1={innerY} x2={outerX} y2={outerY} stroke="currentColor" strokeWidth="1.4" opacity="0.9" />;
  });

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <polygon points="30,6 70,6 94,30 94,70 70,94 30,94 6,70 6,30" stroke="currentColor" strokeWidth="2.8" />
      <polygon points="33,12 67,12 88,33 88,67 67,88 33,88 12,67 12,33" stroke="currentColor" strokeWidth="1.6" opacity="0.75" />
      {rays}
      <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
    </svg>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return <p className="font-icloush-display text-[11px] uppercase tracking-[0.38em] text-[#bcae96]">{children}</p>;
}

export default function LabLandingPage() {
  const platformSnapshotQuery = trpc.platform.snapshot.useQuery();
  const labContactQuery = trpc.site.contactConfig.useQuery({ siteKey: "lab", contactScene: "business" });

  const platformSnapshot = (platformSnapshotQuery.data ?? null) as PlatformSnapshot | null;
  const labSnapshot = (platformSnapshot?.siteSummaries ?? []).find(item => item?.siteKey === "lab");
  const labSnapshotState = resolveSnapshotState(labSnapshot, platformSnapshotQuery.isLoading, platformSnapshotQuery.isError);
  const labContact = (labContactQuery.data ?? null) as LabContactConfig | null;
  const requestAccessHref = typeof window === "undefined" ? "/account" : getLoginUrl("/account");
  const primaryCtaHref = labContact?.primaryCtaHref ?? "/account";
  const secondaryCtaHref = labContact?.secondaryCtaHref ?? "/shop";
  const contactCards = [
    { label: "EMAIL", value: labContact?.contactEmail ?? "lab@icloush.com" },
    { label: "LINE", value: labContact?.contactPhone ?? "400-820-2026" },
    { label: "WECHAT", value: labContact?.contactWechat ?? "iCloushLAB" },
    { label: "SLA", value: labContact?.responseSla ?? "24H RESPONSE" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#ebe6dc]">
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBackgroundImage})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(214,224,255,0.18),transparent_24%),linear-gradient(180deg,rgba(5,5,5,0.38)_0%,rgba(5,5,5,0.72)_48%,rgba(5,5,5,0.96)_100%)]"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(235,230,220,0.65),transparent)]" aria-hidden="true" />

        <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-md">
          <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
            <Link href="/" className="inline-flex items-center gap-3 text-[#ebe6dc] transition hover:text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 p-2 text-[#d6cbb8]">
                <LabBrandMark className="h-full w-full" />
              </span>
              <span>
                <span className="font-icloush-display block text-[0.72rem] uppercase tracking-[0.34em]">iCloush LAB.</span>
                <span className="block text-[0.68rem] uppercase tracking-[0.28em] text-[#b8b0a2]">Defining the Void.</span>
              </span>
            </Link>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <nav className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-black/35 px-2 py-2 text-[11px] uppercase tracking-[0.28em] text-[#c7bba6]">
                {navItems.map(item => (
                  <a key={item.label} href={item.href} className="rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white">
                    {item.label}
                  </a>
                ))}
              </nav>
              <a href={requestAccessHref} className="clip-cta inline-flex h-12 items-center gap-2 rounded-full bg-[#ebe6dc] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#050505] transition hover:bg-white">
                <span>[ REQUEST ACCESS ]</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </header>

        <div className="container relative z-10 flex min-h-[calc(100vh-76px)] items-end py-10 md:py-16">
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.2fr)_24rem] lg:items-end xl:grid-cols-[minmax(0,1.25fr)_28rem]">
            <div className="max-w-4xl">
              <SectionEyebrow>// DOMAIN: SPATIAL_RECONSTRUCTION //</SectionEyebrow>
              <p className="mt-5 max-w-3xl text-xs uppercase tracking-[0.34em] text-[#bcae96]">
                BRUTALIST DECO SPACE JEWELER / ARCHIVIST TONE / PRACTICAL SCI-FI
              </p>
              <h1 className="font-icloush-display mt-8 text-[2.95rem] leading-[0.9] tracking-[0.16em] text-[#f4efe6] sm:text-[4.8rem] lg:text-[6rem] xl:text-[7.2rem]">
                ATMOSPHERIC
                <span className="mt-3 block text-[#d7ccba]">PURIFICATION</span>
              </h1>
              <p className="mt-8 max-w-2xl text-sm leading-7 text-[#d5cfc3] sm:text-base sm:leading-8">
                Artifact No. AP-01 已进入公开陈列阶段。该协议用于 15–20m² 空间的大气重组与异味湮灭，界面以压迫式留白、金属切割边与低照度质感构成第一道筛选。
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                <a href={primaryCtaHref} className="clip-cta inline-flex h-12 items-center justify-center rounded-full gap-3 bg-[#ebe6dc] px-6 py-4 text-xs font-semibold uppercase tracking-[0.36em] text-[#050505] transition hover:bg-white">
                  <span>[ INITIATE PROTOCOL ]</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href={secondaryCtaHref} className="clip-cta inline-flex h-12 items-center justify-center rounded-full gap-3 border border-white/18 bg-black/35 px-6 py-4 text-xs font-semibold uppercase tracking-[0.36em] text-[#ebe6dc] transition hover:border-white/40 hover:bg-white/6">
                  <span>[ ORBITAL ASSETS ]</span>
                </a>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {laboratoryCapabilities.map(item => (
                  <div key={item.title} className="clip-panel bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 backdrop-blur-sm">
                    <p className="font-icloush-display text-[10px] uppercase tracking-[0.28em] text-[#bcae96]">{item.title}</p>
                    <p className="mt-4 text-2xl font-semibold tracking-[0.08em] text-[#f7f2e9]">{item.value}</p>
                    <p className="mt-3 text-xs leading-6 text-[#d5cec2]">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-[#b8b0a2]">
                <ChevronDown className="h-4 w-4" />
                <span>SCROLL TO EXTRACT THE CORE</span>
              </div>
            </div>

            <aside className="clip-panel data-terminal self-stretch p-5 sm:p-6 lg:max-w-none">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-icloush-display text-[10px] uppercase tracking-[0.32em] text-[#bcae96]">ARCHIVE STATUS</p>
                  <p className="mt-3 text-lg font-semibold tracking-[0.08em] text-[#f3eee4]">LIVE DEPLOYMENT</p>
                </div>
                <span className="rounded-full border border-[#bcae96]/30 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-[#d7ccba]">
                  {labContactQuery.isLoading ? "SYNCING" : labContact?.source === "database" ? "LIVE CONFIG" : "LOCAL FALLBACK"}
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/35">
                <img src={voidSettingImage} alt="Atmospheric Purification 分子笼视觉素材" className="h-56 w-full object-cover object-center" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[1.15rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#a89c87]">PUBLIC PRODUCTS</p>
                  <p className="mt-2 text-2xl font-semibold text-[#f7f2e9]">{resolveMetric(labSnapshot?.productCount, "", labSnapshotState, "PENDING")}</p>
                </div>
                <div className="rounded-[1.15rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#a89c87]">PIPELINE ORDERS</p>
                  <p className="mt-2 text-2xl font-semibold text-[#f7f2e9]">{resolveMetric(labSnapshot?.orderCount, "", labSnapshotState, "PENDING")}</p>
                </div>
                <div className="rounded-[1.15rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#a89c87]">LEAD CAPTURE</p>
                  <p className="mt-2 text-2xl font-semibold text-[#f7f2e9]">{resolveMetric(labSnapshot?.leadCount, "", labSnapshotState, "PENDING")}</p>
                </div>
              </div>

              <div className="mechanical-divider mt-6" />

              <div className="mt-6 space-y-3 text-sm leading-7 text-[#d5cec2]">
                <p>Status: Active. Protocol tuned for dense smoke, damp textile residue and pet-sourced volatile chains.</p>
                <p>Signal path rejects conventional retail language. Interface words remain cold, sparse and machine-readable.</p>
              </div>

              <div className="mt-5 rounded-[1.15rem] border border-white/10 bg-black/28 px-4 py-4 text-xs leading-6 text-[#bdb4a6]">
                {labContact?.source === "database"
                  ? "Live business-scene contact config is active. Request Access keeps the OAuth login route while Initiate Protocol follows the managed business CTA."
                  : "Fallback contact config is active. Request Access still routes through OAuth login, and Initiate Protocol currently resolves to /account until the business-scene record is published."}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <main>
        <section id="ap" className="border-b border-white/8 py-18 md:py-24">
          <div className="container grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
            <div>
              <SectionEyebrow>TACTICAL PAYLOAD / AP-01</SectionEyebrow>
              <h2 className="font-icloush-display mt-5 text-3xl leading-tight tracking-[0.14em] text-[#f3eee4] sm:text-4xl lg:text-5xl">
                THE PRODUCT IS NOT A SKU. IT IS A SPATIAL RESET DEVICE.
              </h2>
              <p className="mt-6 max-w-2xl text-sm leading-8 text-[#d4cdc1] sm:text-base">
                第一屏之后不急于解释“是什么”，而是继续强化“为什么危险且昂贵”。因此 AP 模块以战术包裹、分子部署矩阵与嗅觉档案三种视角，展示从粗糙矿物到精密蓝瓶的微距对比。
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {deploymentNotes.map(note => (
                  <div key={note} className="clip-panel bg-white/[0.025] p-5">
                    <p className="text-sm leading-7 text-[#dad3c7]">{note}</p>
                  </div>
                ))}
                <div className="clip-panel bg-[#111111] p-5">
                  <p className="font-icloush-display text-[10px] uppercase tracking-[0.32em] text-[#bcae96]">REQUEST FLOW</p>
                  <p className="mt-4 text-base leading-7 text-[#f3eee4]">
                    Entry 01 → {labContact?.primaryCtaLabel ?? "提交合作需求"}
                    <br />
                    Entry 02 → {labContact?.secondaryCtaLabel ?? "查看产品采购入口"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="spotlight-card clip-panel overflow-hidden bg-white/[0.03]">
                <img src={productKeyVisualImage} alt="AP 系列蓝瓶主视觉" className="h-[26rem] w-full object-cover object-center" />
              </div>
              <div className="spotlight-card clip-panel overflow-hidden bg-white/[0.03]">
                <img src={mailerBoxImage} alt="AP 系列战术包裹礼盒展示" className="h-[18rem] w-full object-cover object-center" />
              </div>
            </div>
          </div>
        </section>

        <section id="orbital-assets" className="border-b border-white/8 py-18 md:py-24">
          <div className="container grid gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-center">
            <div className="spotlight-card clip-panel overflow-hidden bg-white/[0.03]">
              <img src={deploymentMatrixImage} alt="AP 系列部署矩阵视觉素材" className="h-full min-h-[28rem] w-full object-cover object-center" />
            </div>
            <div>
              <SectionEyebrow>OLFACTORY ARCHIVE / SANDALWOOD SHADOWS</SectionEyebrow>
              <h2 className="font-icloush-display mt-5 text-3xl leading-tight tracking-[0.14em] text-[#f3eee4] sm:text-4xl lg:text-5xl">
                MACRO CONTRAST AS THE PRIMARY CONVERSION HOOK.
              </h2>
              <p className="mt-6 max-w-2xl text-sm leading-8 text-[#d4cdc1] sm:text-base">
                页面使用“粗糙 vs 光滑”的微距对比原则：矿石、沉木与黑色底面负责粗野基底；深蓝玻璃、金属喷头与切削边线负责高级珠宝感。它不解释香味，而是先解释结构与重量。
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="clip-panel bg-white/[0.025] p-5">
                  <p className="font-icloush-display text-[10px] uppercase tracking-[0.32em] text-[#bcae96]">SCENT STRUCTURE</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-[#dad3c7]">
                    <p>Top Note // Highland Bergamot</p>
                    <p>Mid Note // Valley Lily &amp; Tea</p>
                    <p>Base Note // Tibetan Musk</p>
                  </div>
                </div>
                <div className="clip-panel bg-[#111111] p-5">
                  <p className="font-icloush-display text-[10px] uppercase tracking-[0.32em] text-[#bcae96]">ARCHIVIST COPY</p>
                  <p className="mt-4 text-sm leading-7 text-[#dad3c7]">
                    Recommended for atmospheric purification in sealed cabins, private wardrobes and low-ventilation interiors. Condition: Pristine. Allocation: Limited.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="container mt-8">
            <div className="spotlight-card clip-panel overflow-hidden bg-white/[0.03]">
              <img src={olfactoryArchiveImage} alt="AP 系列嗅觉档案视觉素材" className="h-[26rem] w-full object-cover object-center" />
            </div>
          </div>
        </section>

        <section id="fc" className="py-18 md:py-24">
          <div className="container grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div>
              <SectionEyebrow>// DOMAIN: MATERIAL_STASIS //</SectionEyebrow>
              <h2 className="font-icloush-display mt-5 text-3xl leading-tight tracking-[0.14em] text-[#f3eee4] sm:text-4xl lg:text-5xl">
                FABRIC CARE DELUXE REMAINS IN COLD STORAGE.
              </h2>
              <p className="mt-6 max-w-3xl text-sm leading-8 text-[#d4cdc1] sm:text-base">
                FC 系列将承接“液态流银 / 丁达尔微乳蓝”的更冷冽界面语言，并以织物冻结、成分参数与无微胶囊叙事作为下一阶段扩展。当前页面已预留系列跳转与负空间结构，可直接继续深化而无需推翻首版框架。
              </p>
            </div>
            <div className="clip-panel bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(80,113,147,0.14))] p-6">
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-[#d7ccba]">
                  <Orbit className="h-5 w-5" />
                  <p className="font-icloush-display text-[11px] uppercase tracking-[0.3em]">Future Sequence</p>
                </div>
                <div className="flex items-center gap-3 text-[#d7ccba]">
                  <Radar className="h-5 w-5" />
                  <p className="font-icloush-display text-[11px] uppercase tracking-[0.3em]">Material Stasis</p>
                </div>
                <div className="flex items-center gap-3 text-[#d7ccba]">
                  <Sparkles className="h-5 w-5" />
                  <p className="font-icloush-display text-[11px] uppercase tracking-[0.3em]">Silk Preservation</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-black/30 py-8">
        <div className="container grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <SectionEyebrow>CONTACT PROTOCOL</SectionEyebrow>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d5cec2]">
              {labContact?.headline ?? "为合作、研发共创与技术交流提供可执行的咨询路径"}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#aba395]">
              {labContact?.description ?? "提交后将进入统一后台进行跟进、响应与归档。"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {contactCards.map(item => (
              <div key={item.label} className="clip-panel bg-white/[0.025] p-4">
                <p className="font-icloush-display text-[10px] uppercase tracking-[0.28em] text-[#a89c87]">{item.label}</p>
                <p className="mt-3 text-sm leading-7 text-[#f1ece3]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
