import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { AdminProfile, AdminRole } from "../types";
import { setStoredAdminSession, clearStoredAdminSession } from "./storeService";

// Primary authorized emails recognized as initial superadmins
export const PRIMARY_ADMIN_EMAILS = [
  "crochetbyshriya01@gmail.com",
  "houseofshriya.in@gmail.com",
  "shriya14301@gmail.com",
  "shriyapusha01@gmail.com",
  "hello.munchmini@gmail.com",
  "care@houseofshriya.com",
  "kshriya2626@gmail.com",
  "admin@houseofshriya.com",
];

const ADMIN_SESSION_KEY = "hos_firebase_admin_session";

/**
 * Checks if a given user email or uid has admin privileges.
 */
export async function checkIsAdmin(user: User): Promise<{ isAdmin: boolean; profile: AdminProfile | null }> {
  if (!user || !user.uid) return { isAdmin: false, profile: null };

  const userEmail = (user.email || "").toLowerCase().trim();
  const isPrimary = PRIMARY_ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail);

  try {
    const adminDocRef = doc(db, "admins", user.uid);
    const snap = await getDoc(adminDocRef);

    if (snap.exists()) {
      const data = snap.data() as AdminProfile;
      return { isAdmin: true, profile: { ...data, uid: user.uid } };
    }

    // Bootstrap: If this is the primary owner's email, auto-create the superadmin document
    if (isPrimary) {
      const newProfile: AdminProfile = {
        uid: user.uid,
        email: user.email || userEmail,
        displayName: user.displayName || "Atelier Owner",
        role: "superadmin",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      await setDoc(adminDocRef, newProfile);
      return { isAdmin: true, profile: newProfile };
    }

    return { isAdmin: false, profile: null };
  } catch (err) {
    console.warn("Error verifying admin status in Firestore:", err);
    // If Firestore check has a network/permission hiccup but email is primary owner
    if (isPrimary) {
      return {
        isAdmin: true,
        profile: {
          uid: user.uid,
          email: user.email || userEmail,
          displayName: user.displayName || "Atelier Owner",
          role: "superadmin",
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
      };
    }
    return { isAdmin: false, profile: null };
  }
}

/**
 * Sign in admin using Firebase Email & Password
 */
export async function adminSignInWithEmail(
  email: string,
  password: string
): Promise<{ user: User; profile: AdminProfile }> {
  const cleanEmail = email.trim().toLowerCase();
  const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const user = cred.user;

  const { isAdmin, profile } = await checkIsAdmin(user);

  if (!isAdmin) {
    // If not recognized as an admin, sign out immediately to prevent unauthorized access
    await signOut(auth);
    throw new Error(
      "Access Restricted: This account does not have Administrator privileges. Please contact the Atelier Owner or use an authorized admin email."
    );
  }

  // Update last login timestamp in Firestore
  try {
    await updateDoc(doc(db, "admins", user.uid), {
      lastLoginAt: new Date().toISOString(),
    });
  } catch {
    // Non-blocking
  }

  // Store local session helper & backend auth token
  try {
    const idToken = await user.getIdToken();
    setStoredAdminSession(profile?.displayName || user.displayName || "House of Shriya", idToken);
    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: profile?.displayName || user.displayName,
        role: profile?.role || "admin",
        authenticatedAt: Date.now(),
      })
    );
  } catch {
    // Non-blocking
  }

  return { user, profile: profile! };
}

/**
 * Create a new Admin account in Firebase Auth and record in Firestore `admins` collection
 */
export async function adminCreateAccount(
  email: string,
  pass: string,
  displayName: string,
  role: AdminRole = "admin"
): Promise<{ user: User; profile: AdminProfile }> {
  const cleanEmail = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const user = cred.user;

  const cleanName = displayName.trim() || "House of Shriya";
  await updateProfile(user, { displayName: cleanName });

  const profile: AdminProfile = {
    uid: user.uid,
    email: user.email || cleanEmail,
    displayName: cleanName,
    role,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "admins", user.uid), profile);

  try {
    const idToken = await user.getIdToken();
    setStoredAdminSession(cleanName, idToken);
    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: cleanName,
        role,
        authenticatedAt: Date.now(),
      })
    );
  } catch {
    // Non-blocking
  }

  return { user, profile };
}

/**
 * Send password reset email via Firebase Auth
 */
export async function adminSendPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, cleanEmail);
}

/**
 * Sign out current admin
 */
export async function adminSignOutSession(): Promise<void> {
  try {
    clearStoredAdminSession();
    localStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Non-blocking
  }
  await signOut(auth);
}

/**
 * Retrieve cached admin session if any
 */
export function getCachedAdminSession(): { uid: string; email: string; displayName: string; role: string } | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY) || sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Listen to Firebase Auth state for Admin
 */
export function subscribeAdminAuthState(
  callback: (state: { user: User | null; profile: AdminProfile | null; isAdmin: boolean; loading: boolean }) => void
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, profile: null, isAdmin: false, loading: false });
      return;
    }

    try {
      const { isAdmin, profile } = await checkIsAdmin(user);
      if (isAdmin && user) {
        try {
          const idToken = await user.getIdToken();
          setStoredAdminSession(profile?.displayName || user.displayName || "House of Shriya", idToken);
        } catch {}
      }
      callback({ user, profile, isAdmin, loading: false });
    } catch {
      callback({ user, profile: null, isAdmin: false, loading: false });
    }
  });
}
