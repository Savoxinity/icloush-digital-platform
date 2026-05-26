import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["../../packages/oms/src/index.test.ts"],
    environment: "node",
    globals: true,
  },
});
