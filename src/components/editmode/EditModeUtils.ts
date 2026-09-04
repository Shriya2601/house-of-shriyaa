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

  // Always enable in dev container environments (both inside iframe and in new tab)
  if (
    hostname.includes("ais-dev-") ||
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1")
  ) {
    return true;
  }

  // Check if embedded in Google AI Studio editor iframe
  try {
    const isEmbeddedInIframe = window.self !== window.top;
    const ancestor =
      (window.location as any).ancestorOrigins?.[0] || document.referrer || "";

    if (ancestor) {
      const isStudio =
        ancestor.includes("ai.studio") ||
        ancestor.includes("aistudio.google.com") ||
        ancestor.includes("google.com");
      if (isStudio) return true;
    }

    return isEmbeddedInIframe;
  } catch {
    return false;
  }
}
