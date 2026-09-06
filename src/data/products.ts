import { Product } from "../types";
import savedProductsJson from "./products.json";

export const imageUrls = {
  silk: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
  chanderi: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=85",
  fabric: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=800&q=80",
  luxury: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=900&q=85",
  festive: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=85",
  daily: "https://images.unsplash.com/photo-1563178406-4cdc2923acbc?auto=format&fit=crop&w=900&q=85",
  college: "https://images.unsplash.com/photo-1583391733975-27a928923a1a?auto=format&fit=crop&w=900&q=85",
};

export const initialProducts: Product[] =
  savedProductsJson && Array.isArray(savedProductsJson) && savedProductsJson.length > 0
    ? (savedProductsJson as Product[])
    : [];

export const products: Product[] = initialProducts;
