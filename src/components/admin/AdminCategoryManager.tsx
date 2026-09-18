import React, { useState, useMemo } from "react";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  RotateCcw,
  Save,
  Layers,
  X,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { CategoryItem } from "../../types";
import { saveCategory, deleteCategory } from "../../services/storeService";

interface AdminCategoryManagerProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function AdminCategoryManager({ showToast }: AdminCategoryManagerProps) {
  const { categories, setCategories, products } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Compute product count per category for business intelligence
  const productCountMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const cat = p.category || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return map;
  }, [products]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [categories]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setSortOrder(categories.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name || "");
    setSlug(cat.slug || "");
    setDescription(cat.description || "");
    setSortOrder(cat.sortOrder || 1);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(val.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Category name is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryId = editingCategory?.id || `cat-${Date.now()}`;
      const payload: CategoryItem = {
        id: categoryId,
        name: name.trim(),
        slug: slug.trim() || name.trim(),
        description: description.trim(),
        sortOrder: Number(sortOrder) || 1,
      };

      // Optimistic update
      setCategories((prev) => {
        const idx = prev.findIndex((c) => c.id === categoryId);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = payload;
          return next;
        }
        return [...prev, payload];
      });

      await saveCategory(payload);
      showToast(
        editingCategory
          ? `Category "${payload.name}" updated & published live!`
          : `Category "${payload.name}" added & published live!`,
        "success"
      );
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Save category error:", err);
      showToast("Failed to save category: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"? It will be removed from storefront category pills immediately.`)) {
      return;
    }

    setDeletingId(cat.id);
    try {
      // Optimistic update
      setCategories((prev) =>
        prev.filter((c) => c.id !== cat.id && c.slug !== cat.slug && c.name !== cat.name)
      );
      await deleteCategory(cat.id);
      showToast(`Category "${cat.name}" deleted and removed from live site.`, "info");
    } catch (err: any) {
      console.error("Delete category error:", err);
      showToast("Failed to delete category: " + (err.message || "Unknown error"), "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedCategories.length) return;

    const updated = [...sortedCategories];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Re-assign sortOrder
    const reordered = updated.map((cat, idx) => ({
      ...cat,
      sortOrder: idx + 1,
    }));

    setCategories(reordered);

    // Save all affected categories
    try {
      for (const cat of reordered) {
        await saveCategory(cat);
      }
      showToast("Category ordering updated live on storefront!", "success");
    } catch (err) {
      console.warn("Reorder category warning:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-[#e5ddd3] p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-[#0d4f3c]/10 text-[#0d4f3c] rounded-xl">
            <Layers size={20} />
          </span>
          <div>
            <h2 className="font-serif font-bold text-lg text-[#1e1b18]">
              Storefront Categories & Collections
            </h2>
            <p className="text-xs text-stone-500">
              Manage catalog filter pills and navigation drawer collections • Instant live storefront sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#0d4f3c] hover:bg-[#0b3f30] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add New Category</span>
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-[#e5ddd3] overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-[#e5ddd3] flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2">
            <Tag size={15} className="text-[#0d4f3c]" />
            <span className="font-serif font-bold text-xs text-stone-800 uppercase tracking-wider">
              Active Storefront Categories ({sortedCategories.length})
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <CheckCircle2 size={11} />
            <span>Sync Engine Active</span>
          </span>
        </div>

        {sortedCategories.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Layers size={22} />
            </div>
            <p className="text-sm font-medium text-stone-700">No categories found</p>
            <p className="text-xs text-stone-400">Click &quot;Add New Category&quot; to create boutique collection pills.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold bg-stone-50/50">
                  <th className="py-3 px-4 w-16 text-center">Order</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Description / Subtitle</th>
                  <th className="py-3 px-4 text-center">Boutique Pieces</th>
                  <th className="py-3 px-4 text-center">Live Filter Pill</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sortedCategories.map((cat, idx) => {
                  const pieceCount = productCountMap.get(cat.name) || 0;
                  return (
                    <tr key={cat.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Sort Order & Reorder Controls */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-bold text-stone-600 w-5">
                            {idx + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => handleMove(idx, "up")}
                              disabled={idx === 0}
                              className="text-stone-400 hover:text-[#0d4f3c] disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(idx, "down")}
                              disabled={idx === sortedCategories.length - 1}
                              className="text-stone-400 hover:text-[#0d4f3c] disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Name & Slug */}
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-serif font-bold text-stone-900 text-sm">{cat.name}</p>
                          <p className="text-[11px] text-stone-400 font-mono">slug: {cat.slug || cat.name}</p>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-stone-600 max-w-xs">
                        <p className="line-clamp-2">{cat.description || "—"}</p>
                      </td>

                      {/* Product Count */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          pieceCount > 0 ? "bg-[#0d4f3c]/10 text-[#0d4f3c]" : "bg-stone-100 text-stone-400"
                        }`}>
                          {pieceCount} {pieceCount === 1 ? "piece" : "pieces"}
                        </span>
                      </td>

                      {/* Preview Pill */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border border-[#0d4f3c] text-[#0d4f3c] bg-emerald-50/50">
                          {cat.name}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 text-stone-400 hover:text-[#0d4f3c] hover:bg-[#0d4f3c]/10 rounded-md transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            disabled={deletingId === cat.id}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#e5ddd3] overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="bg-[#0d4f3c] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-[#d4af37]" />
                <h3 className="font-serif font-bold text-base">
                  {editingCategory ? "Edit Category Collection" : "Add New Category Collection"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Cotton Suits, Party Wear, Organza Sets"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  This text appears on the filter pill and product badges.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  URL / Filter Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. Cotton Suits"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description / Subtitle
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Pure Mulmul & Hand-block everyday sets"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-24 px-3 py-2 text-xs rounded-lg border border-stone-200 focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c] outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0d4f3c] hover:bg-[#0b3f30] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} />
                  <span>{isSubmitting ? "Publishing..." : editingCategory ? "Update Live" : "Add & Publish Live"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
