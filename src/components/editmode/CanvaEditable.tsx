import React, {
  ElementType,
  ReactNode,
  CSSProperties,
  createElement,
  useRef,
  MouseEvent,
} from "react";
import { useEditMode } from "./EditModeContext";
import { SelectedElement } from "./EditModeTypes";

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
  type = "text",
  label,
  fieldPath,
  currentValue,
  productId,
  slideIndex,
  className = "",
  style = {},
  children,
  text,
  src,
  alt,
  ...rest
}: CanvaEditableProps) {
  const {
    isEditMode,
    isPreviewOnly,
    selectedElement,
    setSelectedElement,
    getOverride,
    quickEditImage,
    quickEditProduct,
    quickEditSlide,
  } = useEditMode();

  const elementRef = useRef<HTMLElement | null>(null);

  const override = getOverride(id);
  const isSelected = isEditMode && !isPreviewOnly && selectedElement?.id === id;

  // Determine displayed text or image src
  const displayText = override?.text !== undefined ? override.text : text !== undefined ? text : undefined;
  const displaySrc = override?.src !== undefined ? override.src : src;

  // Compute merged styles from default + overrides
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

  // Normal mode rendering
  if (!isEditMode || isPreviewOnly) {
    if (Component === "img") {
      return createElement(Component, {
        ...rest,
        src: displaySrc,
        alt: alt || label || "",
        className,
        style: computedStyle,
      });
    }

    return createElement(
      Component,
      {
        ...rest,
        className,
        style: computedStyle,
      },
      displayText !== undefined ? displayText : children
    );
  }

  // EDIT MODE INTERACTION
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = elementRef.current?.getBoundingClientRect();

    const elementData: SelectedElement = {
      id,
      type,
      label: label || (typeof text === "string" ? text.slice(0, 24) : id),
      fieldPath,
      currentValue: displayText !== undefined ? String(displayText) : currentValue || displaySrc,
      currentStyles: override,
      productId,
      slideIndex,
      domElement: elementRef.current,
      rect: rect || null,
    };

    setSelectedElement(elementData);

    // Double-click / Quick modal launcher for complex types
    if (type === "image" && displaySrc) {
      quickEditImage(id, displaySrc, label || "Photo");
    } else if (type === "product" && productId) {
      // product modal handles it
    } else if (type === "banner" && typeof slideIndex === "number") {
      quickEditSlide(slideIndex);
    }
  };

  const outlineClasses = isSelected
    ? "outline-2 outline-[#7D2AE8] outline-offset-2 relative ring-4 ring-[#7D2AE8]/20 z-20 cursor-pointer"
    : "hover:outline-1 hover:outline-dashed hover:outline-[#d4af37] hover:outline-offset-2 transition-all cursor-pointer";

  const combinedClassName = `${className} ${outlineClasses}`.trim();

  const elementProps = {
    ...rest,
    ref: elementRef,
    onClick: handleClick,
    className: combinedClassName,
    style: computedStyle,
    "data-canva-editable": "true",
    "data-canva-id": id,
    title: `Click to edit: ${label || id}`,
    ...(Component === "img" ? { src: displaySrc, alt: alt || label || "" } : {}),
  };

  const renderedContent = displayText !== undefined ? displayText : children;

  return (
    <span className="relative inline-block group">
      {createElement(Component, elementProps, Component === "img" ? undefined : renderedContent)}

      {/* Canva Selection Badge & Handles when selected */}
      {isSelected && (
        <>
          {/* Floating element label tag */}
          <span className="absolute -top-6 left-0 bg-[#7D2AE8] text-white text-[0.62rem] font-sans font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none uppercase tracking-wider z-30 whitespace-nowrap">
            {label || type}
          </span>
          {/* 4 corner resize handle dots (Canva style) */}
          <span className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-[#7D2AE8] shadow pointer-events-none z-30" />
          <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border-2 border-[#7D2AE8] shadow pointer-events-none z-30" />
          <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-[#7D2AE8] shadow pointer-events-none z-30" />
          <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border-2 border-[#7D2AE8] shadow pointer-events-none z-30" />
        </>
      )}
    </span>
  );
}
