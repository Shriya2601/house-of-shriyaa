/**
 * Image URL normalization utility for House of Shriya.
 * Converts external share links (Kommodo, Google Drive, Dropbox) into direct, embeddable image URLs.
 */

const KNOWN_KOMMODO_MAP: Record<string, string> = {
  "eA9kgNNZCuEDbWDBS8JI": "https://plain-apac-prod-public.komododecks.com/202609/05/eA9kgNNZCuEDbWDBS8JI/image.jpg",
  "4UmFSGtcoZdZF37bKc3R": "https://plain-apac-prod-public.komododecks.com/202609/05/4UmFSGtcoZdZF37bKc3R/image.jpg",
};

export function normalizeImageUrl(url?: string | null, fallback = ""): string {
  if (!url || typeof url !== "string") return fallback;
  let trimmed = url.trim();
  if (!trimmed) return fallback;

  // Check known Kommodo mappings
  for (const [key, directUrl] of Object.entries(KNOWN_KOMMODO_MAP)) {
    if (trimmed.includes(key)) {
      return directUrl;
    }
  }

  // Generic Kommodo share link: route through proxy if not a direct image file
  if (trimmed.includes("kommodo.ai/i/")) {
    const idMatch = trimmed.match(/kommodo\.ai\/i\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1] && KNOWN_KOMMODO_MAP[idMatch[1]]) {
      return KNOWN_KOMMODO_MAP[idMatch[1]];
    }
    return `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
  }

  // Google Drive share link: https://drive.google.com/file/d/ID/view -> direct stream
  const gDriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${gDriveMatch[1]}`;
  }

  // Dropbox share link: dl=0 -> raw=1
  if (trimmed.includes("dropbox.com") && trimmed.includes("dl=0")) {
    return trimmed.replace("dl=0", "raw=1");
  }

  // Clean /public/ prefix if stored incorrectly
  if (trimmed.startsWith("/public/")) {
    trimmed = trimmed.replace("/public", "");
  } else if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("data:") &&
    !trimmed.startsWith("/")
  ) {
    trimmed = `/${trimmed}`;
  }

  return trimmed;
}
