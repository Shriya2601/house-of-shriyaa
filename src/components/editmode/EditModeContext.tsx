import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  BrandStyles,
  CustomElementStyle,
  SelectedElement,
  CanvaModalType,
  EditSnapshot,
} from "./EditModeTypes";
import defaultBrandStylesJson from "../../data/brandStyles.json";
import defaultOverridesJson from "../../data/customOverrides.json";
import { isInsideAIStudioEditor } from "./EditModeUtils";
import {
  getCachedBrandStyles,
  cacheBrandStylesLocally,
  saveBrandStyles as persistBrandStyles,
  getCachedCustomOverrides,
  cacheCustomOverridesLocally,
  saveCustomOverrides as persistCustomOverrides,
  saveSiteContent,
} from "../../services/storeService";

export const defaultBrandStyles: BrandStyles = {
  primaryColor: "#0d4f3c", // Royal Emerald Green
  accentColor: "#d4af37", // Boutique Gold
  headingFont: "Cinzel",
  bodyFont: "Plus Jakarta Sans",
  backgroundColor: "#faf8f5", // Pure Ivory
  headingWeight: "700",
  letterSpacing: "normal",
  ...(defaultBrandStylesJson as Partial<BrandStyles>),
};

interface EditModeContextType {
  isEditMode: boolean;
  setIsEditMode: (active: boolean) => void;
  toggleEditMode: () => void;
  isPreviewOnly: boolean;
  setIsPreviewOnly: (preview: boolean) => void;
  selectedElement: SelectedElement | null;
  setSelectedElement: (element: SelectedElement | null) => void;
  activeModal: CanvaModalType;
  setActiveModal: (modal: CanvaModalType) => void;
  modalData: unknown;
  setModalData: (data: unknown) => void;

  brandStyles: BrandStyles;
  updateBrandStyles: (updates: Partial<BrandStyles>, description?: string) => void;

  customOverrides: Record<string, CustomElementStyle>;
  updateCustomOverride: (id: string, updates: Partial<CustomElementStyle>, description?: string) => void;
  getOverride: (id: string) => CustomElementStyle | undefined;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  lastActionDescription: string;

  saveChanges: () => Promise<boolean>;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  hasUnsavedChanges: boolean;
  resetToDefaults: () => void;

  quickEditProduct: (product: unknown) => void;
  quickEditSlide: (slideIndex: number) => void;
  quickEditImage: (targetId: string, currentUrl: string, label: string) => void;
  updateContentField: (fieldPath: string, value: unknown, description?: string) => void;
}

const EditModeContext = createContext<EditModeContextType | null>(null);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("canva") === "true" || urlParams.get("edit_mode") === "true") return true;
    if (urlParams.get("canva") === "false" || urlParams.get("edit_mode") === "false") return false;
    const saved = localStorage.getItem("hos_edit_mode");
    if (saved !== null) return saved === "true";
    return isInsideAIStudioEditor();
  });

  const [isPreviewOnly, setIsPreviewOnly] = useState<boolean>(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [activeModal, setActiveModal] = useState<CanvaModalType>(null);
  const [modalData, setModalData] = useState<unknown>(null);

  const [brandStyles, setBrandStyles] = useState<BrandStyles>(() => {
    const cached = getCachedBrandStyles();
    return {
      ...defaultBrandStyles,
      ...(defaultBrandStylesJson as Partial<BrandStyles>),
      ...cached,
    };
  });

  const [customOverrides, setCustomOverrides] = useState<Record<string, CustomElementStyle>>(() => {
    const cached = getCachedCustomOverrides();
    return {
      ...(defaultOverridesJson as Record<string, CustomElementStyle>),
      ...cached,
    };
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState<{ brandStyles: BrandStyles; customOverrides: Record<string, CustomElementStyle> }[]>([]);
  const [redoStack, setRedoStack] = useState<{ brandStyles: BrandStyles; customOverrides: Record<string, CustomElementStyle> }[]>([]);
  const [lastActionDescription, setLastActionDescription] = useState<string>("");

  const brandStylesRef = useRef(brandStyles);
  brandStylesRef.current = brandStyles;

  const customOverridesRef = useRef(customOverrides);
  customOverridesRef.current = customOverrides;

  // Sync initial data from backend API on mount
  useEffect(() => {
    let mounted = true;
    async function loadBackendData() {
      try {
        const [bsRes, coRes] = await Promise.all([
          fetch("/api/brand-styles").catch(() => null),
          fetch("/api/custom-overrides").catch(() => null),
        ]);

        if (bsRes && bsRes.ok) {
          const bsData = await bsRes.json().catch(() => null);
          if (bsData && typeof bsData === "object" && mounted) {
            setBrandStyles((prev) => {
              const merged = { ...prev, ...bsData };
              cacheBrandStylesLocally(merged);
              return merged;
            });
          }
        }

        if (coRes && coRes.ok) {
          const coData = await coRes.json().catch(() => null);
          if (coData && typeof coData === "object" && mounted) {
            setCustomOverrides((prev) => {
              const merged = { ...prev, ...coData };
              cacheCustomOverridesLocally(merged);
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn("Notice: could not pre-fetch brandStyles or customOverrides from backend:", err);
      }
    }
    loadBackendData();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen to window update events from other tabs / components
  useEffect(() => {
    const handleBrandStylesUpdated = (e: any) => {
      if (e.detail && typeof e.detail === "object") {
        setBrandStyles((prev) => ({ ...prev, ...e.detail }));
      }
    };

    const handleOverridesUpdated = (e: any) => {
      if (e.detail && typeof e.detail === "object") {
        setCustomOverrides((prev) => ({ ...prev, ...e.detail }));
      }
    };

    window.addEventListener("hos-brand-styles-updated", handleBrandStylesUpdated);
    window.addEventListener("hos-custom-overrides-updated", handleOverridesUpdated);

    return () => {
      window.removeEventListener("hos-brand-styles-updated", handleBrandStylesUpdated);
      window.removeEventListener("hos-custom-overrides-updated", handleOverridesUpdated);
    };
  }, []);

  const setIsEditMode = useCallback((active: boolean) => {
    setIsEditModeState(active);
    try {
      localStorage.setItem("hos_edit_mode", active ? "true" : "false");
    } catch {}
  }, []);

  const toggleEditMode = useCallback(() => {
    setIsEditModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hos_edit_mode", next ? "true" : "false");
      } catch {}
      return next;
    });
  }, []);

  const updateBrandStyles = useCallback((updates: Partial<BrandStyles>, description?: string) => {
    setUndoStack((prev) => [
      ...prev.slice(-20),
      { brandStyles: brandStylesRef.current, customOverrides: customOverridesRef.current },
    ]);
    setRedoStack([]);
    setBrandStyles((prev) => {
      const next = { ...prev, ...updates };
      cacheBrandStylesLocally(next);
      return next;
    });
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
    setSaveError(null);
    if (description) setLastActionDescription(description);
  }, []);

  const updateCustomOverride = useCallback(
    (id: string, updates: Partial<CustomElementStyle>, description?: string) => {
      setUndoStack((prev) => [
        ...prev.slice(-20),
        { brandStyles: brandStylesRef.current, customOverrides: customOverridesRef.current },
      ]);
      setRedoStack([]);
      setCustomOverrides((prev) => {
        const next = {
          ...prev,
          [id]: {
            ...prev[id],
            ...updates,
          },
        };
        cacheCustomOverridesLocally(next);
        return next;
      });
      setHasUnsavedChanges(true);
      setSaveSuccess(false);
      setSaveError(null);
      if (description) setLastActionDescription(description);
    },
    []
  );

  const getOverride = useCallback(
    (id: string): CustomElementStyle | undefined => {
      return customOverrides[id];
    },
    [customOverrides]
  );

  const undo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const last = prevUndo[prevUndo.length - 1];
      const remaining = prevUndo.slice(0, prevUndo.length - 1);

      setRedoStack((prevRedo) => [
        ...prevRedo,
        { brandStyles: brandStylesRef.current, customOverrides: customOverridesRef.current },
      ]);

      setBrandStyles(last.brandStyles);
      setCustomOverrides(last.customOverrides);
      cacheBrandStylesLocally(last.brandStyles);
      cacheCustomOverridesLocally(last.customOverrides);
      setHasUnsavedChanges(true);

      return remaining;
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[prevRedo.length - 1];
      const remaining = prevRedo.slice(0, prevRedo.length - 1);

      setUndoStack((prevUndo) => [
        ...prevUndo,
        { brandStyles: brandStylesRef.current, customOverrides: customOverridesRef.current },
      ]);

      setBrandStyles(next.brandStyles);
      setCustomOverrides(next.customOverrides);
      cacheBrandStylesLocally(next.brandStyles);
      cacheCustomOverridesLocally(next.customOverrides);
      setHasUnsavedChanges(true);

      return remaining;
    });
  }, []);

  const saveChanges = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // 1. Persist Brand Styles to server and disk
      await persistBrandStyles(brandStylesRef.current);

      // 2. Persist Custom Overrides to server and disk
      await persistCustomOverrides(customOverridesRef.current);

      setIsSaving(false);
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveSuccess(false), 4000);
      return true;
    } catch (err: any) {
      console.error("[EditModeContext] Failed to save changes:", err);
      const errMsg = err?.message || "Failed to persist changes to the server.";
      setIsSaving(false);
      setSaveError(errMsg);
      // NEVER silently revert user edits on failure! Keep hasUnsavedChanges true so user can retry.
      setHasUnsavedChanges(true);
      throw new Error(errMsg);
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-20),
      { brandStyles: brandStylesRef.current, customOverrides: customOverridesRef.current },
    ]);
    setRedoStack([]);
    setBrandStyles(defaultBrandStyles);
    setCustomOverrides({});
    cacheBrandStylesLocally(defaultBrandStyles);
    cacheCustomOverridesLocally({});
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  }, []);

  const quickEditProduct = useCallback((product: unknown) => {
    setActiveModal("productModal");
    setModalData(product);
  }, []);

  const quickEditSlide = useCallback((slideIndex: number) => {
    setActiveModal("slideModal");
    setModalData({ slideIndex });
  }, []);

  const quickEditImage = useCallback((targetId: string, currentUrl: string, label: string) => {
    setActiveModal("imagePicker");
    setModalData({ targetId, currentUrl, label });
  }, []);

  const updateContentField = useCallback((fieldPath: string, value: unknown, description?: string) => {
    if (!fieldPath) return;
    // Map directly into custom override or siteContent
    updateCustomOverride(fieldPath, { text: String(value) }, description);
  }, [updateCustomOverride]);

  const value: EditModeContextType = {
    isEditMode,
    setIsEditMode,
    toggleEditMode,
    isPreviewOnly,
    setIsPreviewOnly,
    selectedElement,
    setSelectedElement,
    activeModal,
    setActiveModal,
    modalData,
    setModalData,

    brandStyles,
    updateBrandStyles,

    customOverrides,
    updateCustomOverride,
    getOverride,

    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    lastActionDescription,

    saveChanges,
    isSaving,
    saveSuccess,
    saveError,
    hasUnsavedChanges,
    resetToDefaults,

    quickEditProduct,
    quickEditSlide,
    quickEditImage,
    updateContentField,
  };

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("useEditMode must be used within an EditModeProvider");
  }
  return context;
}
