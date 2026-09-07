import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Crown } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import AdminLoginView from "../components/admin/AdminLoginView";

export default function AdminLogin() {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && isAdmin) {
      const from = (location.state as { from?: string })?.from || "/admin/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAdmin, loading, navigate, location]);

  if (loading) {
    return (
      <div id="admin-login-loading" className="min-h-screen bg-[#080e0c] flex items-center justify-center text-[#d4af37]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#0d4f3c] border border-[#d4af37]/40 flex items-center justify-center mx-auto shadow-2xl animate-pulse">
            <Crown size={30} className="text-[#d4af37]" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.25em] text-[#d4af37] uppercase block">
            HOUSE OF SHRIYA
          </span>
          <p className="font-serif tracking-widest text-xs text-[#cfc8bc] uppercase">
            Initializing Secure Admin Access...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminLoginView
      onSuccess={() => {
        const from = (location.state as { from?: string })?.from || "/admin/dashboard";
        navigate(from, { replace: true });
      }}
    />
  );
}
