// JWleria Native Product Database
// All products are pre-order only with lead times

export interface Product {
  id: number;
  name: string;
  brand: string;
  brandSlug?: string;
  category: string;
  categoryKey: string;
  priceSAR?: number;
  priceEUR: number;
  image: string;
  images?: string[];
  description?: string;
  material?: string;
  dimensions?: string;
  weight?: string;
  // All products are pre-order (isReadyToShip always false for compatibility)
  isReadyToShip?: boolean;
  isPreOrder?: boolean;
  leadTime?: string;
  isNew?: boolean;
  isLimitedEdition?: boolean;
  tags?: string[];
}

// Categories list
export const categories = [
  { key: "rings", label: "Rings" },
  { key: "necklaces", label: "Necklaces" },
  { key: "earrings", label: "Earrings" },
  { key: "bracelets", label: "Bracelets" },
  { key: "watches", label: "Watches" },
  { key: "bags", label: "Bags" },
  { key: "sunglasses", label: "Sunglasses" },
  { key: "accessories", label: "Accessories" },
];

// Lead time options
export const leadTimeOptions = [
  "2 to 3 weeks",
  "2 to 4 weeks",
  "3 to 5 weeks",
  "4 to 6 weeks",
  "6 to 8 weeks",
];

// All luxury brands (for legacy compatibility)
export const luxuryBrands = [
  "Cartier", "Bulgari", "Van Cleef & Arpels", "Tiffany & Co.", 
  "Chopard", "Graff", "Harry Winston", "Piaget",
  "Dior", "Givenchy", "Rolex", "Patek Philippe",
  "Boucheron", "Chaumet", "Messika", "Pomellato",
  "Audemars Piguet", "Omega"
];

// Helper functions
export const getFeaturedProducts = (count: number = 12): Product[] => {
  return allProducts.filter(p => p.isNew).slice(0, count).concat(
    allProducts.filter(p => !p.isNew).slice(0, Math.max(0, count - allProducts.filter(p => p.isNew).length))
  ).slice(0, count);
};

export const getProductsByBrand = (brand: string): Product[] => {
  return allProducts.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
};

export const getProductsByBrandSlug = (slug: string): Product[] => {
  return allProducts.filter(p => p.brandSlug === slug);
};

export const getProductById = (id: number): Product | undefined => {
  return allProducts.find((p) => p.id === id);
};

export const getProductsByCategory = (categoryKey: string): Product[] => {
  return allProducts.filter(p => p.categoryKey === categoryKey);
};

export const getBestSellers = (count: number = 4): Product[] => {
  return [...allProducts].sort((a, b) => b.priceSAR - a.priceSAR).slice(0, count);
};

export const getNewArrivals = (count: number = 4): Product[] => {
  return allProducts.filter(p => p.isNew).slice(0, count);
};

export const searchProducts = (query: string): Product[] => {
  const lowerQuery = query.toLowerCase();
  return allProducts.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.brand.toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery) ||
    p.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

// Comprehensive product catalog - ALL PRODUCTS ARE PRE-ORDER
export const allProducts: Product[] = [
  // CARTIER
  { 
    id: 1, 
    name: "Love Bracelet", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Bracelets", 
    categoryKey: "bracelets", 
    priceSAR: 28500, 
    priceEUR: 6850, 
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80",
    description: "The iconic Love bracelet, designed as a symbol of everlasting love. Crafted in 18K gold with the signature screw motifs.",
    material: "18K Rose Gold",
    isNew: true,
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["iconic", "gold", "love"]
  },
  { 
    id: 2, 
    name: "Juste un Clou Ring", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 10200, 
    priceEUR: 2450, 
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
    description: "A bold statement ring in the shape of a nail, reimagining everyday objects with high jewelry craftsmanship.",
    material: "18K Yellow Gold",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["bold", "modern", "gold"]
  },
  { 
    id: 3, 
    name: "Trinity Ring", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 8950, 
    priceEUR: 2150, 
    image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80",
    description: "Three intertwined bands in pink, yellow, and white gold, symbolizing love, fidelity, and friendship.",
    material: "18K Tri-Color Gold",
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["classic", "trinity", "gold"]
  },
  { 
    id: 4, 
    name: "Panthère Ring", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 33500, 
    priceEUR: 8050, 
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80",
    description: "The legendary Panthère motif brought to life with exceptional craftsmanship and precious gemstones.",
    material: "18K White Gold, Onyx, Emeralds, Diamonds",
    isPreOrder: true,
    leadTime: "4 to 6 weeks",
    isLimitedEdition: true,
    tags: ["panthère", "statement", "diamonds"]
  },
  { 
    id: 5, 
    name: "Love Ring", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 6450, 
    priceEUR: 1550, 
    image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80",
    description: "The Love ring features the iconic screw motifs of the Love collection in a timeless band design.",
    material: "18K Rose Gold",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["love", "classic", "gold"]
  },
  { 
    id: 6, 
    name: "Panthère Necklace", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Necklaces", 
    categoryKey: "necklaces", 
    priceSAR: 63300, 
    priceEUR: 15200, 
    image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80",
    description: "An exquisite necklace featuring the majestic Panthère, crafted with meticulous attention to detail.",
    material: "18K White Gold, Onyx, Diamonds",
    isNew: true,
    isPreOrder: true,
    leadTime: "4 to 6 weeks",
    tags: ["panthère", "statement", "diamonds"]
  },
  { 
    id: 7, 
    name: "Clash de Cartier Ring", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 12900, 
    priceEUR: 3100, 
    image: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=800&q=80",
    description: "Bold studs and geometric beads create a striking ring that embodies duality and rebellion.",
    material: "18K Rose Gold",
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["modern", "bold", "gold"]
  },
  { 
    id: 8, 
    name: "Ballon Bleu Watch", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 37250, 
    priceEUR: 8950, 
    image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80",
    description: "The perfectly round Ballon Bleu with its distinctive blue cabochon crown, a modern icon of watchmaking.",
    material: "Stainless Steel",
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["watch", "classic", "steel"]
  },
  { 
    id: 9, 
    name: "Tank Française Watch", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 31000, 
    priceEUR: 7450, 
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
    description: "The Tank Française features the iconic rectangular case with a fluid bracelet design.",
    material: "Stainless Steel",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["watch", "tank", "steel"]
  },
  { 
    id: 10, 
    name: "Santos Watch", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 41000, 
    priceEUR: 9850, 
    image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80",
    description: "The legendary Santos, created for aviation pioneer Alberto Santos-Dumont, the first modern wristwatch.",
    material: "Stainless Steel & 18K Yellow Gold",
    isNew: true,
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["watch", "santos", "iconic"]
  },
  { 
    id: 11, 
    name: "Juste un Clou Bracelet", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Bracelets", 
    categoryKey: "bracelets", 
    priceSAR: 18100, 
    priceEUR: 4350, 
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80",
    description: "The nail bracelet, a bold and contemporary piece that transforms the ordinary into the extraordinary.",
    material: "18K Yellow Gold",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["bold", "modern", "gold"]
  },
  { 
    id: 12, 
    name: "Love Earrings", 
    brand: "Cartier", 
    brandSlug: "cartier",
    category: "Earrings", 
    categoryKey: "earrings", 
    priceSAR: 11650, 
    priceEUR: 2800, 
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    description: "Elegant hoop earrings featuring the iconic Love screw motifs.",
    material: "18K Rose Gold",
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["love", "hoops", "gold"]
  },
  
  // BULGARI
  { 
    id: 21, 
    name: "Serpenti Viper Ring", 
    brand: "Bulgari", 
    brandSlug: "bulgari",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 13300, 
    priceEUR: 3200, 
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
    description: "The serpent's seductive coils wrap around the finger in this contemporary interpretation of the iconic motif.",
    material: "18K Rose Gold, Diamonds",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["serpenti", "iconic", "diamonds"]
  },
  { 
    id: 22, 
    name: "B.zero1 Bracelet", 
    brand: "Bulgari", 
    brandSlug: "bulgari",
    category: "Bracelets", 
    categoryKey: "bracelets", 
    priceSAR: 11650, 
    priceEUR: 2800, 
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80",
    description: "The spiral design inspired by Rome's iconic Colosseum, a symbol of Bulgari's heritage.",
    material: "18K Rose Gold & Ceramic",
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["bzero1", "ceramic", "iconic"]
  },
  { 
    id: 23, 
    name: "Divas' Dream Necklace", 
    brand: "Bulgari", 
    brandSlug: "bulgari",
    category: "Necklaces", 
    categoryKey: "necklaces", 
    priceSAR: 20600, 
    priceEUR: 4950, 
    image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80",
    description: "Fan-shaped motifs inspired by the mosaics of ancient Rome's thermal baths.",
    material: "18K Rose Gold, Mother of Pearl, Diamonds",
    isNew: true,
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["divas", "mother of pearl", "diamonds"]
  },
  { 
    id: 24, 
    name: "Serpenti Bracelet", 
    brand: "Bulgari", 
    brandSlug: "bulgari",
    category: "Bracelets", 
    categoryKey: "bracelets", 
    priceSAR: 21450, 
    priceEUR: 5150, 
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80",
    description: "The serpent wraps sensually around the wrist, its scales crafted with extraordinary precision.",
    material: "18K Rose Gold",
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["serpenti", "statement", "gold"]
  },
  { 
    id: 25, 
    name: "B.zero1 Ring", 
    brand: "Bulgari", 
    brandSlug: "bulgari",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 7700, 
    priceEUR: 1850, 
    image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80",
    description: "The iconic spiral ring that celebrates Bulgari's audacious creativity and Roman heritage.",
    material: "18K White Gold",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["bzero1", "iconic", "gold"]
  },
  { 
    id: 26, 
    name: "Serpenti Tubogas Watch", 
    brand: "Bulgari", 
    brandSlug: "bulgari",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 52000, 
    priceEUR: 12500, 
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
    description: "The serpent wraps around the wrist multiple times, with the watch face as its head.",
    material: "18K Rose Gold & Stainless Steel",
    isPreOrder: true,
    leadTime: "4 to 6 weeks",
    tags: ["serpenti", "watch", "tubogas"]
  },
  
  // VAN CLEEF & ARPELS
  { 
    id: 41, 
    name: "Alhambra Necklace", 
    brand: "Van Cleef & Arpels", 
    brandSlug: "van-cleef-arpels",
    category: "Necklaces", 
    categoryKey: "necklaces", 
    priceSAR: 20600, 
    priceEUR: 4950, 
    image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80",
    description: "The iconic four-leaf clover motif, a symbol of luck crafted with exceptional attention to detail.",
    material: "18K Yellow Gold, Mother of Pearl",
    isNew: true,
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["alhambra", "iconic", "mother of pearl"]
  },
  { 
    id: 42, 
    name: "Frivole Earrings", 
    brand: "Van Cleef & Arpels", 
    brandSlug: "van-cleef-arpels",
    category: "Earrings", 
    categoryKey: "earrings", 
    priceSAR: 23100, 
    priceEUR: 5550, 
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    description: "Delicate floral-inspired earrings with dancing mirror-polished petals that catch the light.",
    material: "18K Yellow Gold",
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["frivole", "floral", "gold"]
  },
  { 
    id: 43, 
    name: "Perlée Bracelet", 
    brand: "Van Cleef & Arpels", 
    brandSlug: "van-cleef-arpels",
    category: "Bracelets", 
    categoryKey: "bracelets", 
    priceSAR: 15600, 
    priceEUR: 3750, 
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80",
    description: "Golden beads of varying sizes create a playful yet sophisticated bracelet design.",
    material: "18K Yellow Gold",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["perlée", "beads", "gold"]
  },
  
  // TIFFANY & CO
  { 
    id: 59, 
    name: "T Wire Bracelet", 
    brand: "Tiffany & Co.", 
    brandSlug: "tiffany",
    category: "Bracelets", 
    categoryKey: "bracelets", 
    priceSAR: 6870, 
    priceEUR: 1650, 
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80",
    description: "The clean, modern wire bracelet featuring the iconic T motif at each end.",
    material: "18K Rose Gold",
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["t collection", "modern", "gold"]
  },
  { 
    id: 60, 
    name: "Elsa Peretti Bean Necklace", 
    brand: "Tiffany & Co.", 
    brandSlug: "tiffany",
    category: "Necklaces", 
    categoryKey: "necklaces", 
    priceSAR: 7700, 
    priceEUR: 1850, 
    image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80",
    description: "Elsa Peretti's organic bean design, a timeless symbol of beginnings and new life.",
    material: "18K Yellow Gold",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["elsa peretti", "iconic", "gold"]
  },
  { 
    id: 61, 
    name: "Return to Tiffany Pendant", 
    brand: "Tiffany & Co.", 
    brandSlug: "tiffany",
    category: "Necklaces", 
    categoryKey: "necklaces", 
    priceSAR: 3540, 
    priceEUR: 850, 
    image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80",
    description: "The heart tag pendant, inspired by Tiffany's key ring tradition since 1969.",
    material: "Sterling Silver",
    isNew: true,
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["return to tiffany", "heart", "silver"]
  },
  
  // CHOPARD
  { 
    id: 77, 
    name: "Happy Hearts Earrings", 
    brand: "Chopard", 
    brandSlug: "chopard",
    category: "Earrings", 
    categoryKey: "earrings", 
    priceSAR: 9370, 
    priceEUR: 2250, 
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    description: "Playful heart motifs with floating diamonds that dance with every movement.",
    material: "18K Rose Gold, Diamonds",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["happy hearts", "diamonds", "playful"]
  },
  { 
    id: 78, 
    name: "Ice Cube Ring", 
    brand: "Chopard", 
    brandSlug: "chopard",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 8530, 
    priceEUR: 2050, 
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
    description: "Geometric cubes create a modern, edgy design that stacks beautifully.",
    material: "18K Rose Gold",
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["ice cube", "geometric", "modern"]
  },
  { 
    id: 79, 
    name: "L'Heure du Diamant Watch", 
    brand: "Chopard", 
    brandSlug: "chopard",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 51400, 
    priceEUR: 12350, 
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
    description: "A stunning timepiece where diamonds take center stage on both dial and bezel.",
    material: "18K White Gold, Diamonds",
    isNew: true,
    isPreOrder: true,
    leadTime: "4 to 6 weeks",
    tags: ["diamonds", "watch", "luxury"]
  },
  
  // ROLEX
  { 
    id: 169, 
    name: "Datejust 41", 
    brand: "Rolex", 
    brandSlug: "rolex",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 37250, 
    priceEUR: 8950, 
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
    description: "The quintessential classic watch, featuring the iconic Cyclops lens and fluted bezel.",
    material: "Oystersteel, 18K White Gold Bezel",
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["datejust", "classic", "steel"]
  },
  { 
    id: 170, 
    name: "Submariner Date", 
    brand: "Rolex", 
    brandSlug: "rolex",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 42450, 
    priceEUR: 10200, 
    image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80",
    description: "The legendary dive watch, water-resistant to 300 meters with the iconic rotating bezel.",
    material: "Oystersteel, Cerachrom Bezel",
    isNew: true,
    isPreOrder: true,
    leadTime: "4 to 6 weeks",
    tags: ["submariner", "dive", "iconic"]
  },
  { 
    id: 171, 
    name: "Day-Date 40", 
    brand: "Rolex", 
    brandSlug: "rolex",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 160200, 
    priceEUR: 38500, 
    image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80",
    description: "The President's watch, available exclusively in precious metals with day and date display.",
    material: "18K Yellow Gold",
    isPreOrder: true,
    leadTime: "6 to 8 weeks",
    isLimitedEdition: true,
    tags: ["day-date", "president", "gold"]
  },
  
  // PATEK PHILIPPE
  { 
    id: 184, 
    name: "Nautilus 5711", 
    brand: "Patek Philippe", 
    brandSlug: "patek-philippe",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 145700, 
    priceEUR: 35000, 
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
    description: "The legendary sports watch with the distinctive porthole-shaped case designed by Gérald Genta.",
    material: "Stainless Steel",
    isNew: true,
    isPreOrder: true,
    leadTime: "6 to 8 weeks",
    isLimitedEdition: true,
    tags: ["nautilus", "iconic", "genta"]
  },
  { 
    id: 185, 
    name: "Aquanaut 5167", 
    brand: "Patek Philippe", 
    brandSlug: "patek-philippe",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 102000, 
    priceEUR: 24500, 
    image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80",
    description: "The modern sports watch with the tropical composite strap and distinctive dial texture.",
    material: "Stainless Steel",
    isPreOrder: true,
    leadTime: "4 to 6 weeks",
    tags: ["aquanaut", "sports", "modern"]
  },
  
  // DIOR
  { 
    id: 139, 
    name: "Rose des Vents Ring", 
    brand: "Dior", 
    brandSlug: "dior",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 12280, 
    priceEUR: 2950, 
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
    description: "The lucky star motif dear to Christian Dior, crafted as an elegant medallion ring.",
    material: "18K Yellow Gold, Diamond, Mother of Pearl",
    isNew: true,
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["rose des vents", "lucky charm", "gold"]
  },
  { 
    id: 140, 
    name: "Tribales Earrings", 
    brand: "Dior", 
    brandSlug: "dior",
    category: "Earrings", 
    categoryKey: "earrings", 
    priceSAR: 3700, 
    priceEUR: 890, 
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    description: "Asymmetric pearl earrings with the Dior logo, a modern twist on classic elegance.",
    material: "Resin, Glass Pearl",
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["tribales", "pearl", "modern"]
  },
  { 
    id: 143, 
    name: "Lady Dior Bag", 
    brand: "Dior", 
    brandSlug: "dior",
    category: "Bags", 
    categoryKey: "bags", 
    priceSAR: 21650, 
    priceEUR: 5200, 
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
    description: "The iconic Lady Dior bag with Cannage stitching and D.I.O.R. charms.",
    material: "Lambskin Leather",
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["lady dior", "iconic", "leather"]
  },
  
  // GIVENCHY
  { 
    id: 154, 
    name: "G Cube Earrings", 
    brand: "Givenchy", 
    brandSlug: "givenchy",
    category: "Earrings", 
    categoryKey: "earrings", 
    priceSAR: 1870, 
    priceEUR: 450, 
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    description: "Geometric G cube earrings showcasing Givenchy's architectural design language.",
    material: "Palladium-Plated Brass",
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["g cube", "geometric", "modern"]
  },
  { 
    id: 155, 
    name: "4G Necklace", 
    brand: "Givenchy", 
    brandSlug: "givenchy",
    category: "Necklaces", 
    categoryKey: "necklaces", 
    priceSAR: 2700, 
    priceEUR: 650, 
    image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80",
    description: "The interlocking 4G logo pendant, a contemporary symbol of the maison.",
    material: "Palladium-Plated Brass",
    isNew: true,
    isPreOrder: true,
    leadTime: "2 to 3 weeks",
    tags: ["4g", "logo", "modern"]
  },
  { 
    id: 157, 
    name: "Antigona Bag", 
    brand: "Givenchy", 
    brandSlug: "givenchy",
    category: "Bags", 
    categoryKey: "bags", 
    priceSAR: 10200, 
    priceEUR: 2450, 
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
    description: "The structured Antigona bag, a modern classic with clean architectural lines.",
    material: "Goat Leather",
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["antigona", "structured", "leather"]
  },
  
  // GRAFF
  { 
    id: 94, 
    name: "Butterfly Ring", 
    brand: "Graff", 
    brandSlug: "graff",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 187300, 
    priceEUR: 45000, 
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
    description: "An extraordinary butterfly ring set with exceptional diamonds and colored gemstones.",
    material: "18K White Gold, Diamonds, Sapphires",
    isNew: true,
    isPreOrder: true,
    leadTime: "6 to 8 weeks",
    isLimitedEdition: true,
    tags: ["butterfly", "high jewelry", "diamonds"]
  },
  { 
    id: 95, 
    name: "Snowflake Earrings", 
    brand: "Graff", 
    brandSlug: "graff",
    category: "Earrings", 
    categoryKey: "earrings", 
    priceSAR: 158200, 
    priceEUR: 38000, 
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    description: "Delicate snowflake motifs set with exceptional round brilliant cut diamonds.",
    material: "18K White Gold, Diamonds",
    isPreOrder: true,
    leadTime: "6 to 8 weeks",
    tags: ["snowflake", "high jewelry", "diamonds"]
  },
  
  // HARRY WINSTON
  { 
    id: 109, 
    name: "Cluster Ring", 
    brand: "Harry Winston", 
    brandSlug: "harry-winston",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 270600, 
    priceEUR: 65000, 
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
    description: "The iconic Winston Cluster design, where diamonds are set to maximize brilliance.",
    material: "Platinum, Diamonds",
    isNew: true,
    isPreOrder: true,
    leadTime: "6 to 8 weeks",
    isLimitedEdition: true,
    tags: ["cluster", "high jewelry", "platinum"]
  },
  { 
    id: 110, 
    name: "Winston Cluster Earrings", 
    brand: "Harry Winston", 
    brandSlug: "harry-winston",
    category: "Earrings", 
    categoryKey: "earrings", 
    priceSAR: 353800, 
    priceEUR: 85000, 
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    description: "Magnificent cluster earrings featuring the house's signature wreath-like setting.",
    material: "Platinum, Diamonds",
    isPreOrder: true,
    leadTime: "6 to 8 weeks",
    tags: ["cluster", "high jewelry", "platinum"]
  },
  
  // PIAGET
  { 
    id: 124, 
    name: "Possession Ring", 
    brand: "Piaget", 
    brandSlug: "piaget",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 11860, 
    priceEUR: 2850, 
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
    description: "The turning ring that brings luck with every rotation, a playful yet elegant design.",
    material: "18K Rose Gold, Diamonds",
    isPreOrder: true,
    leadTime: "2 to 4 weeks",
    tags: ["possession", "turning", "diamonds"]
  },
  { 
    id: 125, 
    name: "Rose Earrings", 
    brand: "Piaget", 
    brandSlug: "piaget",
    category: "Earrings", 
    categoryKey: "earrings", 
    priceSAR: 35380, 
    priceEUR: 8500, 
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    description: "Delicate rose motif earrings, celebrating the flower at the heart of Piaget's gardens.",
    material: "18K Rose Gold, Diamonds",
    isNew: true,
    isPreOrder: true,
    leadTime: "3 to 5 weeks",
    tags: ["rose", "floral", "diamonds"]
  },
];
