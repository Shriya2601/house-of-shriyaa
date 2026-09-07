import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Crown } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAdmin, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div id="admin-auth-guard-loading" className="min-h-screen bg-[#080e0c] flex items-center justify-center text-[#d4af37]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#0d4f3c] border border-[#d4af37]/40 flex items-center justify-center mx-auto shadow-2xl animate-pulse">
            <Crown size={30} className="text-[#d4af37]" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.25em] text-[#d4af37] uppercase block">
            HOUSE OF SHRIYA ATELIER
          </span>
          <p className="font-serif tracking-widest text-xs text-[#cfc8bc] uppercase">
            Verifying Administrator Clearance...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
