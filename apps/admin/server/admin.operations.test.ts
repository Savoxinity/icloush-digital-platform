import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn(async () => ({}) as never));
const getPlatformSnapshotMock = vi.hoisted(() => vi.fn());
const getAdminOperationsSnapshotMock = vi.hoisted(() => vi.fn());
const upsertSiteContactConfigMock = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({
  getDb: getDbMock,
  getPlatformSnapshot: getPlatformSnapshotMock,
  getAdminOperationsSnapshot: getAdminOperationsSnapshotMock,
  upsertSiteContactConfig: upsertSiteContactConfigMock,
}));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "sample-user",
    unionId: null,
    mobile: null,
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    accountType: "personal",
    globalRole: "admin",
    status: "active",
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    lastSignedIn: new Date("2026-04-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createContext(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

describe("admin operations router", () => {
  beforeEach(() => {
    getDbMock.mockClear();
    getPlatformSnapshotMock.mockReset();
    getAdminOperationsSnapshotMock.mockReset();
    upsertSiteContactConfigMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns admin operations snapshot for the selected brand scope", async () => {
    getAdminOperationsSnapshotMock.mockResolvedValue({
      generatedAt: "2026-04-10T18:05:00.000Z",
      scope: {
        brandId: 2,
        brandCode: "tech",
        brandName: "环洗朵科技",
        isGlobal: false,
      },
      products: {
        totals: {
          productCount: 8,
          activeCount: 6,
          draftCount: 2,
          categoryCount: 3,
          seoReadyCount: 5,
          contentReadyCount: 4,
        },
        products: [],
        brandViews: [],
        alerts: ["仍有 2 个商品处于草稿态。"],
      },
      customers: {
        totals: {
          membershipCount: 5,
          activeMembershipCount: 4,
          pendingMembershipCount: 1,
          enterpriseAccountCount: 3,
          leadCount: 4,
          qualifiedLeadCount: 2,
        },
        customers: [],
        leads: [],
        brandViews: [],
        alerts: ["存在待跟进线索。"],
      },
      content: {
        totals: {
          siteCount: 1,
          storyReadyCount: 1,
          seoReadySiteCount: 1,
          productStoryCount: 3,
          leadCaptureCount: 2,
        },
        siteEntries: [],
        queue: [],
        alerts: ["品牌官网内容已同步。"],
      },
      seo: {
        totals: {
          siteMetaReadyCount: 1,
          productMetaReadyCount: 5,
          activeProductCount: 6,
          missingMetaCount: 1,
        },
        siteEntries: [],
        opportunities: [],
        alerts: ["剩余 1 项 SEO 字段待补齐。"],
      },
    });

    const caller = appRouter.createCaller(createContext(createUser({ globalRole: "admin" })));
    const result = await caller.admin.operations({ brandId: 2 });

    expect(getAdminOperationsSnapshotMock).toHaveBeenCalledWith({ brandId: 2 });
    expect(result.scope.brandName).toBe("环洗朵科技");
    expect(result.products.totals.productCount).toBe(8);
    expect(result.seo.totals.missingMetaCount).toBe(1);
  });

  it("blocks non-admin users from reading admin operations snapshot", async () => {
    const caller = appRouter.createCaller(createContext(createUser({ globalRole: "user" })));

    await expect(caller.admin.operations({ brandId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getAdminOperationsSnapshotMock).not.toHaveBeenCalled();
  });

  it("allows admin users to update lab contact config", async () => {
    upsertSiteContactConfigMock.mockResolvedValue({
      siteKey: "lab",
      headline: "更新后的 LAB 联系入口",
      description: "用于验证后台内容治理的联系配置保存能力。",
      primaryCtaLabel: "提交合作需求",
      primaryCtaHref: "/account",
      secondaryCtaLabel: "查看共创表单",
      secondaryCtaHref: "/shop",
      contactEmail: "lab@icloush.com",
      contactPhone: "400-820-2026",
      contactWechat: "iCloushLAB",
      contactAddress: "上海市闵行区研发协同中心 3F",
      serviceHours: "周一至周五 09:00-18:00",
      responseSla: "1 个工作日内答复",
    });

    const caller = appRouter.createCaller(createContext(createUser({ globalRole: "admin" })));
    const input = {
      siteKey: "lab" as const,
      contactScene: "business",
      headline: "更新后的 LAB 联系入口",
      description: "用于验证后台内容治理的联系配置保存能力。",
      primaryCtaLabel: "提交合作需求",
      primaryCtaHref: "/account",
      secondaryCtaLabel: "查看共创表单",
      secondaryCtaHref: "/shop",
      contactEmail: "lab@icloush.com",
      contactPhone: "400-820-2026",
      contactWechat: "iCloushLAB",
      contactAddress: "上海市闵行区研发协同中心 3F",
      serviceHours: "周一至周五 09:00-18:00",
      responseSla: "1 个工作日内答复",
    };

    const result = await caller.site.updateContactConfig(input);

    expect(upsertSiteContactConfigMock).toHaveBeenCalledWith(input);
    expect(result.headline).toBe("更新后的 LAB 联系入口");
  });

  it("blocks non-admin users from updating lab contact config", async () => {
    const caller = appRouter.createCaller(createContext(createUser({ globalRole: "user" })));

    await expect(
      caller.site.updateContactConfig({
        siteKey: "lab",
        contactScene: "business",
        headline: "无权限更新",
        description: "普通用户不应具备联系配置写入能力。",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(upsertSiteContactConfigMock).not.toHaveBeenCalled();
  });
});
