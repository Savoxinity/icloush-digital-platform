# 腾讯云 Lighthouse 部署说明

本文档面向当前 **iCloush Digital Platform** 的首版云端部署。现阶段仓库中已经补齐了管理端应用的生产构建入口、`Dockerfile`、`.dockerignore` 与 `docker-compose.yml`，并且已经确认腾讯云正确实例为 `124.222.106.121`，可通过 `ubuntu` 用户与临时 SSH 密钥直接登录。

## 当前部署边界

当前仓库内真正具备可运行生产构建能力的前台/后台工作区，以 `apps/admin` 为主。它同时承载 React 前端与 Express/tRPC 服务端，适合作为第一阶段的云端主入口。`apps/web-b2b` 与 `apps/web-lab` 仍是占位脚手架，暂不纳入第一阶段服务器容器编排。

| 项目 | 当前状态 | 部署策略 |
| --- | --- | --- |
| `apps/admin` | 已具备 `build` / `start` 脚本 | 第一阶段作为主容器服务 |
| `apps/api-gateway` | 可独立构建，但未纳入首版 Compose | 后续按域名与网关拆分再加入 |
| `apps/web-b2b` | 仅占位脚手架 | 暂不部署 |
| `apps/web-lab` | 仅占位脚手架 | 暂不部署 |

## 生产环境变量

当前管理端在生产环境至少需要以下变量才能启动。为减少耦合，建议优先写入服务器项目根目录的 `.env` 文件，并由 `docker-compose.yml` 加载。

| 变量名 | 用途 | 是否必需 |
| --- | --- | --- |
| `DATABASE_URL` | MySQL / TiDB 连接串 | 必需 |
| `JWT_SECRET` | 会话签名密钥，长度至少 40 字符 | 必需 |
| `OAUTH_SERVER_URL` | Manus OAuth 服务地址 | 必需 |
| `VITE_APP_ID` | Manus OAuth 应用 ID | 必需 |
| `VITE_OAUTH_PORTAL_URL` | 前端登录门户地址 | 建议 |
| `VITE_FRONTEND_FORGE_API_KEY` | 前端内建能力访问令牌 | 按功能需要 |
| `VITE_FRONTEND_FORGE_API_URL` | 前端内建能力地址 | 按功能需要 |
| `OWNER_OPEN_ID` | 项目所有者标识 | 可选 |
| `BUILT_IN_FORGE_API_KEY` | 服务端内建能力访问令牌 | 按功能需要 |
| `BUILT_IN_FORGE_API_URL` | 服务端内建能力地址 | 按功能需要 |

## 服务器首版部署命令

在服务器的推荐目录中执行以下流程即可完成第一次拉起：

```bash
cd /srv
sudo mkdir -p /srv/icloush
sudo chown -R ubuntu:ubuntu /srv/icloush
cd /srv/icloush

git clone https://github.com/Savox/icloush-digital-platform.git app
cd app

# 写入 .env 后
sudo docker compose up -d --build
```

后续常规迭代建议保持为同一条链路：

```bash
cd /srv/icloush/app
git pull
sudo docker compose up -d --build
```

## 已补充的运行时修复

本轮为适配生产容器运行，还修复了管理端服务在 `dist` 构建产物下的目录解析问题。此前代码默认以开发目录结构推断 `adminRootDir` 与静态资源目录；在容器中运行 `dist/index.js` 时，这会把路径错误解析到 `apps/`。现在服务会根据当前运行位置自动识别 `apps/admin` 根目录，并从 `apps/admin/dist/public` 提供静态资源。

## 下一阶段建议

下一阶段应在服务器上继续补齐三项内容。首先是把当前仓库变更同步到远端 Git 仓库，并在 Lighthouse 上实际克隆代码目录。其次是将服务器 `.env` 写入完整生产变量，并执行第一次 `docker compose up -d --build`。最后再在容器稳定后补充 Nginx 反向代理、域名解析与 Let's Encrypt 证书，形成对外可访问的 `admin.icloush.com` 等入口。
