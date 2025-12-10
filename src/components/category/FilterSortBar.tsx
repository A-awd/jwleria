import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { luxuryBrands } from "@/data/products";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface FilterSortBarProps {
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  itemCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedBrands: string[];
  setSelectedBrands: (brands: string[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  readyToShipOnly: boolean;
  setReadyToShipOnly: (value: boolean) => void;
  preOrderOnly: boolean;
  setPreOrderOnly: (value: boolean) => void;
}

const FilterSortBar = ({ 
  filtersOpen, 
  setFiltersOpen, 
  itemCount,
  searchQuery,
  setSearchQuery,
  selectedBrands,
  setSelectedBrands,
  selectedCategories,
  setSelectedCategories,
  sortBy,
  setSortBy,
  readyToShipOnly,
  setReadyToShipOnly,
  preOrderOnly,
  setPreOrderOnly
}: FilterSortBarProps) => {
  const { t } = useLanguage();

  const categoryItems = [
    { key: "Rings", label: t("rings") },
    { key: "Necklaces", label: t("necklaces") },
    { key: "Earrings", label: t("earrings") },
    { key: "Bracelets", label: t("bracelets") },
    { key: "Watches", label: t("watches") },
    { key: "Bags", label: t("bags") },
    { key: "Sunglasses", label: t("sunglasses") },
  ];
  
  // Price ranges - translated
  const priceRanges = [
    { key: "under1000", label: t("priceUnder1000") },
    { key: "1000-5000", label: t("price1kTo5k") },
    { key: "5000-10000", label: t("price5kTo10k") },
    { key: "over10000", label: t("priceOver10000") },
  ];
  
  // Materials - translated
  const materials = [
    { key: "gold", label: t("materialGold") },
    { key: "whiteGold", label: t("materialWhiteGold") },
    { key: "roseGold", label: t("materialRoseGold") },
    { key: "platinum", label: t("materialPlatinum") },
    { key: "diamond", label: t("materialDiamond") },
  ];

  const handleBrandToggle = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      setSelectedBrands(selectedBrands.filter(b => b !== brand));
    } else {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSortBy("featured");
    setReadyToShipOnly(false);
    setPreOrderOnly(false);
  };

  const hasActiveFilters = searchQuery || selectedBrands.length > 0 || selectedCategories.length > 0 || readyToShipOnly || preOrderOnly;
  const activeFilterCount = selectedBrands.length + selectedCategories.length + (readyToShipOnly ? 1 : 0) + (preOrderOnly ? 1 : 0);

  return (
    <section className="w-full px-4 md:px-6 lg:px-8 mb-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-muted/30 rounded-sm p-4 md:p-5"
      >
        {/* Top Row: Search and Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("searchForJewelry")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background border-border/50 focus:border-foreground/30 rounded-sm"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex items-center gap-3">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="outline" 
                    size="default"
                    className="h-11 px-4 gap-2 rounded-sm border-border/50 hover:border-foreground/30 hover:bg-transparent"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>{t("filters")}</span>
                    {activeFilterCount > 0 && (
                      <span className="ml-1 text-xs bg-foreground text-background px-1.5 py-0.5 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </motion.div>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 bg-background border-l border-border overflow-y-auto">
                <SheetHeader className="mb-6 pb-4 border-b border-border">
                  <SheetTitle className="text-xl font-light">{t("filters")}</SheetTitle>
                </SheetHeader>
                
                <div className="space-y-6">
                  {/* Brand Filter */}
                  <div>
                    <h3 className="text-sm font-medium mb-4 text-foreground">{t("brand")}</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {luxuryBrands.map((brand) => (
                        <motion.div 
                          key={brand} 
                          className="flex items-center space-x-3"
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Checkbox 
                            id={brand} 
                            checked={selectedBrands.includes(brand)}
                            onCheckedChange={() => handleBrandToggle(brand)}
                            className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground rounded-sm" 
                          />
                          <Label htmlFor={brand} className="text-sm font-light text-foreground cursor-pointer">
                            {brand}
                          </Label>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* All Products Pre-Order Info */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-foreground">{t("availability")}</h3>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-sm">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {t("allProductsPreOrder")}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Category Filter */}
                  <div>
                    <h3 className="text-sm font-medium mb-4 text-foreground">{t("shop")}</h3>
                    <div className="space-y-3">
                      {categoryItems.map((category) => (
                        <motion.div 
                          key={category.key} 
                          className="flex items-center space-x-3"
                          whileHover={{ x: 2 }}
                        >
                          <Checkbox 
                            id={category.key} 
                            checked={selectedCategories.includes(category.key)}
                            onCheckedChange={() => handleCategoryToggle(category.key)}
                            className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground rounded-sm" 
                          />
                          <Label htmlFor={category.key} className="text-sm font-light text-foreground cursor-pointer">
                            {category.label}
                          </Label>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Price Filter */}
                  <div>
                    <h3 className="text-sm font-medium mb-4 text-foreground">{t("subtotal")}</h3>
                    <div className="space-y-3">
                      {priceRanges.map((range) => (
                        <motion.div 
                          key={range.key} 
                          className="flex items-center space-x-3"
                          whileHover={{ x: 2 }}
                        >
                          <Checkbox 
                            id={range.key} 
                            className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground rounded-sm" 
                          />
                          <Label htmlFor={range.key} className="text-sm font-light text-foreground cursor-pointer">
                            {range.label}
                          </Label>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Material Filter */}
                  <div>
                    <h3 className="text-sm font-medium mb-4 text-foreground">{t("material")}</h3>
                    <div className="space-y-3">
                      {materials.map((material) => (
                        <motion.div 
                          key={material.key} 
                          className="flex items-center space-x-3"
                          whileHover={{ x: 2 }}
                        >
                          <Checkbox 
                            id={material.key} 
                            className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground rounded-sm" 
                          />
                          <Label htmlFor={material.key} className="text-sm font-light text-foreground cursor-pointer">
                            {material.label}
                          </Label>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Clear All Button */}
                  <div className="pt-4 border-t border-border">
                    <Button 
                      variant="ghost" 
                      onClick={clearAllFilters}
                      className="w-full justify-center hover:bg-transparent hover:underline font-light"
                    >
                      {t("clearAll")}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-11 w-auto min-w-[140px] border-border/50 bg-background hover:border-foreground/30 rounded-sm gap-2">
                <SelectValue />
                <ChevronDown className="w-4 h-4 opacity-50" />
              </SelectTrigger>
              <SelectContent className="rounded-sm border-border bg-background">
                <SelectItem value="featured" className="rounded-sm">{t("featured")}</SelectItem>
                <SelectItem value="price-low" className="rounded-sm">{t("priceLowHigh")}</SelectItem>
                <SelectItem value="price-high" className="rounded-sm">{t("priceHighLow")}</SelectItem>
                <SelectItem value="newest" className="rounded-sm">{t("newest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters & Count */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <AnimatePresence mode="popLayout">
              {selectedBrands.map(brand => (
                <motion.button
                  key={brand}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => handleBrandToggle(brand)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground/10 text-foreground rounded-sm hover:bg-foreground/20 transition-colors"
                >
                  {brand}
                  <X className="w-3 h-3" />
                </motion.button>
              ))}
              {selectedCategories.map(category => (
                <motion.button
                  key={category}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => handleCategoryToggle(category)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground/10 text-foreground rounded-sm hover:bg-foreground/20 transition-colors"
                >
                  {category}
                  <X className="w-3 h-3" />
                </motion.button>
              ))}
            </AnimatePresence>
            {hasActiveFilters && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                {t("clearAll")}
              </motion.button>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            {itemCount} {t("products")}
          </p>
        </div>
      </motion.div>
    </section>
  );
};

export default FilterSortBar;
