import React from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-stone-100">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isDestructive
                  ? "bg-red-50 text-red-600 border border-red-100"
                  : "bg-amber-50 text-amber-600 border border-amber-100"
              }`}
            >
              {isDestructive ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3
                id="confirm-dialog-title"
                className="text-base font-serif font-semibold text-stone-900"
              >
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Message */}
        <div className="p-5 py-4 text-sm text-stone-600 leading-relaxed font-sans">
          {message}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 px-5 py-4 bg-stone-50/70 border-t border-stone-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 text-xs uppercase tracking-widest font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs uppercase tracking-widest font-medium text-white rounded-lg flex items-center space-x-2 transition-all cursor-pointer shadow-xs disabled:opacity-60 ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                : "bg-stone-900 hover:bg-stone-800 active:bg-black"
            }`}
          >
            {isLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
