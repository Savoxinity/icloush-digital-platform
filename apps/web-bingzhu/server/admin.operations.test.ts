import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn(async () => ({}) as never));
const getPlatformSnapshotMock = vi.hoisted(() => vi.fn());
const getAdminOperationsSnapshotMock = vi.hoisted(() => vi.fn());
const upsertSiteContactConfigMock = vi.hoisted(() => vi.fn());
const listEnterpriseApplicationsByUserMock = vi.hoisted(() => vi.fn());
const submitEnterpriseApplicationMock = vi.hoisted(() => vi.fn());
const reviewEnterpriseApplicationMock = vi.hoisted(() => vi.fn());
const notifyOwnerMock = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({
  getDb: getDbMock,
  getPlatformSnapshot: getPlatformSnapshotMock,
  getAdminOperationsSnapshot: getAdminOperationsSnapshotMock,
  upsertSiteContactConfig: upsertSiteContactConfigMock,
  listEnterpriseApplicationsByUser: listEnterpriseApplicationsByUserMock,
  submitEnterpriseApplication: submitEnterpriseApplicationMock,
  reviewEnterpriseApplication: reviewEnterpriseApplicationMock,
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: notifyOwnerMock,
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
    listEnterpriseApplicationsByUserMock.mockReset();
    submitEnterpriseApplicationMock.mockReset();
    reviewEnterpriseApplicationMock.mockReset();
    notifyOwnerMock.mockReset();
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
        customers: [
          {
            membershipId: 15,
            brandId: 2,
            brandName: "环洗朵科技",
            userId: 88,
            displayName: "示例酒店集团",
            enterpriseName: "示例酒店集团",
            contactName: "王经理",
            memberType: "enterprise",
            status: "approved",
            priceLevel: "tier_pending_assignment",
            email: "buyer@example.com",
            mobile: "13800000000",
            accountType: "enterprise",
            globalRole: "user",
            lastSignedIn: "2026-04-10T09:00:00.000Z",
          },
        ],
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
    expect(result.customers.customers[0]?.priceLevel).toBe("tier_pending_assignment");
    expect(result.seo.totals.missingMetaCount).toBe(1);
  });

  it("blocks non-admin users from reading admin operations snapshot", async () => {
    const caller = appRouter.createCaller(createContext(createUser({ globalRole: "user" })));

    await expect(caller.admin.operations({ brandId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getAdminOperationsSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns the current user's enterprise applications within the selected brand scope", async () => {
    listEnterpriseApplicationsByUserMock.mockResolvedValue([
      {
        brandId: 2,
        brandCode: "tech",
        brandName: "环洗朵科技",
        memberType: "enterprise",
        enterpriseName: "示例酒店集团",
        contactName: "王经理",
        status: "pending",
        createdAt: "2026-04-10T10:00:00.000Z",
        updatedAt: "2026-04-10T10:00:00.000Z",
      },
    ]);

    const caller = appRouter.createCaller(createContext(createUser({ id: 88, globalRole: "user" })));
    const result = await caller.site.myEnterpriseApplications({ brandId: 2 });

    expect(listEnterpriseApplicationsByUserMock).toHaveBeenCalledWith({ userId: 88, brandId: 2 });
    expect(result).toHaveLength(1);
    expect(result[0]?.enterpriseName).toBe("示例酒店集团");
    expect(result[0]?.status).toBe("pending");
  });

  it("submits enterprise application and notifies owner", async () => {
    submitEnterpriseApplicationMock.mockResolvedValue({
      accepted: true,
      brandId: 2,
      brandCode: "tech",
      brandName: "环洗朵科技",
      membershipStatus: "pending",
      leadStatus: "pending",
      source: "database",
      receivedAt: "2026-04-10T10:00:00.000Z",
    });
    notifyOwnerMock.mockResolvedValue(true);

    const caller = appRouter.createCaller(createContext(createUser({ id: 23, globalRole: "user" })));
    const result = await caller.site.submitEnterpriseApplication({
      brandId: 2,
      sourcePage: "/account",
      enterpriseName: "示例酒店集团",
      contactName: "王经理",
      mobile: "13800000000",
      message: "希望接入企业采购与后台审核闭环。",
    });

    expect(submitEnterpriseApplicationMock).toHaveBeenCalledWith({
      brandId: 2,
      sourcePage: "/account",
      enterpriseName: "示例酒店集团",
      contactName: "王经理",
      mobile: "13800000000",
      message: "希望接入企业采购与后台审核闭环。",
      userId: 23,
    });
    expect(notifyOwnerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "[TECH] 新企业入驻申请",
      }),
    );
    expect(result.membershipStatus).toBe("pending");
    expect(result.notificationDelivered).toBe(true);
  });

  it("allows admin users to review enterprise applications and inject reviewer identity", async () => {
    reviewEnterpriseApplicationMock.mockResolvedValue({
      membershipId: 15,
      membershipStatus: "approved",
      leadStatus: "qualified",
      priceLevel: "tier_pending_assignment",
      reviewedAt: "2026-04-10T12:00:00.000Z",
      reviewNote: "已确认采购主体信息。",
    });

    const caller = appRouter.createCaller(createContext(createUser({ id: 7, globalRole: "admin" })));
    const result = await caller.admin.reviewEnterpriseApplication({
      brandId: 2,
      membershipId: 15,
      approved: true,
      reviewNote: "已确认采购主体信息。",
    });

    expect(reviewEnterpriseApplicationMock).toHaveBeenCalledWith({
      brandId: 2,
      membershipId: 15,
      approved: true,
      reviewedBy: 7,
      reviewNote: "已确认采购主体信息。",
    });
    expect(result.tenant).toEqual({ brandId: 2 });
    expect(result.membershipStatus).toBe("approved");
    expect(result.priceLevel).toBe("tier_pending_assignment");
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
