import React, {
  ElementType,
  ReactNode,
  CSSProperties,
  createElement,
} from "react";
import { useEditMode } from "./EditModeContext";

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
  const { getOverride } = useEditMode();
  const override = getOverride(id);

  const displayText = override?.text !== undefined ? override.text : text !== undefined ? text : undefined;
  const displaySrc = src || override?.src;

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
    return createElement("img", {
      ...rest,
      id,
      src: displaySrc || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
      alt: alt || label || "",
      className,
      style: computedStyle,
      onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.currentTarget;
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

