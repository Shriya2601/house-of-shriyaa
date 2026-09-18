/**
 * EditModeUtils.ts
 *
 * Checks if the application is running inside the Google AI Studio editor environment.
 * Hides Canva Edit Mode from preview (ais-pre-*, shared URLs, new tabs) and all customer views.
 */

export function isInsideAIStudioEditor(): boolean {
  if (typeof window === "undefined") return false;

  const urlParams = new URLSearchParams(window.location.search);

  // If explicitly disabled via query param
  if (urlParams.get("canva") === "false" || urlParams.get("edit_mode") === "false") {
    return false;
  }

  // If explicitly enabled by admin / developer via query param
  if (urlParams.get("canva") === "true" || urlParams.get("edit_mode") === "true") {
    return true;
  }

  const hostname = window.location.hostname;

  // Shared preview domains (*ais-pre-*.run.app) or production domains MUST hide Edit Mode
  if (hostname.includes("ais-pre-") || hostname.includes("pages.dev") || hostname.includes("houseofshriya")) {
    return false;
  }

  // Only activate Canva visual edit mode when explicitly requested via query parameter or admin toggle
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem("hos_edit_mode") : null;
  if (saved === "true") return true;

  return false;
}
