# Sprint 1 第 3–5 步评审稿：API Gateway 与 B2B 交易闭环骨架

## 一、当前实现范围

本轮已在 `apps/api-gateway` 中搭建基于 **Node.js + Express + tRPC** 的统一接口层骨架，并完成以下能力的第一版实现：

| 模块 | 当前状态 | 说明 |
| --- | --- | --- |
| API Gateway 工作区 | 已完成 | 新增独立包配置、TypeScript 配置、运行入口与测试配置 |
| 多租户识别 | 已完成 | 支持从请求头 `x-brand-id` / `brand_id` / `x-tenant-id` 或域名解析品牌租户 |
| 商品查询 | 已完成 | 支持按品牌读取 `products`、`productSkus`、`skuTierPrices` |
| 阶梯定价 | 已完成 | 按 `customerType + quantity` 计算 B2B / B2C 单价 |
| 创建订单 | 已完成 | 生成 `orders`、`orderItems`、`payments` 三类核心记录 |
| 微信支付预留 | 已完成 | 返回 JSAPI 支付占位参数结构，保留信用卡 / 分期扩展元数据 |
| 对公转账凭证上传 | 已完成 | 支持提交打款凭证 URL，并将订单扭转为 `under_review` |
| 单元测试 | 已完成 | 已覆盖租户识别、域名规范化、阶梯定价、微信支付草稿生成 |

## 二、当前目录位置

```text
apps/
  api-gateway/
    package.json
    tsconfig.json
    vitest.config.ts
    src/
      gateway.ts
      index.ts
    tests/
      gateway.test.ts
```

## 三、Router 结构总览

当前统一接口层集中定义在：

- `apps/api-gateway/src/gateway.ts`
- `apps/api-gateway/src/index.ts`

`tRPC Router` 结构如下：

```ts
appRouter
├─ health
├─ tenant
│  └─ resolve
├─ products
│  └─ list
├─ orders
│  └─ create
└─ payments
   └─ submitBankTransferReceipt
```

## 四、多租户识别机制

### 4.1 识别优先级

当前网关的租户解析逻辑如下：

| 优先级 | 来源 | 规则 |
| --- | --- | --- |
| 1 | 请求头 | `x-brand-id` / `brand_id` / `brand-id` / `x-tenant-id` |
| 2 | 域名 | 从 `x-forwarded-host` 或 `host` 中提取域名，与 `brands.domain` 匹配 |
| 3 | 兜底 | 未识别到租户时拒绝进入交易接口 |

### 4.2 上下文输出

解析成功后，接口上下文中会携带：

```ts
{
  brandId: number,
  brandCode?: string | null,
  brandName?: string | null,
  domain?: string | null,
  source: "header" | "host"
}
```

### 4.3 当前约束

> 当前实现已经满足“通过请求头或域名识别租户上下文”的 Sprint 1 要求；后续在小程序、官网接入时，只需把品牌标识透传给网关即可。

## 五、核心接口说明

### 5.1 `health`

用于健康检查。

```ts
health: public query
```

响应示例：

```json
{
  "service": "api-gateway",
  "ok": true,
  "timestamp": 1712614094000
}
```

---

### 5.2 `tenant.resolve`

用于验证当前请求命中的租户上下文。

```ts
tenant.resolve: tenantProcedure query
```

响应示例：

```json
{
  "tenant": {
    "brandId": 1,
    "brandCode": "hxed-tech",
    "brandName": "环洗朵科技",
    "domain": "b2b.icloush.com",
    "source": "header"
  }
}
```

---

### 5.3 `products.list`

用于获取当前品牌的商品列表，并返回按采购量实时计算后的阶梯价格。

#### 输入结构

```ts
{
  categorySlug?: string,
  customerType?: "b2b" | "b2c",
  requestedQtyBySkuId?: Record<string, number>,
  includeInactive?: boolean
}
```

#### 逻辑说明

接口会执行以下步骤：

| 步骤 | 说明 |
| --- | --- |
| 1 | 按 `tenant.brandId` 读取 `products` |
| 2 | 读取对应 `productSkus` |
| 3 | 读取对应 `skuTierPrices` |
| 4 | 依据 `customerType + requestedQty` 命中最合适阶梯价 |
| 5 | 返回 `pricing.unitPrice`、`lineAmount`、`matchedTier` 与完整阶梯表 |

#### 阶梯定价规则

当前定价函数：`resolveTierPrice()`

```ts
resolveTierPrice({
  basePrice,
  quantity,
  customerType,
  tierPrices,
})
```

命中原则：

1. 先过滤 `customerType === 当前客户类型` 或 `all`
2. 再过滤 `minQty <= quantity <= maxQty`
3. 按最大 `minQty` 优先，确保命中最深层档位
4. 若无任何阶梯命中，则回退到 `productSkus.basePrice`

#### 响应重点字段

```json
{
  "items": [
    {
      "id": 101,
      "name": "酒店布草碱剂",
      "skus": [
        {
          "id": 1001,
          "skuCode": "HXD-ALK-25KG",
          "requestedQty": 12,
          "pricing": {
            "pricingModel": "tiered",
            "unitPrice": 980,
            "lineAmount": 11760,
            "matchedTier": {
              "minQty": 10,
              "maxQty": 49,
              "price": 980,
              "customerType": "b2b"
            },
            "tierTable": []
          }
        }
      ]
    }
  ]
}
```

---

### 5.4 `orders.create`

用于创建订单主记录、订单行项目、支付记录，并根据支付方式返回不同的支付意图骨架。

#### 输入结构

```ts
{
  userId: number,
  membershipId?: number,
  customerType?: "b2b" | "b2c",
  orderType?: "b2b_purchase" | "b2c_purchase" | "subscription" | "service" | "rental",
  channel?: "admin" | "web" | "mini_program" | "sales_manual",
  note?: string,
  items: Array<{
    productId: number,
    skuId: number,
    quantity: number
  }>,
  payment: {
    provider: "wechat_jsapi" | "offline_bank_transfer",
    paymentScenario?: "full_payment" | "installment" | "credit_card",
    payerOpenId?: string,
    allowCreditCard?: boolean,
    installmentPlanCode?: string,
    meta?: Record<string, unknown>
  }
}
```

#### 当前做了什么

| 能力 | 当前实现 |
| --- | --- |
| 多租户隔离 | 所有订单数据强制写入当前 `tenant.brandId` |
| 成员关系校验 | 如果传入 `membershipId`，会校验是否属于当前品牌与用户 |
| 商品价格重算 | 服务端重新按照 `skuTierPrices` 计算单价，避免客户端作弊 |
| 订单号生成 | 自动生成 `ORD-{brandId}-{timestamp}-{random}` |
| 支付号生成 | 自动生成 `PAY-{brandId}-{timestamp}-{random}` |
| 支付记录生成 | 同步写入 `payments` |
| 微信支付占位 | 返回 JSAPI 草稿结构 |
| 对公转账占位 | 返回“待上传凭证”下一步提示 |

#### 微信支付返回骨架

当 `payment.provider = "wechat_jsapi"` 时，返回：

```json
{
  "paymentIntent": {
    "provider": "wechat_jsapi",
    "paymentScenario": "installment",
    "status": "pending_configuration",
    "capabilities": {
      "supportsCreditCard": true,
      "supportsInstallment": true
    },
    "jsapiParams": {
      "appId": null,
      "timeStamp": null,
      "nonceStr": null,
      "package": null,
      "signType": "RSA",
      "paySign": null
    },
    "metadata": {
      "brandId": 1,
      "orderId": 88,
      "orderNo": "ORD-1-...",
      "amount": 880000,
      "paymentScenario": "installment",
      "payerOpenId": "wx-open-id",
      "installmentPlanCode": "CMB-12M"
    }
  }
}
```

> 这部分已经满足你提出的关键要求：**当前接口模型已经保留“信用卡付款”和“分期付款”属性承载位**。后续接入真实微信支付时，只需把这里的占位参数替换为正式签名结果，而不必推翻订单接口协议。

---

### 5.5 `payments.submitBankTransferReceipt`

用于客户上传线下打款凭证 URL，并将订单状态流转为待审核。

#### 输入结构

```ts
{
  orderId: number,
  paymentId?: number,
  payerName?: string,
  payerAccountNo?: string,
  receiptFileKey?: string,
  receiptFileUrl: string
}
```

#### 当前状态流转

| 对象 | 更新结果 |
| --- | --- |
| `bankTransferReceipts` | 新增一条凭证记录，`reviewStatus = pending` |
| `orders` | `status = under_review`，`paymentStatus = offline_review` |
| `payments` | 若已有支付记录则改为 `reviewing`；若没有则自动补建 `offline_bank_transfer` 支付记录 |

#### 响应示例

```json
{
  "order": {
    "id": 88,
    "orderNo": "ORD-1-...",
    "status": "under_review",
    "paymentStatus": "offline_review"
  },
  "receipt": {
    "id": 12,
    "paymentId": 35,
    "reviewStatus": "pending",
    "receiptFileUrl": "https://cdn.example.com/receipt-001.png"
  }
}
```

## 六、当前代码文件说明

| 文件 | 作用 |
| --- | --- |
| `apps/api-gateway/src/index.ts` | Express 服务入口，挂载 `/health` 与 `/trpc` |
| `apps/api-gateway/src/gateway.ts` | 多租户解析、Router 定义、业务辅助函数核心文件 |
| `apps/api-gateway/tests/gateway.test.ts` | 单元测试，覆盖租户识别、阶梯定价与微信支付草稿生成 |
| `apps/api-gateway/vitest.config.ts` | API Gateway 的测试配置 |

## 七、已通过的测试

本轮已执行：

```bash
pnpm install
pnpm api:check
pnpm api:test
```

测试结果：

| 校验项 | 结果 |
| --- | --- |
| TypeScript 类型检查 | 通过 |
| API Gateway 单元测试 | 通过 |
| 已通过测试数 | 5 / 5 |

覆盖点包括：

1. 请求头中的品牌识别
2. 域名标准化处理
3. B2B 阶梯定价命中
4. 未命中阶梯价时回退基础价
5. 微信支付草稿的信用卡 / 分期能力元数据

## 八、当前仍是骨架、尚未接入的部分

为了与你的 Sprint 节奏一致，本轮先完成“可评审、可扩展、可继续落地”的核心协议层，以下部分仍待下一轮进入真实集成：

| 待实现项 | 说明 |
| --- | --- |
| 真实微信 JSAPI 下单 | 需接入微信商户参数、签名、回调验签与通知处理 |
| 分期资方映射 | 当前仅保留 `installmentPlanCode`，尚未接银行 / 通道规则 |
| 小程序身份体系 | 当前接口已支持 `payerOpenId`，但未接正式微信登录态 |
| 文件上传到 S3 | 当前凭证接口接收的是 URL，上传能力下一步建议通过统一文件服务接入 |
| 订单查询接口 | 本轮重点是商品、下单与支付闭环骨架，订单列表/详情可下一步补齐 |
| 后台审核接口 | 当前已把订单扭转到待审核，后台“审核通过/驳回”接口可在下一轮补完 |

## 九、建议的下一步

如果你认可这版 Router 结构，我建议下一轮按以下顺序推进：

1. **补 `orders.list` / `orders.detail` / `payments.detail` 查询接口**，形成最小闭环。
2. **接入微信支付配置层与签名服务**，把 `paymentIntent.jsapiParams` 从占位参数替换为真实返回。
3. **补管理后台审核接口**，完成“上传凭证 → 财务审核 → 订单转 paid / rejected”的闭环。
4. **为小程序商城准备鉴权与购物车接口**，把当前订单能力接入真实交易前台。

## 十、评审结论

本轮 `apps/api-gateway` 已经从占位目录升级为可运行、可测试、可扩展的统一接口层骨架，且已经满足你本次明确要求的四项重点：

- **支持按请求头或域名识别租户上下文**
- **支持环洗朵 B2B 商品查询与阶梯定价计算**
- **支持订单创建与微信 JSAPI 支付参数骨架输出**
- **支持线下打款凭证 URL 上传并将订单切换为待审核**

你确认后，我下一步就继续补齐：**订单查询接口、后台审核接口、微信支付真实接入层**。
