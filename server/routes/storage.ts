import { Router } from "express";
import {
  localFiles,
  getLocalFile,
  uploadFileToStorage,
  getStorageUrl
} from "../services/storageService";
import { cleanValue } from "../services/supabaseAdmin";

const router = Router();

// GET /api/storage/raw - Raw Local File Reader Fallback
router.get("/raw", (req, res) => {
  const { key } = req.query;
  if (!key || typeof key !== "string") {
    return res.status(400).send("Missing key query parameter");
  }

  let file = localFiles.get(key);
  if (!file) {
    file = getLocalFile(key) || undefined;
    if (file) {
      localFiles.set(key, file);
    }
  }

  if (!file) {
    return res.status(404).send("File not found in local cache");
  }

  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000");
  res.send(file.buffer);
});

// POST /api/storage/upload - Upload file to storage
router.post("/upload", async (req, res) => {
  try {
    const { key, fileData, contentType } = req.body;
    if (!key || !fileData) {
      return res.status(400).json({ error: "Missing required fields: key and fileData are required." });
    }

    const result = await uploadFileToStorage(key, fileData, contentType);
    res.json(result);
  } catch (error: any) {
    console.error("[Storage API] Upload failed:", error);
    res.status(500).json({ error: "Failed to upload file.", details: error.message });
  }
});

// GET /api/storage/url - Signed or public storage URL
router.get("/url", async (req, res) => {
  try {
    const { key, expires } = req.query;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Missing required query parameter: key" });
    }

    const url = await getStorageUrl(key, expires ? String(expires) : undefined);
    res.json({ success: true, url });
  } catch (error: any) {
    console.error("[Storage API] Failed to generate URL:", error);
    res.status(500).json({ error: "Failed to resolve URL.", details: error.message });
  }
});

export default router;
