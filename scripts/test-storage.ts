const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  console.log(`\n---> [HTTP FETCH] ${init?.method || "GET"} ${url}`);
  try {
    const res = await originalFetch(input, init);
    console.log(`<--- [HTTP RESPONSE] Status: ${res.status} ${res.statusText}`);
    const clone = res.clone();
    try {
      const text = await clone.text();
      console.log(`     Response body: ${text}`);
    } catch {}
    return res;
  } catch (err: any) {
    console.log(`x--- [HTTP FETCH ERROR]`, err);
    throw err;
  }
};

import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

console.log("=== Firebase Storage Diagnostic Script with Fetch Interceptor ===");
console.log("ProjectId:", firebaseConfig.projectId);
console.log("StorageBucket:", firebaseConfig.storageBucket);

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const dummyJpgBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
  0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0xff, 0xd9,
]);

const storageRef = ref(storage, `diagnostic/test-${Date.now()}.jpg`);
console.log("Uploading tiny dummy image to path:", storageRef.fullPath);

const uploadTask = uploadBytesResumable(storageRef, dummyJpgBuffer, {
  contentType: "image/jpeg",
});

uploadTask.on(
  "state_changed",
  (snapshot) => {
    console.log("Progress:", snapshot.bytesTransferred, "/", snapshot.totalBytes);
  },
  (error) => {
    console.error("\nSTORAGE TEST FAILED with error code:", error.code);
    console.error("Exact message:", error.message);
    console.error("Server response:", error.serverResponse);
    process.exit(1);
  },
  async () => {
    try {
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      console.log("STORAGE TEST SUCCESS:", url);
      process.exit(0);
    } catch (e: any) {
      console.error("GetDownloadURL failed:", e);
      process.exit(1);
    }
  }
);
