import React, { useState, useEffect, useMemo } from "react";
import {
  Server,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  Copy,
  Check,
  Code,
  Radio,
  FileText,
  X,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Truck,
  Key,
} from "lucide-react";
import {
  fetchShiprocketLogs,
  clearShiprocketLogs,
  triggerShiprocketRetry,
  ShiprocketLogEntry,
} from "../../services/shiprocketClient";

interface ShiprocketLogsViewProps {
  onOpenConfigModal: () => void;
  onSelectOrder?: (orderNumber: string) => void;
}

export default function ShiprocketLogsView({
  onOpenConfigModal,
  onSelectOrder,
}: ShiprocketLogsViewProps) {
  const [logs, setLogs] = useState<ShiprocketLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retrySummary, setRetrySummary] = useState<{
    attempted: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Inspection modal
  const [selectedLog, setSelectedLog] = useState<ShiprocketLogEntry | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const loadLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchShiprocketLogs({ limit: 150 });
      if (res.success && Array.isArray(res.logs)) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.warn("Error fetching logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all Shiprocket API logs?")) return;
    try {
      const res = await clearShiprocketLogs();
      if (res.success) {
        setLogs([]);
        setSelectedLog(null);
      }
    } catch (err) {
      console.error("Error clearing logs:", err);
    }
  };

  const handleTriggerRetry = async () => {
    setRetrying(true);
    setRetrySummary(null);
    try {
      const res = await triggerShiprocketRetry();
      if (res.success) {
        setRetrySummary({
          attempted: res.attempted,
          succeeded: res.succeeded,
          failed: res.failed,
        });
        // Reload logs immediately to capture the retry outcomes
        setTimeout(() => loadLogs(true), 800);
      } else {
        alert(res.error || "Retry failed to execute");
      }
    } catch (err: any) {
      alert(err.message || "Failed to trigger retry sync");
    } finally {
      setRetrying(false);
    }
  };

  const handleCopyJson = (content: any, section: string) => {
    const text = typeof content === "object" ? JSON.stringify(content, null, 2) : String(content);
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const successes = logs.filter((l) => l.status === "SUCCESS").length;
    const failures = logs.filter((l) => l.status === "FAILED").length;
    const webhooks = logs.filter((l) => l.action === "WEBHOOK").length;
    const orderCreates = logs.filter((l) => l.action === "CREATE_ORDER").length;
    return { total, successes, failures, webhooks, orderCreates };
  }, [logs]);

  // Filtered list
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
      if (statusFilter !== "ALL" && log.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const orderMatch = log.orderNumber?.toLowerCase().includes(q) || log.orderId?.toLowerCase().includes(q);
        const errorMatch = log.errorMessage?.toLowerCase().includes(q);
        const actionMatch = log.action?.toLowerCase().includes(q);
        const rawMatch = log.responsePayload ? JSON.stringify(log.responsePayload).toLowerCase().includes(q) : false;
        return orderMatch || errorMatch || actionMatch || rawMatch;
      }
      return true;
    });
  }, [logs, actionFilter, statusFilter, searchQuery]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE_ORDER":
        return {
          label: "Order Creation",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: Truck,
        };
      case "AUTH":
        return {
          label: "Authentication",
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          icon: Key,
        };
      case "WEBHOOK":
        return {
          label: "Shiprocket Webhook",
          bg: "bg-purple-50 text-purple-800 border-purple-200",
          icon: Radio,
        };
      case "RETRY_SYNC":
        return {
          label: "Auto-Retry Sync",
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: RefreshCw,
        };
      case "TRACK":
        return {
          label: "Tracking Query",
          bg: "bg-cyan-50 text-cyan-800 border-cyan-200",
          icon: ExternalLink,
        };
      case "CONFIG":
        return {
          label: "Configuration",
          bg: "bg-stone-50 text-stone-800 border-stone-200",
          icon: Server,
        };
      default:
        return {
          label: action,
          bg: "bg-gray-50 text-gray-800 border-gray-200",
          icon: FileText,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-[#1e1b18] text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
                <Server size={18} />
              </div>
              <h2 className="font-serif text-xl font-bold tracking-tight">
                Shiprocket API Dispatch & Response Logs
              </h2>
            </div>
            <p className="text-xs text-[#d6ccc2] max-w-2xl">
              Inspect automated order creation payloads, live authentication attempts, background retry executions,
              and incoming webhooks directly from Shiprocket's shipping engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTriggerRetry}
              disabled={retrying}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#d4af37] text-[#1e1b18] hover:bg-[#c49f2c] transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={13} className={retrying ? "animate-spin" : ""} />
              {retrying ? "Retrying Pending Orders..." : "Run Background Retry"}
            </button>

            <button
              onClick={onOpenConfigModal}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5"
            >
              <Key size={13} />
              Configure Credentials
            </button>

            <button
              onClick={() => loadLogs(true)}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/90 transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-all flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Retry Notification Summary */}
        {retrySummary && (
          <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#d4af37]" />
              <span>
                Background sync cycle complete: <strong>{retrySummary.attempted}</strong> order(s) processed.{" "}
                <span className="text-emerald-300 font-semibold">{retrySummary.succeeded} synced successfully</span>
                {retrySummary.failed > 0 && (
                  <span className="text-rose-300 ml-1">({retrySummary.failed} still require configuration)</span>
                )}
              </span>
            </div>
            <button
              onClick={() => setRetrySummary(null)}
              className="text-white/60 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-[11px] text-white/60 uppercase tracking-wider block">Total Recorded Logs</span>
            <span className="font-serif text-xl font-bold text-white mt-1 block">{stats.total}</span>
          </div>
          <div className="bg-emerald-950/30 rounded-xl p-3 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-300 uppercase tracking-wider block">Successful Dispatches</span>
            <span className="font-serif text-xl font-bold text-emerald-400 mt-1 block">{stats.successes}</span>
          </div>
          <div className="bg-rose-950/30 rounded-xl p-3 border border-rose-500/20">
            <span className="text-[11px] text-rose-300 uppercase tracking-wider block">Sync Failures / Alerts</span>
            <span className="font-serif text-xl font-bold text-rose-400 mt-1 block">{stats.failures}</span>
          </div>
          <div className="bg-purple-950/30 rounded-xl p-3 border border-purple-500/20">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider block">Webhook Updates</span>
            <span className="font-serif text-xl font-bold text-purple-400 mt-1 block">{stats.webhooks}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e8dfd8] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a89f91]" />
            <input
              type="text"
              placeholder="Search by Order #, AWB, error description, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#faf8f5] border border-[#e8dfd8] rounded-xl focus:outline-hidden focus:border-[#1e1b18] text-[#1e1b18]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: "All Actions" },
              { id: "CREATE_ORDER", label: "Orders" },
              { id: "AUTH", label: "Auth" },
              { id: "WEBHOOK", label: "Webhooks" },
              { id: "RETRY_SYNC", label: "Retries" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  actionFilter === tab.id
                    ? "bg-[#1e1b18] text-white"
                    : "bg-[#faf8f5] text-[#5a544c] hover:bg-[#ece5dd]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#faf8f5] p-1 rounded-xl border border-[#e8dfd8]">
            {[
              { id: "ALL", label: "All Status" },
              { id: "SUCCESS", label: "Success" },
              { id: "FAILED", label: "Failed" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  statusFilter === s.id
                    ? "bg-white text-[#1e1b18] shadow-xs"
                    : "text-[#6b6257] hover:text-[#1e1b18]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-white border border-[#e8dfd8] rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-[#6b6257]">
            <RefreshCw size={24} className="animate-spin mx-auto text-[#0d4f3c] mb-2" />
            <p className="text-xs font-medium">Loading raw Shiprocket API logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f4eee6] flex items-center justify-center mx-auto mb-3 text-[#a89f91]">
              <FileText size={20} />
            </div>
            <h3 className="font-serif text-base font-bold text-[#1e1b18]">No Shiprocket logs match your filter</h3>
            <p className="text-xs text-[#6b6257] max-w-md mx-auto mt-1 mb-4">
              {logs.length === 0
                ? "Logs will appear automatically whenever orders are placed, API credentials are verified, or status webhooks arrive from Shiprocket."
                : "Try resetting your search query or switching filters to view all entries."}
            </p>
            {logs.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActionFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b18] text-white hover:bg-[#332e29]"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#faf8f5] border-b border-[#e8dfd8] text-[11px] font-semibold text-[#5a544c] uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Status & Code</th>
                  <th className="py-3 px-4">Details / API Message</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eae1] text-xs">
                {filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;
                  const isSuccess = log.status === "SUCCESS";
                  const formattedDate = new Date(log.timestamp).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#faf8f5] transition-colors cursor-pointer group"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#6b6257] whitespace-nowrap">
                        {formattedDate}
                        {log.durationMs !== undefined && (
                          <span className="block text-[10px] text-[#a89f91]">{log.durationMs}ms</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                        >
                          <Icon size={12} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Order Ref */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.orderNumber ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectOrder) onSelectOrder(log.orderNumber!);
                            }}
                            className="font-mono font-bold text-[#0d4f3c] hover:underline"
                          >
                            #{log.orderNumber}
                          </button>
                        ) : (
                          <span className="text-[#a89f91] italic font-mono text-[11px]">System / API</span>
                        )}
                      </td>

                      {/* Status & Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 size={12} /> 200 OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              <AlertCircle size={12} /> {log.statusCode ? `HTTP ${log.statusCode}` : "FAILED"}
                            </span>
                          )}
                          {log.attemptNumber && (
                            <span className="text-[10px] text-[#a89f91]">Attempt #{log.attemptNumber}</span>
                          )}
                        </div>
                      </td>

                      {/* Details / Error */}
                      <td className="py-3.5 px-4 max-w-md">
                        <p
                          className={`truncate text-xs ${
                            isSuccess ? "text-[#5a544c]" : "text-rose-700 font-medium"
                          }`}
                          title={log.errorMessage || (log.responsePayload ? JSON.stringify(log.responsePayload) : "Completed")}
                        >
                          {log.errorMessage ||
                            (log.responsePayload?.message
                              ? String(log.responsePayload.message)
                              : isSuccess
                              ? "Dispatched and synchronized successfully"
                              : "Operation encountered an error")}
                        </p>
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#faf8f5] group-hover:bg-[#1e1b18] group-hover:text-white text-[#5a544c] border border-[#e8dfd8] transition-all flex items-center gap-1 ml-auto"
                        >
                          <Code size={12} />
                          Inspect JSON
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Payload Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#e8dfd8] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#faf8f5] border-b border-[#e8dfd8] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1e1b18] text-white flex items-center justify-center">
                  <Code size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base text-[#1e1b18]">
                      Shiprocket API Log Detail
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        selectedLog.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {selectedLog.status}
                    </span>
                  </div>
                  <span className="text-xs text-[#6b6257]">
                    Action: <strong>{selectedLog.action}</strong>
                    {selectedLog.orderNumber && ` • Order #${selectedLog.orderNumber}`}
                    {` • ${new Date(selectedLog.timestamp).toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full hover:bg-[#e8dfd8] flex items-center justify-center text-[#5a544c] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Error Callout if Failed */}
              {selectedLog.status === "FAILED" && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                    <ShieldAlert size={14} className="text-rose-700" />
                    <span>Failure Reason / Troubleshooting Advice:</span>
                  </div>
                  <p className="text-xs text-rose-800 font-mono">
                    {selectedLog.errorMessage || "No explicit error message returned."}
                  </p>
                  {selectedLog.errorMessage?.toLowerCase().includes("credential") && (
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setSelectedLog(null);
                          onOpenConfigModal();
                        }}
                        className="text-xs font-semibold text-[#0d4f3c] hover:underline flex items-center gap-1"
                      >
                        Click here to configure Shiprocket API credentials <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Raw Response Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1e1b18] flex items-center gap-1.5">
                    <FileText size={13} className="text-[#0d4f3c]" />
                    Raw Shiprocket API Response:
                  </label>
                  {selectedLog.responsePayload && (
                    <button
                      onClick={() => handleCopyJson(selectedLog.responsePayload, "response")}
                      className="text-[11px] font-semibold text-[#0d4f3c] hover:underline flex items-center gap-1"
                    >
                      {copiedSection === "response" ? <Check size={12} /> : <Copy size={12} />}
                      {copiedSection === "response" ? "Copied!" : "Copy Response JSON"}
                    </button>
                  )}
                </div>
                <pre className="p-3.5 bg-[#1e1b18] text-[#e8dfd8] rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed border border-[#332e29]">
                  {selectedLog.responsePayload
                    ? JSON.stringify(selectedLog.responsePayload, null, 2)
                    : "// No response body recorded"}
                </pre>
              </div>

              {/* Outgoing Request Payload (if recorded) */}
              {selectedLog.requestPayload && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1e1b18] flex items-center gap-1.5">
                      <Truck size={13} className="text-[#0d4f3c]" />
                      Outgoing Request Payload Sent to Shiprocket:
                    </label>
                    <button
                      onClick={() => handleCopyJson(selectedLog.requestPayload, "request")}
                      className="text-[11px] font-semibold text-[#0d4f3c] hover:underline flex items-center gap-1"
                    >
                      {copiedSection === "request" ? <Check size={12} /> : <Copy size={12} />}
                      {copiedSection === "request" ? "Copied!" : "Copy Request JSON"}
                    </button>
                  </div>
                  <pre className="p-3.5 bg-[#2a2622] text-[#d6ccc2] rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed border border-[#3e3833]">
                    {JSON.stringify(selectedLog.requestPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#faf8f5] border-t border-[#e8dfd8] flex items-center justify-between">
              <span className="text-[11px] text-[#6b6257]">
                Log Entry ID: <code className="font-mono text-[10px]">{selectedLog.id}</code>
              </span>
              <div className="flex items-center gap-2">
                {selectedLog.orderNumber && onSelectOrder && (
                  <button
                    onClick={() => {
                      const orderNum = selectedLog.orderNumber!;
                      setSelectedLog(null);
                      onSelectOrder(orderNum);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b18] text-white hover:bg-[#332e29] transition-all"
                  >
                    View Order #{selectedLog.orderNumber}
                  </button>
                )}
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#d6ccc2] text-[#1e1b18] hover:bg-[#f4eee6]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
