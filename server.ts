import "dotenv/config";
import express from "express";
import path from "path";
import apiRouter from "./server/routes/index";
import { spaFallbackMiddleware } from "./server/middleware/spaFallback";
import { setupViteOrStaticMiddleware } from "./server/middleware/viteMiddleware";

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Impacto Monolith Server] running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server bootstrap failure:", err);
  process.exit(1);
});
