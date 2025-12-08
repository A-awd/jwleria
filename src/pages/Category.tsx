import { useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import CategoryHeader from "../components/category/CategoryHeader";
import FilterSortBar from "../components/category/FilterSortBar";
import ProductGrid from "../components/category/ProductGrid";
import { allProducts } from "@/data/products";

const Category = () => {
  const { category, brandId } = useParams();
  const [searchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("featured");
  const [readyToShipOnly, setReadyToShipOnly] = useState(false);
  const [preOrderOnly, setPreOrderOnly] = useState(false);

  // Calculate filtered product count
  const filteredCount = useMemo(() => {
    let filtered = [...allProducts];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }
    
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => selectedBrands.includes(product.brand));
    }
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => selectedCategories.includes(product.category));
    }

    if (readyToShipOnly) {
      filtered = filtered.filter(product => product.isReadyToShip);
    }

    if (preOrderOnly) {
      filtered = filtered.filter(product => product.isPreOrder);
    }
    
    return filtered.length;
  }, [searchQuery, selectedBrands, selectedCategories, readyToShipOnly, preOrderOnly]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-6">
        <CategoryHeader 
          category={category || 'All Products'} 
        />
        
        <FilterSortBar 
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          itemCount={filteredCount}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedBrands={selectedBrands}
          setSelectedBrands={setSelectedBrands}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          sortBy={sortBy}
          setSortBy={setSortBy}
          readyToShipOnly={readyToShipOnly}
          setReadyToShipOnly={setReadyToShipOnly}
          preOrderOnly={preOrderOnly}
          setPreOrderOnly={setPreOrderOnly}
        />
        
        <ProductGrid 
          searchQuery={searchQuery}
          selectedBrands={selectedBrands}
          selectedCategories={selectedCategories}
          sortBy={sortBy}
          readyToShipOnly={readyToShipOnly}
          preOrderOnly={preOrderOnly}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default Category;