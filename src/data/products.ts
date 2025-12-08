// Shopify-ready product data structure with backward compatibility

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  categoryKey: string;
  priceEUR: number;
  image: string;
  isNew?: boolean;
  isReadyToShip?: boolean;
  // Shopify-ready fields (optional for now)
  handle?: string;
  description?: string;
  sku?: string;
  inventoryQuantity?: number;
  compareAtPrice?: number;
  tags?: string[];
}

// Categories list
export const categories = [
  "Rings", "Necklaces", "Earrings", "Bracelets", 
  "Watches", "Bags", "Sunglasses", "Brooches"
];

// All luxury brands
export const luxuryBrands = [
  "Cartier", "Bulgari", "Van Cleef & Arpels", "Tiffany & Co.", 
  "Chopard", "Graff", "Harry Winston", "Piaget",
  "Dior", "Givenchy", "Rolex", "Patek Philippe"
];

// Get featured products
export const getFeaturedProducts = (count: number = 12): Product[] => {
  return allProducts.filter(p => p.isNew).slice(0, count).concat(
    allProducts.filter(p => !p.isNew).slice(0, Math.max(0, count - allProducts.filter(p => p.isNew).length))
  ).slice(0, count);
};

// Get products by brand
export const getProductsByBrand = (brand: string): Product[] => {
  return allProducts.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
};

// Get product by ID
export const getProductById = (id: number): Product | undefined => {
  return allProducts.find((p) => p.id === id);
};

// Get best sellers (sorted by price, top items)
export const getBestSellers = (count: number = 4): Product[] => {
  return [...allProducts].sort((a, b) => b.priceEUR - a.priceEUR).slice(0, count);
};

// Get new arrivals
export const getNewArrivals = (count: number = 4): Product[] => {
  return allProducts.filter(p => p.isNew).slice(0, count);
};

// Comprehensive product catalog
export const allProducts: Product[] = [
  // CARTIER
  { id: 1, name: "Love Bracelet", brand: "Cartier", category: "Bracelets", categoryKey: "bracelets", priceEUR: 6850, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", isNew: true, isReadyToShip: true },
  { id: 2, name: "Juste un Clou Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 2450, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", isReadyToShip: true },
  { id: 3, name: "Trinity Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 2150, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 4, name: "Panthère Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 8050, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80", isReadyToShip: true },
  { id: 5, name: "Love Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 1550, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },
  { id: 6, name: "Panthère Necklace", brand: "Cartier", category: "Necklaces", categoryKey: "necklaces", priceEUR: 15200, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 7, name: "Clash de Cartier Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 3100, image: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=800&q=80", isReadyToShip: true },
  { id: 8, name: "Ballon Bleu Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 8950, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 9, name: "Tank Française Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 7450, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", isReadyToShip: true },
  { id: 10, name: "Santos Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 9850, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80", isNew: true },
  { id: 11, name: "Juste un Clou Bracelet", brand: "Cartier", category: "Bracelets", categoryKey: "bracelets", priceEUR: 4350, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80", isReadyToShip: true },
  { id: 12, name: "Love Earrings", brand: "Cartier", category: "Earrings", categoryKey: "earrings", priceEUR: 2800, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 13, name: "Panthère Earrings", brand: "Cartier", category: "Earrings", categoryKey: "earrings", priceEUR: 5950, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80", isReadyToShip: true },
  { id: 14, name: "C de Cartier Bag", brand: "Cartier", category: "Bags", categoryKey: "bags", priceEUR: 3200, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: 15, name: "Panthère Sunglasses", brand: "Cartier", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 890, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80", isReadyToShip: true },
  // BULGARI
  { id: 21, name: "Serpenti Viper Ring", brand: "Bulgari", category: "Rings", categoryKey: "rings", priceEUR: 3200, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", isReadyToShip: true },
  { id: 22, name: "B.zero1 Bracelet", brand: "Bulgari", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2800, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 23, name: "Divas' Dream Necklace", brand: "Bulgari", category: "Necklaces", categoryKey: "necklaces", priceEUR: 4950, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true, isReadyToShip: true },
  { id: 24, name: "Serpenti Bracelet", brand: "Bulgari", category: "Bracelets", categoryKey: "bracelets", priceEUR: 5150, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 25, name: "B.zero1 Ring", brand: "Bulgari", category: "Rings", categoryKey: "rings", priceEUR: 1850, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80", isReadyToShip: true },
  { id: 26, name: "Serpenti Tubogas Watch", brand: "Bulgari", category: "Watches", categoryKey: "watches", priceEUR: 12500, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 27, name: "Serpenti Seduttori Watch", brand: "Bulgari", category: "Watches", categoryKey: "watches", priceEUR: 9800, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", isNew: true },
  // VAN CLEEF
  { id: 41, name: "Alhambra Necklace", brand: "Van Cleef & Arpels", category: "Necklaces", categoryKey: "necklaces", priceEUR: 4950, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true, isReadyToShip: true },
  { id: 42, name: "Frivole Earrings", brand: "Van Cleef & Arpels", category: "Earrings", categoryKey: "earrings", priceEUR: 5550, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 43, name: "Perlée Bracelet", brand: "Van Cleef & Arpels", category: "Bracelets", categoryKey: "bracelets", priceEUR: 3750, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", isReadyToShip: true },
  // TIFFANY
  { id: 59, name: "T Wire Bracelet", brand: "Tiffany & Co.", category: "Bracelets", categoryKey: "bracelets", priceEUR: 1650, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", isReadyToShip: true },
  { id: 60, name: "Elsa Peretti Bean Necklace", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 1850, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 61, name: "Return to Tiffany Pendant", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 850, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true, isReadyToShip: true },
  // CHOPARD
  { id: 77, name: "Happy Hearts Earrings", brand: "Chopard", category: "Earrings", categoryKey: "earrings", priceEUR: 2250, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", isReadyToShip: true },
  { id: 78, name: "Ice Cube Ring", brand: "Chopard", category: "Rings", categoryKey: "rings", priceEUR: 2050, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 79, name: "L'Heure du Diamant Watch", brand: "Chopard", category: "Watches", categoryKey: "watches", priceEUR: 12350, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", isNew: true },
  // ROLEX
  { id: 169, name: "Datejust 41", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 8950, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", isReadyToShip: true },
  { id: 170, name: "Submariner Date", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 10200, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", isNew: true },
  { id: 171, name: "Day-Date 40", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 38500, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  // PATEK PHILIPPE
  { id: 184, name: "Nautilus 5711", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 35000, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", isNew: true },
  { id: 185, name: "Aquanaut 5167", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 24500, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", isReadyToShip: true },
  // DIOR
  { id: 139, name: "Rose des Vents Ring", brand: "Dior", category: "Rings", categoryKey: "rings", priceEUR: 2950, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", isNew: true, isReadyToShip: true },
  { id: 140, name: "Tribales Earrings", brand: "Dior", category: "Earrings", categoryKey: "earrings", priceEUR: 890, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 143, name: "Lady Dior Bag", brand: "Dior", category: "Bags", categoryKey: "bags", priceEUR: 5200, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80", isReadyToShip: true },
  // GIVENCHY
  { id: 154, name: "G Cube Earrings", brand: "Givenchy", category: "Earrings", categoryKey: "earrings", priceEUR: 450, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", isReadyToShip: true },
  { id: 155, name: "4G Necklace", brand: "Givenchy", category: "Necklaces", categoryKey: "necklaces", priceEUR: 650, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 157, name: "Antigona Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 2450, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  // GRAFF
  { id: 94, name: "Butterfly Ring", brand: "Graff", category: "Rings", categoryKey: "rings", priceEUR: 45000, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", isNew: true },
  { id: 95, name: "Snowflake Earrings", brand: "Graff", category: "Earrings", categoryKey: "earrings", priceEUR: 38000, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", isReadyToShip: true },
  // HARRY WINSTON
  { id: 109, name: "Cluster Ring", brand: "Harry Winston", category: "Rings", categoryKey: "rings", priceEUR: 65000, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", isNew: true },
  { id: 110, name: "Winston Cluster Earrings", brand: "Harry Winston", category: "Earrings", categoryKey: "earrings", priceEUR: 85000, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  // PIAGET
  { id: 124, name: "Possession Ring", brand: "Piaget", category: "Rings", categoryKey: "rings", priceEUR: 2850, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", isReadyToShip: true },
  { id: 125, name: "Rose Earrings", brand: "Piaget", category: "Earrings", categoryKey: "earrings", priceEUR: 8500, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", isNew: true },
];
