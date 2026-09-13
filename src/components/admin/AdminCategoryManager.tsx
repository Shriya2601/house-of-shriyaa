import React, { useState, useMemo } from "react";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowUpDown,
  Tag,
  ShoppingBag,
} from "lucide-react";
import { CategoryItem, Product } from "../../types";
import { saveCategory, deleteCategory } from "../../services/storeService";
import { ConfirmDialog } from "./ConfirmDialog";

interface AdminCategoryManagerProps {
  categories: CategoryItem[];
  products: Product[];
  onCategoryUpdated?: (category: CategoryItem) => void;
  onCategoryDeleted?: (id: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function AdminCategoryManager({
  categories,
  products,
  onCategoryUpdated,
  onCategoryDeleted,
  showToast,
}: AdminCategoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Map product count per category
  const productCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category?.trim();
      if (cat) {
        map[cat.toLowerCase()] = (map[cat.toLowerCase()] || 0) + 1;
      }
      if (Array.isArray(p.tags)) {
        p.tags.forEach((tag) => {
          if (tag) {
            map[tag.toLowerCase()] = (map[tag.toLowerCase()] || 0) + 1;
          }
        });
      }
    });
    return map;
  }, [products]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return categories
      .filter((cat) => {
        if (!query) return true;
        return (
          cat.name?.toLowerCase().includes(query) ||
          cat.slug?.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [categories, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setSortOrder((categories.length || 0) + 1);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name || "");
    setSlug(cat.slug || "");
    setDescription(cat.description || "");
    setSortOrder(cat.sortOrder ?? 1);
    setFormError(null);
    setIsModalOpen(true);
  };

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Please provide a category title.");
      return;
    }

    const cleanSlug = slug.trim() ? generateSlug(slug) : generateSlug(name);
    const catId = editingCategory?.id || `cat-${cleanSlug || Date.now()}`;

    setSubmitting(true);
    setFormError(null);

    const payload: CategoryItem = {
      id: catId,
      name: name.trim(),
      slug: cleanSlug,
      description: description.trim(),
      sortOrder: Number(sortOrder) || 1,
    };

    try {
      await saveCategory(payload);
      if (onCategoryUpdated) onCategoryUpdated(payload);
      showToast(
        editingCategory
          ? `Category "${payload.name}" updated successfully!`
          : `Category "${payload.name}" created successfully!`
      );
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving category:", err);
      setFormError(err?.message || "Failed to save category. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    const target = categoryToDelete;
    setDeletingId(target.id);
    try {
      if (onCategoryDeleted) onCategoryDeleted(target.id);
      await deleteCategory(target.id);
      showToast(`Category "${target.name}" deleted successfully.`);
    } catch (err: any) {
      console.error("Error deleting category:", err);
      showToast("Failed to delete category.", "error");
    } finally {
      setDeletingId(null);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white rounded-xl border border-[#e5ddd3] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
            <input
              id="admin-search-categories"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category title, slug, or description..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-[#0d4f3c]"
            />
          </div>
        </div>

        <button
          id="admin-btn-add-category"
          onClick={handleOpenAddModal}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#0d4f3c] hover:bg-[#09382b] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Plus size={15} />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-[#e5ddd3] overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-[#e5ddd3] flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-[#1e1b18]">
              Taxonomy & Categories
            </h3>
            <p className="text-xs text-stone-500">
              Manage live navigation categories, sort orders, and product groupings across the boutique.
            </p>
          </div>
          <span className="text-xs font-bold text-[#0d4f3c] bg-[#0d4f3c]/10 px-2.5 py-1 rounded-full">
            {filteredCategories.length} Categories
          </span>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="p-12 text-center">
            <Layers size={36} className="mx-auto text-stone-300 mb-3" />
            <p className="text-sm font-semibold text-stone-600">No categories found</p>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No categories match "${searchQuery}". Try a different search term.`
                : "No categories currently exist. Create your first category above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f9f7f4] border-b border-[#e5ddd3] text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4 w-16 text-center">Order</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Slug (URL Key)</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Products</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ddd3]">
                {filteredCategories.map((cat, idx) => {
                  const count =
                    productCountByCategory[cat.name.toLowerCase()] ||
                    productCountByCategory[cat.slug.toLowerCase()] ||
                    0;

                  return (
                    <tr
                      key={cat.id || idx}
                      id={`category-row-${cat.id}`}
                      className="hover:bg-stone-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 text-stone-700 font-bold text-[11px]">
                          {cat.sortOrder ?? idx + 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-stone-900">
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-[#d4af37] shrink-0" />
                          <span className="font-semibold text-sm text-[#0d4f3c]">{cat.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-stone-600">
                        <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">
                          {cat.slug || cat.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-stone-500 max-w-xs truncate">
                        {cat.description || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            count > 0
                              ? "bg-emerald-50 text-emerald-800 font-bold"
                              : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          <ShoppingBag size={11} />
                          <span>{count} pieces</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          id={`btn-edit-category-${cat.id}`}
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-1.5 text-stone-500 hover:text-[#0d4f3c] hover:bg-[#0d4f3c]/10 rounded-md transition-colors cursor-pointer"
                          title="Modify Category"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          id={`btn-delete-category-${cat.id}`}
                          onClick={() => setCategoryToDelete(cat)}
                          className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 size={14} />
                        </button>
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
        <div
          id="modal-category-editor"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#e5ddd3] overflow-hidden">
            {/* Header */}
            <div className="bg-[#0d4f3c] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#d4af37]" />
                <h3 className="font-serif font-bold text-base">
                  {editingCategory ? "Modify Category" : "Add New Category"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category Name *
                </label>
                <input
                  id="category-input-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Pure Organza Silk"
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden focus:border-[#0d4f3c] focus:ring-1 focus:ring-[#0d4f3c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Slug (URL Key) *
                  </label>
                  <input
                    id="category-input-slug"
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="e.g. pure-organza-silk"
                    className="w-full text-xs font-mono px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Display Sort Order
                  </label>
                  <input
                    id="category-input-order"
                    type="number"
                    min={1}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description / Tagline
                </label>
                <textarea
                  id="category-input-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bespoke unstitched couture pieces curated in pure fabrics..."
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-category"
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#0d4f3c] hover:bg-[#09382b] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Saving...</span>
                  ) : (
                    <span>{editingCategory ? "Save Changes" : "Create Category"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? Any products assigned to this category will still remain in your catalog but this category filter will be removed from navigation.`}
        confirmLabel="Delete Category"
        cancelLabel="Keep Category"
        isLoading={!!deletingId}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deletingId) setCategoryToDelete(null);
        }}
      />
    </div>
  );
}
