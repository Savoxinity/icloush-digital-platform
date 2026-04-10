import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  productCategories,
  products,
  productSkus,
  skuTierPrices,
} from "../../database/schema";

export type DatabaseClient = ReturnType<typeof drizzle>;
export type CustomerType = "b2b" | "b2c";

export type TierPriceRecord = {
  id?: number;
  minQty: number;
  maxQty: number | null;
  price: number;
  customerType: CustomerType | "all";
};

export type RequestedOrderItem = {
  productId: number;
  skuId: number;
  quantity: number;
};

export function resolveTierPrice(args: {
  basePrice: number;
  quantity: number;
  customerType: CustomerType;
  tierPrices: TierPriceRecord[];
}) {
  const matchedTier = [...args.tierPrices]
    .filter((tier) => {
      const customerTypeMatches = tier.customerType === "all" || tier.customerType === args.customerType;
      const minMatches = args.quantity >= tier.minQty;
      const maxMatches = tier.maxQty === null || args.quantity <= tier.maxQty;
      return customerTypeMatches && minMatches && maxMatches;
    })
    .sort((left, right) => right.minQty - left.minQty)[0];

  return {
    unitPrice: matchedTier?.price ?? args.basePrice,
    matchedTier: matchedTier ?? null,
  };
}

export async function listProductsWithPricing(args: {
  db: DatabaseClient;
  brandId: number;
  categorySlug?: string;
  customerType?: CustomerType;
  requestedQtyBySkuId?: Record<string, number>;
  includeInactive?: boolean;
}) {
  let categoryId: number | null = null;
  if (args.categorySlug) {
    const matchedCategory = await args.db
      .select()
      .from(productCategories)
      .where(
        and(eq(productCategories.brandId, args.brandId), eq(productCategories.slug, args.categorySlug)),
      )
      .limit(1);

    categoryId = matchedCategory[0]?.id ?? null;
  }

  const productRows = await args.db
    .select()
    .from(products)
    .where(
      and(
        eq(products.brandId, args.brandId),
        args.includeInactive ? undefined : eq(products.status, "active"),
        categoryId ? eq(products.categoryId, categoryId) : undefined,
      ),
    );

  if (productRows.length === 0) {
    return {
      items: [],
    };
  }

  const productIds = productRows.map((product) => product.id);
  const skuRows = await args.db
    .select()
    .from(productSkus)
    .where(
      and(
        eq(productSkus.brandId, args.brandId),
        inArray(productSkus.productId, productIds),
        args.includeInactive ? undefined : eq(productSkus.status, "active"),
      ),
    );

  const skuIds = skuRows.map((sku) => sku.id);
  const tierRows = skuIds.length
    ? await args.db
        .select()
        .from(skuTierPrices)
        .where(and(eq(skuTierPrices.brandId, args.brandId), inArray(skuTierPrices.skuId, skuIds)))
    : [];

  const tiersBySkuId = new Map<number, typeof tierRows>();
  for (const tier of tierRows) {
    const existing = tiersBySkuId.get(tier.skuId) ?? [];
    existing.push(tier);
    tiersBySkuId.set(tier.skuId, existing);
  }

  const skusByProductId = new Map<number, typeof skuRows>();
  for (const sku of skuRows) {
    const existing = skusByProductId.get(sku.productId) ?? [];
    existing.push(sku);
    skusByProductId.set(sku.productId, existing);
  }

  return {
    items: productRows.map((product) => {
      const skus = (skusByProductId.get(product.id) ?? []).map((sku) => {
        const requestedQty = args.requestedQtyBySkuId?.[String(sku.id)] ?? sku.minOrderQty ?? 1;
        const tierPreview = resolveTierPrice({
          basePrice: sku.basePrice,
          quantity: requestedQty,
          customerType: args.customerType ?? "b2b",
          tierPrices: (tiersBySkuId.get(sku.id) ?? []).map((tier) => ({
            id: tier.id,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            price: tier.price,
            customerType: tier.customerType,
          })),
        });

        return {
          ...sku,
          requestedQty,
          pricing: {
            pricingModel: "tiered" as const,
            unitPrice: tierPreview.unitPrice,
            lineAmount: tierPreview.unitPrice * requestedQty,
            matchedTier: tierPreview.matchedTier,
            tierTable: tiersBySkuId.get(sku.id) ?? [],
          },
        };
      });

      return {
        ...product,
        skus,
      };
    }),
  };
}

export async function priceOrderItems(args: {
  db: DatabaseClient;
  brandId: number;
  customerType: CustomerType;
  items: RequestedOrderItem[];
}) {
  const skuIds = args.items.map((item) => item.skuId);
  const productIds = Array.from(new Set(args.items.map((item) => item.productId)));

  const skuRows = await args.db
    .select()
    .from(productSkus)
    .where(and(eq(productSkus.brandId, args.brandId), inArray(productSkus.id, skuIds)));

  if (skuRows.length !== skuIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "提交的商品 SKU 中存在不属于当前品牌或不存在的记录。",
    });
  }

  const productRows = await args.db
    .select()
    .from(products)
    .where(and(eq(products.brandId, args.brandId), inArray(products.id, productIds)));

  if (productRows.length !== productIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "提交的商品中存在不属于当前品牌或不存在的记录。",
    });
  }

  const tierRows = await args.db
    .select()
    .from(skuTierPrices)
    .where(and(eq(skuTierPrices.brandId, args.brandId), inArray(skuTierPrices.skuId, skuIds)));

  const productById = new Map(productRows.map((product) => [product.id, product]));
  const skuById = new Map(skuRows.map((sku) => [sku.id, sku]));
  const tierBySkuId = new Map<number, typeof tierRows>();
  for (const tier of tierRows) {
    const existing = tierBySkuId.get(tier.skuId) ?? [];
    existing.push(tier);
    tierBySkuId.set(tier.skuId, existing);
  }

  const pricedItems = args.items.map((item) => {
    const sku = skuById.get(item.skuId);
    const product = productById.get(item.productId);
    if (!sku || !product || sku.productId !== product.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `商品 ${item.productId} 与 SKU ${item.skuId} 不匹配。`,
      });
    }

    const pricing = resolveTierPrice({
      basePrice: sku.basePrice,
      quantity: item.quantity,
      customerType: args.customerType,
      tierPrices: (tierBySkuId.get(sku.id) ?? []).map((tier) => ({
        id: tier.id,
        minQty: tier.minQty,
        maxQty: tier.maxQty,
        price: tier.price,
        customerType: tier.customerType,
      })),
    });

    return {
      item,
      sku,
      product,
      unitPrice: pricing.unitPrice,
      lineAmount: pricing.unitPrice * item.quantity,
      matchedTier: pricing.matchedTier,
    };
  });

  return {
    pricedItems,
    subtotalAmount: pricedItems.reduce((sum, current) => sum + current.lineAmount, 0),
  };
}
