import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import ProductDetails from "./pages/ProductDetails";
import InfoPage from "./pages/InfoPage";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import { StoreProvider } from "./context/StoreContext";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import {
  EditModeProvider,
  CanvaTopBar,
  CanvaContextualToolbar,
  CanvaBrandKitModal,
  CanvaImagePickerModal,
  CanvaProductModal,
  CanvaSlideModal,
  CanvaDeploymentModal,
} from "./components/editmode";
import CartDrawer from "./components/cart/CartDrawer";
import CheckoutModal from "./components/checkout/CheckoutModal";
import PookieChatbot from "./components/pookie/PookieChatbot";

function AdminRouteRedirect() {
  const { isAdmin, loading } = useAdminAuth();
  if (loading) {
    return (
      <div id="admin-redirect-loading" className="min-h-screen bg-[#080e0c] flex items-center justify-center text-[#d4af37]">
        <div className="w-12 h-12 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
      </div>
    );
  }
  return <Navigate to={isAdmin ? "/admin/dashboard" : "/admin/login"} replace />;
}

export default function App() {
  return (
    <StoreProvider>
      <AdminAuthProvider>
        <EditModeProvider>
          <BrowserRouter>
            <CanvaTopBar />
            <CanvaContextualToolbar />
            <CanvaBrandKitModal />
            <CanvaImagePickerModal />
            <CanvaProductModal />
            <CanvaSlideModal />
            <CanvaDeploymentModal />
            <CartDrawer />
            <CheckoutModal />
            <PookieChatbot />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminProtectedRoute>
                    <Admin />
                  </AdminProtectedRoute>
                }
              />
              <Route path="/admin" element={<AdminRouteRedirect />} />
              <Route
                path="/admin/*"
                element={
                  <AdminProtectedRoute>
                    <Admin />
                  </AdminProtectedRoute>
                }
              />
              <Route path="/our-story" element={<InfoPage path="/our-story" />} />
              <Route path="/craftsmanship" element={<InfoPage path="/craftsmanship" />} />
              <Route path="/journal" element={<InfoPage path="/journal" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </EditModeProvider>
      </AdminAuthProvider>
    </StoreProvider>
  );
}


