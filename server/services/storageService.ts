import path from "path";
import fs from "fs";
import { uploadFile, getFileUrl } from "../../src/lib/supabaseStorage";
import { hasSupabaseCredentials } from "./supabaseAdmin";

// In-memory file cache fallback
export const localFiles = new Map<string, { buffer: Buffer; contentType: string }>();

// Persistent Local Disk Storage Fallback
export const STORAGE_DIR = path.join(process.cwd(), ".data", "storage");
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    console.error("[Disk Storage] Failed to create storage directory:", e);
  }
}

export function saveLocalFile(key: string, buffer: Buffer, contentType: string): void {
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = path.join(STORAGE_DIR, safeKey);
    fs.writeFileSync(filePath, buffer);
    fs.writeFileSync(filePath + ".meta", JSON.stringify({ contentType }));
    console.log(`[Disk Storage] Persisted file to disk: ${filePath}`);
  } catch (e) {
    console.error("[Disk Storage] Failed to write file to disk:", e);
  }
}

export function getLocalFile(key: string): { buffer: Buffer; contentType: string } | null {
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = path.join(STORAGE_DIR, safeKey);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      let contentType = "application/octet-stream";
      if (fs.existsSync(filePath + ".meta")) {
        const meta = JSON.parse(fs.readFileSync(filePath + ".meta", "utf8"));
        contentType = meta.contentType || contentType;
      }
      return { buffer, contentType };
    }
  } catch (e) {
    console.error("[Disk Storage] Failed to read file from disk:", e);
  }
  return null;
}

export function saveLocalFileAndMemory(key: string, buffer: Buffer, contentType: string): void {
  localFiles.set(key, { buffer, contentType });
  saveLocalFile(key, buffer, contentType);
}

export async function uploadFileToStorage(
  key: string,
  fileData: string,
  contentType?: string
): Promise<{ success: boolean; key: string }> {
  let base64String = fileData;
  if (base64String.includes(";base64,")) {
    base64String = base64String.split(";base64,")[1];
  }
  const buffer = Buffer.from(base64String, "base64");
  const finalContentType = contentType || "application/octet-stream";

  if (!hasSupabaseCredentials()) {
    saveLocalFileAndMemory(key, buffer, finalContentType);
    console.log(`[Storage Fallback] Stored file locally in-memory & disk (No Supabase Credentials) for key: ${key}`);
    return { success: true, key };
  }

  try {
    await uploadFile(key, buffer, finalContentType);
    console.log(`[Supabase Storage] Successfully uploaded file to key: ${key}`);
    return { success: true, key };
  } catch (storageError: any) {
    console.warn("[Supabase Storage] Upload failed. Falling back to in-memory & disk local storage.", storageError.message);
    saveLocalFileAndMemory(key, buffer, finalContentType);
    return { success: true, key };
  }
}

export async function getStorageUrl(key: string, expires?: string): Promise<string> {
  // If exists locally in memory or disk, serve raw URL
  if (localFiles.has(key) || getLocalFile(key)) {
    return `/api/storage/raw?key=${encodeURIComponent(key)}`;
  }

  if (!hasSupabaseCredentials()) {
    return `/api/storage/raw?key=${encodeURIComponent(key)}`;
  }

  try {
    const expiresInSeconds = expires ? parseInt(expires, 10) : 3600;
    return await getFileUrl(key, "impacto-files", expiresInSeconds);
  } catch (storageError: any) {
    console.warn("[Supabase Storage] Failed to generate signed URL. Returning local raw route.", storageError.message);
    return `/api/storage/raw?key=${encodeURIComponent(key)}`;
  }
}
