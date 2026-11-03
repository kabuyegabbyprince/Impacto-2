import express, { Express } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

/**
 * Attaches Vite development server middleware in development mode,
 * or static assets and SPA fallback in production mode.
 */
export async function setupViteOrStaticMiddleware(app: Express): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Vite Middleware] Vite development server attached.");
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Serve static compiled assets from dist/
    app.use(
      express.static(distPath, {
        maxAge: "1d",
      })
    );

    // Fallback all unspecified routes to index.html for client-side routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Static Middleware] Serving production build from /dist.");
  }
}
