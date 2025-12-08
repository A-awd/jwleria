import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { luxuryBrands, categories } from "@/data/products";
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
  setReadyToShipOnly
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
  
  const priceRanges = ["Under €1,000", "€1,000 - €5,000", "€5,000 - €10,000", "Over €10,000"];
  const materials = ["Gold", "White Gold", "Rose Gold", "Platinum", "Diamond"];

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
  };

  const hasActiveFilters = searchQuery || selectedBrands.length > 0 || selectedCategories.length > 0 || readyToShipOnly;

  return (
    <>
      <section className="w-full px-6 mb-8 border-b border-border pb-4">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              type="text"
              placeholder={t("searchForJewelry")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 border-border/50 bg-transparent focus:border-foreground/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-foreground/40 hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedBrands.map(brand => (
              <button
                key={brand}
                onClick={() => handleBrandToggle(brand)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-foreground/10 text-foreground rounded-sm"
              >
                {brand}
                <X className="w-3 h-3" />
              </button>
            ))}
            {selectedCategories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-foreground/10 text-foreground rounded-sm"
              >
                {category}
                <X className="w-3 h-3" />
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-foreground/60 hover:text-foreground underline"
              >
                {t("clearAll")}
              </button>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <p className="text-sm font-light text-muted-foreground">
            {itemCount} {t("products")}
          </p>
          
          <div className="flex items-center gap-4">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="font-light hover:bg-transparent"
                >
                  {t("filters")}
                  {(selectedBrands.length > 0 || selectedCategories.length > 0) && (
                    <span className="ml-1 text-xs bg-foreground text-background px-1.5 rounded-full">
                      {selectedBrands.length + selectedCategories.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-background border-none shadow-none overflow-y-auto">
                <SheetHeader className="mb-6 border-b border-border pb-4">
                  <SheetTitle className="text-lg font-light">{t("filters")}</SheetTitle>
                </SheetHeader>
                
                <div className="space-y-8">
                  {/* Brand Filter - Most important for multi-brand platform */}
                  <div>
                    <h3 className="text-sm font-light mb-4 text-foreground">{t("brand")}</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {luxuryBrands.map((brand) => (
                        <div key={brand} className="flex items-center space-x-3">
                          <Checkbox 
                            id={brand} 
                            checked={selectedBrands.includes(brand)}
                            onCheckedChange={() => handleBrandToggle(brand)}
                            className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" 
                          />
                          <Label htmlFor={brand} className="text-sm font-light text-foreground cursor-pointer">
                            {brand}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-border" />

                  {/* Ready to Ship Filter */}
                  <div>
                    <h3 className="text-sm font-light mb-4 text-foreground">{t("availability")}</h3>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id="readyToShip" 
                        checked={readyToShipOnly}
                        onCheckedChange={(checked) => setReadyToShipOnly(checked === true)}
                        className="border-border data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" 
                      />
                      <Label htmlFor="readyToShip" className="text-sm font-light text-foreground cursor-pointer">
                        {t("readyToShip")}
                      </Label>
                    </div>
                  </div>

                  <Separator className="border-border" />

                  {/* Category Filter */}
                  <div>
                    <h3 className="text-sm font-light mb-4 text-foreground">{t("shop")}</h3>
                    <div className="space-y-3">
                      {categoryItems.map((category) => (
                        <div key={category.key} className="flex items-center space-x-3">
                          <Checkbox 
                            id={category.key} 
                            checked={selectedCategories.includes(category.key)}
                            onCheckedChange={() => handleCategoryToggle(category.key)}
                            className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" 
                          />
                          <Label htmlFor={category.key} className="text-sm font-light text-foreground cursor-pointer">
                            {category.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-border" />

                  {/* Price Filter */}
                  <div>
                    <h3 className="text-sm font-light mb-4 text-foreground">{t("subtotal")}</h3>
                    <div className="space-y-3">
                      {priceRanges.map((range) => (
                        <div key={range} className="flex items-center space-x-3">
                          <Checkbox id={range} className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" />
                          <Label htmlFor={range} className="text-sm font-light text-foreground cursor-pointer">
                            {range}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-border" />

                  {/* Material Filter */}
                  <div>
                    <h3 className="text-sm font-light mb-4 text-foreground">{t("material")}</h3>
                    <div className="space-y-3">
                      {materials.map((material) => (
                        <div key={material} className="flex items-center space-x-3">
                          <Checkbox id={material} className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" />
                          <Label htmlFor={material} className="text-sm font-light text-foreground cursor-pointer">
                            {material}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-border" />

                  <div className="flex flex-col gap-2 pt-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearAllFilters}
                      className="w-full border-none hover:bg-transparent hover:underline font-normal text-left justify-start"
                    >
                      {t("clearAll")}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-auto border-none bg-transparent text-sm font-light shadow-none rounded-none pr-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="shadow-none border-none rounded-none bg-background">
                <SelectItem value="featured" className="hover:bg-transparent hover:underline data-[state=checked]:bg-transparent data-[state=checked]:underline pl-2 [&>span:first-child]:hidden">{t("featured")}</SelectItem>
                <SelectItem value="price-low" className="hover:bg-transparent hover:underline data-[state=checked]:bg-transparent data-[state=checked]:underline pl-2 [&>span:first-child]:hidden">{t("priceLowHigh")}</SelectItem>
                <SelectItem value="price-high" className="hover:bg-transparent hover:underline data-[state=checked]:bg-transparent data-[state=checked]:underline pl-2 [&>span:first-child]:hidden">{t("priceHighLow")}</SelectItem>
                <SelectItem value="newest" className="hover:bg-transparent hover:underline data-[state=checked]:bg-transparent data-[state=checked]:underline pl-2 [&>span:first-child]:hidden">{t("newest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    </>
  );
};

export default FilterSortBar;
