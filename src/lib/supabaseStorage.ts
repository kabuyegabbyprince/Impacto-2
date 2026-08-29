import { supabase } from "./supabase";

const DEFAULT_BUCKET = "impacto-files";

/**
 * Uploads a file buffer to Supabase Storage bucket
 */
export async function uploadFile(key: string, fileBuffer: Buffer | ArrayBuffer, contentType?: string, bucketName: string = DEFAULT_BUCKET) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(key, fileBuffer, {
      contentType: contentType || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw error;
  }
  return data;
}

export function dataUrlToUint8Array(dataUrl: string): { data: Uint8Array; contentType: string } {
  const parts = dataUrl.split(",");
  const contentType = parts[0].split(":")[1].split(";")[0];
  const base64Data = parts[1];
  
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { data: bytes, contentType };
}

/**
 * Generates a signed URL or retrieves public URL from Supabase Storage bucket
 */
export async function getFileUrl(key: string, bucketName: string = DEFAULT_BUCKET, expiresInSeconds: number = 3600) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(key, expiresInSeconds);

  if (error) {
    // Fallback to public URL if signed url creation fails (e.g., public bucket setup)
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(key);
    return publicData.publicUrl;
  }

  return data.signedUrl;
}
