import fs from "fs";
import path from "path";

export interface ShiprocketLogEntry {
  id: string;
  timestamp: string;
  action: "AUTH" | "CREATE_ORDER" | "TRACK" | "WEBHOOK" | "RETRY_SYNC" | "CONFIG" | "SERVICEABILITY";
  status: "SUCCESS" | "FAILED" | "PENDING" | "RETRYING";
  statusCode?: number;
  orderNumber?: string;
  orderId?: string;
  endpoint?: string;
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  durationMs?: number;
  attemptNumber?: number;
}

const MAX_LOGS = 200;
const SECURE_LOGS_PATH = path.resolve(process.cwd(), "data/shiprocket_logs.json");
const LEGACY_LOGS_PATH = path.resolve(process.cwd(), "public/data/shiprocket_logs.json");

let memoryLogs: ShiprocketLogEntry[] = [];
let isLoaded = false;

function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) return payload.map(sanitizePayload);
  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    const lk = k.toLowerCase();
    if (lk.includes("password") || lk.includes("token") || lk.includes("secret") || lk.includes("authorization")) {
      sanitized[k] = "***";
    } else if (typeof v === "object") {
      sanitized[k] = sanitizePayload(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

function ensureLogsLoaded() {
  if (isLoaded) return;
  try {
    const targetPath = fs.existsSync(SECURE_LOGS_PATH)
      ? SECURE_LOGS_PATH
      : fs.existsSync(LEGACY_LOGS_PATH)
      ? LEGACY_LOGS_PATH
      : null;

    if (targetPath && fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        memoryLogs = parsed;
      }
    }
  } catch (err) {
    console.warn("[Shiprocket Logger] Notice loading initial logs:", err);
    memoryLogs = [];
  }
  isLoaded = true;
}

function persistLogs() {
  try {
    const dir = path.dirname(SECURE_LOGS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SECURE_LOGS_PATH, JSON.stringify(memoryLogs.slice(0, MAX_LOGS), null, 2), "utf-8");
  } catch (err) {
    console.warn("[Shiprocket Logger] Error persisting logs:", err);
  }
}

/**
 * Add a new structured log entry
 */
export function logShiprocketEvent(
  entry: Omit<ShiprocketLogEntry, "id" | "timestamp">
): ShiprocketLogEntry {
  ensureLogsLoaded();

  const fullEntry: ShiprocketLogEntry = {
    ...entry,
    requestPayload: sanitizePayload(entry.requestPayload),
    responsePayload: sanitizePayload(entry.responsePayload),
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  memoryLogs.unshift(fullEntry);
  if (memoryLogs.length > MAX_LOGS) {
    memoryLogs = memoryLogs.slice(0, MAX_LOGS);
  }

  persistLogs();
  return fullEntry;
}

/**
 * Query logs with optional search & filtering
 */
export function getShiprocketLogs(params?: {
  limit?: number;
  action?: string;
  status?: string;
  search?: string;
}): ShiprocketLogEntry[] {
  ensureLogsLoaded();

  let results = [...memoryLogs];

  if (params?.action && params.action !== "ALL") {
    results = results.filter((l) => l.action.toLowerCase() === params.action?.toLowerCase());
  }

  if (params?.status && params.status !== "ALL") {
    results = results.filter((l) => l.status.toLowerCase() === params.status?.toLowerCase());
  }

  if (params?.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    results = results.filter((l) => {
      const orderMatch = l.orderNumber?.toLowerCase().includes(q) || l.orderId?.toLowerCase().includes(q);
      const errorMatch = l.errorMessage?.toLowerCase().includes(q);
      const actionMatch = l.action?.toLowerCase().includes(q);
      const responseMatch = l.responsePayload ? JSON.stringify(l.responsePayload).toLowerCase().includes(q) : false;
      return orderMatch || errorMatch || actionMatch || responseMatch;
    });
  }

  if (params?.limit && params.limit > 0) {
    results = results.slice(0, params.limit);
  }

  return results;
}

/**
 * Clear all logs
 */
export function clearShiprocketLogs(): boolean {
  memoryLogs = [];
  persistLogs();
  return true;
}
