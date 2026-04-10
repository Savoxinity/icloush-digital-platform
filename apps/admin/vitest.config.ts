import path from "node:path";
import { defineConfig } from "vitest/config";

const appRoot = path.resolve(import.meta.dirname);
const workspaceRoot = path.resolve(appRoot, "../..");

export default defineConfig({
  root: appRoot,
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
      "@shared": path.resolve(appRoot, "shared"),
      "@database": path.resolve(workspaceRoot, "packages/database"),
      "@assets": path.resolve(workspaceRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
