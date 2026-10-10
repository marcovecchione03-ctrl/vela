/**
 * Storage Abstraction for Vela
 * 
 * Note: For Phase 3, this is a stub. True cloud storage (e.g. AWS S3, Cloudflare R2, Google Cloud Storage)
 * will be integrated in a future phase.
 */

export interface UploadResult {
  url: string;
  key: string;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadImage(file: File, folder: string = "uploads"): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Maximum size is 5MB.`);
  }

  // TODO: Replace with actual Cloud Storage provider upload logic.
  // For now, return a dummy placeholder URL to represent the upload.
  
  const dummyKey = `${folder}/stub-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
  const dummyUrl = `https://dummy-storage.vela.local/${dummyKey}`;
  
  console.warn("Storage provider is not configured. Stub URL returned:", dummyUrl);

  return {
    url: dummyUrl,
    key: dummyKey
  };
}
