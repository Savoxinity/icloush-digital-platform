export const safeFallbackSecret = "0123456789abcdef0123456789abcdef01234567";
export const minimumSecretLength = 40;

export function applyVitestEnv(env: NodeJS.ProcessEnv = process.env) {
  env.NODE_ENV = env.NODE_ENV || "test";
  env.VITE_APP_ID = env.VITE_APP_ID || "app_test_123";
  env.DATABASE_URL = env.DATABASE_URL || "mysql://tester:secret@localhost:3306/icloush_test";
  env.OAUTH_SERVER_URL = env.OAUTH_SERVER_URL || "https://api.manus.im";

  if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < minimumSecretLength) {
    env.JWT_SECRET = safeFallbackSecret;
  }

  return env;
}

applyVitestEnv();
