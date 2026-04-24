import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, ImagePlus, LoaderCircle, PencilLine, Plus, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { trpc } from "@/lib/trpc";

type ProductSeriesFilter = "all" | "AP" | "FC";
type ProductStatusFilter = "all" | "draft" | "active" | "archived";

type ManagedProductSpec = {
  key: string;
  value: string;
};

type ManagedProductFormState = {
  id?: number;
  brandId: number | null;
  code: string;
  name: string;
  slug: string;
  series: "AP" | "FC" | "";
  price: string;
  status: "draft" | "active" | "archived";
  imageUrl: string;
  subtitle: string;
  description: string;
  unit: string;
  taobaoUrl: string;
  tmallUrl: string;
  miniProgramPath: string;
  wechatQrUrl: string;
  alipayQrUrl: string;
  detailImageUrls: string;
  paymentMode: "sandbox" | "production_ready" | "production_live";
  specs: ManagedProductSpec[];
};

const emptyFormState = (brandId: number | null): ManagedProductFormState => ({
  brandId,
  code: "",
  name: "",
  slug: "",
  series: "AP",
  price: "",
  status: "draft",
  imageUrl: "",
  subtitle: "",
  description: "",
  unit: "件",
  taobaoUrl: "",
  tmallUrl: "",
  miniProgramPath: "",
  wechatQrUrl: "",
  alipayQrUrl: "",
  detailImageUrls: "",
  paymentMode: "sandbox",
  specs: [
    { key: "核心成分", value: "" },
    { key: "适用场景", value: "" },
  ],
});

function statusLabel(status: string) {
  if (status === "active") return "ACTIVE";
  if (status === "archived") return "ARCHIVED";
  return "DRAFT";
}

function priceLabel(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "待定价";
  }

  return `¥ ${value.toLocaleString("zh-CN")}`;
}

const PRODUCT_META_SPEC_KEYS = {
  taobaoUrl: "__retail_taobao_url",
  tmallUrl: "__retail_tmall_url",
  miniProgramPath: "__retail_mini_program_path",
  wechatQrUrl: "__retail_wechat_qr_url",
  alipayQrUrl: "__retail_alipay_qr_url",
  detailImageUrls: "__retail_detail_image_urls",
  paymentMode: "__retail_payment_mode",
} as const;

function extractRetailMeta(specs: ManagedProductSpec[]) {
  const meta = {
    taobaoUrl: "",
    tmallUrl: "",
    miniProgramPath: "",
    wechatQrUrl: "",
    alipayQrUrl: "",
    detailImageUrls: "",
    paymentMode: "sandbox" as const,
  };

  const cleanSpecs = specs.filter((item) => {
    if (item.key === PRODUCT_META_SPEC_KEYS.taobaoUrl) {
      meta.taobaoUrl = item.value;
      return false;
    }
    if (item.key === PRODUCT_META_SPEC_KEYS.tmallUrl) {
      meta.tmallUrl = item.value;
      return false;
    }
    if (item.key === PRODUCT_META_SPEC_KEYS.miniProgramPath) {
      meta.miniProgramPath = item.value;
      return false;
    }
    if (item.key === PRODUCT_META_SPEC_KEYS.wechatQrUrl) {
      meta.wechatQrUrl = item.value;
      return false;
    }
    if (item.key === PRODUCT_META_SPEC_KEYS.alipayQrUrl) {
      meta.alipayQrUrl = item.value;
      return false;
    }
    if (item.key === PRODUCT_META_SPEC_KEYS.detailImageUrls) {
      meta.detailImageUrls = item.value;
      return false;
    }
    if (item.key === PRODUCT_META_SPEC_KEYS.paymentMode) {
      meta.paymentMode = item.value === "production_live" || item.value === "production_ready" ? item.value : "sandbox";
      return false;
    }
    return true;
  });

  return {
    meta,
    cleanSpecs,
  };
}

function mergeRetailMetaIntoSpecs(specs: ManagedProductSpec[], meta: Pick<ManagedProductFormState, "taobaoUrl" | "tmallUrl" | "miniProgramPath" | "wechatQrUrl" | "alipayQrUrl" | "detailImageUrls" | "paymentMode">) {
  const normalizedSpecs = specs
    .map((item) => ({ key: item.key.trim(), value: item.value.trim() }))
    .filter((item) => item.key && item.value);
  const metaEntries: ManagedProductSpec[] = [
    { key: PRODUCT_META_SPEC_KEYS.taobaoUrl, value: meta.taobaoUrl.trim() },
    { key: PRODUCT_META_SPEC_KEYS.tmallUrl, value: meta.tmallUrl.trim() },
    { key: PRODUCT_META_SPEC_KEYS.miniProgramPath, value: meta.miniProgramPath.trim() },
    { key: PRODUCT_META_SPEC_KEYS.wechatQrUrl, value: meta.wechatQrUrl.trim() },
    { key: PRODUCT_META_SPEC_KEYS.alipayQrUrl, value: meta.alipayQrUrl.trim() },
    {
      key: PRODUCT_META_SPEC_KEYS.detailImageUrls,
      value: meta.detailImageUrls
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .join("\n"),
    },
    {
      key: PRODUCT_META_SPEC_KEYS.paymentMode,
      value: meta.paymentMode,
    },
  ].filter((item) => item.value);

  return [...normalizedSpecs, ...metaEntries];
}

async function fileToBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",").pop() ?? "" : result;
      if (!base64) {
        reject(new Error("图片读取失败，请重新选择文件。"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("图片读取失败，请稍后重试。"));
    reader.readAsDataURL(file);
  });
}

export default function AdminProductsWorkbench(props: {
  activeBrandId: number | null;
  selectedBrandName?: string | null;
}) {
  const { activeBrandId, selectedBrandName } = props;
  const utils = trpc.useUtils();
  const [seriesFilter, setSeriesFilter] = useState<ProductSeriesFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [formState, setFormState] = useState<ManagedProductFormState>(() => emptyFormState(activeBrandId));

  useEffect(() => {
    setFormState((current) => {
      if (current.id) {
        return current;
      }
      return {
        ...current,
        brandId: activeBrandId,
      };
    });
  }, [activeBrandId]);

  const managedProductsQuery = trpc.admin.managedProducts.useQuery(
    activeBrandId
      ? {
          brandId: activeBrandId,
          series: seriesFilter,
          status: statusFilter,
        }
      : {},
    {
      enabled: Boolean(activeBrandId),
    },
  );

  const uploadProductImageMutation = trpc.admin.uploadProductImage.useMutation({
    onSuccess: (payload) => {
      setFormState((current) => ({
        ...current,
        imageUrl: payload.url,
      }));
      sonnerToast.success("商品主图已上传，可直接用于 showroom 与 PDP。", {
        description: payload.url,
      });
    },
    onError: (error) => {
      sonnerToast.error(error.message || "图片上传失败，请稍后重试。");
    },
  });

  const upsertProductMutation = trpc.admin.upsertProduct.useMutation({
    onSuccess: async (payload) => {
      await Promise.all([
        utils.admin.managedProducts.invalidate(),
        utils.admin.operations.invalidate(),
        utils.platform.showroomProducts.invalidate(),
      ]);
      setFormState(emptyFormState(activeBrandId));
      sonnerToast.success(payload.mode === "created" ? "测试商品已录入商品池。" : "商品已更新。", {
        description: `${payload.product.code} · ${payload.product.name}`,
      });
    },
    onError: (error) => {
      sonnerToast.error(error.message || "商品保存失败，请检查表单后重试。");
    },
  });

  const products = useMemo(() => managedProductsQuery.data?.products ?? [], [managedProductsQuery.data]);

  const totalSpecs = useMemo(
    () => formState.specs.filter((item) => item.key.trim() && item.value.trim()).length,
    [formState.specs],
  );
  const retailAccessCount = useMemo(
    () => [formState.taobaoUrl, formState.tmallUrl, formState.miniProgramPath, formState.wechatQrUrl, formState.alipayQrUrl].filter((item) => item.trim()).length,
    [formState.alipayQrUrl, formState.miniProgramPath, formState.taobaoUrl, formState.tmallUrl, formState.wechatQrUrl],
  );
  const detailImageCount = useMemo(
    () =>
      formState.detailImageUrls
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean).length,
    [formState.detailImageUrls],
  );
  const landingPath = useMemo(() => {
    const slug = formState.slug.trim();
    if (slug) {
      return `/product/${slug}`;
    }
    const fallbackCode = formState.code.trim().toLowerCase();
    return fallbackCode ? `/product/${fallbackCode}` : "";
  }, [formState.code, formState.slug]);
  const landingUrl = useMemo(() => {
    if (!landingPath) {
      return "";
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "https://preview.icloush.local";
    return `${origin}${landingPath}`;
  }, [landingPath]);

  const beginEdit = (product: {
    id: number;
    brandId: number;
    code: string;
    name: string;
    slug: string;
    series: "AP" | "FC" | null;
    price: number | null;
    status: string;
    imageUrl: string | null;
    subtitle: string | null;
    description: string | null;
    specs: ManagedProductSpec[];
  }) => {
    const retailMeta = extractRetailMeta(product.specs);
    setFormState({
      id: product.id,
      brandId: product.brandId,
      code: product.code,
      name: product.name,
      slug: product.slug,
      series: product.series ?? "AP",
      price: typeof product.price === "number" ? String(product.price) : "",
      status: product.status === "active" || product.status === "archived" ? product.status : "draft",
      imageUrl: product.imageUrl ?? "",
      subtitle: product.subtitle ?? "",
      description: product.description ?? "",
      unit: "件",
      taobaoUrl: retailMeta.meta.taobaoUrl,
      tmallUrl: retailMeta.meta.tmallUrl,
      miniProgramPath: retailMeta.meta.miniProgramPath,
      wechatQrUrl: retailMeta.meta.wechatQrUrl,
      alipayQrUrl: retailMeta.meta.alipayQrUrl,
      detailImageUrls: retailMeta.meta.detailImageUrls,
      paymentMode: retailMeta.meta.paymentMode,
      specs: retailMeta.cleanSpecs.length > 0 ? retailMeta.cleanSpecs : [{ key: "核心成分", value: "" }],
    });
  };

  const resetForm = () => {
    setFormState(emptyFormState(activeBrandId));
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeBrandId) {
      return;
    }

    try {
      const base64Data = await fileToBase64(file);
      uploadProductImageMutation.mutate({
        brandId: activeBrandId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        base64Data,
      });
    } catch (error) {
      sonnerToast.error(error instanceof Error ? error.message : "图片读取失败，请稍后重试。");
    } finally {
      event.target.value = "";
    }
  };

  const submitProduct = () => {
    if (!activeBrandId) {
      sonnerToast.error("请先选择品牌，再录入商品。");
      return;
    }

    if (!formState.code.trim() || !formState.name.trim()) {
      sonnerToast.error("请至少填写商品代号与商品名称。");
      return;
    }

    upsertProductMutation.mutate({
      id: formState.id,
      brandId: activeBrandId,
      code: formState.code,
      name: formState.name,
      slug: formState.slug || undefined,
      series: formState.series || null,
      price: formState.price.trim() ? Number(formState.price) : null,
      status: formState.status,
      imageUrl: formState.imageUrl || null,
      subtitle: formState.subtitle || null,
      description: formState.description || null,
      unit: formState.unit || null,
      specs: mergeRetailMetaIntoSpecs(formState.specs, {
        taobaoUrl: formState.taobaoUrl,
        tmallUrl: formState.tmallUrl,
        miniProgramPath: formState.miniProgramPath,
        wechatQrUrl: formState.wechatQrUrl,
        alipayQrUrl: formState.alipayQrUrl,
        detailImageUrls: formState.detailImageUrls,
        paymentMode: formState.paymentMode,
      }),
    });
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Sprint 3 / Product Control</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Showroom 商品池与可筛选数据表</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              当前面板直接面向 {selectedBrandName || "当前品牌"} 的真实商品池，支持按系列与状态筛选，并作为 showroom / PDP 的统一数据上游。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              value={seriesFilter}
              onChange={(event) => setSeriesFilter(event.target.value as ProductSeriesFilter)}
            >
              <option value="all">全部系列</option>
              <option value="AP">AP</option>
              <option value="FC">FC</option>
            </select>
            <select
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ProductStatusFilter)}
            >
              <option value="all">全部状态</option>
              <option value="active">ACTIVE</option>
              <option value="draft">DRAFT</option>
              <option value="archived">ARCHIVED</option>
            </select>
            <button
              type="button"
              onClick={() => managedProductsQuery.refetch()}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "当前结果", value: `${products.length} 条` },
            { label: "ACTIVE", value: `${products.filter((item) => item.status === "active").length} 条` },
            { label: "DRAFT", value: `${products.filter((item) => item.status === "draft").length} 条` },
            { label: "已挂主图", value: `${products.filter((item) => item.imageUrl).length} 条` },
            {
              label: "已挂详情长图",
              value: `${products.filter((item) => item.specs.some((spec) => spec.key === PRODUCT_META_SPEC_KEYS.detailImageUrls && spec.value.trim())).length} 条`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>

        {managedProductsQuery.isLoading ? (
          <div className="mt-6 flex items-center gap-3 rounded-3xl border border-dashed border-slate-200 p-5 text-sm text-slate-600">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            正在同步商品池。
          </div>
        ) : managedProductsQuery.isError ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
            商品池读取失败，请重试后继续录入。
          </div>
        ) : products.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm leading-7 text-slate-600">
            当前筛选结果为空。你可以直接在右侧录入首个测试商品，然后刷新 showroom 预览验证联通结果。
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {products.map((product) => (
              <div key={product.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-medium text-slate-950">{product.name}</p>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">
                        {product.code}
                      </span>
                      {product.series ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{product.series}</span>
                      ) : null}
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${product.status === "active" ? "bg-emerald-50 text-emerald-700" : product.status === "archived" ? "bg-slate-200 text-slate-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {statusLabel(product.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{product.brandName}</p>
                    <p className="text-sm leading-7 text-slate-600">
                      {product.subtitle || product.description || "该条目已进入商品池，但仍可补充更具转化力的副标题与实验室说明。"}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{priceLabel(product.price)}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Specs {product.specs.length} 项</span>
                      {product.specs.some((spec) => spec.key === PRODUCT_META_SPEC_KEYS.detailImageUrls && spec.value.trim()) ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">详情长图已挂载</span>
                      ) : null}
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">更新于 {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString("zh-CN") : "待同步"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <button
                      type="button"
                      onClick={() => beginEdit(product)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      <PencilLine className="h-4 w-4" />
                      编辑
                    </button>
                    {product.imageUrl ? (
                      <a
                        href={product.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 underline-offset-4 hover:underline"
                      >
                        查看主图
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">尚未上传主图</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Product Form</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                {formState.id ? "编辑商品" : "录入测试商品"}
              </h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              <Plus className="h-4 w-4" />
              新建
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">产品代号</span>
              <input
                value={formState.code}
                onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                placeholder="VOID-B03"
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">产品名称</span>
              <input
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                placeholder="大气重组基质"
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">系列</span>
                <select
                  value={formState.series}
                  onChange={(event) => setFormState((current) => ({ ...current, series: event.target.value as "AP" | "FC" | "" }))}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <option value="AP">AP</option>
                  <option value="FC">FC</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">价格</span>
                <input
                  value={formState.price}
                  onChange={(event) => setFormState((current) => ({ ...current, price: event.target.value.replace(/[^0-9]/g, "") }))}
                  placeholder="1280"
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">状态</span>
                <select
                  value={formState.status}
                  onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as "draft" | "active" | "archived" }))}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <option value="draft">DRAFT</option>
                  <option value="active">ACTIVE</option>
                  <option value="archived">ARCHIVED</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">副标题</span>
              <input
                value={formState.subtitle}
                onChange={(event) => setFormState((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Atmospheric Purification / Brutal showroom hero asset"
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">说明</span>
              <textarea
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                rows={4}
                placeholder="写入用于 showroom 与 PDP 的核心实验室说明。"
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              />
            </label>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Rich Content / 详情长图发布</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">每行填写 1 个详情长图 URL。保存后，前台 PDP 将按顺序渲染这些长图，用于承接淘宝/京东式沉浸详情浏览。</p>
              </div>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">详情长图 URL 序列</span>
                <textarea
                  value={formState.detailImageUrls}
                  onChange={(event) => setFormState((current) => ({ ...current, detailImageUrls: event.target.value }))}
                  rows={5}
                  placeholder={"https://cdn.example.com/detail-01.jpg\nhttps://cdn.example.com/detail-02.jpg"}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700"
                />
              </label>
              <p className="mt-3 text-xs leading-6 text-slate-500">当前已挂载 {detailImageCount} 张详情图。后续如果需要拖拽排序或富文本区块，可在这一版元数据链路之上继续升级。</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Landing Distribution / H5 落地页与二维码</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">运营填完 slug 或 code 后，系统会自动生成商品落地页路径、H5 访问链接与二维码预览，可直接用于朋友圈、私聊或线下物料。</p>
                </div>
                <QrCode className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">落地页路径</span>
                    <input value={landingPath} readOnly placeholder="/product/void-b03" className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">H5 分发链接</span>
                    <div className="mt-2 flex gap-3">
                      <input value={landingUrl} readOnly placeholder="填写 slug 后自动生成" className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" />
                      {landingUrl ? (
                        <a href={landingUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </label>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  {landingUrl ? (
                    <div className="space-y-3">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(landingUrl)}`} alt="商品落地页二维码" className="w-full rounded-2xl border border-slate-100" />
                      <p className="text-xs leading-6 text-slate-500">二维码实时根据当前商品 slug 生成。正式发布后可直接用于 H5 商品页分发。</p>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-xs leading-6 text-slate-400">
                      先填写 slug 或产品代号，
                      <br />
                      再自动生成二维码。
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Retail Bridge / 外部入口与二维码</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">维护淘宝/天猫短链与小程序二维码素材后，前台 PDP 的 EXTERNAL ACCESS 面板会自动读取并展示。</p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">淘宝短链</span>
                  <input
                    value={formState.taobaoUrl}
                    onChange={(event) => setFormState((current) => ({ ...current, taobaoUrl: event.target.value }))}
                    placeholder="https://m.tb.cn/..."
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">天猫链接</span>
                  <input
                    value={formState.tmallUrl}
                    onChange={(event) => setFormState((current) => ({ ...current, tmallUrl: event.target.value }))}
                    placeholder="https://detail.tmall.com/..."
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">微信/支付宝小程序路径</span>
                  <input
                    value={formState.miniProgramPath}
                    onChange={(event) => setFormState((current) => ({ ...current, miniProgramPath: event.target.value }))}
                    placeholder="pages/shop/detail?id=VOID-B03"
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">支付通道模式</span>
                  <select
                    value={formState.paymentMode}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        paymentMode: event.target.value as ManagedProductFormState["paymentMode"],
                      }))
                    }
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  >
                    <option value="sandbox">SANDBOX / 当前测试</option>
                    <option value="production_ready">PRODUCTION READY / 备案后可切正式</option>
                    <option value="production_live">PRODUCTION LIVE / 已切正式</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">微信小程序二维码 URL</span>
                  <input
                    value={formState.wechatQrUrl}
                    onChange={(event) => setFormState((current) => ({ ...current, wechatQrUrl: event.target.value }))}
                    placeholder="https://.../wechat-qr.png"
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">支付宝小程序二维码 URL</span>
                  <input
                    value={formState.alipayQrUrl}
                    onChange={(event) => setFormState((current) => ({ ...current, alipayQrUrl: event.target.value }))}
                    placeholder="https://.../alipay-qr.png"
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  />
                </label>
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">主图 URL</span>
              <input
                value={formState.imageUrl}
                onChange={(event) => setFormState((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder="https://... 或 /manus-storage/..."
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              />
            </label>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">上传主图</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">支持将本地主图上传到存储服务，成功后会自动回填 image_url。</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
                  {uploadProductImageMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  选择图片
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Specs Builder</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">实验室参数键值对</h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormState((current) => ({
                  ...current,
                  specs: [...current.specs, { key: "", value: "" }],
                }))
              }
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              <Plus className="h-4 w-4" />
              添加参数
            </button>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">当前已填写 {totalSpecs} 项有效参数，可直接用于 PDP 数据面板；另有 {retailAccessCount} 项零售桥接元数据已独立维护。</p>
          <div className="mt-5 space-y-3">
            {formState.specs.map((spec, index) => (
              <div key={`${index}-${spec.key}`} className="grid gap-3 md:grid-cols-[0.9fr_1.1fr_auto]">
                <input
                  value={spec.key}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      specs: current.specs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, key: event.target.value } : item,
                      ),
                    }))
                  }
                  placeholder="例如：除味率"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
                <input
                  value={spec.value}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      specs: current.specs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, value: event.target.value } : item,
                      ),
                    }))
                  }
                  placeholder="例如：99.2%"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormState((current) => ({
                      ...current,
                      specs: current.specs.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={submitProduct}
              disabled={upsertProductMutation.isPending || !activeBrandId}
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {upsertProductMutation.isPending ? "保存中..." : formState.id ? "更新商品" : "录入测试商品"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              重置表单
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
