/**
 * Cloudflare Pages Function: /api/admin/upload/ (trailing slash support)
 * Re-exports the upload function so both /api/admin/upload and /api/admin/upload/
 * are explicitly routed to the Cloudflare Pages Function and avoid static fallback.
 */

export {
  onRequestPost,
  onRequestGet,
  onRequestOptions,
  onRequest,
  findR2Bucket,
} from "../upload";
