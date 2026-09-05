import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InfoPage from "./pages/InfoPage";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import { StoreProvider } from "./context/StoreContext";
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

export default function App() {
  return (
    <StoreProvider>
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
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/login" element={<Admin />} />
            <Route path="/our-story" element={<InfoPage path="/our-story" />} />
            <Route path="/craftsmanship" element={<InfoPage path="/craftsmanship" />} />
            <Route path="/journal" element={<InfoPage path="/journal" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EditModeProvider>
    </StoreProvider>
  );
}

