import "dotenv/config";
import express from "express";
import path from "path";
import apiRouter from "./server/routes/index";
import { spaFallbackMiddleware } from "./server/middleware/spaFallback";
import { setupViteOrStaticMiddleware } from "./server/middleware/viteMiddleware";

function getCliArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return undefined;
}

async function startServer() {
  const app = express();

  const portArg = getCliArg("--port");
  const hostArg = getCliArg("--host");

  const PORT = Number(process.env.PORT || portArg || 3000);
  const HOST = process.env.HOST || hostArg || "0.0.0.0";

  // JSON parsing with high limit for base64 file uploads
  app.use(express.json({ limit: "50mb" }));

  // Mount backend API routes and webhooks
  app.use(apiRouter);

  // Serve mobile app artifacts (/app/impacto.apk)
  app.use("/app", express.static(path.join(process.cwd(), "app")));

  // Handle SPA routing rewrites for custom vanity URLs like /@slug
  app.use(spaFallbackMiddleware);

  // Connect Vite middleware in dev or static dist in production
  await setupViteOrStaticMiddleware(app);

  let currentServer: ReturnType<typeof app.listen> | null = null;

  const tryListen = (attemptsLeft = 5, delayMs = 1000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const server = app.listen(PORT, HOST, () => {
        console.log(`[Impacto Monolith Server] running on http://${HOST}:${PORT}`);
        currentServer = server;
        resolve();
      });

      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
          console.warn(`[Impacto Monolith Server] Port ${PORT} busy, retrying in ${delayMs}ms... (${attemptsLeft} attempts remaining)`);
          setTimeout(() => {
            tryListen(attemptsLeft - 1, delayMs * 1.5).then(resolve).catch(reject);
          }, delayMs);
        } else {
          reject(err);
        }
      });
    });
  };

  await tryListen();

  const handleShutdown = (signal: string) => {
    console.log(`[Impacto Monolith Server] Received ${signal}. Closing server gracefully...`);
    if (currentServer) {
      currentServer.close(() => {
        console.log("[Impacto Monolith Server] Closed HTTP server.");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

startServer().catch((err) => {
  console.error("Critical server bootstrap failure:", err);
  process.exit(1);
});
