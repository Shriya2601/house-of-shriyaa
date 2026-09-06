import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useStore } from "../../context/StoreContext";
import {
  BrandStyles,
  CustomElementStyle,
  SelectedElement,
  EditSnapshot,
  CanvaModalType,
} from "./EditModeTypes";
import { saveSiteContent, saveProduct, getAdminAuthHeaders } from "../../services/storeService";
import { Product, SiteContent } from "../../types";
import { isInsideAIStudioEditor } from "./EditModeUtils";
import defaultBrandStylesJson from "../../data/brandStyles.json";
import defaultOverridesJson from "../../data/customOverrides.json";

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
  modalData: any;
  setModalData: (data: any) => void;

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

  saveChanges: (explicitData?: {
    siteContent?: SiteContent;
    products?: Product[];
    brandStyles?: BrandStyles;
    customOverrides?: Record<string, CustomElementStyle>;
  }) => Promise<boolean>;
  isSaving: boolean;
  saveSuccess: boolean;
  hasUnsavedChanges: boolean;
  resetToDefaults: () => void;

  // Shortcuts
  quickEditProduct: (product: Product) => void;
  quickEditSlide: (slideIndex: number) => void;
  quickEditImage: (targetId: string, currentUrl: string, label: string) => void;
  updateContentField: (fieldPath: string, value: any, description?: string) => void;
}

const EditModeContext = createContext<EditModeContextType | null>(null);

const STORAGE_KEY_OVERRIDES = "hos_canva_overrides";
const STORAGE_KEY_BRAND_STYLES = "hos_canva_brand_styles";
const MAX_HISTORY = 35;

export function EditModeProvider({ children }: { children: ReactNode }) {
  const { siteContent, setSiteContent, products, setProducts } = useStore();

  const [isEditMode, setIsEditMode] = useState<boolean>(() => {
    // Start with Edit Mode accessible via the prominent Canva top bar / toggle
    return false;
  });
  const [isPreviewOnly, setIsPreviewOnly] = useState<boolean>(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [activeModal, setActiveModal] = useState<CanvaModalType>(null);
  const [modalData, setModalData] = useState<any>(null);

  const [brandStyles, setBrandStyles] = useState<BrandStyles>(() => {
    const base = {
      ...defaultBrandStyles,
      ...(defaultBrandStylesJson as Partial<BrandStyles>),
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BRAND_STYLES);
      return saved ? { ...base, ...JSON.parse(saved) } : base;
    } catch {
      return base;
    }
  });

  const [customOverrides, setCustomOverrides] = useState<Record<string, CustomElementStyle>>(() => {
    const base = (defaultOverridesJson as Record<string, CustomElementStyle>) || {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OVERRIDES);
      return saved ? { ...base, ...JSON.parse(saved) } : base;
    } catch {
      return base;
    }
  });

  const [history, setHistory] = useState<EditSnapshot[]>([]);
  const [future, setFuture] = useState<EditSnapshot[]>([]);
  const [lastActionDescription, setLastActionDescription] = useState<string>("Ready to edit");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Track latest state in a ref to avoid stale closures in saveChanges and callbacks
  const latestStateRef = useRef({
    siteContent,
    products,
    brandStyles,
    customOverrides,
  });

  useEffect(() => {
    latestStateRef.current = {
      siteContent,
      products,
      brandStyles,
      customOverrides,
    };
  }, [siteContent, products, brandStyles, customOverrides]);

  // Fetch persisted brand styles and custom overrides from server API on mount
  useEffect(() => {
    fetch(`/api/brand-styles?v=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setBrandStyles((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});

    fetch(`/api/custom-overrides?v=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setCustomOverrides((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, []);

  // Track deliberate user edits so initial Firestore data fetch doesn't trigger spurious git auto-commits
  const userInteractedRef = useRef(false);

  // AUTOMATIC DEBOUNCED AUTO-SAVE TO PROJECT SOURCE FILES & GITHUB:
  // Whenever any deliberate edit is made in Canva / Edit Mode, write to src/data/*.json on disk and sync to Git
  const isFirstMount = useRef(true);
  const prevDataRef = useRef({
    siteContentStr: JSON.stringify(siteContent),
    productsStr: JSON.stringify(products),
    brandStylesStr: JSON.stringify(brandStyles),
    customOverridesStr: JSON.stringify(customOverrides),
  });

  // Automatically detect any modification across modals, toolbar, or brand kit
  useEffect(() => {
    if (isFirstMount.current) return;
    if (isEditMode) {
      userInteractedRef.current = true;
    }
    if (!userInteractedRef.current) {
      // Don't mark unsaved or trigger auto-commit on initial store boots
      prevDataRef.current = {
        siteContentStr: JSON.stringify(siteContent),
        productsStr: JSON.stringify(products),
        brandStylesStr: JSON.stringify(brandStyles),
        customOverridesStr: JSON.stringify(customOverrides),
      };
      return;
    }

    const currentSiteContentStr = JSON.stringify(siteContent);
    const currentProductsStr = JSON.stringify(products);
    const currentBrandStylesStr = JSON.stringify(brandStyles);
    const currentOverridesStr = JSON.stringify(customOverrides);

    if (
      currentSiteContentStr !== prevDataRef.current.siteContentStr ||
      currentProductsStr !== prevDataRef.current.productsStr ||
      currentBrandStylesStr !== prevDataRef.current.brandStylesStr ||
      currentOverridesStr !== prevDataRef.current.customOverridesStr
    ) {
      setHasUnsavedChanges(true);
      prevDataRef.current = {
        siteContentStr: currentSiteContentStr,
        productsStr: currentProductsStr,
        brandStylesStr: currentBrandStylesStr,
        customOverridesStr: currentOverridesStr,
      };
    }
  }, [siteContent, products, brandStyles, customOverrides]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (!hasUnsavedChanges || !userInteractedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const savedToken = (typeof window !== "undefined" && localStorage.getItem("gh_pat_token")) || "";
        const dataToSave = latestStateRef.current;
        const repoRes = await fetch("/api/save-repo-changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteContent: dataToSave.siteContent,
            products: dataToSave.products,
            brandStyles: dataToSave.brandStyles,
            customOverrides: dataToSave.customOverrides,
            token: savedToken,
            commitMessage: `chore(canva): auto-sync storefront edits to source files (${new Date().toLocaleTimeString()})`,
          }),
        });
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          setHasUnsavedChanges(false);
          if (repoData.remotePushed) {
            setLastActionDescription(`✓ Auto-synced & pushed to GitHub main (${repoData.commitHash?.slice(0, 7) || ""})`);
          } else {
            setLastActionDescription("✓ Changes auto-saved to project source files & local Git");
          }
        }
      } catch (err) {
        console.warn("Auto-save notice:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [siteContent, products, brandStyles, customOverrides, hasUnsavedChanges]);

  // Sync brand styles into CSS root variables dynamically for instant live preview
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--hos-primary", brandStyles.primaryColor);
    root.style.setProperty("--hos-accent", brandStyles.accentColor);
    root.style.setProperty("--hos-bg", brandStyles.backgroundColor);

    // Apply font variables
    const headingFontFamily =
      brandStyles.headingFont === "Cinzel"
        ? "'Cinzel', Georgia, serif"
        : brandStyles.headingFont === "Playfair Display"
        ? "'Playfair Display', Georgia, serif"
        : brandStyles.headingFont === "Cormorant Garamond"
        ? "'Cormorant Garamond', Georgia, serif"
        : brandStyles.headingFont === "Montserrat"
        ? "'Montserrat', sans-serif"
        : "'Plus Jakarta Sans', sans-serif";

    const bodyFontFamily =
      brandStyles.bodyFont === "Plus Jakarta Sans"
        ? "'Plus Jakarta Sans', sans-serif"
        : brandStyles.bodyFont === "Montserrat"
        ? "'Montserrat', sans-serif"
        : "Inter, sans-serif";

    root.style.setProperty("--font-display", headingFontFamily);
    root.style.setProperty("--font-serif", headingFontFamily);
    root.style.setProperty("--font-sans", bodyFontFamily);

    // Update root background
    document.body.style.backgroundColor = brandStyles.backgroundColor;

    try {
      localStorage.setItem(STORAGE_KEY_BRAND_STYLES, JSON.stringify(brandStyles));
    } catch (e) {
      console.warn("Storage sync notice:", e);
    }
  }, [brandStyles]);

  // Sync custom overrides to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(customOverrides));
    } catch (e) {
      console.warn("Overrides storage sync notice:", e);
    }
  }, [customOverrides]);

  // Push snapshot before any state modification
  const pushSnapshot = useCallback(
    (description: string) => {
      userInteractedRef.current = true;
      const snapshot: EditSnapshot = {
        timestamp: Date.now(),
        description,
        siteContent: JSON.parse(JSON.stringify(siteContent)),
        products: JSON.parse(JSON.stringify(products)),
        brandStyles: { ...brandStyles },
        customOverrides: JSON.parse(JSON.stringify(customOverrides)),
      };

      setHistory((prev) => [...prev.slice(-MAX_HISTORY), snapshot]);
      setFuture([]);
      setLastActionDescription(description);
      setHasUnsavedChanges(true);
    },
    [siteContent, products, brandStyles, customOverrides]
  );

  // Undo operation
  const undo = useCallback(() => {
    if (history.length === 0) return;

    // Current state snapshot to push into future
    const currentSnapshot: EditSnapshot = {
      timestamp: Date.now(),
      description: "Undone: " + lastActionDescription,
      siteContent: JSON.parse(JSON.stringify(siteContent)),
      products: JSON.parse(JSON.stringify(products)),
      brandStyles: { ...brandStyles },
      customOverrides: JSON.parse(JSON.stringify(customOverrides)),
    };

    const previousSnapshot = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setFuture((prev) => [currentSnapshot, ...prev]);
    setHistory(newHistory);

    // Revert state
    setSiteContent(previousSnapshot.siteContent);
    setProducts(previousSnapshot.products);
    setBrandStyles(previousSnapshot.brandStyles);
    setCustomOverrides(previousSnapshot.customOverrides);
    setLastActionDescription(`Undo: ${previousSnapshot.description}`);
  }, [history, lastActionDescription, siteContent, products, brandStyles, customOverrides, setSiteContent, setProducts]);

  // Redo operation
  const redo = useCallback(() => {
    if (future.length === 0) return;

    const nextSnapshot = future[0];
    const newFuture = future.slice(1);

    const currentSnapshot: EditSnapshot = {
      timestamp: Date.now(),
      description: "Redone: " + nextSnapshot.description,
      siteContent: JSON.parse(JSON.stringify(siteContent)),
      products: JSON.parse(JSON.stringify(products)),
      brandStyles: { ...brandStyles },
      customOverrides: JSON.parse(JSON.stringify(customOverrides)),
    };

    setHistory((prev) => [...prev, currentSnapshot]);
    setFuture(newFuture);

    // Reapply state
    setSiteContent(nextSnapshot.siteContent);
    setProducts(nextSnapshot.products);
    setBrandStyles(nextSnapshot.brandStyles);
    setCustomOverrides(nextSnapshot.customOverrides);
    setLastActionDescription(`Redo: ${nextSnapshot.description}`);
  }, [future, siteContent, products, brandStyles, customOverrides, setSiteContent, setProducts]);

  // Keyboard shortcuts (Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Shift+Z, Escape, Ctrl+E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea unless it's Ctrl+Z
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isModifier = isMac ? e.metaKey : e.ctrlKey;

      if (isModifier && e.key.toLowerCase() === "e") {
        if (!isInsideAIStudioEditor()) return;
        e.preventDefault();
        setIsEditMode((prev) => !prev);
        return;
      }

      if (isModifier && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (!isInput) {
          e.preventDefault();
          undo();
        }
      } else if (isModifier && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        if (!isInput) {
          e.preventDefault();
          redo();
        }
      } else if (e.key === "Escape") {
        if (selectedElement) {
          setSelectedElement(null);
        }
        if (activeModal) {
          setActiveModal(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedElement, activeModal]);

  // Update Brand Styles live
  const updateBrandStyles = useCallback(
    (updates: Partial<BrandStyles>, description = "Updated Brand Styles") => {
      pushSnapshot(description);
      setBrandStyles((prev) => ({ ...prev, ...updates }));
    },
    [pushSnapshot]
  );

  // Update Custom Overrides per element (e.g. specific font size, custom text, specific color)
  const updateCustomOverride = useCallback(
    (id: string, updates: Partial<CustomElementStyle>, description = `Edited ${id}`) => {
      pushSnapshot(description);
      setCustomOverrides((prev) => {
        const existing = prev[id] || {};
        return {
          ...prev,
          [id]: { ...existing, ...updates },
        };
      });
    },
    [pushSnapshot]
  );

  const getOverride = useCallback(
    (id: string) => {
      return customOverrides[id];
    },
    [customOverrides]
  );

  // Update content fields directly (e.g. siteContent.announcementText, heroSlides[0].title)
  const updateContentField = useCallback(
    (fieldPath: string, value: any, description?: string) => {
      pushSnapshot(description || `Updated ${fieldPath}`);
      setSiteContent((prev) => {
        const next = { ...prev };
        if (fieldPath.startsWith("heroSlides[")) {
          const match = fieldPath.match(/heroSlides\[(\d+)\]\.(.+)/);
          if (match) {
            const slideIdx = parseInt(match[1], 10);
            const prop = match[2];
            const updatedSlides = [...(next.heroSlides || [])];
            if (updatedSlides[slideIdx]) {
              updatedSlides[slideIdx] = { ...updatedSlides[slideIdx], [prop]: value };
              next.heroSlides = updatedSlides;
            }
          }
        } else if (fieldPath in next) {
          (next as any)[fieldPath] = value;
        }
        return next;
      });
    },
    [pushSnapshot, setSiteContent]
  );

  // Save all changes to Git Repository, Cloud Firestore and LocalStorage
  const saveChanges = useCallback(
    async (explicitData?: {
      siteContent?: SiteContent;
      products?: Product[];
      brandStyles?: BrandStyles;
      customOverrides?: Record<string, CustomElementStyle>;
    }): Promise<boolean> => {
      userInteractedRef.current = true;
      setIsSaving(true);
      setSaveSuccess(false);

      const targetSiteContent = explicitData?.siteContent || latestStateRef.current.siteContent;
      const targetProducts = explicitData?.products || latestStateRef.current.products;
      const targetBrandStyles = explicitData?.brandStyles || latestStateRef.current.brandStyles;
      const targetOverrides = explicitData?.customOverrides || latestStateRef.current.customOverrides;

      let gitCommitMsg = "";

      try {
        // 1. Save directly to GitHub repository files on disk and commit to Git
        try {
          const savedToken = (typeof window !== "undefined" && localStorage.getItem("gh_pat_token")) || "";
          const repoRes = await fetch("/api/save-repo-changes", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
            body: JSON.stringify({
              siteContent: targetSiteContent,
              products: targetProducts,
              brandStyles: targetBrandStyles,
              customOverrides: targetOverrides,
              token: savedToken,
              commitMessage: `chore(canva): storefront design & catalog updates (${new Date().toLocaleDateString()})`,
            }),
          });
          if (repoRes.ok) {
            const repoData = await repoRes.json();
            if (repoData.commitHash) {
              gitCommitMsg = ` · Git: ${repoData.commitHash.slice(0, 7)}`;
            }
            if (repoData.remotePushed) {
              gitCommitMsg += " · Pushed to GitHub main";
            }
          }
        } catch (repoErr) {
          console.warn("Notice: /api/save-repo-changes unavailable in current env:", repoErr);
        }

        // 2. Save siteContent to Firestore
        try {
          await saveSiteContent(targetSiteContent);
        } catch (fsErr) {
          console.warn("Firestore siteContent notice:", fsErr);
        }

        // 3. Save any edited products to Firestore
        try {
          for (const p of targetProducts) {
            if (p.updatedAt) {
              await saveProduct(p);
            }
          }
        } catch (prodErr) {
          console.warn("Firestore product save notice:", prodErr);
        }

        // 4. Persist brand styles and overrides locally and to server API
        try {
          fetch("/api/brand-styles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(targetBrandStyles),
          }).catch(() => {});

          fetch("/api/custom-overrides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(targetOverrides),
          }).catch(() => {});
        } catch {}

        localStorage.setItem(STORAGE_KEY_BRAND_STYLES, JSON.stringify(targetBrandStyles));
        localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(targetOverrides));

        setIsSaving(false);
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        setLastActionDescription(`Saved to repository & cloud!${gitCommitMsg}`);

        setTimeout(() => setSaveSuccess(false), 4000);
        return true;
      } catch (error) {
        console.error("Failed to save changes:", error);
        setIsSaving(false);
        // Still keep local backup saved
        localStorage.setItem(STORAGE_KEY_BRAND_STYLES, JSON.stringify(targetBrandStyles));
        localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(targetOverrides));
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveSuccess(false), 3000);
        return false;
      }
    },
    []
  );

  // Reset to initial defaults
  const resetToDefaults = useCallback(() => {
    pushSnapshot("Reset to original brand template");
    setBrandStyles(defaultBrandStyles);
    setCustomOverrides({});
    localStorage.removeItem(STORAGE_KEY_BRAND_STYLES);
    localStorage.removeItem(STORAGE_KEY_OVERRIDES);
    setLastActionDescription("Reset to defaults");
  }, [pushSnapshot]);

  // Quick Action Helpers
  const quickEditProduct = useCallback((product: Product) => {
    setModalData(product);
    setActiveModal("productModal");
  }, []);

  const quickEditSlide = useCallback((slideIndex: number) => {
    setModalData({ slideIndex });
    setActiveModal("slideModal");
  }, []);

  const quickEditImage = useCallback((targetId: string, currentUrl: string, label: string) => {
    setModalData({ targetId, currentUrl, label });
    setActiveModal("imagePicker");
  }, []);

  const toggleEditMode = useCallback(() => {
    if (!isInsideAIStudioEditor()) {
      setIsEditMode(false);
      setSelectedElement(null);
      setActiveModal(null);
      return;
    }
    setIsEditMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedElement(null);
        setActiveModal(null);
      }
      return next;
    });
  }, []);

  return (
    <EditModeContext.Provider
      value={{
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
        canUndo: history.length > 0,
        canRedo: future.length > 0,
        lastActionDescription,
        saveChanges,
        isSaving,
        saveSuccess,
        hasUnsavedChanges,
        resetToDefaults,
        quickEditProduct,
        quickEditSlide,
        quickEditImage,
        updateContentField,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("useEditMode must be used within an EditModeProvider");
  }
  return context;
}
