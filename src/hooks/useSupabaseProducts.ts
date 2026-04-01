import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";

interface SupabaseProduct {
  id: string;
  name_en: string;
  name_ar: string | null;
  name_es: string | null;
  name_fr: string | null;
  description_en: string | null;
  description_ar: string | null;
  description_es: string | null;
  description_fr: string | null;
  material_en: string | null;
  material_ar: string | null;
  material_es: string | null;
  material_fr: string | null;
  price: number;
  images: string[] | null;
  slug: string;
  sku: string | null;
  tags: string[] | null;
  dimensions: string | null;
  weight_grams: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  brand_id: string | null;
  category_id: string | null;
  brands?: { name_en: string; slug: string } | null;
  categories?: { name_en: string; slug: string } | null;
}

function mapToProduct(sp: SupabaseProduct, index: number): Product {
  const images = Array.isArray(sp.images) ? sp.images : [];
  return {
    id: 90000 + index,
    name: sp.name_en,
    brand: sp.brands?.name_en || "Unknown",
    brandSlug: sp.brands?.slug || "unknown",
    category: sp.categories?.name_en || "Accessories",
    categoryKey: sp.categories?.slug || "accessories",
    priceSAR: sp.price || 0,
    priceEUR: sp.price || 0,
    image: images[0] || "/placeholder.svg",
    images: images,
    description: sp.description_en || "",
    material: sp.material_en || "",
    dimensions: sp.dimensions || undefined,
    weight: sp.weight_grams ? `${sp.weight_grams}g` : undefined,
    isPreOrder: true,
    leadTime: "5-7",
    isNew: sp.is_featured || false,
    isLimitedEdition: false,
    tags: sp.tags || [],
    translations: {
      en: { name: sp.name_en, description: sp.description_en || "", material: sp.material_en || "" },
      ar: sp.name_ar ? { name: sp.name_ar, description: sp.description_ar || "", material: sp.material_ar || "" } : undefined,
      es: sp.name_es ? { name: sp.name_es, description: sp.description_es || "", material: sp.material_es || "" } : undefined,
      fr: sp.name_fr ? { name: sp.name_fr, description: sp.description_fr || "", material: sp.material_fr || "" } : undefined,
    },
  };
}

export function useSupabaseProducts() {
  return useQuery({
    queryKey: ["supabase-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, brands(name_en, slug), categories(name_en, slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase products fetch failed, using fallback:", error.message);
        return [];
      }

      return (data || []).map((item, index) => mapToProduct(item as SupabaseProduct, index));
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useSupabaseProductsByBrand(brandSlug: string) {
  return useQuery({
    queryKey: ["supabase-products-brand", brandSlug],
    queryFn: async () => {
      const { data: brand } = await supabase
        .from("brands")
        .select("id")
        .eq("slug", brandSlug)
        .single();

      if (!brand) return [];

      const { data, error } = await supabase
        .from("products")
        .select("*, brands(name_en, slug), categories(name_en, slug)")
        .eq("brand_id", brand.id)
        .eq("is_active", true);

      if (error) return [];
      return (data || []).map((item, index) => mapToProduct(item as SupabaseProduct, index));
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!brandSlug,
  });
}
