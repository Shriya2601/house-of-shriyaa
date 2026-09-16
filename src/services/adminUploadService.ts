/**
 * Admin Production Image Upload Service
 * Communicates with /api/admin/upload directly without any dependency on Firebase Storage.
 */

export interface AdminUploadOptions {
  slot?: string;
  productId?: string;
  onProgress?: (percent: number) => void;
}

export interface AdminUploadResponse {
  success: boolean;
  url: string;
  key?: string;
  filename?: string;
  size?: number;
  contentType?: string;
  storageType?: string;
  error?: string;
}

export function getAdminAuthToken(): string {
  if (typeof window === "undefined") return "houseofshriya_admin_secure_session";
  try {
    const directToken =
      localStorage.getItem("hos_admin_session_token") ||
      localStorage.getItem("admin_auth_token") ||
      sessionStorage.getItem("hos_admin_session_token");
    if (directToken) return directToken;

    const adminUser = localStorage.getItem("hos_admin_user");
    if (adminUser) {
      const parsed = JSON.parse(adminUser);
      if (parsed?.token) return parsed.token;
      if (parsed?.email) return btoa(JSON.stringify({ email: parsed.email, role: "admin" }));
    }
  } catch {}
  return "houseofshriya_admin_secure_session";
}

/**
 * Uploads a banner, product photo, or gallery image directly to the production storage server.
 * Never uses Firebase Storage.
 * Always resolves to a permanent public URL.
 */
export async function uploadImageToAdminStorage(
  fileOrDataUrl: File | Blob | string,
  options: AdminUploadOptions = {}
): Promise<string> {
  const { slot = "image", productId, onProgress } = options;

  if (!fileOrDataUrl) {
    throw new Error("No image data provided for upload.");
  }

  // If already a permanent URL, return immediately without re-uploading
  if (typeof fileOrDataUrl === "string") {
    const trimmed = fileOrDataUrl.trim();
    if (!trimmed.startsWith("data:")) {
      return trimmed;
    }
  }

  onProgress?.(15);
  const token = getAdminAuthToken();

  let response: Response;

  try {
    if (fileOrDataUrl instanceof Blob) {
      const formData = new FormData();
      const filename = (fileOrDataUrl as File).name || `${slot}-${Date.now()}.jpg`;
      formData.append("file", fileOrDataUrl, filename);
      formData.append("slot", slot);
      if (productId) formData.append("productId", productId);

      onProgress?.(45);

      response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "x-admin-token": token,
        },
        body: formData,
      });
    } else {
      onProgress?.(45);
      response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          dataUrl: fileOrDataUrl,
          slot,
          productId,
        }),
      });
    }

    onProgress?.(80);

    if (!response.ok) {
      let errorDetail = `Upload request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error) errorDetail = errorJson.error;
      } catch {}
      throw new Error(errorDetail);
    }

    const result: AdminUploadResponse = await response.json();

    if (!result.success || !result.url) {
      throw new Error(result.error || "Server completed upload but did not return a permanent image URL.");
    }

    onProgress?.(100);
    return result.url;
  } catch (err: any) {
    console.error("[Admin Upload Error]:", err);
    throw new Error(err.message || "Failed to upload image to production storage.");
  }
}
