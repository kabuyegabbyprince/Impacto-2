/**
 * Client-side storage service to communicate with our Express backend for Supabase Storage.
 */

/**
 * Helper to convert a File object to a Base64 Data URL
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Helper to convert a File object to a Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let result = reader.result as string;
      // Extract base64 part
      if (result.includes(";base64,")) {
        result = result.split(";base64,")[1];
      }
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
  });
}

import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Uploads a file directly to Supabase Storage bucket
 */
export async function uploadFileToSupabase(file: File, bucketName: string, keyPrefix: string = "uploads"): Promise<string> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }
  // Validate file size
  const MAX_FILE_SIZE_MB = 50;
  if ((file.size || 0) > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error("File too large. Maximum size is 50MB.");
  }
  
  const fileName = file.name || "unnamed_file";
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const timestamp = Date.now();
  const uniqueKey = `${keyPrefix}/${timestamp}-${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(uniqueKey, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    throw error;
  }
  
  return `${bucketName}::${data.path}`;
}

/**
 * Resolves a key stored in the database to a public URL.
 */
export async function resolveFileUrl(path: string | undefined, bucketName: string = "impacto-files"): Promise<string> {
  if (!path) return "";
  
  let activeBucket = bucketName;
  let actualPath = path;

  // Extract hash fragment (like #show_header=true) to preserve it at the end
  let hashFragment = "";
  if (actualPath.includes("#")) {
    const hashIdx = actualPath.indexOf("#");
    hashFragment = actualPath.substring(hashIdx);
    actualPath = actualPath.substring(0, hashIdx);
  }

  // Extract query parameters to avoid sending them in the storage path
  let queryParams = "";
  if (actualPath.includes("?")) {
    const qIdx = actualPath.indexOf("?");
    queryParams = actualPath.substring(qIdx);
    actualPath = actualPath.substring(0, qIdx);
  }

  const isSupabaseUrl = actualPath.includes("/storage/v1/object/");

  if (isSupabaseUrl) {
    try {
      // E.g. https://[project-id].supabase.co/storage/v1/object/public/documents/orgId/file.txt
      const urlObj = new URL(actualPath);
      const segments = urlObj.pathname.split("/").filter(Boolean);
      // segments: ["storage", "v1", "object", "[public|authenticated|sign]", "bucketName", "file_path_segments..."]
      if (segments.length >= 5 && segments[0] === "storage" && segments[1] === "v1" && segments[2] === "object") {
        activeBucket = segments[4];
        actualPath = segments.slice(5).join("/");
      }
    } catch (e) {
      console.warn("Error parsing Supabase Storage URL in resolveFileUrl:", e);
    }
  } else if (
    actualPath.startsWith("/") ||
    actualPath.startsWith("http://") || 
    actualPath.startsWith("https://") || 
    actualPath.startsWith("data:") ||
    actualPath.startsWith("blob:") ||
    actualPath.startsWith("icon:")
  ) {
    // Relative paths, external non-Supabase URLs, direct blobs/base64s or icon strings returned as-is
    return path;
  } else if (actualPath.includes("::")) {
    const parts = actualPath.split("::");
    activeBucket = parts[0];
    actualPath = parts.slice(1).join("::");
  }

  if (!isSupabaseConfigured) {
    return path;
  }

  let data: { signedUrl: string } | null = null;
  let error: any = null;
  
  // We prioritize activeBucket, but if it fails (e.g. Object not found), we fall back
  // to trying other buckets in sequence. This prevents failures when buckets are mismatched.
  const candidateBuckets = [
    activeBucket,
    "documents",
    "chat-attachments",
    "impacto-files",
    "avatars"
  ].filter((b, idx, self) => b && self.indexOf(b) === idx);

  let successfulBucket = activeBucket;

  for (const bucket of candidateBuckets) {
    let attemptSucceeded = false;
    
    // Attempt with retry
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await supabase.storage
          .from(bucket)
          .createSignedUrl(actualPath, 86400); // 24 hours expiry
        
        if (res.data?.signedUrl) {
          data = res.data;
          successfulBucket = bucket;
          error = null;
          attemptSucceeded = true;
          break;
        }
        
        error = res.error;
      } catch (err: any) {
        error = err;
      }
      
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (attemptSucceeded) {
      break; // Found the file and signed it successfully!
    }
  }
  
  if (data?.signedUrl) {
    console.log("Resolved signed URL successfully on bucket:", successfulBucket, data.signedUrl);
    return data.signedUrl + hashFragment;
  }
  
  if (error) {
    console.warn("createSignedUrl failed on all buckets, falling back to public url:", error);
  }

  const { data: publicData } = supabase.storage.from(successfulBucket).getPublicUrl(actualPath);
  console.log("Resolved URL fallback bucket:", successfulBucket, publicData.publicUrl);
  return publicData.publicUrl + hashFragment;
}

