import fs from "node:fs";
import path from "node:path";

const root = "/home/ubuntu/icloush-digital-platform";
const appPath = path.join(root, "apps/web-b2b/src/App.tsx");
const testPath = path.join(root, "apps/web-b2b/src/App.test.tsx");
const storageProxyPath = path.join(root, "apps/web-b2b/server/_core/storageProxy.ts");

const heroStoragePath = "/manus-storage/huanxiduo-hero-4k_a47d4dd9.jpg";
const tdsStoragePath = "/manus-storage/huanxiduo-tds-placeholder_18e633bb.pdf";

const storageProxyContent = `import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";

import { ENV } from "./env";

const LOCAL_ASSET_ROOTS = [
  "/home/ubuntu/webdev-static-assets",
  "/home/ubuntu/webdev-static-assets/huanxiduo",
] as const;

function buildCandidateNames(key: string) {
  const basename = path.basename(decodeURIComponent(key));
  const withoutHash = basename.replace(/_[a-f0-9]{8}(?=\.[^.]+$)/i, "");
  return Array.from(new Set([basename, withoutHash]));
}

function resolveLocalAssetPath(key: string) {
  for (const rootDir of LOCAL_ASSET_ROOTS) {
    for (const candidateName of buildCandidateNames(key)) {
      const candidatePath = path.join(rootDir, candidateName);
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        return candidatePath;
      }
    }
  }
  return null;
}

function resolveForgeConfig() {
  return {
    apiUrl:
      ENV.forgeApiUrl ||
      process.env.ADMIN_BUILT_IN_FORGE_API_URL?.trim() ||
      process.env.BUILT_IN_FORGE_API_URL?.trim() ||
      process.env.VITE_FRONTEND_FORGE_API_URL?.trim() ||
      "",
    apiKey:
      ENV.forgeApiKey ||
      process.env.ADMIN_BUILT_IN_FORGE_API_KEY?.trim() ||
      process.env.BUILT_IN_FORGE_API_KEY?.trim() ||
      process.env.VITE_FRONTEND_FORGE_API_KEY?.trim() ||
      "",
  };
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string | undefined>)["0"];

    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const localAssetPath = resolveLocalAssetPath(key);
    if (localAssetPath) {
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.sendFile(localAssetPath);
      return;
    }

    const { apiUrl, apiKey } = resolveForgeConfig();
    if (!apiUrl || !apiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL("v1/storage/presign/get", apiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: \`Bearer \${apiKey}\` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(\`[StorageProxy] forge error: \${forgeResp.status} \${body}\`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
`;

const huanxiduoBlock = `function IndustrialSignalField({ posterUrl }: { posterUrl: string }) {
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
            context.strokeStyle = \`rgba(93, 177, 255, \${0.16 - distance / 1800})\`;
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
    ["4K Poster", "高清媒资链路", "首屏改用真实 /manus-storage 高清图，不再依赖 Base64。"],
    ["Snap Stack", "强制吸附滚动", "每个章节以整屏为单位硬切换，建立工业门闸般的节奏。"],
    ["Live Motion", "代码驱动 Hero", "在缺少正式短片素材前，用动态流体场替代静态糊图。"],
  ] as const;

  const technologyModules = [
    ["MODULE 01", "军规级洁净技术", "把活性酶、去污效率与织物友好度组织成可验证的参数蓝图。"],
    ["MODULE 02", "自动分配与软水系统", "用分配器、蠕动泵与软水装置把系统能力而不是单品感受推到前台。"],
    ["MODULE 03", "低残留可持续闭环", "包装循环、浓缩投放和低残留同屏呈现，避免落回普通环保话术。"],
  ] as const;

  const sampleChannels = [
    ["企业微信", "页脚与申样区统一展示客服二维码资源位，承接高价值咨询。"],
    ["技术总监直连", "保留大客户的快速评估通道，用于设备与配方方案沟通。"],
    ["采购小程序", "把样板申请、规格书下载与 B2B 采购链路放进一个动作闭环。"],
  ] as const;

  const heroMediaUrl = "${heroStoragePath}";
  const tdsPlaceholderUrl = "${tdsStoragePath}";

  return (
    <main className="h-screen snap-y snap-mandatory overflow-y-auto bg-[#020406] text-white">
      <section className="relative h-screen snap-start snap-always overflow-hidden border-b border-white/10">
        <IndustrialSignalField posterUrl={heroMediaUrl} />
        <div className="relative z-10 mx-auto flex h-full max-w-[1680px] flex-col px-6 md:px-10 xl:px-14">
          <header className="flex items-center justify-between border-b border-white/10 py-5">
            <div className="flex items-center gap-3">
              <span className="inline-block h-3 w-3 border border-white/60 bg-[#0b5fff]" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/40">Unified Digital Base / Tech</p>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">HUANXIDUO</p>
              </div>
            </div>
            <nav className="hidden items-center gap-6 lg:flex">
              {navigationItems.map(([href, label]) => (
                <a key={href} href={href} className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/55 transition hover:text-white">
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/" className="hidden text-[11px] uppercase tracking-[0.28em] text-white/52 transition hover:text-white sm:inline-flex">平台总入口</Link>
              <a href="#sample" className="inline-flex h-11 items-center justify-center border border-white/14 bg-white/6 px-5 text-[11px] font-medium uppercase tracking-[0.28em] text-white transition hover:bg-white hover:text-[#020406]">
                REQUEST SAMPLE
              </a>
            </div>
          </header>

          <div className="grid h-full items-end gap-10 py-8 lg:grid-cols-[0.72fr_0.28fr] xl:gap-16">
            <div className="max-w-[900px] pb-10 md:pb-14 xl:pb-18">
              <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-[#7fb1ff]">Hyper-Resolution Industrial Terminal</p>
              <h1 className="mt-6 max-w-[1100px] text-5xl font-black leading-[0.88] tracking-[-0.08em] text-white md:text-7xl xl:text-[7.4rem]">
                环洗朵科技
              </h1>
              <p className="mt-5 max-w-3xl text-xl font-medium tracking-[-0.04em] text-white/86 md:text-4xl">
                次时代清洁解决方案
              </p>
              <p className="mt-6 max-w-2xl text-sm leading-8 text-white/62 md:text-base">
                把实验室液滴微距、工业参数板和强制分屏滚动拼成一块发布终端。先用画面建立压迫，再用参数建立信任，最后才让样板申请与采购入口接管转化。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#products" className="inline-flex h-14 items-center gap-3 border border-white/14 bg-white px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-[#020406] transition hover:bg-[#0b5fff] hover:text-white">
                  查看产品矩阵
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#solutions" className="inline-flex h-14 items-center gap-3 border border-white/14 bg-white/8 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-white transition hover:bg-white hover:text-[#020406]">
                  查看解决方案
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href={tdsPlaceholderUrl} target="_blank" rel="noreferrer" className="inline-flex h-14 items-center gap-3 border border-[#7fb1ff]/30 bg-[#0b5fff]/14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-[#dce8ff] transition hover:bg-[#0b5fff] hover:text-white">
                  DOWNLOAD TDS / 下载 TDS
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="hidden self-end pb-10 lg:block">
              <div className="grid gap-px border border-white/10 bg-white/10">
                {heroSignals.map(([value, label, detail]) => (
                  <div key={value} className="bg-black/45 px-5 py-5 backdrop-blur-sm">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/42">{label}</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{value}</p>
                    <p className="mt-3 text-sm leading-6 text-white/58">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 hidden gap-px border border-white/10 bg-white/10 xl:grid xl:grid-cols-[0.3fr_0.34fr_0.36fr]">
            <div className="bg-black/50 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/42">HERO FEED</p>
              <p className="mt-2 text-sm text-white/72">${heroStoragePath}</p>
            </div>
            <div className="bg-black/50 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/42">Noise Overlay / Terminal Grain</p>
              <p className="mt-2 text-sm text-white/72">代码驱动流体场 + 扫描纹理，暂代正式实验室短片。</p>
            </div>
            <div className="bg-black/50 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/42">4K Hero / Lab Liquid Macro</p>
              <p className="mt-2 text-sm text-white/72">真实高清图片通过本地静态代理恢复可访问，避免 500 和 Base64 失真。</p>
            </div>
          </div>
        </div>
      </section>

      <section id="technology" className="h-screen snap-start snap-always overflow-hidden border-b border-white/10 bg-[#05080d]">
        <div className="mx-auto grid h-full max-w-[1680px] gap-8 px-6 py-8 md:px-10 lg:grid-cols-[0.38fr_0.62fr] xl:px-14">
          <div className="flex flex-col justify-between border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#7fb1ff]">Clean Science / System Logic</p>
              <h2 className="mt-5 text-4xl font-black leading-[0.94] tracking-[-0.06em] md:text-6xl">把洁净能力做成可验证的工业系统。</h2>
              <p className="mt-6 max-w-xl text-sm leading-8 text-white/62 md:text-base">
                这一屏承担“可信度建立”。所有内容必须像工业终端参数面板，而不是 B2B 模板的花哨卡片。结构越硬，技术越可信。
              </p>
            </div>
            <div className="grid gap-px border border-white/10 bg-white/10">
              {[
                ["TRUST FRAME", "CMA / CNAS 报告位已预留"],
                ["DOSING SYSTEM", "设备参数、配比逻辑与工艺节点同屏"],
                ["SUSTAINABLE LOOP", "低残留、浓缩、循环包装统一进板"],
              ].map(([code, detail]) => (
                <div key={code} className="grid gap-px bg-white/10 md:grid-cols-[0.3fr_0.7fr]">
                  <div className="bg-black/50 px-4 py-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/42">{code}</div>
                  <div className="bg-black/35 px-4 py-4 text-sm text-white/66">{detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-3">
            {technologyModules.map(([code, title, detail]) => (
              <article key={code} className="flex h-full flex-col justify-between bg-[#08101a] p-6 md:p-7">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#7fb1ff]">{code}</p>
                  <h3 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.05em] text-white">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/60">{detail}</p>
                </div>
                <div className="mt-8 border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/36">
                  Parameter grid ready for real lab data
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="h-screen snap-start snap-always overflow-hidden border-b border-white/10 bg-[#04070b]">
        <div className="mx-auto flex h-full max-w-[1680px] flex-col px-6 py-8 md:px-10 xl:px-14">
          <div className="flex items-end justify-between gap-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#7fb1ff]">Solutions / Dispatch by Scenario</p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.06em] md:text-6xl">解决方案</h2>
            </div>
            <p className="hidden max-w-2xl text-sm leading-8 text-white/60 lg:block">
              三个场景不再做成普通卡片，而是像任务频道一样分屏分发，让用户每滚一次就硬切到下一组行动目标。
            </p>
          </div>
          <div className="mt-8 grid h-full gap-px border border-white/10 bg-white/10">
            {HUANXIDUO_SOLUTIONS.map((item, index) => (
              <div key={item.title} className="grid gap-px bg-white/10 lg:grid-cols-[0.18fr_0.42fr_0.4fr]">
                <div className="flex items-start justify-between bg-[#07111d] px-5 py-5 md:px-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/42">SCENARIO {index + 1}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{item.title}</p>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#7fb1ff]">LIVE</div>
                </div>
                <div className="bg-black/45 px-5 py-5 text-sm leading-7 text-white/62 md:px-6">{item.detail}</div>
                <div className="grid gap-px bg-white/10 sm:grid-cols-2">
                  <div className="bg-black/35 px-5 py-5 md:px-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/42">Action</p>
                    <p className="mt-3 text-sm leading-7 text-white/62">下载 TDS、获取行业方案并把客户推入样板申请或采购链路。</p>
                  </div>
                  <a href="#sample" className="flex items-center justify-between bg-[#0b5fff] px-5 py-5 text-[11px] font-medium uppercase tracking-[0.24em] text-white transition hover:bg-[#2d79ff] md:px-6">
                    获取行业方案
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="h-screen snap-start snap-always overflow-hidden bg-[#020406]">
        <div className="mx-auto flex h-full max-w-[1680px] flex-col px-6 py-8 md:px-10 xl:px-14">
          <div className="flex items-end justify-between gap-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#7fb1ff]">Product Matrix / Industrial Blueprint</p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.06em] md:text-6xl">产品矩阵</h2>
            </div>
            <p className="hidden max-w-2xl text-sm leading-8 text-white/60 lg:block">
              消费电子式矩阵展示承担“决策加速”。每个对象同时拥有规格、使用场景、TDS 下载和样板动作入口。
            </p>
          </div>
          <div className="mt-8 grid h-full gap-px border border-white/10 bg-white/10 lg:grid-cols-2">
            {HUANXIDUO_PRODUCTS.map((item, index) => (
              <article key={item.title} className="grid gap-px bg-white/10 md:grid-cols-[0.42fr_0.58fr]">
                <div className="flex flex-col justify-between bg-[#07101a] px-6 py-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/42">HXD-0{index + 1}</p>
                    <p className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white">{item.title}</p>
                    <p className="mt-3 font-mono text-sm uppercase tracking-[0.28em] text-[#7fb1ff]">{item.specs}</p>
                  </div>
                  <p className="border-t border-white/10 pt-4 text-sm leading-7 text-white/60">{item.detail}</p>
                </div>
                <div className="grid gap-px bg-white/10">
                  <div className="bg-black/40 px-6 py-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/42">Quiet Spec</p>
                    <div className="mt-4 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2">
                      <div className="bg-[#050b12] px-4 py-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/42">Format</p>
                        <p className="mt-2 text-sm leading-6 text-white/64">固体、液体、系统设备与终端卫生四类结构。</p>
                      </div>
                      <div className="bg-[#050b12] px-4 py-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/42">Use Case</p>
                        <p className="mt-2 text-sm leading-6 text-white/64">工业洗涤、后厨重油污、客房卫生与设备协同。</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-px bg-white/10 sm:grid-cols-2">
                    <a href="#sample" className="flex h-16 items-center justify-between bg-[#0b5fff] px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-white transition hover:bg-[#2d79ff]">
                      REQUEST SAMPLE / 申请试样
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <a href={tdsPlaceholderUrl} target="_blank" rel="noreferrer" className="flex h-16 items-center justify-between bg-white px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-[#020406] transition hover:bg-[#0b5fff] hover:text-white">
                      DOWNLOAD TDS / 下载 TDS
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="sample" className="h-screen snap-start snap-always overflow-hidden border-t border-white/10 bg-[#04070b]">
        <div className="mx-auto grid h-full max-w-[1680px] gap-px px-6 py-8 md:px-10 lg:grid-cols-[0.38fr_0.62fr] xl:px-14">
          <div className="grid gap-px border border-white/10 bg-white/10">
            <div className="bg-[#07111d] px-6 py-6 md:px-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#7fb1ff]">Sample Request / Conversion Hook</p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.06em] md:text-6xl text-white">申领样板</h2>
              <p className="mt-6 text-sm leading-8 text-white/62 md:text-base">
                画面保持高压，动作保持直给。留资、扫码、技术直连必须在一屏内全部建立，不让用户在滚动中迷失。
              </p>
            </div>
            {sampleChannels.map(([title, detail]) => (
              <div key={title} className="bg-black/35 px-6 py-5 md:px-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/42">{title}</p>
                <p className="mt-3 text-sm leading-7 text-white/62">{detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-px border border-white/10 bg-white/10">
            <div className="grid gap-px bg-white/10 md:grid-cols-2">
              {[
                "企业名称",
                "联系人",
                "手机 / 微信",
                "所属行业",
                "使用场景",
                "预计月用量",
              ].map((label) => (
                <label key={label} className="bg-black/35 px-5 py-5 text-sm text-white/66">
                  <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.24em] text-white/42">{label}</span>
                  <div className="h-12 border border-white/10 bg-[#07111d]" />
                </label>
              ))}
            </div>
            <label className="bg-black/35 px-5 py-5 text-sm text-white/66">
              <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.24em] text-white/42">备注</span>
              <div className="h-24 border border-white/10 bg-[#07111d]" />
            </label>
            <div className="grid gap-px bg-white/10 md:grid-cols-2">
              <button type="button" className="inline-flex h-16 items-center justify-between bg-[#0b5fff] px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-white transition hover:bg-[#2d79ff]">
                提交样板申请
                <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" className="inline-flex h-16 items-center justify-between bg-white px-5 text-[11px] font-medium uppercase tracking-[0.24em] text-[#020406] transition hover:bg-[#0b5fff] hover:text-white">
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
`;

let appSource = fs.readFileSync(appPath, "utf8");
if (!appSource.includes("useRef")) {
  appSource = appSource.replace(
    /import React, \{([^}]*)\} from "react";/,
    (_full, imports) => {
      const importList = imports.includes("useRef") ? imports : `${imports.trimEnd()}, useRef `;
      return `import React, {${importList}} from "react";`;
    },
  );
}

appSource = appSource.replace(/export function HuanxiduoTechPage\(\) \{[\s\S]*?\nexport function CareBrandPage\(\) \{/m, huanxiduoBlock);
fs.writeFileSync(appPath, appSource);

let testSource = fs.readFileSync(testPath, "utf8");
testSource = testSource.replace(
  /it\("恢复环洗朵科技官网首页[\s\S]*?\n  \}\);/m,
  `it("恢复环洗朵科技官网首页，采用动态 Hero、真实高清媒资链路与强制整屏吸附滚动", () => {
    setLocation("/tech");
    const html = renderToStaticMarkup(<HuanxiduoTechPage />);

    expect(html).toContain("Hyper-Resolution Industrial Terminal");
    expect(html).toContain("次时代清洁解决方案");
    expect(html).toContain("Noise Overlay / Terminal Grain");
    expect(html).toContain("snap-mandatory");
    expect(html).toContain("snap-start snap-always");
    expect(html).toContain('href="#technology"');
    expect(html).toContain('href="#solutions"');
    expect(html).toContain('href="#products"');
    expect(html).toContain('href="#sample"');
    expect(html).toContain("REQUEST SAMPLE / 申请试样");
    expect(html).toContain("DOWNLOAD TDS / 下载 TDS");
    expect(html).toContain("${heroStoragePath}");
    expect(html).toContain("${tdsStoragePath}");
    expect(html).not.toContain("data:image/jpeg;base64,");
    expect(html).not.toContain("data:application/pdf;base64,");
  });`,
);
fs.writeFileSync(testPath, testSource);
fs.writeFileSync(storageProxyPath, storageProxyContent);

console.log("Patched huanxiduo visual overhaul, tests, and storage proxy.");
