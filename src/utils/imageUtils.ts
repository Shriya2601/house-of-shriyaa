/**
 * Image URL normalization utility for House of Shriya.
 * Converts external share links (Kommodo, Google Drive, Dropbox) into direct, embeddable image URLs.
 */
import type React from "react";

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

  // Clean /public/ or public/ prefix if stored incorrectly
  if (trimmed.startsWith("/public/")) {
    trimmed = trimmed.replace("/public", "");
  } else if (trimmed.startsWith("public/")) {
    trimmed = "/" + trimmed.replace(/^public\//, "");
  }

  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("data:") &&
    !trimmed.startsWith("blob:") &&
    !trimmed.startsWith("/")
  ) {
    trimmed = `/${trimmed}`;
  }

  return trimmed;
}

export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"
) {
  const target = e.currentTarget;
  // If image has ?v= cache-busting timestamp, retry without ?v=
  if (target.src && target.src.includes("?v=") && !target.dataset.retried) {
    target.dataset.retried = "true";
    target.src = target.src.split("?")[0];
    return;
  }
  if (!target.src.includes("unsplash.com") && target.src !== fallback) {
    target.src = fallback;
  }
}

export function getProductDisplayImage(
  product?: {
    image?: string;
    hoverImage?: string;
    images?: string[];
    colorVariants?: Array<{ image?: string; hoverImage?: string; images?: string[] }>;
  } | null,
  fallback = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"
): string {
  if (!product) return fallback;
  const raw =
    product.image ||
    (Array.isArray(product.images) && product.images.find((img) => img && typeof img === "string" && img.trim())) ||
    product.colorVariants?.[0]?.image ||
    (Array.isArray(product.colorVariants?.[0]?.images) && product.colorVariants[0].images.find((img) => img && typeof img === "string" && img.trim())) ||
    "";
  return normalizeImageUrl(raw, fallback);
}

export function getProductHoverImage(
  product?: {
    image?: string;
    hoverImage?: string;
    images?: string[];
    colorVariants?: Array<{ image?: string; hoverImage?: string; images?: string[] }>;
  } | null,
  fallback = ""
): string {
  if (!product) return fallback;
  const main = getProductDisplayImage(product, "");
  const raw =
    (product.hoverImage && product.hoverImage !== product.image ? product.hoverImage : null) ||
    (Array.isArray(product.images) && product.images.length > 1 ? product.images[1] : null) ||
    product.colorVariants?.[0]?.hoverImage ||
    (Array.isArray(product.colorVariants?.[0]?.images) && product.colorVariants[0].images.length > 1 ? product.colorVariants[0].images[1] : null) ||
    main;
  return normalizeImageUrl(raw, fallback || main);
}

export function getProductGalleryImages(
  product?: {
    image?: string;
    hoverImage?: string;
    images?: string[];
    colorVariants?: Array<{ image?: string; hoverImage?: string; images?: string[] }>;
  } | null
): string[] {
  if (!product) return [];
  const list: string[] = [];
  const add = (u?: string | null) => {
    if (!u || typeof u !== "string") return;
    const clean = normalizeImageUrl(u);
    if (clean && !list.includes(clean)) list.push(clean);
  };

  add(product.image);
  if (Array.isArray(product.images)) {
    product.images.forEach(add);
  }
  add(product.hoverImage);

  if (Array.isArray(product.colorVariants)) {
    for (const v of product.colorVariants) {
      add(v.image);
      if (Array.isArray(v.images)) v.images.forEach(add);
      add(v.hoverImage);
    }
  }

  return list;
}

