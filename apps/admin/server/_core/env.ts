type RawEnv = NodeJS.ProcessEnv;

type RequiredEnvKey = "appId" | "cookieSecret" | "databaseUrl" | "oAuthServerUrl";

type EnvAliases = {
  [K in RequiredEnvKey]: readonly string[];
};

export type AdminEnv = {
  appId: string;
  cookieSecret: string;
  databaseUrl: string;
  oAuthServerUrl: string;
  ownerOpenId: string;
  isProduction: boolean;
  forgeApiUrl: string;
  forgeApiKey: string;
};

const REQUIRED_ENV_ALIASES: EnvAliases = {
  appId: ["ADMIN_VITE_APP_ID", "VITE_APP_ID"],
  cookieSecret: ["ADMIN_JWT_SECRET", "JWT_SECRET"],
  databaseUrl: ["ADMIN_DATABASE_URL", "DATABASE_URL"],
  oAuthServerUrl: ["ADMIN_OAUTH_SERVER_URL", "OAUTH_SERVER_URL"],
};

const REQUIRED_ENV_LABELS: Record<RequiredEnvKey, string> = {
  appId: "Manus OAuth 应用 ID",
  cookieSecret: "JWT 会话签名密钥",
  databaseUrl: "数据库连接串",
  oAuthServerUrl: "OAuth 服务地址",
};

const MIN_COOKIE_SECRET_LENGTH = 40;
const RECOMMENDED_COOKIE_SECRET_PATTERN = /^[A-Za-z0-9]+$/;

function readRequiredEnv(source: RawEnv, key: RequiredEnvKey): string {
  const aliasCandidates = REQUIRED_ENV_ALIASES[key];
  const matchedKey = aliasCandidates.find(candidate => {
    const value = source[candidate]?.trim();
    return typeof value === "string" && value.length > 0;
  });
  const value = matchedKey ? source[matchedKey]!.trim() : "";

  if (!value) {
    throw new Error(
      `[ENV] 缺少必填环境变量 ${aliasCandidates.join(" 或 ")}（${REQUIRED_ENV_LABELS[key]}）。请在项目 secrets 或本地环境中配置后再启动 apps/admin。`
    );
  }

  if (key === "cookieSecret") {
    if (value.length < MIN_COOKIE_SECRET_LENGTH) {
      throw new Error(
        `[ENV] 环境变量 ${matchedKey ?? aliasCandidates[0]} 长度不足。为保证会话签名安全，至少需要 ${MIN_COOKIE_SECRET_LENGTH} 个字符。`
      );
    }

    if (!RECOMMENDED_COOKIE_SECRET_PATTERN.test(value)) {
      console.warn(
        `[ENV] 环境变量 ${matchedKey ?? aliasCandidates[0]} 已通过长度校验，但建议仅使用大小写字母与数字，以避免在不同环境中出现转义或拷贝问题。`
      );
    }
  }

  return value;
}

function readOptionalEnv(source: RawEnv, key: string, fallbackKey?: string): string {
  return source[key]?.trim() ?? source[fallbackKey ?? ""]?.trim() ?? "";
}

export function createAdminEnv(source: RawEnv = process.env): AdminEnv {
  return {
    appId: readRequiredEnv(source, "appId"),
    cookieSecret: readRequiredEnv(source, "cookieSecret"),
    databaseUrl: readRequiredEnv(source, "databaseUrl"),
    oAuthServerUrl: readRequiredEnv(source, "oAuthServerUrl"),
    ownerOpenId: readOptionalEnv(source, "OWNER_OPEN_ID"),
    isProduction: source.NODE_ENV === "production",
    forgeApiUrl: readOptionalEnv(source, "ADMIN_BUILT_IN_FORGE_API_URL", "BUILT_IN_FORGE_API_URL"),
    forgeApiKey: readOptionalEnv(source, "ADMIN_BUILT_IN_FORGE_API_KEY", "BUILT_IN_FORGE_API_KEY"),
  };
}

export const ENV = createAdminEnv();
