import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import {
  BrandStyles,
  CustomElementStyle,
  SelectedElement,
  CanvaModalType,
} from "./EditModeTypes";
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
  hasUnsavedChanges: boolean;
  resetToDefaults: () => void;

  quickEditProduct: (product: unknown) => void;
  quickEditSlide: (slideIndex: number) => void;
  quickEditImage: (targetId: string, currentUrl: string, label: string) => void;
  updateContentField: (fieldPath: string, value: unknown, description?: string) => void;
}

const EditModeContext = createContext<EditModeContextType | null>(null);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [brandStyles] = useState<BrandStyles>(() => ({
    ...defaultBrandStyles,
    ...(defaultBrandStylesJson as Partial<BrandStyles>),
  }));

  const [customOverrides] = useState<Record<string, CustomElementStyle>>(() => ({
    ...(defaultOverridesJson as Record<string, CustomElementStyle>),
  }));

  const getOverride = (id: string) => customOverrides[id];

  const value: EditModeContextType = {
    isEditMode: false,
    setIsEditMode: () => {},
    toggleEditMode: () => {},
    isPreviewOnly: true,
    setIsPreviewOnly: () => {},
    selectedElement: null,
    setSelectedElement: () => {},
    activeModal: null,
    setActiveModal: () => {},
    modalData: null,
    setModalData: () => {},

    brandStyles,
    updateBrandStyles: () => {},

    customOverrides,
    updateCustomOverride: () => {},
    getOverride,

    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
    lastActionDescription: "",

    saveChanges: async () => true,
    isSaving: false,
    saveSuccess: false,
    hasUnsavedChanges: false,
    resetToDefaults: () => {},

    quickEditProduct: () => {},
    quickEditSlide: () => {},
    quickEditImage: () => {},
    updateContentField: () => {},
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
