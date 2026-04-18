import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, LoaderCircle, PencilLine, Plus, RefreshCw, Trash2 } from "lucide-react";
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
      specs: product.specs.length > 0 ? product.specs : [{ key: "核心成分", value: "" }],
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
      specs: formState.specs
        .map((item) => ({ key: item.key.trim(), value: item.value.trim() }))
        .filter((item) => item.key && item.value),
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
          <p className="mt-3 text-sm leading-7 text-slate-600">当前已填写 {totalSpecs} 项有效参数，可直接用于 PDP 数据面板。</p>
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
