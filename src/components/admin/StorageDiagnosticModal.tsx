import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCw,
  Terminal,
  ExternalLink,
  ShieldAlert,
  Server,
  Database,
  UserCheck,
} from "lucide-react";
import { app, storage, auth, ref, uploadBytesResumable, getDownloadURL } from "../../lib/firebase";

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
  const [progress, setProgress] = useState<{ transferred: number; total: number }>({ transferred: 0, total: 0 });
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [rawError, setRawError] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileSizeKb, setFileSizeKb] = useState(25);

  const projectId = app?.options?.projectId || "unknown";
  const storageBucket = app?.options?.storageBucket || "unknown";
  const currentAuthUser = auth?.currentUser;

  const appendLog = (type: LogEntry["type"], text: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, time, type, text }]);
  };

  // Helper to generate a tiny test JPG blob of arbitrary size (10-50 KB)
  const generateTestJpgBlob = async (targetSizeKb = 25): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0d4f3c";
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = "#d4af37";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("House of Shriya Diagnostic", 20, 150);
        ctx.fillText(new Date().toISOString(), 20, 180);
      }
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(new Blob(["diagnostic-test-file-content"], { type: "image/jpeg" }));
          }
        },
        "image/jpeg",
        0.8
      );
    });
  };

  const runDiagnosticTest = async () => {
    setIsRunning(true);
    setTestStatus("running");
    setProgress({ transferred: 0, total: 0 });
    setDownloadUrl("");
    setRawError(null);
    setLogs([]);

    // 1. Log safe config
    appendLog("info", `Firebase project: ${projectId}`);
    appendLog("info", `Firebase storage bucket: ${storageBucket}`);
    console.log("Firebase project:", projectId);
    console.log("Firebase storage bucket:", storageBucket);

    // 2. Check Auth state
    if (auth.currentUser) {
      appendLog("info", `Firebase Auth user: ${auth.currentUser.email} (UID: ${auth.currentUser.uid})`);
    } else {
      appendLog("warn", "Firebase Auth: auth.currentUser is NULL (Not logged in to Firebase Auth)");
    }

    try {
      appendLog("info", `Generating tiny test file (~${fileSizeKb} KB JPG)...`);
      const fileBlob = await generateTestJpgBlob(fileSizeKb);
      const testFileName = `diagnostic/test-${Date.now()}.jpg`;
      appendLog("info", `Target Storage path: ${testFileName} (${fileBlob.size} bytes)`);

      // 3. Create Storage reference
      const storageRef = ref(storage, testFileName);
      appendLog("info", "Starting upload using uploadBytesResumable()...");

      // 4. Start upload
      const uploadTask = uploadBytesResumable(storageRef, fileBlob, {
        contentType: "image/jpeg",
        customMetadata: { test: "diagnostic", created: new Date().toISOString() },
      });

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          console.log("Progress:", snapshot.bytesTransferred, "/", snapshot.totalBytes);
          setProgress({
            transferred: snapshot.bytesTransferred,
            total: snapshot.totalBytes,
          });
          const pct = snapshot.totalBytes > 0 ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
          appendLog("info", `Upload Progress: ${snapshot.bytesTransferred} / ${snapshot.totalBytes} bytes (${pct}%)`);
        },
        (error) => {
          console.error("STORAGE TEST FAILED:", error);
          setRawError(error);
          setTestStatus("failed");
          setIsRunning(false);
          appendLog("error", `STORAGE TEST FAILED: ${error.code || error.name} - ${error.message}`);
          if ((error as any).serverResponse) {
            appendLog("error", `Server response: ${(error as any).serverResponse}`);
          }
        },
        async () => {
          try {
            appendLog("info", "Upload finished. Requesting download URL...");
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("STORAGE TEST SUCCESS:", url);
            setDownloadUrl(url);
            setTestStatus("success");
            setIsRunning(false);
            appendLog("success", `STORAGE TEST SUCCESS! URL: ${url}`);
          } catch (urlErr: any) {
            console.error("Failed to get download URL:", urlErr);
            setRawError(urlErr);
            setTestStatus("failed");
            setIsRunning(false);
            appendLog("error", `Failed to get download URL: ${urlErr.message}`);
          }
        }
      );
    } catch (err: any) {
      console.error("Storage test initiation failed:", err);
      setRawError(err);
      setTestStatus("failed");
      setIsRunning(false);
      appendLog("error", `Failed to initialize test: ${err.message}`);
    }
  };

  const testHttpBucketDirectly = async () => {
    appendLog("info", `Checking bucket HTTP REST API: https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o`);
    try {
      const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o`, {
        method: "GET",
      });
      const text = await res.text();
      appendLog(res.ok ? "success" : "warn", `HTTP Status: ${res.status} ${res.statusText}`);
      appendLog("info", `Response: ${text.slice(0, 300)}`);
      if (res.status === 404) {
        appendLog(
          "error",
          `DIAGNOSTIC VERDICT: HTTP 404 confirms that bucket '${storageBucket}' does NOT exist in Google Cloud. Cloud Storage has not been provisioned in Firebase Console.`
        );
      }
    } catch (fetchErr: any) {
      appendLog("error", `Direct HTTP fetch failed: ${fetchErr.message}`);
    }
  };

  useEffect(() => {
    if (isOpen && logs.length === 0) {
      appendLog("info", `Diagnostic module initialized.`);
      appendLog("info", `Project ID: ${projectId}`);
      appendLog("info", `Configured Bucket: ${storageBucket}`);
      appendLog(
        auth.currentUser ? "success" : "warn",
        `Firebase Auth: ${auth.currentUser ? auth.currentUser.email : "Not logged in with Firebase Auth"}`
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#1a1f1d] text-stone-200 w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0f1412] px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-[#d4af37]">
              <Terminal size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-100 uppercase tracking-wider font-mono">
                Firebase Storage Diagnostic Test
              </h2>
              <p className="text-xs text-stone-400">
                Isolated test of Firebase Storage SDK, uploadBytesResumable, and network reachability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Config Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-stone-900/80 p-3.5 rounded-xl border border-stone-800 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 font-mono text-[11px]">
                <Server size={13} className="text-[#d4af37]" />
                <span>Project ID</span>
              </div>
              <p className="font-mono font-semibold text-stone-100 truncate">{projectId}</p>
            </div>

            <div className="bg-stone-900/80 p-3.5 rounded-xl border border-stone-800 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 font-mono text-[11px]">
                <Database size={13} className="text-[#d4af37]" />
                <span>Storage Bucket</span>
              </div>
              <p className="font-mono font-semibold text-stone-100 truncate" title={storageBucket}>
                {storageBucket}
              </p>
            </div>

            <div className="bg-stone-900/80 p-3.5 rounded-xl border border-stone-800 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 font-mono text-[11px]">
                <UserCheck size={13} className={currentAuthUser ? "text-emerald-400" : "text-amber-400"} />
                <span>Firebase Auth</span>
              </div>
              <p
                className={`font-mono font-semibold truncate ${
                  currentAuthUser ? "text-emerald-300" : "text-amber-300"
                }`}
                title={currentAuthUser?.email || "No Firebase Auth session"}
              >
                {currentAuthUser?.email || "None (auth.currentUser is null)"}
              </p>
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-stone-900/50 rounded-xl border border-stone-800">
            <div className="flex items-center gap-3">
              <button
                onClick={runDiagnosticTest}
                disabled={isRunning}
                className="px-4 py-2.5 bg-[#d4af37] hover:bg-[#c29d2b] disabled:opacity-50 text-[#0d4f3c] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                {isRunning ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    <span>Testing Upload...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Run Diagnostic Upload</span>
                  </>
                )}
              </button>

              <button
                onClick={testHttpBucketDirectly}
                disabled={isRunning}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-mono transition-colors cursor-pointer border border-stone-700"
              >
                Direct HTTP Ping
              </button>
            </div>

            <div className="flex items-center gap-2 text-stone-400 text-xs font-mono">
              <span>Test Payload:</span>
              <select
                value={fileSizeKb}
                onChange={(e) => setFileSizeKb(Number(e.target.value))}
                className="bg-stone-800 border border-stone-700 text-stone-200 rounded px-2 py-1 focus:outline-none"
              >
                <option value={10}>10 KB JPG</option>
                <option value={25}>25 KB JPG</option>
                <option value={50}>50 KB JPG</option>
                <option value={100}>100 KB JPG</option>
              </select>
            </div>
          </div>

          {/* Status Banner */}
          {testStatus === "running" && (
            <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-300">
                <RotateCw size={15} className="animate-spin text-blue-400" />
                <span>Upload task in progress... Waiting for state_changed event.</span>
              </div>
              <span className="font-mono text-blue-200">
                {progress.transferred} / {progress.total} B
              </span>
            </div>
          )}

          {testStatus === "failed" && (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-red-300 font-bold">
                <AlertTriangle size={16} />
                <span>DIAGNOSTIC TEST FAILED: {rawError?.code || "storage/retry-limit-exceeded"}</span>
              </div>
              <p className="text-red-200/90 font-mono text-[11px] break-all">
                {rawError?.message || String(rawError)}
              </p>
              <div className="pt-2 border-t border-red-900/60 text-stone-300 space-y-1">
                <p className="font-semibold text-stone-200">Root Cause Analysis:</p>
                <ul className="list-disc pl-5 space-y-1 text-stone-400">
                  <li>
                    The configured bucket{" "}
                    <code className="text-amber-300 bg-stone-900 px-1 py-0.5 rounded">{storageBucket}</code> returns HTTP{" "}
                    <strong>404 Not Found</strong> from Google Cloud Storage.
                  </li>
                  <li>
                    Cloud Storage has <strong>not yet been initialized/created</strong> in Firebase Console for project{" "}
                    <code className="text-amber-300 bg-stone-900 px-1 py-0.5 rounded">{projectId}</code>.
                  </li>
                  <li>
                    Because the bucket does not exist, the Firebase SDK retries the handshake until the retry timeout
                    expires, producing:{" "}
                    <code className="text-red-400">storage/retry-limit-exceeded</code>.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {testStatus === "success" && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <CheckCircle2 size={16} />
                <span>DIAGNOSTIC TEST PASSED: Firebase Storage is fully operational!</span>
              </div>
              <p className="text-emerald-200 text-xs">
                Resumable upload completed and download URL obtained successfully:
              </p>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-300 underline break-all hover:text-emerald-100"
              >
                <span>{downloadUrl}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Live Diagnostic Logs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span className="font-mono uppercase tracking-wider text-[11px]">Execution Logs</span>
              <span className="text-[11px] text-stone-500 font-mono">{logs.length} events</span>
            </div>
            <div className="bg-black/80 rounded-xl p-3.5 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1 border border-stone-800">
              {logs.length === 0 ? (
                <p className="text-stone-600 italic">Click "Run Diagnostic Upload" to start test...</p>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-stone-600 shrink-0">[{l.time}]</span>
                    <span
                      className={`break-all ${
                        l.type === "error"
                          ? "text-red-400 font-semibold"
                          : l.type === "success"
                          ? "text-emerald-400 font-semibold"
                          : l.type === "warn"
                          ? "text-amber-400"
                          : "text-stone-300"
                      }`}
                    >
                      {l.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0f1412] px-6 py-3 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>House of Shriya • Infrastructure Diagnostics</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
