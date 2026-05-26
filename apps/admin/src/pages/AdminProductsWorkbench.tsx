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

type ManagedProductTierPriceForm = {
  id?: number;
  minQty: string;
  maxQty: string;
  price: string;
  customerType: "b2b" | "b2c" | "all";
};

type ManagedProductSkuForm = {
  id?: number;
  skuCode: string;
  specName: string;
  packSize: string;
  basePrice: string;
  marketPrice: string;
  stockQty: string;
  minOrderQty: string;
  status: "active" | "inactive";
  tierPrices: ManagedProductTierPriceForm[];
};

type ManagedSubscriptionPlanForm = {
  id?: number;
  name: string;
  billingCycle: "weekly" | "monthly" | "quarterly";
  deliveryRule: string;
  price: string;
  status: "active" | "inactive";
};

type ManagedProductFormState = {
  id?: number;
  brandId: number | null;
  code: string;
  name: string;
  slug: string;
  series: "AP" | "FC" | "";
  productType: "physical" | "service" | "rental" | "subscription";
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
  landingPath: string;
  shortCode: string;
  shortUrl: string;
  paymentMode: "sandbox" | "production_ready" | "production_live";
  specs: ManagedProductSpec[];
  skus: ManagedProductSkuForm[];
  subscriptionPlans: ManagedSubscriptionPlanForm[];
};

type AdminBrandOption = {
  id: number;
  code: string;
  name: string;
  shortName?: string | null;
};

const emptyTierPriceForm = (): ManagedProductTierPriceForm => ({
  minQty: "1",
  maxQty: "",
  price: "",
  customerType: "all",
});

const emptySkuForm = (): ManagedProductSkuForm => ({
  skuCode: "",
  specName: "",
  packSize: "",
  basePrice: "",
  marketPrice: "",
  stockQty: "0",
  minOrderQty: "1",
  status: "active",
  tierPrices: [],
});

const emptySubscriptionPlanForm = (): ManagedSubscriptionPlanForm => ({
  name: "",
  billingCycle: "monthly",
  deliveryRule: "",
  price: "",
  status: "active",
});

const emptyFormState = (brandId: number | null): ManagedProductFormState => ({
  brandId,
  code: "",
  name: "",
  slug: "",
  series: "AP",
  productType: "physical",
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
  landingPath: "",
  shortCode: "",
  shortUrl: "",
  paymentMode: "sandbox",
  specs: [
    { key: "核心成分", value: "" },
    { key: "适用场景", value: "" },
  ],
  skus: [],
  subscriptionPlans: [],
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

const LOW_STOCK_THRESHOLD = 5;

function getInventorySignal(product: {
  productType?: string | null;
  skus?: Array<{ stockQty?: number | null; status?: string | null }>;
}) {
  const activeSkus = (product.skus ?? []).filter((sku) => sku.status !== "inactive");
  const totalStockQty = activeSkus.reduce((sum, sku) => sum + Math.max(sku.stockQty ?? 0, 0), 0);
  const lowStockSkuCount = activeSkus.filter((sku) => {
    const stockQty = Math.max(sku.stockQty ?? 0, 0);
    return stockQty > 0 && stockQty <= LOW_STOCK_THRESHOLD;
  }).length;
  const outOfStockSkuCount = activeSkus.filter((sku) => Math.max(sku.stockQty ?? 0, 0) === 0).length;
  const isInventoryTracked = product.productType === "physical" || product.productType === "rental";

  return {
    isInventoryTracked,
    activeSkuCount: activeSkus.length,
    totalStockQty,
    lowStockSkuCount,
    outOfStockSkuCount,
  };
}

const PRODUCT_META_SPEC_KEYS = {
  taobaoUrl: "__retail_taobao_url",
  tmallUrl: "__retail_tmall_url",
  miniProgramPath: "__retail_mini_program_path",
  wechatQrUrl: "__retail_wechat_qr_url",
  alipayQrUrl: "__retail_alipay_qr_url",
  detailImageUrls: "__retail_detail_image_urls",
  landingPath: "__retail_landing_path",
  shortCode: "__retail_short_code",
  shortUrl: "__retail_short_url",
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
    landingPath: "",
    shortCode: "",
    shortUrl: "",
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
    if (item.key === PRODUCT_META_SPEC_KEYS.landingPath) {
      meta.landingPath = item.value;
      return false;
    }
    if (item.key === PRODUCT_META_SPEC_KEYS.shortCode) {
      meta.shortCode = item.value;
      return false;
    }
    if (item.key === PRODUCT_META_SPEC_KEYS.shortUrl) {
      meta.shortUrl = item.value;
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

export function normalizeDetailImageValue(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isAllowedDetailImageUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/manus-storage/");
}

export function getDetailImageValidationError(value: string) {
  const detailImageEntries = normalizeDetailImageValue(value);
  if (detailImageEntries.some((item) => !isAllowedDetailImageUrl(item))) {
    return "详情长图仅支持 http(s) 或 /manus-storage/ 开头的图片地址。请先修正后再保存。";
  }
  if (detailImageEntries.length > 8) {
    return "详情长图当前最多支持 8 张，请先删减后再保存。";
  }
  return null;
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
  brandOptions?: AdminBrandOption[];
  onBrandChange?: (brandId: number) => void;
}) {
  const { activeBrandId, selectedBrandName, brandOptions = [], onBrandChange } = props;
  const utils = trpc.useUtils();
  const [seriesFilter, setSeriesFilter] = useState<ProductSeriesFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [formState, setFormState] = useState<ManagedProductFormState>(() => emptyFormState(activeBrandId));

  useEffect(() => {
    setFormState((current) => {
      if (current.id && current.brandId === activeBrandId) {
        return current;
      }
      if (current.id && current.brandId !== activeBrandId) {
        return emptyFormState(activeBrandId);
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

  const uploadProductImageMutation = trpc.admin.uploadProductImage.useMutation();

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
  const inventorySummary = useMemo(
    () =>
      products.reduce(
        (summary, product) => {
          const signal = getInventorySignal(product);
          return {
            trackedProductCount: summary.trackedProductCount + (signal.isInventoryTracked ? 1 : 0),
            activeSkuCount: summary.activeSkuCount + signal.activeSkuCount,
            totalStockQty: summary.totalStockQty + signal.totalStockQty,
            lowStockSkuCount: summary.lowStockSkuCount + signal.lowStockSkuCount,
            outOfStockSkuCount: summary.outOfStockSkuCount + signal.outOfStockSkuCount,
          };
        },
        {
          trackedProductCount: 0,
          activeSkuCount: 0,
          totalStockQty: 0,
          lowStockSkuCount: 0,
          outOfStockSkuCount: 0,
        },
      ),
    [products],
  );
  const selectedBrandOption = useMemo(
    () => brandOptions.find((item) => item.id === (formState.brandId ?? activeBrandId)) ?? null,
    [activeBrandId, brandOptions, formState.brandId],
  );

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
    if (formState.landingPath.trim()) {
      return formState.landingPath.trim();
    }
    const slug = formState.slug.trim();
    if (slug) {
      return `/product/${slug}`;
    }
    const fallbackCode = formState.code.trim().toLowerCase();
    return fallbackCode ? `/product/${fallbackCode}` : "";
  }, [formState.code, formState.landingPath, formState.slug]);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://preview.icloush.local";
  const landingUrl = useMemo(() => {
    return landingPath ? `${origin}${landingPath}` : "";
  }, [landingPath, origin]);
  const shortUrl = useMemo(() => {
    const relativeShortUrl = formState.shortUrl.trim();
    if (relativeShortUrl.startsWith("http://") || relativeShortUrl.startsWith("https://")) {
      return relativeShortUrl;
    }
    if (relativeShortUrl) {
      return `${origin}${relativeShortUrl.startsWith("/") ? relativeShortUrl : `/${relativeShortUrl}`}`;
    }
    return "";
  }, [formState.shortUrl, origin]);

  const beginEdit = (product: {
    id: number;
    brandId: number;
    code: string;
    name: string;
    slug: string;
    series: "AP" | "FC" | null;
    productType: "physical" | "service" | "rental" | "subscription" | string;
    price: number | null;
    status: string;
    imageUrl: string | null;
    subtitle: string | null;
    description: string | null;
    specs: ManagedProductSpec[];
    skus?: Array<{
      id?: number;
      skuCode: string;
      specName?: string | null;
      packSize?: string | null;
      basePrice: number;
      marketPrice?: number | null;
      stockQty?: number | null;
      minOrderQty?: number | null;
      status?: "active" | "inactive" | string | null;
      tierPrices?: Array<{
        id?: number;
        minQty: number;
        maxQty?: number | null;
        price: number;
        customerType?: "b2b" | "b2c" | "all" | string | null;
      }>;
    }>;
    subscriptionPlans?: Array<{
      id?: number;
      name: string;
      billingCycle?: "weekly" | "monthly" | "quarterly" | string | null;
      deliveryRule?: string | null;
      price: number;
      status?: "active" | "inactive" | string | null;
    }>;
  }) => {
    const retailMeta = extractRetailMeta(product.specs);
    setFormState({
      id: product.id,
      brandId: product.brandId,
      code: product.code,
      name: product.name,
      slug: product.slug,
      series: product.series ?? "AP",
      productType: product.productType === "service" || product.productType === "rental" || product.productType === "subscription" ? product.productType : "physical",
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
      landingPath: retailMeta.meta.landingPath,
      shortCode: retailMeta.meta.shortCode,
      shortUrl: retailMeta.meta.shortUrl,
      paymentMode: retailMeta.meta.paymentMode,
      specs: retailMeta.cleanSpecs.length > 0 ? retailMeta.cleanSpecs : [{ key: "核心成分", value: "" }],
      skus: (product.skus ?? []).map((sku) => ({
        id: sku.id,
        skuCode: sku.skuCode,
        specName: sku.specName ?? "",
        packSize: sku.packSize ?? "",
        basePrice: String(sku.basePrice ?? ""),
        marketPrice: typeof sku.marketPrice === "number" ? String(sku.marketPrice) : "",
        stockQty: typeof sku.stockQty === "number" ? String(sku.stockQty) : "0",
        minOrderQty: typeof sku.minOrderQty === "number" ? String(sku.minOrderQty) : "1",
        status: sku.status === "inactive" ? "inactive" : "active",
        tierPrices: (sku.tierPrices ?? []).map((tier) => ({
          id: tier.id,
          minQty: String(tier.minQty ?? 1),
          maxQty: typeof tier.maxQty === "number" ? String(tier.maxQty) : "",
          price: String(tier.price ?? ""),
          customerType: tier.customerType === "b2b" || tier.customerType === "b2c" ? tier.customerType : "all",
        })),
      })),
      subscriptionPlans: (product.subscriptionPlans ?? []).map((plan) => ({
        id: plan.id,
        name: plan.name,
        billingCycle: plan.billingCycle === "weekly" || plan.billingCycle === "quarterly" ? plan.billingCycle : "monthly",
        deliveryRule: plan.deliveryRule ?? "",
        price: String(plan.price ?? ""),
        status: plan.status === "inactive" ? "inactive" : "active",
      })),
    });
  };

  const resetForm = () => {
    setFormState(emptyFormState(activeBrandId));
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const resolvedBrandId = formState.brandId ?? activeBrandId;
    if (!file || !resolvedBrandId) {
      return;
    }

    try {
      const base64Data = await fileToBase64(file);
      const payload = await uploadProductImageMutation.mutateAsync({
        brandId: resolvedBrandId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        base64Data,
      });
      setFormState((current) => ({
        ...current,
        imageUrl: payload.url,
      }));
      sonnerToast.success("商品主图已上传，可直接用于 showroom 与 PDP。", {
        description: payload.url,
      });
    } catch (error) {
      sonnerToast.error(error instanceof Error ? error.message : "图片读取失败，请稍后重试。");
    } finally {
      event.target.value = "";
    }
  };

  const handleDetailUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const resolvedBrandId = formState.brandId ?? activeBrandId;
    if (files.length === 0 || !resolvedBrandId) {
      return;
    }

    try {
      const uploadedUrls: string[] = [];
      for (const file of files.slice(0, 8)) {
        const base64Data = await fileToBase64(file);
        const payload = await uploadProductImageMutation.mutateAsync({
          brandId: resolvedBrandId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          base64Data,
        });
        uploadedUrls.push(payload.url);
      }
      setFormState((current) => ({
        ...current,
        detailImageUrls: [...normalizeDetailImageValue(current.detailImageUrls), ...uploadedUrls].slice(0, 8).join("\n"),
      }));
      sonnerToast.success(`已上传 ${uploadedUrls.length} 张详情图，保存后会同步到 PDP。`);
    } catch (error) {
      sonnerToast.error(error instanceof Error ? error.message : "详情图上传失败，请稍后重试。");
    } finally {
      event.target.value = "";
    }
  };

  const submitProduct = () => {
    const resolvedBrandId = formState.brandId ?? activeBrandId;

    if (!resolvedBrandId) {
      sonnerToast.error("请先选择品牌，再录入商品。");
      return;
    }

    if (!formState.code.trim() || !formState.name.trim()) {
      sonnerToast.error("请至少填写商品代号与商品名称。");
      return;
    }

    const detailImageError = getDetailImageValidationError(formState.detailImageUrls);
    if (detailImageError) {
      sonnerToast.error(detailImageError);
      return;
    }

    const normalizedSkus = formState.skus
      .filter((sku) => sku.skuCode.trim())
      .map((sku) => ({
        id: sku.id,
        skuCode: sku.skuCode.trim(),
        specName: sku.specName.trim() || null,
        packSize: sku.packSize.trim() || null,
        basePrice: sku.basePrice.trim() ? Number(sku.basePrice) : formState.price.trim() ? Number(formState.price) : 0,
        marketPrice: sku.marketPrice.trim() ? Number(sku.marketPrice) : null,
        stockQty: sku.stockQty.trim() ? Number(sku.stockQty) : 0,
        minOrderQty: sku.minOrderQty.trim() ? Number(sku.minOrderQty) : 1,
        status: sku.status,
        tierPrices: sku.tierPrices
          .filter((tier) => tier.price.trim())
          .map((tier) => ({
            id: tier.id,
            minQty: tier.minQty.trim() ? Number(tier.minQty) : 1,
            maxQty: tier.maxQty.trim() ? Number(tier.maxQty) : null,
            price: Number(tier.price),
            customerType: tier.customerType,
          })),
      }));

    const normalizedSubscriptionPlans = formState.subscriptionPlans
      .filter((plan) => plan.name.trim())
      .map((plan) => ({
        id: plan.id,
        name: plan.name.trim(),
        billingCycle: plan.billingCycle,
        deliveryRule: plan.deliveryRule.trim() || null,
        price: plan.price.trim() ? Number(plan.price) : 0,
        status: plan.status,
      }));

    upsertProductMutation.mutate({
      id: formState.id,
      brandId: resolvedBrandId,
      code: formState.code,
      name: formState.name,
      slug: formState.slug || undefined,
      series: formState.series || null,
      productType: formState.productType,
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
      skus: normalizedSkus,
      subscriptionPlans: normalizedSubscriptionPlans,
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

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {[
            { label: "当前结果", value: `${products.length} 条` },
            { label: "ACTIVE", value: `${products.filter((item) => item.status === "active").length} 条` },
            { label: "库存跟踪 SKU", value: `${inventorySummary.activeSkuCount} 个` },
            { label: "低库存 / 缺货", value: `${inventorySummary.lowStockSkuCount} / ${inventorySummary.outOfStockSkuCount}` },
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
                      {(() => {
                        const inventorySignal = getInventorySignal(product);
                        return (
                          <>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{priceLabel(product.price)}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Specs {product.specs.length} 项</span>
                            {inventorySignal.isInventoryTracked ? (
                              <>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">SKU {inventorySignal.activeSkuCount} 个</span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">可售库存 {inventorySignal.totalStockQty}</span>
                                {inventorySignal.lowStockSkuCount > 0 ? (
                                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">低库存预警 {inventorySignal.lowStockSkuCount} 个</span>
                                ) : null}
                                {inventorySignal.outOfStockSkuCount > 0 ? (
                                  <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">缺货 SKU {inventorySignal.outOfStockSkuCount} 个</span>
                                ) : null}
                              </>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">非库存型商品</span>
                            )}
                            {product.specs.some((spec) => spec.key === PRODUCT_META_SPEC_KEYS.detailImageUrls && spec.value.trim()) ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">详情长图已挂载</span>
                            ) : null}
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">更新于 {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString("zh-CN") : "待同步"}</span>
                          </>
                        );
                      })()}
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
              <p className="mt-2 text-sm leading-7 text-slate-500">
                商品保存时会严格落到当前品牌上下文，避免跨品牌串台。当前归属：{selectedBrandOption?.name ?? selectedBrandName ?? "待选择品牌"}。
              </p>
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

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">品牌归属 / Brand Ownership</p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  运营在这里明确指定商品归属品牌；商品保存、图片上传、前台 `/shop` 货架与 PDP 查询都会沿用同一品牌上下文。
                </p>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-xs tracking-[0.22em] text-slate-500">
                BRAND ID · {formState.brandId ?? activeBrandId ?? "--"}
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">归属品牌</span>
                <select
                  value={formState.brandId ?? ""}
                  onChange={(event) => {
                    const nextBrandId = Number(event.target.value);
                    setFormState((current) => ({ ...current, brandId: nextBrandId }));
                    onBrandChange?.(nextBrandId);
                  }}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <option value="" disabled>
                    请选择品牌
                  </option>
                  {brandOptions.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                当前品牌说明：{selectedBrandOption?.shortName ?? selectedBrandOption?.name ?? selectedBrandName ?? "待同步品牌信息"}。如果要切换到“环洗朵”或 “iCloush LAB.” 等其他品牌，请先在此处切换后再录入商品。
              </div>
            </div>
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
            <div className="grid gap-4 md:grid-cols-4">
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
                <span className="text-sm font-medium text-slate-700">商品类型</span>
                <select
                  value={formState.productType}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      productType: event.target.value as ManagedProductFormState["productType"],
                      unit: event.target.value === "service" ? "项目" : event.target.value === "subscription" ? "月" : current.unit || "件",
                    }))
                  }
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <option value="physical">实物零售 / Physical</option>
                  <option value="service">服务方案 / Service</option>
                  <option value="rental">租赁方案 / Rental</option>
                  <option value="subscription">订阅计划 / Subscription</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">价格</span>
                <input
                  value={formState.price}
                  onChange={(event) => setFormState((current) => ({ ...current, price: event.target.value.replace(/[^0-9]/g, "") }))}
                  placeholder={formState.productType === "subscription" ? "例如：299（按月）" : "1280"}
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
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              当前商品模型：
              <span className="font-medium text-slate-900">
                {formState.productType === "physical"
                  ? "实物零售"
                  : formState.productType === "service"
                    ? "服务方案"
                    : formState.productType === "rental"
                      ? "设备租赁"
                      : "订阅计划"}
              </span>
              。当前已开始支持 SKU、订阅计划与阶梯价字段落库；下一步会继续补齐更完整的会员价与专用运营面板。
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">SKU & Tier Pricing / 规格、库存与阶梯价</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    为实物零售、租赁或需要分层报价的商品维护 SKU、库存与阶梯定价。服务型商品可保留为空，仅依赖下方订阅/方案模块。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormState((current) => ({
                      ...current,
                      skus: [...current.skus, emptySkuForm()],
                    }))
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <Plus className="h-4 w-4" />
                  新增 SKU
                </button>
              </div>
              {formState.skus.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm leading-7 text-slate-500">
                  还没有 SKU。若该商品需要库存、规格或会员阶梯价，请先新增至少一个 SKU。
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {formState.skus.map((sku, skuIndex) => (
                    <div key={`${sku.id ?? "draft"}-${skuIndex}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">SKU #{skuIndex + 1}</p>
                          <p className="mt-1 text-xs leading-6 text-slate-500">每个 SKU 都可以继续维护不同数量阶梯对应的散客 / B 端价格。</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormState((current) => ({
                              ...current,
                              skus: current.skus.filter((_, index) => index !== skuIndex),
                            }))
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-full border border-rose-200 px-3 text-xs text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          删除 SKU
                        </button>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">SKU 代号</span>
                          <input
                            value={sku.skuCode}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                skus: current.skus.map((item, index) =>
                                  index === skuIndex ? { ...item, skuCode: event.target.value.toUpperCase() } : item,
                                ),
                              }))
                            }
                            placeholder="HXD-LINEN-01"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">规格名</span>
                          <input
                            value={sku.specName}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                skus: current.skus.map((item, index) =>
                                  index === skuIndex ? { ...item, specName: event.target.value } : item,
                                ),
                              }))
                            }
                            placeholder="标准装 / 500ml"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">包装规格</span>
                          <input
                            value={sku.packSize}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                skus: current.skus.map((item, index) =>
                                  index === skuIndex ? { ...item, packSize: event.target.value } : item,
                                ),
                              }))
                            }
                            placeholder="12 瓶 / 箱"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">SKU 状态</span>
                          <select
                            value={sku.status}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                skus: current.skus.map((item, index) =>
                                  index === skuIndex ? { ...item, status: event.target.value as ManagedProductSkuForm["status"] } : item,
                                ),
                              }))
                            }
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            <option value="active">ACTIVE</option>
                            <option value="inactive">INACTIVE</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">基础售价</span>
                          <input
                            value={sku.basePrice}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                skus: current.skus.map((item, index) =>
                                  index === skuIndex ? { ...item, basePrice: event.target.value.replace(/[^0-9]/g, "") } : item,
                                ),
                              }))
                            }
                            placeholder="1280"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">吊牌价 / 市场价</span>
                          <input
                            value={sku.marketPrice}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                skus: current.skus.map((item, index) =>
                                  index === skuIndex ? { ...item, marketPrice: event.target.value.replace(/[^0-9]/g, "") } : item,
                                ),
                              }))
                            }
                            placeholder="1680"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">库存</span>
                          <input
                            value={sku.stockQty}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                skus: current.skus.map((item, index) =>
                                  index === skuIndex ? { ...item, stockQty: event.target.value.replace(/[^0-9]/g, "") } : item,
                                ),
                              }))
                            }
                            placeholder="100"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">最小起订量</span>
                          <input
                            value={sku.minOrderQty}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                skus: current.skus.map((item, index) =>
                                  index === skuIndex ? { ...item, minOrderQty: event.target.value.replace(/[^0-9]/g, "") } : item,
                                ),
                              }))
                            }
                            placeholder="1"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">Tier Prices / 阶梯价</p>
                            <p className="mt-1 text-xs leading-6 text-slate-500">例如散客零售价、酒店集采价、批量采购价，都可以挂在同一个 SKU 下。</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setFormState((current) => ({
                                ...current,
                                skus: current.skus.map((item, index) =>
                                  index === skuIndex
                                    ? {
                                        ...item,
                                        tierPrices: [...item.tierPrices, emptyTierPriceForm()],
                                      }
                                    : item,
                                ),
                              }))
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                          >
                            <Plus className="h-4 w-4" />
                            新增阶梯价
                          </button>
                        </div>
                        {sku.tierPrices.length === 0 ? (
                          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-xs leading-6 text-slate-500">
                            暂未录入阶梯价，前台将默认使用 SKU 基础售价。
                          </div>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {sku.tierPrices.map((tier, tierIndex) => (
                              <div key={`${tier.id ?? "draft"}-${tierIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[0.8fr_0.8fr_0.9fr_1fr_auto]">
                                <label className="block">
                                  <span className="text-xs font-medium text-slate-600">起始数量</span>
                                  <input
                                    value={tier.minQty}
                                    onChange={(event) =>
                                      setFormState((current) => ({
                                        ...current,
                                        skus: current.skus.map((item, index) =>
                                          index === skuIndex
                                            ? {
                                                ...item,
                                                tierPrices: item.tierPrices.map((tierItem, innerIndex) =>
                                                  innerIndex === tierIndex ? { ...tierItem, minQty: event.target.value.replace(/[^0-9]/g, "") } : tierItem,
                                                ),
                                              }
                                            : item,
                                        ),
                                      }))
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-medium text-slate-600">截止数量</span>
                                  <input
                                    value={tier.maxQty}
                                    onChange={(event) =>
                                      setFormState((current) => ({
                                        ...current,
                                        skus: current.skus.map((item, index) =>
                                          index === skuIndex
                                            ? {
                                                ...item,
                                                tierPrices: item.tierPrices.map((tierItem, innerIndex) =>
                                                  innerIndex === tierIndex ? { ...tierItem, maxQty: event.target.value.replace(/[^0-9]/g, "") } : tierItem,
                                                ),
                                              }
                                            : item,
                                        ),
                                      }))
                                    }
                                    placeholder="留空表示无上限"
                                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-medium text-slate-600">阶梯价</span>
                                  <input
                                    value={tier.price}
                                    onChange={(event) =>
                                      setFormState((current) => ({
                                        ...current,
                                        skus: current.skus.map((item, index) =>
                                          index === skuIndex
                                            ? {
                                                ...item,
                                                tierPrices: item.tierPrices.map((tierItem, innerIndex) =>
                                                  innerIndex === tierIndex ? { ...tierItem, price: event.target.value.replace(/[^0-9]/g, "") } : tierItem,
                                                ),
                                              }
                                            : item,
                                        ),
                                      }))
                                    }
                                    placeholder="980"
                                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-medium text-slate-600">客户类型</span>
                                  <select
                                    value={tier.customerType}
                                    onChange={(event) =>
                                      setFormState((current) => ({
                                        ...current,
                                        skus: current.skus.map((item, index) =>
                                          index === skuIndex
                                            ? {
                                                ...item,
                                                tierPrices: item.tierPrices.map((tierItem, innerIndex) =>
                                                  innerIndex === tierIndex
                                                    ? { ...tierItem, customerType: event.target.value as ManagedProductTierPriceForm["customerType"] }
                                                    : tierItem,
                                                ),
                                              }
                                            : item,
                                        ),
                                      }))
                                    }
                                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                  >
                                    <option value="all">ALL</option>
                                    <option value="b2c">B2C</option>
                                    <option value="b2b">B2B</option>
                                  </select>
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormState((current) => ({
                                      ...current,
                                      skus: current.skus.map((item, index) =>
                                        index === skuIndex
                                          ? {
                                              ...item,
                                              tierPrices: item.tierPrices.filter((_, innerIndex) => innerIndex !== tierIndex),
                                            }
                                          : item,
                                      ),
                                    }))
                                  }
                                  className="mt-6 inline-flex h-10 items-center justify-center rounded-full border border-rose-200 px-3 text-xs text-rose-600 transition hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Subscription Plans / 服务订阅与周期计划</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    面向环洗朵 DaaS、香氛 FaaS 等服务 / 订阅模型，支持按周、按月、按季度配置方案价格与履约说明。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormState((current) => ({
                      ...current,
                      subscriptionPlans: [...current.subscriptionPlans, emptySubscriptionPlanForm()],
                    }))
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <Plus className="h-4 w-4" />
                  新增订阅计划
                </button>
              </div>
              {formState.subscriptionPlans.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm leading-7 text-slate-500">
                  当前没有订阅计划。如果该商品属于月结、租赁或持续服务方案，可在此补录专属计划。
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {formState.subscriptionPlans.map((plan, planIndex) => (
                    <div key={`${plan.id ?? "draft"}-${planIndex}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">计划 #{planIndex + 1}</p>
                          <p className="mt-1 text-xs leading-6 text-slate-500">支持写入计费周期、履约方式与价格，用于后续沙盒订单和服务型商品流转。</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormState((current) => ({
                              ...current,
                              subscriptionPlans: current.subscriptionPlans.filter((_, index) => index !== planIndex),
                            }))
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-full border border-rose-200 px-3 text-xs text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          删除计划
                        </button>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <label className="block xl:col-span-2">
                          <span className="text-sm font-medium text-slate-700">计划名称</span>
                          <input
                            value={plan.name}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                subscriptionPlans: current.subscriptionPlans.map((item, index) =>
                                  index === planIndex ? { ...item, name: event.target.value } : item,
                                ),
                              }))
                            }
                            placeholder="环洗朵月度洁净维保计划"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">计费周期</span>
                          <select
                            value={plan.billingCycle}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                subscriptionPlans: current.subscriptionPlans.map((item, index) =>
                                  index === planIndex ? { ...item, billingCycle: event.target.value as ManagedSubscriptionPlanForm["billingCycle"] } : item,
                                ),
                              }))
                            }
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            <option value="weekly">按周 / Weekly</option>
                            <option value="monthly">按月 / Monthly</option>
                            <option value="quarterly">按季度 / Quarterly</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">计划价格</span>
                          <input
                            value={plan.price}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                subscriptionPlans: current.subscriptionPlans.map((item, index) =>
                                  index === planIndex ? { ...item, price: event.target.value.replace(/[^0-9]/g, "") } : item,
                                ),
                              }))
                            }
                            placeholder="299"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">状态</span>
                          <select
                            value={plan.status}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                subscriptionPlans: current.subscriptionPlans.map((item, index) =>
                                  index === planIndex ? { ...item, status: event.target.value as ManagedSubscriptionPlanForm["status"] } : item,
                                ),
                              }))
                            }
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            <option value="active">ACTIVE</option>
                            <option value="inactive">INACTIVE</option>
                          </select>
                        </label>
                        <label className="block md:col-span-2 xl:col-span-5">
                          <span className="text-sm font-medium text-slate-700">履约说明 / Delivery Rule</span>
                          <input
                            value={plan.deliveryRule}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                subscriptionPlans: current.subscriptionPlans.map((item, index) =>
                                  index === planIndex ? { ...item, deliveryRule: event.target.value } : item,
                                ),
                              }))
                            }
                            placeholder="按月上门维保 1 次，设备免押租赁，耗材按季度补给"
                            className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Rich Content / 详情长图发布</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">支持每行填写 1 个详情图 URL，或直接上传多张详情图。保存后，前台 PDP 将按顺序渲染这些长图，用于承接淘宝/京东式沉浸详情浏览。</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
                  <ImagePlus className="h-4 w-4" />
                  批量上传详情图
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleDetailUpload} />
                </label>
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
              <p className="mt-3 text-xs leading-6 text-slate-500">当前已挂载 {detailImageCount} 张详情图，仅接受 http(s) 或 /manus-storage/ 地址，最多支持 8 张。上传后可继续手动调整顺序。</p>
              {detailImageCount > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {normalizeDetailImageValue(formState.detailImageUrls).map((item, index) => (
                    <span key={`${item}-${index}`} className="rounded-full bg-white px-3 py-1 text-[11px] text-slate-600">
                      #{index + 1} {item.split("/").pop() || item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Landing Distribution / H5 落地页与二维码</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">保存商品后，服务端会自动生成落地页路径、短链短码与 `/s/:code` 分发短链。二维码预览默认绑定短链，便于运营直接投放与后续替换正式域名。</p>
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
                    <span className="text-sm font-medium text-slate-700">H5 原始链接</span>
                    <div className="mt-2 flex gap-3">
                      <input value={landingUrl} readOnly placeholder="保存后自动生成" className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" />
                      {landingUrl ? (
                        <a href={landingUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">服务端短码</span>
                    <input value={formState.shortCode} readOnly placeholder="保存后由服务端生成" className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">正式分发短链</span>
                    <div className="mt-2 flex gap-3">
                      <input value={shortUrl} readOnly placeholder="保存后自动生成 /s/:code" className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" />
                      {shortUrl ? (
                        <a href={shortUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </label>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  {shortUrl ? (
                    <div className="space-y-3">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shortUrl)}`} alt="商品分发短链二维码" className="w-full rounded-2xl border border-slate-100" />
                      <p className="text-xs leading-6 text-slate-500">二维码当前绑定服务端短链。若后续切正式域名，只需保持短链路由可用即可延续线下物料投放。</p>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-xs leading-6 text-slate-400">
                      先保存一次商品，
                      <br />
                      再自动生成短链二维码。
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
              disabled={upsertProductMutation.isPending || !(formState.brandId ?? activeBrandId)}
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
