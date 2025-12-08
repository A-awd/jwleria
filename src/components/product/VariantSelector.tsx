import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ProductVariant } from '@/types/shopify';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant) => void;
  className?: string;
}

// Extract unique option types and their values from variants
function extractOptions(variants: ProductVariant[]): Map<string, string[]> {
  const optionsMap = new Map<string, Set<string>>();

  variants.forEach(variant => {
    Object.entries(variant.options).forEach(([optionName, optionValue]) => {
      if (!optionsMap.has(optionName)) {
        optionsMap.set(optionName, new Set());
      }
      optionsMap.get(optionName)?.add(optionValue);
    });
  });

  // Convert Sets to Arrays
  const result = new Map<string, string[]>();
  optionsMap.forEach((values, key) => {
    result.set(key, Array.from(values));
  });

  return result;
}

// Find variant that matches selected options
function findMatchingVariant(
  variants: ProductVariant[],
  selectedOptions: Record<string, string>
): ProductVariant | null {
  return (
    variants.find(variant => {
      return Object.entries(selectedOptions).every(
        ([optionName, optionValue]) => variant.options[optionName] === optionValue
      );
    }) ?? null
  );
}

// Check if an option value is available given current selections
function isOptionAvailable(
  variants: ProductVariant[],
  optionName: string,
  optionValue: string,
  currentSelections: Record<string, string>
): boolean {
  // Find variants that have this option value
  const matchingVariants = variants.filter(
    variant => variant.options[optionName] === optionValue
  );

  // Check if any of those variants match the other current selections and are available
  return matchingVariants.some(variant => {
    const matchesOtherSelections = Object.entries(currentSelections).every(
      ([name, value]) => name === optionName || variant.options[name] === value
    );
    return matchesOtherSelections && variant.available;
  });
}

export function VariantSelector({
  variants,
  selectedVariant,
  onVariantChange,
  className,
}: VariantSelectorProps) {
  // Extract all option types (e.g., Size, Color, Material)
  const optionTypes = useMemo(() => extractOptions(variants), [variants]);

  // Initialize selected options from the selected variant or first available variant
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    if (selectedVariant) {
      return { ...selectedVariant.options };
    }
    // Default to first available variant's options
    const firstAvailable = variants.find(v => v.available) ?? variants[0];
    return firstAvailable ? { ...firstAvailable.options } : {};
  });

  // Handle option selection
  const handleOptionSelect = (optionName: string, optionValue: string) => {
    const newSelections = { ...selectedOptions, [optionName]: optionValue };
    setSelectedOptions(newSelections);

    // Find and select the matching variant
    const matchingVariant = findMatchingVariant(variants, newSelections);
    if (matchingVariant) {
      onVariantChange(matchingVariant);
    }
  };

  // If only one variant with default title, don't show selector
  if (variants.length <= 1 && variants[0]?.title === 'Default Title') {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {Array.from(optionTypes.entries()).map(([optionName, optionValues]) => (
        <div key={optionName} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground uppercase tracking-wide">
              {optionName}
            </label>
            {selectedOptions[optionName] && (
              <span className="text-sm text-muted-foreground">
                {selectedOptions[optionName]}
              </span>
            )}
          </div>

          {/* Render different UI based on option type */}
          {optionName.toLowerCase() === 'color' ? (
            <ColorSwatches
              values={optionValues}
              selectedValue={selectedOptions[optionName]}
              onSelect={(value) => handleOptionSelect(optionName, value)}
              isValueAvailable={(value) =>
                isOptionAvailable(variants, optionName, value, selectedOptions)
              }
            />
          ) : (
            <OptionButtons
              values={optionValues}
              selectedValue={selectedOptions[optionName]}
              onSelect={(value) => handleOptionSelect(optionName, value)}
              isValueAvailable={(value) =>
                isOptionAvailable(variants, optionName, value, selectedOptions)
              }
            />
          )}
        </div>
      ))}

      {/* Selected variant info */}
      {selectedVariant && !selectedVariant.available && (
        <p className="text-sm text-destructive">
          This combination is currently unavailable
        </p>
      )}
    </div>
  );
}

// Color swatches component
interface ColorSwatchesProps {
  values: string[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  isValueAvailable: (value: string) => boolean;
}

function ColorSwatches({ values, selectedValue, onSelect, isValueAvailable }: ColorSwatchesProps) {
  // Map color names to CSS colors
  const colorMap: Record<string, string> = {
    // Basic colors
    black: '#000000',
    white: '#FFFFFF',
    red: '#DC2626',
    blue: '#2563EB',
    green: '#16A34A',
    yellow: '#EAB308',
    orange: '#EA580C',
    purple: '#9333EA',
    pink: '#EC4899',
    gray: '#6B7280',
    grey: '#6B7280',
    brown: '#92400E',
    navy: '#1E3A5A',
    beige: '#D4C5B0',
    cream: '#FFFDD0',
    ivory: '#FFFFF0',
    // Jewelry-specific
    gold: '#FFD700',
    silver: '#C0C0C0',
    'rose gold': '#B76E79',
    platinum: '#E5E4E2',
    bronze: '#CD7F32',
    copper: '#B87333',
  };

  const getColorStyle = (colorName: string): string => {
    const lowerName = colorName.toLowerCase();
    return colorMap[lowerName] || '#9CA3AF'; // Default gray if not found
  };

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const isSelected = selectedValue === value;
        const isAvailable = isValueAvailable(value);
        const colorStyle = getColorStyle(value);

        return (
          <button
            key={value}
            type="button"
            onClick={() => isAvailable && onSelect(value)}
            disabled={!isAvailable}
            className={cn(
              'relative w-8 h-8 rounded-full border-2 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              isSelected
                ? 'border-primary ring-2 ring-primary ring-offset-2'
                : 'border-border hover:border-primary/50',
              !isAvailable && 'opacity-40 cursor-not-allowed'
            )}
            style={{ backgroundColor: colorStyle }}
            aria-label={value}
            title={value}
          >
            {/* Checkmark for selected */}
            {isSelected && (
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  colorStyle === '#FFFFFF' || colorStyle === '#FFFDD0' || colorStyle === '#FFFFF0'
                    ? 'text-foreground'
                    : 'text-white'
                )}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
            {/* Strikethrough for unavailable */}
            {!isAvailable && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-full h-0.5 bg-destructive rotate-45 absolute" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Generic option buttons (for Size, Material, etc.)
interface OptionButtonsProps {
  values: string[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  isValueAvailable: (value: string) => boolean;
}

function OptionButtons({ values, selectedValue, onSelect, isValueAvailable }: OptionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const isSelected = selectedValue === value;
        const isAvailable = isValueAvailable(value);

        return (
          <button
            key={value}
            type="button"
            onClick={() => isAvailable && onSelect(value)}
            disabled={!isAvailable}
            className={cn(
              'px-4 py-2 min-w-[3rem] text-sm font-medium border rounded-md transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              isSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent',
              !isAvailable &&
                'opacity-40 cursor-not-allowed line-through decoration-destructive'
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

export default VariantSelector;
