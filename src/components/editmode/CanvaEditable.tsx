import React, {
  ElementType,
  ReactNode,
  CSSProperties,
  createElement,
} from "react";
import { useEditMode } from "./EditModeContext";
import { normalizeImageUrl } from "../../utils/imageUtils";

interface CanvaEditableProps {
  id: string;
  as?: ElementType;
  type?: "text" | "heading" | "banner" | "image" | "product" | "button" | "brand";
  label?: string;
  fieldPath?: string;
  currentValue?: string;
  productId?: string;
  slideIndex?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  text?: string;
  src?: string;
  alt?: string;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  [key: string]: any;
}

export default function CanvaEditable({
  id,
  as: Component = "span",
  className = "",
  style = {},
  children,
  text,
  src,
  alt,
  label,
  type,
  fieldPath,
  currentValue,
  productId,
  slideIndex,
  ...rest
}: CanvaEditableProps) {
  const { getOverride, isEditMode } = useEditMode();
  const override = getOverride(id);

  // If this element represents a live product field (e.g. title, price, description, image) or hero dynamic slide,
  // ensure the live catalog/store props always take precedence unless actively being customized in Canva edit mode:
  const isProductOrDynamicField = Boolean(productId) || id.startsWith("product_") || id.startsWith("hero_slide_");

  // Dynamic product fields and hero slides must always reflect live data from catalog/database
  const displayText = isProductOrDynamicField
    ? (text !== undefined ? text : override?.text)
    : (override?.text !== undefined ? override.text : text);
  
  // Dynamic product images must always reflect live product images from catalog
  const rawSrc = isProductOrDynamicField
    ? (src || override?.src || "")
    : ((override?.src !== undefined && override?.src !== "") ? override.src : (src || ""));
  let displaySrc = normalizeImageUrl(rawSrc);
  if (displaySrc) {
    if (displaySrc.startsWith("/public/")) {
      displaySrc = displaySrc.replace("/public", "");
    }
  }

  const computedStyle: CSSProperties = {
    ...style,
    ...(override?.fontFamily ? { fontFamily: override.fontFamily } : {}),
    ...(override?.fontSize ? { fontSize: override.fontSize } : {}),
    ...(override?.color ? { color: override.color } : {}),
    ...(override?.backgroundColor ? { backgroundColor: override.backgroundColor } : {}),
    ...(override?.fontWeight ? { fontWeight: override.fontWeight } : {}),
    ...(override?.fontStyle ? { fontStyle: override.fontStyle } : {}),
    ...(override?.textAlign ? { textAlign: override.textAlign } : {}),
    ...(override?.textTransform ? { textTransform: override.textTransform } : {}),
  };

  if (Component === "img" || type === "image") {
    const finalImageSrc = displaySrc || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
    return createElement("img", {
      ...rest,
      id,
      key: `${id}_${finalImageSrc}`,
      src: finalImageSrc,
      alt: alt || label || "",
      className,
      style: computedStyle,
      onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.currentTarget;
        if (target.src && target.src.includes("?v=") && !target.dataset.retried) {
          target.dataset.retried = "true";
          target.src = target.src.split("?")[0];
          return;
        }
        if (!target.src.includes("unsplash.com")) {
          target.src = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
        }
      },
    });
  }

  return createElement(
    Component,
    {
      ...rest,
      id,
      className,
      style: computedStyle,
    },
    displayText !== undefined ? displayText : children
  );
}

