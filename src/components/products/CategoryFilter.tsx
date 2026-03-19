import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
}

const CategoryFilter = ({ categories, selected, onSelect }: CategoryFilterProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
      <button
        onClick={() => onSelect("all")}
        className={cn(
          "flex-shrink-0 px-4 py-2 text-sm border rounded-full transition-colors",
          selected === "all"
            ? "bg-foreground text-background border-foreground"
            : "bg-background text-foreground border-border hover:border-foreground"
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={cn(
            "flex-shrink-0 px-4 py-2 text-sm border rounded-full transition-colors",
            selected === cat
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-foreground border-border hover:border-foreground"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
