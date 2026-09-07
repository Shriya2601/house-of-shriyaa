import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { AdminProfile } from "../types";
import {
  subscribeAdminAuthState,
  adminSignInWithEmail,
  adminCreateAccount,
  adminSendPasswordReset,
  adminSignOutSession,
  getCachedAdminSession,
} from "../services/adminAuthService";

interface AdminAuthContextType {
  adminUser: User | null;
  adminProfile: AdminProfile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName: string, role?: "superadmin" | "admin" | "manager") => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(() => {
    const cached = getCachedAdminSession();
    if (!cached) return null;
    return {
      uid: cached.uid,
      email: cached.email,
      displayName: cached.displayName,
      role: (cached.role as "superadmin" | "admin" | "manager") || "admin",
      createdAt: "",
    };
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => Boolean(getCachedAdminSession()));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAdminAuthState(({ user, profile, isAdmin: isUserAdmin }) => {
      setAdminUser(user);
      setAdminProfile(profile);
      setIsAdmin(isUserAdmin);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const { user, profile } = await adminSignInWithEmail(email, pass);
      setAdminUser(user);
      setAdminProfile(profile);
      setIsAdmin(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in with Firebase Auth.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (
      email: string,
      pass: string,
      displayName: string,
      role: "superadmin" | "admin" | "manager" = "admin"
    ) => {
      setError(null);
      setLoading(true);
      try {
        const { user, profile } = await adminCreateAccount(email, pass, displayName, role);
        setAdminUser(user);
        setAdminProfile(profile);
        setIsAdmin(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to establish admin account.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      await adminSignOutSession();
      setAdminUser(null);
      setAdminProfile(null);
      setIsAdmin(false);
    } catch (err: unknown) {
      console.warn("Sign out error:", err);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await adminSendPasswordReset(email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset email.";
      setError(msg);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        adminProfile,
        isAdmin,
        loading,
        error,
        login,
        register,
        logout,
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
