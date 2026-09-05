import { Request, Response, NextFunction } from "express";

/**
 * Custom middleware to handle SPA routing fallback for requests that do not match assets or API.
 * This is especially critical for paths like "/@slug" because Vite's fallback ignores paths
 * starting with "/@" (treating them as Vite internals).
 */
export function spaFallbackMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isApi = req.path.startsWith("/api");
  const isWebhook = req.path.startsWith("/webhooks");
  const isStaticAsset = req.path.includes(".") || req.path.startsWith("/assets");
  const isViteInternal =
    req.path.startsWith("/@vite") ||
    req.path.startsWith("/@fs") ||
    req.path.startsWith("/@id") ||
    req.path.startsWith("/@react-refresh");

  if (!isApi && !isWebhook && !isStaticAsset && !isViteInternal) {
    req.url = "/index.html";
  }
  next();
}
