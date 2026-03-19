import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import CategoryFilter from "./CategoryFilter";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProductItem {
  title: string;
  imgsSrc: string[];
  tags: { tagName: string }[];
  time_stamp: number;
}

const API_BASE = "https://api.allorigins.win/get?url=";
const STORE_URL = "https://A2018011207583011294.szwego.com/weshop/goods/all?%26albumId=_ZMAqfyWVgeIJzxk_lFSY2lWup1lK3tSA";

function cleanTitle(title: string): string {
  return title.replace(/^\d+[\d.\s]*/g, "").trim();
}

const ProductsCatalog = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (pageTimestamp?: number) => {
    try {
      let url = STORE_URL;
      if (pageTimestamp) {
        url += `&pageTimestamp=${pageTimestamp}`;
      }

      const res = await fetch(API_BASE + encodeURIComponent(url));
      const wrapper = await res.json();
      const data = JSON.parse(wrapper.contents);
      const items: ProductItem[] = data.result?.items || [];
      const isLoadMore = data.result?.pagination?.isLoadMore ?? false;

      if (items.length > 0) {
        setLastTimestamp(items[items.length - 1].time_stamp);
      }
      setHasMore(isLoadMore);
      return items;
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Failed to load products. Please try again.");
      return [];
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const items = await fetchProducts();
      setProducts(items);
      setLoading(false);
    };
    load();
  }, [fetchProducts]);

  const loadMore = async () => {
    if (!lastTimestamp || loadingMore) return;
    setLoadingMore(true);
    const items = await fetchProducts(lastTimestamp);
    setProducts((prev) => [...prev, ...items]);
    setLoadingMore(false);
  };

  // Extract unique categories
  const categories = Array.from(
    new Set(products.map((p) => p.tags?.[0]?.tagName).filter(Boolean))
  );

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.tags?.[0]?.tagName === selectedCategory);

  if (error && products.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
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
                key={`${product.time_stamp}-${idx}`}
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

          {/* Load More */}
          {hasMore && selectedCategory === "all" && (
            <div className="flex justify-center mt-10">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="min-w-[180px]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
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
