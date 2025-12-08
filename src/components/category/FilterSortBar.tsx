import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
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
}

const FilterSortBar = ({ filtersOpen, setFiltersOpen, itemCount }: FilterSortBarProps) => {
  const { t } = useLanguage();
  const [sortBy, setSortBy] = useState("featured");

  const categories = [
    { key: "earrings", label: t("earrings") },
    { key: "bracelets", label: t("bracelets") },
    { key: "rings", label: t("rings") },
    { key: "necklaces", label: t("necklaces") },
    { key: "watches", label: t("watches") },
  ];
  
  // Luxury brands for multi-brand personal shopper
  const brands = [
    "Cartier",
    "Bulgari",
    "Van Cleef & Arpels",
    "Tiffany & Co.",
    "Chopard",
    "Graff",
    "Harry Winston",
    "Piaget",
  ];
  
  const priceRanges = ["Under €1,000", "€1,000 - €5,000", "€5,000 - €10,000", "Over €10,000"];
  const materials = ["Gold", "White Gold", "Rose Gold", "Platinum", "Diamond"];

  return (
    <>
      <section className="w-full px-6 mb-8 border-b border-border pb-4">
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
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-background border-none shadow-none">
                <SheetHeader className="mb-6 border-b border-border pb-4">
                  <SheetTitle className="text-lg font-light">{t("filters")}</SheetTitle>
                </SheetHeader>
                
                <div className="space-y-8">
                  {/* Brand Filter - Most important for multi-brand platform */}
                  <div>
                    <h3 className="text-sm font-light mb-4 text-foreground">{t("brand")}</h3>
                    <div className="space-y-3">
                      {brands.map((brand) => (
                        <div key={brand} className="flex items-center space-x-3">
                          <Checkbox id={brand} className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" />
                          <Label htmlFor={brand} className="text-sm font-light text-foreground cursor-pointer">
                            {brand}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-border" />

                  {/* Category Filter */}
                  <div>
                    <h3 className="text-sm font-light mb-4 text-foreground">{t("shop")}</h3>
                    <div className="space-y-3">
                      {categories.map((category) => (
                        <div key={category.key} className="flex items-center space-x-3">
                          <Checkbox id={category.key} className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" />
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
                    <Button variant="ghost" size="sm" className="w-full border-none hover:bg-transparent hover:underline font-normal text-left justify-start">
                      {t("apply")}
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
