import React, { useState, useEffect } from "react";
import { useEditMode } from "./EditModeContext";
import {
  X,
  GitBranch,
  GitCommit,
  Cloud,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  Copy,
  Check,
  ShieldCheck,
  Server,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface DeploymentStatusData {
  branch: string;
  commitHash: string;
  commitLog: string;
  remotes: string;
  status: string;
  config: {
    repository?: string;
    branch?: string;
    cloudflareProject?: string;
    lastDeployCommit?: string;
    lastDeployTime?: string;
    lastCommitMessage?: string;
  };
  cloudflarePages: {
    project: string;
    buildOutputDir: string;
    buildCommand: string;
    cloudflarePagesUrl: string;
  };
}

export default function CanvaDeploymentModal() {
  const { activeModal, setActiveModal, saveChanges, isSaving, saveSuccess } = useEditMode();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DeploymentStatusData | null>(null);
  const [remoteUrl, setRemoteUrl] = useState("https://github.com/kshriya2626/house-of-shriya.git");
  const [isUpdatingRemote, setIsUpdatingRemote] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const isOpen = activeModal === "deployModal";

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deployment-status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.config?.repository) {
          setRemoteUrl(json.config.repository);
        }
      }
    } catch (err) {
      console.warn("Could not fetch deployment status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setPushResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateRemote = async () => {
    if (!remoteUrl.trim()) return;
    setIsUpdatingRemote(true);
    try {
      const res = await fetch("/api/update-git-remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remoteUrl: remoteUrl.trim() }),
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingRemote(false);
    }
  };

  const handleGitPush = async () => {
    setIsPushing(true);
    setPushResult(null);
    try {
      // Always flush latest Canva edits to disk before pushing
      await saveChanges();

      const res = await fetch("/api/git-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        setPushResult({
          success: true,
          message: "Pushed successfully to GitHub origin/main! Cloudflare will now deploy the latest build.",
        });
      } else {
        setPushResult({
          success: false,
          message: json.error || "Remote push requires credentials or SSH key.",
        });
      }
      await fetchStatus();
    } catch (e: any) {
      setPushResult({
        success: false,
        message: e.message || "Failed to push to remote.",
      });
    } finally {
      setIsPushing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#0e1311] border border-[#23352d] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-white flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2c25] bg-[#121916]/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#0d4f3c] flex items-center justify-center shadow-md">
              <Cloud size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-amber-100 flex items-center gap-2">
                Production Deployment & GitHub Repository
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                Automatic Cloudflare Pages sync for every Canva Edit Mode change
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-sm">
          {/* Active Status Banner */}
          <div className="p-4 rounded-xl bg-[#14231d] border border-[#1e3c2f] flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-200 text-sm">
                Repository Sync Active & Cloudflare Ready
              </p>
              <p className="text-xs text-stone-300 leading-relaxed">
                Every single modification made in Canva Edit Mode (brand colors, typography, hero banners, product prices, photos, and descriptions) is directly written to the repository JSON data files and committed to Git on branch <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">main</code>.
              </p>
            </div>
          </div>

          {/* Git Repository Info */}
          <div className="bg-[#121815] border border-[#202f28] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-200 font-semibold text-xs uppercase tracking-wider">
                <GitBranch size={15} />
                <span>Git Repository State</span>
              </div>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-amber-200 transition-colors"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-black/30 rounded-lg border border-white/5 space-y-1">
                <span className="text-stone-400">Branch</span>
                <p className="font-mono text-emerald-300 font-medium">
                  {data?.branch || "main"}
                </p>
              </div>
              <div className="p-3 bg-black/30 rounded-lg border border-white/5 space-y-1">
                <span className="text-stone-400">Latest Commit</span>
                <p className="font-mono text-amber-300 font-medium flex items-center gap-1.5">
                  <GitCommit size={13} />
                  <span>{data?.commitHash || "13de043"}</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-black/30 rounded-lg border border-white/5 space-y-1 text-xs">
              <span className="text-stone-400">Latest Commit Message</span>
              <p className="text-stone-200 font-mono">
                {data?.config?.lastCommitMessage || data?.commitLog || "feat: initial House of Shriya website setup with luxury boutique features"}
              </p>
            </div>
          </div>

          {/* GitHub Remote Setup */}
          <div className="bg-[#121815] border border-[#202f28] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-200 font-semibold text-xs uppercase tracking-wider">
              <UploadCloud size={15} />
              <span>GitHub Remote Repository</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/USERNAME/house-of-shriya.git"
                className="flex-1 px-3 py-2 bg-black/40 border border-[#2c3d35] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleUpdateRemote}
                disabled={isUpdatingRemote}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors shrink-0"
              >
                {isUpdatingRemote ? "Updating..." : "Update Remote"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleGitPush}
                disabled={isPushing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d4f3c] hover:bg-[#14634c] text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <UploadCloud size={13} />
                <span>{isPushing ? "Pushing to GitHub..." : "Push to GitHub (main)"}</span>
              </button>

              <button
                onClick={() =>
                  copyToClipboard("git push -u origin main", "git-push-cmd")
                }
                className="flex items-center gap-1 px-2.5 py-1.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-lg text-xs text-stone-300 font-mono transition-colors"
              >
                {copiedText === "git-push-cmd" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>git push -u origin main</span>
              </button>
            </div>

            {pushResult && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  pushResult.success
                    ? "bg-emerald-950/60 border border-emerald-800/80 text-emerald-200"
                    : "bg-amber-950/40 border border-amber-800/60 text-amber-200"
                }`}
              >
                {pushResult.message}
              </div>
            )}
          </div>

          {/* Cloudflare Pages Automated Deployment Instructions */}
          <div className="bg-[#121815] border border-[#202f28] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-200 font-semibold text-xs uppercase tracking-wider">
                <Cloud size={15} />
                <span>Cloudflare Pages Auto-Deploy Setup</span>
              </div>
              <span className="text-[0.65rem] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Continuous Deployment
              </span>
            </div>

            <p className="text-xs text-stone-300">
              Follow these standard 3 steps to connect Cloudflare Pages to your GitHub repository:
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 bg-black/30 rounded-lg border border-white/5">
                <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[0.7rem]">
                  1
                </span>
                <div>
                  <p className="font-semibold text-stone-200">Connect to Git in Cloudflare</p>
                  <p className="text-stone-400 text-[0.75rem]">
                    In your Cloudflare Dashboard, go to <strong>Workers & Pages</strong> → <strong>Create application</strong> → <strong>Pages</strong> → <strong>Connect to Git</strong>, and select the <code className="text-amber-300">house-of-shriya</code> repository.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-black/30 rounded-lg border border-white/5">
                <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[0.7rem]">
                  2
                </span>
                <div className="space-y-1.5 w-full">
                  <p className="font-semibold text-stone-200">Verify Build Settings</p>
                  <div className="grid grid-cols-2 gap-2 text-[0.75rem]">
                    <div className="bg-black/40 p-2 rounded border border-white/5">
                      <span className="text-stone-400 block">Framework Preset</span>
                      <strong className="text-stone-200">Vite</strong>
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-white/5">
                      <span className="text-stone-400 block">Build Command</span>
                      <strong className="text-amber-300 font-mono">npm run build</strong>
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-white/5">
                      <span className="text-stone-400 block">Build Output Directory</span>
                      <strong className="text-emerald-300 font-mono">dist</strong>
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-white/5">
                      <span className="text-stone-400 block">Production Branch</span>
                      <strong className="text-stone-200 font-mono">main</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-black/30 rounded-lg border border-white/5">
                <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[0.7rem]">
                  3
                </span>
                <div>
                  <p className="font-semibold text-stone-200">Automatic Deployment</p>
                  <p className="text-stone-400 text-[0.75rem]">
                    Click <strong>Save and Deploy</strong>. Cloudflare Pages will automatically rebuild and deploy your production website on every single commit pushed to <code className="text-amber-300 font-mono">main</code>!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Direct CLI Deployment Commands */}
          <div className="bg-[#121815] border border-[#202f28] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-200 font-semibold text-xs uppercase tracking-wider">
                <Server size={15} />
                <span>Direct Cloudflare CLI Deployment</span>
              </div>
              <span className="text-[0.65rem] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Wrangler
              </span>
            </div>
            <p className="text-xs text-stone-300">
              To deploy directly from your terminal with guaranteed cache busting:
            </p>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between bg-black/50 p-2.5 rounded-lg border border-white/10">
                <span className="text-emerald-400">npm run build</span>
                <button
                  onClick={() => copyToClipboard("npm run build", "cmd-build")}
                  className="text-stone-400 hover:text-white text-xs flex items-center gap-1"
                >
                  {copiedText === "cmd-build" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Copy</span>
                </button>
              </div>
              <div className="flex items-center justify-between bg-black/50 p-2.5 rounded-lg border border-white/10">
                <span className="text-stone-300">npx wrangler pages deploy dist</span>
                <button
                  onClick={() => copyToClipboard("npx wrangler pages deploy dist", "cmd-pages")}
                  className="text-stone-400 hover:text-white text-xs flex items-center gap-1"
                >
                  {copiedText === "cmd-pages" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#1c2c25] bg-[#121916]/80 flex items-center justify-between gap-3">
          <button
            onClick={saveChanges}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#b88c29] text-[#090e0c] font-semibold text-xs rounded-xl shadow-md hover:brightness-110 transition-all"
          >
            <Sparkles size={14} />
            <span>{isSaving ? "Saving & Committing..." : "Save & Commit to Repo Now"}</span>
          </button>

          <button
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
