import { SiteContent, Product } from "../../types";

export interface BrandStyles {
  primaryColor: string; // e.g. #0d4f3c
  accentColor: string; // e.g. #d4af37
  headingFont: string; // "Cinzel" | "Playfair Display" | "Cormorant Garamond" | "Montserrat" | "Plus Jakarta Sans"
  bodyFont: string; // "Plus Jakarta Sans" | "Montserrat" | "Inter"
  backgroundColor: string; // #faf8f5 | #ffffff | #f7f2ea | #0a0f0d
  headingWeight: "normal" | "600" | "700" | "800";
  letterSpacing: "normal" | "wide" | "wider" | "widest";
}

export interface CustomElementStyle {
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  fontWeight?: "normal" | "bold" | "600" | "700" | "800";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textAlign?: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "capitalize" | "lowercase";
  text?: string;
  src?: string;
}

export interface SelectedElement {
  id: string;
  type: "text" | "heading" | "banner" | "image" | "product" | "button" | "brand";
  label: string;
  fieldPath?: string; // e.g. "announcementText", "heroSlides[0].title", "brandTagline", etc.
  currentValue?: string;
  currentStyles?: CustomElementStyle;
  productId?: string;
  slideIndex?: number;
  domElement?: HTMLElement | null;
  rect?: DOMRect | null;
}

export interface EditSnapshot {
  timestamp: number;
  description: string;
  siteContent: SiteContent;
  products: Product[];
  brandStyles: BrandStyles;
  customOverrides: Record<string, CustomElementStyle>;
}

export type CanvaModalType =
  | "brandKit"
  | "imagePicker"
  | "productModal"
  | "slideModal"
  | "quickAdd"
  | "deployModal"
  | null;
