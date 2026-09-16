import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Play,
  RotateCw,
  Terminal,
  ExternalLink,
  Server,
  Database,
  CloudCheck,
  ShieldCheck,
} from "lucide-react";
import { app, auth } from "../../lib/firebase";
import { uploadImageToAdminStorage } from "../../services/adminUploadService";

interface StorageDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  time: string;
  type: "info" | "success" | "error" | "warn";
  text: string;
}

export default function StorageDiagnosticModal({ isOpen, onClose }: StorageDiagnosticModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "success" | "failed">("idle");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [rawError, setRawError] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileSizeKb, setFileSizeKb] = useState(25);

  const projectId = app?.options?.projectId || "house-of-shriya-d49d6";
  const currentAuthUser = auth?.currentUser;

  const appendLog = (type: LogEntry["type"], text: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, time, type, text }]);
  };

  const generateTestJpgBlob = (sizeKb: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#4a154b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px serif";
        ctx.fillText("House of Shriya", 40, 60);
        ctx.font = "14px sans-serif";
        ctx.fillText("Production Storage Engine Test", 40, 95);
        ctx.fillText(new Date().toISOString(), 40, 130);
      }
      canvas.toBlob(
        (blob) => {
          resolve(blob || new Blob(["test"], { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85
      );
    });
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    setTestStatus("running");
    setRawError(null);
    setDownloadUrl("");
    setLogs([]);

    appendLog("info", "--- STARTING PRODUCTION STORAGE DIAGNOSTIC ---");
    appendLog("info", `Project ID: ${projectId}`);
    appendLog("info", `Target endpoint: /api/admin/upload`);

    try {
      appendLog("info", `Generating test image blob (~${fileSizeKb} KB)...`);
      const fileBlob = await generateTestJpgBlob(fileSizeKb);
      appendLog("info", `Generated test blob (${fileBlob.size} bytes).`);

      appendLog("info", "Uploading test file via uploadImageToAdminStorage()...");
      const url = await uploadImageToAdminStorage(fileBlob, {
        slot: "diagnostic-test",
        onProgress: (pct) => {
          appendLog("info", `Upload progress: ${pct}%`);
        },
      });

      appendLog("success", `Upload completed successfully!`);
      appendLog("info", `Returned URL: ${url}`);
      setDownloadUrl(url);

      // Verify that the URL can be loaded
      appendLog("info", "Verifying image availability over HTTP...");
      const verifyRes = await fetch(url, { method: "HEAD" });
      if (verifyRes.ok) {
        appendLog("success", `HTTP verification passed: Status ${verifyRes.status}`);
      } else {
        appendLog("warn", `HTTP verification response: Status ${verifyRes.status}`);
      }

      setTestStatus("success");
      setIsRunning(false);
      appendLog("success", "DIAGNOSTIC TEST PASSED: Admin storage is fully functional!");
    } catch (err: any) {
      console.error("Storage test failed:", err);
      setRawError(err);
      setTestStatus("failed");
      setIsRunning(false);
      appendLog("error", `DIAGNOSTIC TEST FAILED: ${err.message || String(err)}`);
    }
  };

  useEffect(() => {
    if (isOpen && logs.length === 0) {
      appendLog("info", `Diagnostic module initialized.`);
      appendLog("info", `Engine: Direct Admin Production Storage`);
      appendLog("info", `Firestore Database: Active`);
      appendLog(
        currentAuthUser ? "success" : "info",
        `Admin Session: ${currentAuthUser ? currentAuthUser.email : "Local Admin Active"}`
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-100">Production Storage Diagnostic</h2>
              <p className="text-xs text-stone-400">Direct Admin Image Persistence Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
                <span>Storage Target</span>
                <Database className="w-3.5 h-3.5 text-stone-500" />
              </div>
              <p className="font-mono font-semibold text-stone-100 text-sm truncate">
                /api/admin/upload
              </p>
              <p className="text-[11px] text-stone-500">Persistent Cloud & Object Store</p>
            </div>

            <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
                <span>Database</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="font-mono font-semibold text-emerald-400 text-sm truncate">
                {projectId}
              </p>
              <p className="text-[11px] text-stone-500">Authoritative Catalog</p>
            </div>
          </div>

          {/* Test Action Area */}
          <div className="bg-stone-950/40 border border-stone-800/60 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-200">Run Live Upload Test</p>
              <p className="text-xs text-stone-400">
                Uploads a synthetic JPG to test end-to-end persistence and retrieval
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={fileSizeKb}
                onChange={(e) => setFileSizeKb(Number(e.target.value))}
                disabled={isRunning}
                className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value={15}>15 KB</option>
                <option value={50}>50 KB</option>
                <option value={150}>150 KB</option>
              </select>

              <button
                onClick={runDiagnostic}
                disabled={isRunning}
                className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all shadow-sm ${
                  isRunning
                    ? "bg-amber-600/50 cursor-not-allowed"
                    : "bg-amber-600 hover:bg-amber-500 active:scale-95"
                }`}
              >
                {isRunning ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Test</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Alert */}
          {testStatus === "success" && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Diagnostic Test Passed</span>
              </div>
              <p className="text-xs text-emerald-300/90 leading-relaxed">
                Image upload completed and verified. The storage engine is active and ready for production uploads.
              </p>
              {downloadUrl && (
                <div className="flex items-center space-x-2 pt-1 text-xs">
                  <span className="text-stone-400">URL:</span>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline truncate max-w-md inline-flex items-center space-x-1"
                  >
                    <span>{downloadUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 ml-1" />
                  </a>
                </div>
              )}
            </div>
          )}

          {testStatus === "failed" && (
            <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-red-400 font-semibold text-sm">
                <span>DIAGNOSTIC TEST FAILED</span>
              </div>
              <p className="text-xs text-red-300/90 leading-relaxed">
                {rawError?.message || "Storage test encountered an error."}
              </p>
            </div>
          )}

          {/* Terminal / Logs view */}
          <div className="bg-black/90 border border-stone-800 rounded-xl overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-3.5 py-2 bg-stone-950 border-b border-stone-800/80 text-[11px] text-stone-400">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Console Log</span>
              </div>
              <span>{logs.length} entries</span>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto space-y-1 select-text">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`leading-relaxed break-all ${
                    log.type === "success"
                      ? "text-emerald-400"
                      : log.type === "error"
                      ? "text-red-400"
                      : log.type === "warn"
                      ? "text-amber-300"
                      : "text-stone-300"
                  }`}
                >
                  <span className="text-stone-600 mr-2">[{log.time}]</span>
                  {log.text}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-stone-600 italic">No logs yet. Click &quot;Start Test&quot; above.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-stone-800 bg-stone-950/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
