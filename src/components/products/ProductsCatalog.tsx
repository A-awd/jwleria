import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import CategoryFilter from "./CategoryFilter";
import { supabase } from "@/integrations/supabase/client";

interface ProductTag {
  tagName: string;
}

interface ProductItem {
  title: string;
  imgsSrc: string[];
  tags: ProductTag[];
  time_stamp: number;
  itemPrice?: string;
  goods_id?: string;
}

function cleanTitle(title: string): string {
  return title.replace(/^\d+[\d.\s]*/g, "").trim();
}

const ProductsCatalog = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadProducts = useCallback(async (pageTimestamp?: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const isInitial = !pageTimestamp;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('szwego-scrape', {
        body: { pageTimestamp: pageTimestamp || undefined },
      });

      if (fnError) throw fnError;

      const items: ProductItem[] = data?.products || [];
      const canLoadMore = data?.hasMore ?? false;

      // Filter out logo/non-product items
      const filtered = items.filter(
        (p) => p.title !== "luxuwine" && !p.imgsSrc?.[0]?.includes("i1678896712_8689_0")
      );

      setProducts((prev) => (isInitial ? filtered : [...prev, ...filtered]));
      setHasMore(canLoadMore);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && products.length > 0) {
          const lastProduct = products[products.length - 1];
          if (lastProduct?.time_stamp) {
            loadProducts(lastProduct.time_stamp);
          }
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, products, loadProducts]);

  // Extract unique categories
  const categories = Array.from(
    new Set(
      products
        .map((p) => p.tags?.[0]?.tagName)
        .filter((t): t is string => Boolean(t))
    )
  );

  // Filter by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "all" || p.tags?.[0]?.tagName === selectedCategory;
    const cleaned = cleanTitle(p.title).toLowerCase();
    const tag = (p.tags?.[0]?.tagName || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || cleaned.includes(q) || tag.includes(q);
    return matchesCategory && matchesSearch;
  });

  if (error && products.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>{error}</p>
        <button
          className="mt-4 px-4 py-2 border border-border rounded-md text-sm hover:bg-secondary transition-colors"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={`${product.goods_id || product.time_stamp}-${idx}`}
                image={product.imgsSrc?.[0] || "/placeholder.svg"}
                title={cleanTitle(product.title)}
                category={product.tags?.[0]?.tagName || ""}
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <p className="text-center text-muted-foreground py-16">No products found.</p>
          )}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading more spinner */}
          {loadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* End message */}
          {!hasMore && products.length > 0 && !searchQuery && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              تم عرض جميع المنتجات
            </p>
          )}
        </>
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={{
            title: cleanTitle(selectedProduct.title),
            images: selectedProduct.imgsSrc || [],
            category: selectedProduct.tags?.[0]?.tagName || "",
          }}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductsCatalog;
