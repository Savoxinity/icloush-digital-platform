import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const adminRootDir = path.resolve(currentDir, "../..");
const workspaceRootDir = path.resolve(adminRootDir, "../..");

dotenv.config({ path: path.join(workspaceRootDir, ".env") });
dotenv.config({ path: path.join(adminRootDir, ".env"), override: false });

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const [{ registerOAuthRoutes }, { appRouter }, { createContext }, { serveStatic, setupVite }] =
    await Promise.all([
      import("./oauth"),
      import("../routers"),
      import("./context"),
      import("./vite"),
    ]);

  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
