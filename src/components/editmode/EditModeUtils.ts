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
  if (hostname.includes("ais-pre-")) {
    return false;
  }

  // Check if embedded in an iframe (Google AI Studio editor embeds the dev preview inside an iframe)
  try {
    const isEmbeddedInIframe = window.self !== window.top;
    if (!isEmbeddedInIframe) {
      // Top-level tab means the user clicked "Open in new tab" / customer is viewing directly -> HIDE
      return false;
    }

    // Check ancestor origins / referrer for Google AI Studio
    const ancestor =
      (window.location as any).ancestorOrigins?.[0] || document.referrer || "";

    if (ancestor) {
      const isStudio =
        ancestor.includes("ai.studio") ||
        ancestor.includes("aistudio.google.com") ||
        ancestor.includes("google.com");
      return isStudio;
    }

    // Inside dev container iframe (ais-dev-* or localhost)
    return (
      hostname.includes("ais-dev-") ||
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1")
    );
  } catch {
    return false;
  }
}
