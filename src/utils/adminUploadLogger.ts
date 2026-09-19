/**
 * Admin Upload Lifecycle Logger
 * Provides structured, high-visibility console tracking for the entire lifecycle
 * of file uploads across AdminPortal, AddProductModal, AdminProductManager, and AdminBannerManager.
 * 
 * Accurately diagnoses and logs:
 * - File selection & metadata extraction
 * - Client-side image pre-processing & compression ratios
 * - Firebase Storage upload attempts, real-time byte progress, and errors
 * - Server API / R2 endpoint HTTP requests, headers, and responses
 * - Firestore persistent mirror write operations, document paths, and errors
 * - Local memory & browser storage caching
 * - Overall lifecycle latency and final storage resolution
 */

export interface UploadLifecycleMetadata {
  sessionId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  slot: string;
  productId?: string;
  startTime: number;
}

export interface UploadStageError {
  stage: "PREPROCESSING" | "FIREBASE_STORAGE" | "SERVER_API" | "FIRESTORE" | "CACHE" | "UNKNOWN";
  error: any;
  code?: string;
  message: string;
  customDetails?: Record<string, any>;
}

// Global in-memory log buffer accessible via window.__hosUploadLogs in browser DevTools
declare global {
  interface Window {
    __hosUploadLogs?: Array<{
      sessionId: string;
      timestamp: string;
      stage: string;
      status: "INFO" | "SUCCESS" | "WARN" | "ERROR";
      message: string;
      details?: any;
    }>;
    __hosGetUploadDiagnostics?: () => void;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export class UploadLifecycleTracker {
  public sessionId: string;
  public metadata: UploadLifecycleMetadata;
  private stepTimes: Map<string, number> = new Map();

  constructor(fileOrName: File | Blob | string, slot = "general", productId?: string) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    this.sessionId = `UP-${timestamp}-${randomSuffix}`;

    const fileName =
      fileOrName instanceof File
        ? fileOrName.name
        : typeof fileOrName === "string"
        ? fileOrName.startsWith("data:")
          ? `data-url-${fileOrName.slice(0, 30)}...`
          : fileOrName.split("/").pop() || "unknown"
        : "blob-object";

    const fileSize =
      fileOrName instanceof Blob
        ? fileOrName.size
        : typeof fileOrName === "string"
        ? fileOrName.length
        : 0;

    const fileType =
      fileOrName instanceof Blob
        ? fileOrName.type || "application/octet-stream"
        : typeof fileOrName === "string" && fileOrName.startsWith("data:")
        ? fileOrName.split(";")[0].replace("data:", "")
        : "image/jpeg";

    this.metadata = {
      sessionId: this.sessionId,
      fileName,
      fileSize,
      fileType,
      slot,
      productId,
      startTime: timestamp,
    };

    this.recordGlobalLog("INIT", "INFO", `Initialized upload session for ${fileName}`, {
      slot,
      productId,
      size: formatBytes(fileSize),
      type: fileType,
    });
  }

  private recordGlobalLog(stage: string, status: "INFO" | "SUCCESS" | "WARN" | "ERROR", message: string, details?: any) {
    if (typeof window === "undefined") return;
    if (!window.__hosUploadLogs) {
      window.__hosUploadLogs = [];
    }
    window.__hosUploadLogs.push({
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      stage,
      status,
      message,
      details,
    });
    // Cap memory log buffer to last 100 entries to prevent memory buildup
    if (window.__hosUploadLogs.length > 100) {
      window.__hosUploadLogs.shift();
    }
  }

  /**
   * Log Stage 1: File Selected & Upload Lifecycle Start
   */
  public logStart(): void {
    const elapsed = Date.now() - this.metadata.startTime;
    console.groupCollapsed(
      `%c[Upload Lifecycle] %c🚀 [STAGE 1: START] %c${this.metadata.fileName} (%c${formatBytes(this.metadata.fileSize)}%c) [${this.sessionId}]`,
      "color: #4338ca; font-weight: bold;",
      "background: #4338ca; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #1e293b; font-weight: 600;",
      "color: #0284c7; font-weight: bold;",
      "color: #1e293b; font-weight: 600;"
    );
    console.log("Upload Session Details:", {
      sessionId: this.sessionId,
      fileName: this.metadata.fileName,
      rawBytes: this.metadata.fileSize,
      formattedSize: formatBytes(this.metadata.fileSize),
      mimeType: this.metadata.fileType,
      targetSlot: this.metadata.slot,
      productId: this.metadata.productId || "None (General Upload)",
      startedAt: new Date(this.metadata.startTime).toLocaleTimeString(),
    });
    console.groupEnd();

    this.stepTimes.set("start", Date.now());
  }

  /**
   * Log Stage 2: Client Pre-processing & Canvas Optimization
   */
  public logPreprocessing(originalBytes: number, compressedBytes: number, mimeType: string, width?: number, height?: number): void {
    const duration = Date.now() - (this.stepTimes.get("start") || this.metadata.startTime);
    const reduction = originalBytes > 0 ? (((originalBytes - compressedBytes) / originalBytes) * 100).toFixed(1) : "0";

    console.groupCollapsed(
      `%c[Upload Lifecycle] %c🎨 [STAGE 2: PRE-PROCESSING] %cOptimized to ${formatBytes(compressedBytes)} (%c-${reduction}%%c) in ${duration}ms`,
      "color: #4338ca; font-weight: bold;",
      "background: #0284c7; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #0f172a; font-weight: 600;",
      "color: #16a34a; font-weight: bold;",
      "color: #0f172a; font-weight: 600;"
    );
    console.log("Compression Metrics:", {
      originalSize: formatBytes(originalBytes),
      compressedSize: formatBytes(compressedBytes),
      reduction: `${reduction}%`,
      targetMime: mimeType,
      dimensions: width && height ? `${width} x ${height} px` : "Dynamic scale",
      durationMs: duration,
    });
    console.groupEnd();

    this.recordGlobalLog("PREPROCESSING", "SUCCESS", `Compressed ${formatBytes(originalBytes)} -> ${formatBytes(compressedBytes)} (-${reduction}%)`, {
      originalBytes,
      compressedBytes,
      duration,
    });

    this.stepTimes.set("preprocessing", Date.now());
  }

  /**
   * Log Stage 3A: Firebase Storage - Initiation
   */
  public logFirebaseStorageStart(bucket: string, storagePath: string): void {
    this.stepTimes.set("firebaseStorage", Date.now());
    console.log(
      `%c[Upload Lifecycle] %c📦 [STAGE 3A: FIREBASE STORAGE] %cInitiating upload to bucket: %c${bucket}%c path: %c${storagePath}`,
      "color: #4338ca; font-weight: bold;",
      "background: #ea580c; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #334155; font-weight: normal;",
      "color: #ea580c; font-weight: bold;",
      "color: #334155; font-weight: normal;",
      "color: #2563eb; font-weight: bold;"
    );
    this.recordGlobalLog("FIREBASE_STORAGE", "INFO", `Started upload to gs://${bucket}/${storagePath}`);
  }

  /**
   * Log Stage 3B: Firebase Storage - Progress
   */
  public logFirebaseStorageProgress(percent: number, bytesTransferred?: number, totalBytes?: number): void {
    const transferredText = bytesTransferred && totalBytes ? ` (${formatBytes(bytesTransferred)} / ${formatBytes(totalBytes)})` : "";
    console.log(
      `%c[Upload Lifecycle] %c⏳ [FIREBASE STORAGE PROGRESS] %c${percent}%${transferredText}`,
      "color: #4338ca; font-weight: bold;",
      "background: #f59e0b; color: #1e293b; padding: 1px 5px; border-radius: 3px; font-weight: bold;",
      "color: #b45309; font-weight: 600;"
    );
  }

  /**
   * Log Stage 3C: Firebase Storage - Success
   */
  public logFirebaseStorageSuccess(downloadUrl: string): void {
    const startTime = this.stepTimes.get("firebaseStorage") || this.metadata.startTime;
    const duration = Date.now() - startTime;

    console.groupCollapsed(
      `%c[Upload Lifecycle] %c✅ [FIREBASE STORAGE: SUCCESS] %cReceived permanent download URL in ${duration}ms`,
      "color: #4338ca; font-weight: bold;",
      "background: #16a34a; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #15803d; font-weight: 600;"
    );
    console.log("Firebase Storage Result:", {
      downloadUrl,
      durationMs: duration,
      bucketResolved: downloadUrl.includes("firebasestorage.googleapis.com") ? "Google Cloud Storage / Firebase Storage" : "Custom/Proxy",
    });
    console.groupEnd();

    this.recordGlobalLog("FIREBASE_STORAGE", "SUCCESS", `Completed in ${duration}ms. Download URL obtained.`, {
      downloadUrl,
      duration,
    });
  }

  /**
   * Log Stage 3D: Firebase Storage - Error Diagnostics
   */
  public logFirebaseStorageError(error: any, bucket?: string, path?: string): void {
    const startTime = this.stepTimes.get("firebaseStorage") || this.metadata.startTime;
    const duration = Date.now() - startTime;

    const errorCode = error?.code || error?.name || "STORAGE_UNKNOWN_ERROR";
    const errorMessage = error?.message || String(error);
    const serverResponse = error?.customData?.serverResponse || error?.serverResponse || null;
    const httpStatus = error?.status || error?.statusCode || null;

    let diagnosis = "An unknown error occurred during Firebase Storage communication.";
    if (errorCode === "storage/unauthorized" || errorCode === "storage/permission-denied") {
      diagnosis = "Firebase Storage Security Rules evaluated to FALSE. Upload was rejected because current user is not authorized to write to this storage path.";
    } else if (errorCode === "storage/quota-exceeded") {
      diagnosis = "Firebase Storage project quota has been exceeded. Check Firebase Console billing / storage quotas.";
    } else if (errorCode === "storage/retry-limit-exceeded") {
      diagnosis = "Maximum time limit on upload operation was exceeded. Network connection may be stalled or disconnected.";
    } else if (errorCode === "storage/canceled") {
      diagnosis = "The user or client application cancelled the upload task.";
    } else if (errorCode === "storage/object-not-found") {
      diagnosis = "No object exists at the desired reference or bucket does not exist.";
    } else if (errorMessage.toLowerCase().includes("cors")) {
      diagnosis = "Cross-Origin Resource Sharing (CORS) check failed on the Google Cloud Storage bucket.";
    }

    console.group(
      `%c[Upload Lifecycle] %c❌ [FIREBASE STORAGE: ERROR] %c${errorCode} (%c${errorMessage}%c) in ${duration}ms`,
      "color: #4338ca; font-weight: bold;",
      "background: #dc2626; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #b91c1c; font-weight: bold;",
      "color: #475569; font-weight: normal;",
      "color: #b91c1c; font-weight: bold;"
    );
    console.error("Firebase Storage Failure Breakdown:", {
      errorCode,
      errorMessage,
      bucket: bucket || "N/A",
      targetPath: path || "N/A",
      httpStatus,
      serverResponse,
      diagnosis,
      rawError: error,
    });
    console.warn("Notice: Upload pipeline will proceed to Tier 1B (Production API endpoint) and Tier 2 (Persistent Firestore Mirror) fallback.");
    console.groupEnd();

    this.recordGlobalLog("FIREBASE_STORAGE", "ERROR", `${errorCode}: ${errorMessage}`, {
      errorCode,
      errorMessage,
      diagnosis,
      rawError: error,
    });
  }

  /**
   * Log Stage 4: Server API / R2 Endpoint
   */
  public logApiAttempt(endpoint: string, method = "POST", headersCount = 0): void {
    this.stepTimes.set("api", Date.now());
    console.log(
      `%c[Upload Lifecycle] %c🌐 [STAGE 4: SERVER API] %cSending ${method} request to %c${endpoint}%c with ${headersCount} auth headers`,
      "color: #4338ca; font-weight: bold;",
      "background: #6366f1; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #334155; font-weight: normal;",
      "color: #4338ca; font-weight: bold;",
      "color: #334155; font-weight: normal;"
    );
  }

  public logApiResult(endpoint: string, status: number, contentType: string, result?: any): void {
    const startTime = this.stepTimes.get("api") || Date.now();
    const duration = Date.now() - startTime;
    const isOk = status >= 200 && status < 300;

    if (isOk) {
      console.log(
        `%c[Upload Lifecycle] %c✅ [SERVER API: SUCCESS] %cHTTP ${status} (${contentType}) from ${endpoint} in ${duration}ms`,
        "color: #4338ca; font-weight: bold;",
        "background: #16a34a; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
        "color: #15803d; font-weight: 600;"
      );
      this.recordGlobalLog("SERVER_API", "SUCCESS", `HTTP ${status} from ${endpoint}`, { duration, result });
    } else {
      console.warn(
        `%c[Upload Lifecycle] %c⚠️ [SERVER API: HTTP ${status}] %c(${contentType}) from ${endpoint} in ${duration}ms. Initiating Firestore mirror fallback.`,
        "color: #4338ca; font-weight: bold;",
        "background: #d97706; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
        "color: #b45309; font-weight: 600;"
      );
      this.recordGlobalLog("SERVER_API", "WARN", `HTTP ${status} from ${endpoint}`, { duration, status, contentType });
    }
  }

  public logApiError(endpoint: string, error: any): void {
    const startTime = this.stepTimes.get("api") || Date.now();
    const duration = Date.now() - startTime;
    console.warn(
      `%c[Upload Lifecycle] %c⚠️ [SERVER API: NOTICE] %cFailed to reach ${endpoint} (${error?.message || error}) in ${duration}ms`,
      "color: #4338ca; font-weight: bold;",
      "background: #d97706; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #b45309; font-weight: 600;"
    );
    this.recordGlobalLog("SERVER_API", "WARN", `Request error: ${error?.message || error}`, { duration, error });
  }

  /**
   * Log Stage 5A: Firestore Persistent Mirror - Attempt
   */
  public logFirestoreStart(collectionName: string, docId: string, payloadBytes: number): void {
    this.stepTimes.set("firestore", Date.now());
    console.log(
      `%c[Upload Lifecycle] %c🗄️ [STAGE 5: FIRESTORE MIRROR] %cWriting persistent image document: %c${collectionName}/${docId}%c (Payload: %c${formatBytes(payloadBytes)}%c)`,
      "color: #4338ca; font-weight: bold;",
      "background: #0891b2; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #334155; font-weight: normal;",
      "color: #0e7490; font-weight: bold;",
      "color: #334155; font-weight: normal;",
      "color: #0284c7; font-weight: bold;",
      "color: #334155; font-weight: normal;"
    );
    this.recordGlobalLog("FIRESTORE", "INFO", `Writing to ${collectionName}/${docId} (${formatBytes(payloadBytes)})`);
  }

  /**
   * Log Stage 5B: Firestore Persistent Mirror - Success
   */
  public logFirestoreSuccess(collectionName: string, docId: string): void {
    const startTime = this.stepTimes.get("firestore") || Date.now();
    const duration = Date.now() - startTime;

    console.groupCollapsed(
      `%c[Upload Lifecycle] %c✅ [FIRESTORE: SUCCESS] %cPersisted ${collectionName}/${docId} in ${duration}ms`,
      "color: #4338ca; font-weight: bold;",
      "background: #16a34a; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #15803d; font-weight: 600;"
    );
    console.log("Firestore Mirror Persisted:", {
      collection: collectionName,
      docId,
      fullPath: `${collectionName}/${docId}`,
      durationMs: duration,
      persistedAt: new Date().toISOString(),
    });
    console.groupEnd();

    this.recordGlobalLog("FIRESTORE", "SUCCESS", `Persisted document ${collectionName}/${docId} in ${duration}ms`);
  }

  /**
   * Log Stage 5C: Firestore Persistent Mirror - Error Diagnostics
   */
  public logFirestoreError(error: any, collectionName: string, docId: string): void {
    const startTime = this.stepTimes.get("firestore") || Date.now();
    const duration = Date.now() - startTime;

    const errorCode = error?.code || error?.name || "FIRESTORE_UNKNOWN_ERROR";
    const errorMessage = error?.message || String(error);

    let diagnosis = "An unexpected error occurred while writing to Firestore database.";
    if (errorCode === "permission-denied") {
      diagnosis = `Firestore Security Rules rejected write operation to collection "${collectionName}". Verify that rules permit admin write access.`;
    } else if (errorCode === "resource-exhausted") {
      diagnosis = `Firestore quota or document size limit exceeded. Firestore documents cannot exceed 1MB in total size.`;
    } else if (errorCode === "unavailable") {
      diagnosis = "Firestore service is temporarily unavailable or device is offline.";
    } else if (errorCode === "failed-precondition") {
      diagnosis = "Firestore query or write precondition failed. May require an index or valid schema.";
    }

    console.group(
      `%c[Upload Lifecycle] %c❌ [FIRESTORE: ERROR] %c${errorCode} (%c${errorMessage}%c) in ${duration}ms`,
      "color: #4338ca; font-weight: bold;",
      "background: #dc2626; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #b91c1c; font-weight: bold;",
      "color: #475569; font-weight: normal;",
      "color: #b91c1c; font-weight: bold;"
    );
    console.error("Firestore Error Breakdown:", {
      errorCode,
      errorMessage,
      targetCollection: collectionName,
      targetDocumentId: docId,
      fullDocumentPath: `${collectionName}/${docId}`,
      diagnosis,
      rawError: error,
    });
    console.groupEnd();

    this.recordGlobalLog("FIRESTORE", "ERROR", `${errorCode}: ${errorMessage}`, {
      errorCode,
      errorMessage,
      collection: collectionName,
      docId,
      diagnosis,
      rawError: error,
    });
  }

  /**
   * Log Stage 6: Client-side In-Memory & Web Storage Caching
   */
  public logCacheRegistration(keys: string[]): void {
    console.log(
      `%c[Upload Lifecycle] %c💾 [STAGE 6: LOCAL CACHE] %cIndexed image in client memory & storage for instant instant preview across tabs. Keys: ${keys.join(", ")}`,
      "color: #4338ca; font-weight: bold;",
      "background: #8b5cf6; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #5b21b6; font-weight: normal;"
    );
  }

  /**
   * Log Final Summary: Completion & Storage Provider Selected
   */
  public logComplete(finalUrl: string, provider: "FIREBASE_STORAGE" | "SERVER_API" | "FIRESTORE_MIRROR" | "LOCAL_DATA_URL"): void {
    const totalDuration = Date.now() - this.metadata.startTime;

    const providerBadges: Record<string, { bg: string; text: string }> = {
      FIREBASE_STORAGE: { bg: "#ea580c", text: "Firebase Storage" },
      SERVER_API: { bg: "#6366f1", text: "Production Server API / R2" },
      FIRESTORE_MIRROR: { bg: "#0891b2", text: "Firestore Document Mirror" },
      LOCAL_DATA_URL: { bg: "#16a34a", text: "Optimized Self-Contained Data URL" },
    };

    const badge = providerBadges[provider] || { bg: "#4338ca", text: provider };

    console.group(
      `%c[Upload Lifecycle] %c🏁 [COMPLETE: ${badge.text}] %cTotal duration: %c${totalDuration}ms %c[${this.sessionId}]`,
      "color: #4338ca; font-weight: bold;",
      `background: ${badge.bg}; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;`,
      "color: #1e293b; font-weight: 600;",
      "color: #16a34a; font-weight: bold;",
      "color: #64748b; font-size: 11px;"
    );
    console.table({
      "Upload Session ID": this.sessionId,
      "Target Slot": this.metadata.slot,
      "Product ID": this.metadata.productId || "None",
      "Original File": this.metadata.fileName,
      "Original Size": formatBytes(this.metadata.fileSize),
      "Storage Provider": badge.text,
      "Resolved URL": finalUrl.length > 80 ? `${finalUrl.slice(0, 80)}...` : finalUrl,
      "Total Elapsed": `${totalDuration} ms`,
    });
    console.groupEnd();

    this.recordGlobalLog("COMPLETE", "SUCCESS", `Upload resolved successfully via ${badge.text} in ${totalDuration}ms`, {
      finalUrl,
      provider,
      totalDuration,
    });
  }

  /**
   * Log Final Failure
   */
  public logFailure(error: any): void {
    const totalDuration = Date.now() - this.metadata.startTime;
    console.group(
      `%c[Upload Lifecycle] %c💥 [LIFECYCLE FAILED] %cAll storage tiers exhausted after ${totalDuration}ms [${this.sessionId}]`,
      "color: #4338ca; font-weight: bold;",
      "background: #991b1b; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #991b1b; font-weight: bold;"
    );
    console.error("Upload Failure Context:", {
      sessionId: this.sessionId,
      metadata: this.metadata,
      error: error?.message || error,
      fullError: error,
    });
    console.groupEnd();

    this.recordGlobalLog("FAILED", "ERROR", `Upload failed after ${totalDuration}ms: ${error?.message || error}`, {
      totalDuration,
      error,
    });
  }
}

// Global helper function for developers to view all recent upload logs in browser console
if (typeof window !== "undefined") {
  window.__hosGetUploadDiagnostics = () => {
    console.group("📋 House of Shriya - Recent Upload Lifecycle Diagnostics");
    if (!window.__hosUploadLogs || window.__hosUploadLogs.length === 0) {
      console.log("No upload events recorded yet in this session.");
    } else {
      console.table(
        window.__hosUploadLogs.map((log) => ({
          Time: log.timestamp.split("T")[1]?.slice(0, 8),
          Session: log.sessionId,
          Stage: log.stage,
          Status: log.status,
          Message: log.message,
        }))
      );
    }
    console.groupEnd();
  };
}
