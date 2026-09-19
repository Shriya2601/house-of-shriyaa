/**
 * Cloudflare Native Shim
 * Replaces Firebase with harmless mock objects.
 * House of Shriya runs on Cloudflare D1 and R2!
 * ZERO Firebase usage!
 */

export const auth = {
  currentUser: null as any,
  onAuthStateChanged: (_cb: any) => () => {},
};

export const db = {};
export const storage = null;
export const app = {
  options: {
    projectId: "house-of-shriya-d1",
    storageBucket: "house-of-shriya-r2",
  },
};
export const analytics = null;

export default app;
