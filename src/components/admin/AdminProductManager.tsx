import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ExternalLink,
  Sparkles,
  Tag,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Product } from "../../types";
import { deleteProduct } from "../../services/storeService";
import AddProductModal from "./AddProductModal";

interface AdminProductManagerProps {
  products: Product[];
  onProductUpdated: (product: Product) => void;
  onProductDeleted: (id: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function AdminProductManager({
  products,
  onProductUpdated,
  onProductDeleted,
  showToast,
}: AdminProductManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "outOfStock">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Derive unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        const matchFabric = p.fabricType?.toLowerCase().includes(q);
        const matchColor = p.color?.toLowerCase().includes(q);
        const matchId = p.id?.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchFabric && !matchColor && !matchId) return false;
      }

      // Category
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }

      // Stock
      if (stockFilter === "inStock" && p.inStock === false) return false;
      if (stockFilter === "outOfStock" && p.inStock !== false) return false;

      return true;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${p.name}"?`)) {
      return;
    }

    setDeletingId(p.id);
    try {
      await deleteProduct(p.id);
      onProductDeleted(p.id);
      showToast(`Product "${p.name}" deleted successfully.`);
    } catch (err: any) {
      console.error("Delete error:", err);
      showToast("Failed to delete product.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white rounded-xl border border-[#e5ddd3] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
            <input
              id="admin-search-products"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, fabric, color, ID..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-[#0d4f3c]"
            />
          </div>

          {/* Category Dropdown */}
          <select
            id="admin-filter-product-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            id="admin-filter-product-stock"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-[#0d4f3c]"
          >
            <option value="all">All Availability</option>
            <option value="inStock">In Stock Only</option>
            <option value="outOfStock">Out of Stock Only</option>
          </select>
        </div>

        {/* Action Button: Add Product */}
        <button
          id="btn-admin-add-product"
          onClick={handleOpenAddModal}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#0d4f3c] hover:bg-[#083629] text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <Plus size={15} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-xl border border-[#e5ddd3] overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-[#e5ddd3] flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-[#1e1b18]">
              Boutique Catalog & Product Inventory
            </h3>
            <p className="text-xs text-stone-500">
              Showing {filteredProducts.length} of {products.length} products in boutique
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package size={36} className="mx-auto text-stone-300" />
            <p className="text-sm font-serif font-medium text-stone-600">
              No products found matching your search.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="text-xs text-[#0d4f3c] hover:underline font-semibold"
            >
              + Add a new product to boutique
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-500 border-b border-stone-200 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Suit Piece</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Fabric & Color</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredProducts.map((p) => {
                  const rawImg = p.image || p.images?.[0] || "";
                  const displayImg =
                    rawImg.startsWith("/") || rawImg.startsWith("http") || rawImg.startsWith("data:")
                      ? rawImg
                      : rawImg
                      ? `/${rawImg}`
                      : "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-stone-50/80 transition-colors group"
                    >
                      {/* Product details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={displayImg}
                            alt={p.name}
                            className="w-11 h-11 object-cover rounded-lg border border-stone-200 shrink-0 bg-stone-100"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes("unsplash")) {
                                target.src =
                                  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
                              }
                            }}
                          />
                          <div>
                            <p className="font-serif font-bold text-stone-900 line-clamp-1 group-hover:text-[#0d4f3c] transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-stone-400 font-mono">
                              #{p.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700">
                          <Tag size={10} />
                          <span>{p.category || "Couture"}</span>
                        </span>
                      </td>

                      {/* Fabric & Color */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <p className="text-stone-800 font-medium">
                            {p.fabricType || "Pure Handloom"}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-stone-500">
                            {p.colorHex && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-stone-300 inline-block shrink-0"
                                style={{ backgroundColor: p.colorHex }}
                              />
                            )}
                            <span className="truncate max-w-[120px]">{p.color || "Standard"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-bold text-[#0d4f3c]">{p.price}</p>
                          {p.originalPrice && (
                            <p className="text-[10px] text-stone-400 line-through">
                              {p.originalPrice}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3">
                        {p.inStock !== false ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <CheckCircle2 size={11} />
                            <span>In Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <XCircle size={11} />
                            <span>Sold Out</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/product/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
                            title="View in Storefront"
                          >
                            <ExternalLink size={14} />
                          </Link>

                          <button
                            id={`btn-edit-product-${p.id}`}
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-stone-400 hover:text-[#0d4f3c] hover:bg-[#0d4f3c]/10 rounded-md transition-colors cursor-pointer"
                            title="Edit Product Details"
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            id={`btn-delete-product-${p.id}`}
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.id}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Product"
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

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <AddProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          productToEdit={editingProduct}
          onSuccess={(savedProduct) => {
            onProductUpdated(savedProduct);
            showToast(
              editingProduct
                ? `Product "${savedProduct.name}" updated successfully!`
                : `Product "${savedProduct.name}" added to boutique successfully!`
            );
          }}
        />
      )}
    </div>
  );
}
