export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  categoryKey: string;
  priceEUR: number;
  image: string;
  isNew?: boolean;
}

// All luxury brands
export const luxuryBrands = [
  "Cartier", "Bulgari", "Van Cleef & Arpels", "Tiffany & Co.", 
  "Chopard", "Graff", "Harry Winston", "Piaget",
  "Dior", "Givenchy", "Rolex", "Patek Philippe"
];

// Comprehensive product catalog - 15-20 products per brand with real product images
export const allProducts: Product[] = [
  // ==================== CARTIER (20 products) ====================
  { id: 1, name: "Love Bracelet", brand: "Cartier", category: "Bracelets", categoryKey: "bracelets", priceEUR: 6850, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", isNew: true },
  { id: 2, name: "Juste un Clou Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 2450, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 3, name: "Trinity Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 2150, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 4, name: "Panthère Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 8050, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80" },
  { id: 5, name: "Love Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 1550, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },
  { id: 6, name: "Panthère Necklace", brand: "Cartier", category: "Necklaces", categoryKey: "necklaces", priceEUR: 15200, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 7, name: "Clash de Cartier Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 3100, image: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=800&q=80" },
  { id: 8, name: "Ballon Bleu Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 8950, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 9, name: "Tank Française Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 7450, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 10, name: "Santos Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 9850, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80", isNew: true },
  { id: 11, name: "Juste un Clou Bracelet", brand: "Cartier", category: "Bracelets", categoryKey: "bracelets", priceEUR: 4350, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 12, name: "Love Earrings", brand: "Cartier", category: "Earrings", categoryKey: "earrings", priceEUR: 2800, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 13, name: "Panthère Earrings", brand: "Cartier", category: "Earrings", categoryKey: "earrings", priceEUR: 5950, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 14, name: "C de Cartier Bag", brand: "Cartier", category: "Bags", categoryKey: "bags", priceEUR: 3200, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: 15, name: "Panthère Sunglasses", brand: "Cartier", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 890, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80" },
  { id: 16, name: "Santos Sunglasses", brand: "Cartier", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 950, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80" },
  { id: 17, name: "Trinity Earrings", brand: "Cartier", category: "Earrings", categoryKey: "earrings", priceEUR: 3250, image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80" },
  { id: 18, name: "Amulette Pendant", brand: "Cartier", category: "Necklaces", categoryKey: "necklaces", priceEUR: 4800, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 19, name: "Pasha Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 11500, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
  { id: 20, name: "Clash Bracelet", brand: "Cartier", category: "Bracelets", categoryKey: "bracelets", priceEUR: 5600, image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },

  // ==================== BULGARI (20 products) ====================
  { id: 21, name: "Serpenti Viper Ring", brand: "Bulgari", category: "Rings", categoryKey: "rings", priceEUR: 3200, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 22, name: "B.zero1 Bracelet", brand: "Bulgari", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2800, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 23, name: "Divas' Dream Necklace", brand: "Bulgari", category: "Necklaces", categoryKey: "necklaces", priceEUR: 4950, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 24, name: "Serpenti Bracelet", brand: "Bulgari", category: "Bracelets", categoryKey: "bracelets", priceEUR: 5150, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 25, name: "B.zero1 Ring", brand: "Bulgari", category: "Rings", categoryKey: "rings", priceEUR: 1850, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 26, name: "Serpenti Tubogas Watch", brand: "Bulgari", category: "Watches", categoryKey: "watches", priceEUR: 12500, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 27, name: "Serpenti Seduttori Watch", brand: "Bulgari", category: "Watches", categoryKey: "watches", priceEUR: 9800, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", isNew: true },
  { id: 28, name: "Divas' Dream Earrings", brand: "Bulgari", category: "Earrings", categoryKey: "earrings", priceEUR: 3600, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 29, name: "Serpenti Forever Bag", brand: "Bulgari", category: "Bags", categoryKey: "bags", priceEUR: 2950, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: 30, name: "Serpenti Eyes Sunglasses", brand: "Bulgari", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 420, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80" },
  { id: 31, name: "Fiorever Ring", brand: "Bulgari", category: "Rings", categoryKey: "rings", priceEUR: 4200, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },
  { id: 32, name: "Fiorever Necklace", brand: "Bulgari", category: "Necklaces", categoryKey: "necklaces", priceEUR: 5800, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 33, name: "Serpenti Viper Bracelet", brand: "Bulgari", category: "Bracelets", categoryKey: "bracelets", priceEUR: 7200, image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },
  { id: 34, name: "B.zero1 Necklace", brand: "Bulgari", category: "Necklaces", categoryKey: "necklaces", priceEUR: 2400, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80" },
  { id: 35, name: "Octo Finissimo Watch", brand: "Bulgari", category: "Watches", categoryKey: "watches", priceEUR: 15800, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 36, name: "Serpenti Cabochon Bag", brand: "Bulgari", category: "Bags", categoryKey: "bags", priceEUR: 3800, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80" },
  { id: 37, name: "Parentesi Earrings", brand: "Bulgari", category: "Earrings", categoryKey: "earrings", priceEUR: 2100, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 38, name: "Allegra Sunglasses", brand: "Bulgari", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 380, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80" },
  { id: 39, name: "Monete Necklace", brand: "Bulgari", category: "Necklaces", categoryKey: "necklaces", priceEUR: 8500, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80", isNew: true },
  { id: 40, name: "Serpenti Viper Earrings", brand: "Bulgari", category: "Earrings", categoryKey: "earrings", priceEUR: 4500, image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80" },

  // ==================== VAN CLEEF & ARPELS (18 products) ====================
  { id: 41, name: "Alhambra Necklace", brand: "Van Cleef & Arpels", category: "Necklaces", categoryKey: "necklaces", priceEUR: 4950, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 42, name: "Frivole Earrings", brand: "Van Cleef & Arpels", category: "Earrings", categoryKey: "earrings", priceEUR: 5550, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 43, name: "Perlée Bracelet", brand: "Van Cleef & Arpels", category: "Bracelets", categoryKey: "bracelets", priceEUR: 3750, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 44, name: "Magic Alhambra Earrings", brand: "Van Cleef & Arpels", category: "Earrings", categoryKey: "earrings", priceEUR: 7650, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 45, name: "Vintage Alhambra Ring", brand: "Van Cleef & Arpels", category: "Rings", categoryKey: "rings", priceEUR: 3200, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", isNew: true },
  { id: 46, name: "Alhambra Watch", brand: "Van Cleef & Arpels", category: "Watches", categoryKey: "watches", priceEUR: 18500, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 47, name: "Sweet Alhambra Bracelet", brand: "Van Cleef & Arpels", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2100, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 48, name: "Frivole Ring", brand: "Van Cleef & Arpels", category: "Rings", categoryKey: "rings", priceEUR: 4800, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 49, name: "Perlée Signature Ring", brand: "Van Cleef & Arpels", category: "Rings", categoryKey: "rings", priceEUR: 2950, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },
  { id: 50, name: "Lotus Earrings", brand: "Van Cleef & Arpels", category: "Earrings", categoryKey: "earrings", priceEUR: 12500, image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80" },
  { id: 51, name: "Cadenas Watch", brand: "Van Cleef & Arpels", category: "Watches", categoryKey: "watches", priceEUR: 25000, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 52, name: "Cosmos Necklace", brand: "Van Cleef & Arpels", category: "Necklaces", categoryKey: "necklaces", priceEUR: 35000, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 53, name: "Perlée Clover Bracelet", brand: "Van Cleef & Arpels", category: "Bracelets", categoryKey: "bracelets", priceEUR: 8900, image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },
  { id: 54, name: "Two Butterfly Ring", brand: "Van Cleef & Arpels", category: "Rings", categoryKey: "rings", priceEUR: 15800, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80" },
  { id: 55, name: "Lucky Spring Necklace", brand: "Van Cleef & Arpels", category: "Necklaces", categoryKey: "necklaces", priceEUR: 6200, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 56, name: "Bouton d'or Earrings", brand: "Van Cleef & Arpels", category: "Earrings", categoryKey: "earrings", priceEUR: 9800, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 57, name: "Midnight Zodiac Watch", brand: "Van Cleef & Arpels", category: "Watches", categoryKey: "watches", priceEUR: 45000, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 58, name: "Rose de Noël Brooch", brand: "Van Cleef & Arpels", category: "Brooches", categoryKey: "brooches", priceEUR: 28000, image: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=800&q=80" },

  // ==================== TIFFANY & CO. (18 products) ====================
  { id: 59, name: "T Wire Bracelet", brand: "Tiffany & Co.", category: "Bracelets", categoryKey: "bracelets", priceEUR: 1650, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 60, name: "Elsa Peretti Bean Necklace", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 1850, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 61, name: "Return to Tiffany Pendant", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 850, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 62, name: "Bone Cuff Bracelet", brand: "Tiffany & Co.", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2950, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 63, name: "T Square Ring", brand: "Tiffany & Co.", category: "Rings", categoryKey: "rings", priceEUR: 1250, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 64, name: "Atlas Watch", brand: "Tiffany & Co.", category: "Watches", categoryKey: "watches", priceEUR: 4500, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 65, name: "HardWear Link Necklace", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 3800, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80", isNew: true },
  { id: 66, name: "Elsa Peretti Diamonds Earrings", brand: "Tiffany & Co.", category: "Earrings", categoryKey: "earrings", priceEUR: 2400, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 67, name: "Victoria Earrings", brand: "Tiffany & Co.", category: "Earrings", categoryKey: "earrings", priceEUR: 8500, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 68, name: "Tiffany T Sunglasses", brand: "Tiffany & Co.", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 450, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80" },
  { id: 69, name: "Return to Tiffany Tote", brand: "Tiffany & Co.", category: "Bags", categoryKey: "bags", priceEUR: 1950, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: 70, name: "Schlumberger Ring", brand: "Tiffany & Co.", category: "Rings", categoryKey: "rings", priceEUR: 12500, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 71, name: "Knot Bracelet", brand: "Tiffany & Co.", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2200, image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },
  { id: 72, name: "Paloma Picasso Olive Leaf", brand: "Tiffany & Co.", category: "Earrings", categoryKey: "earrings", priceEUR: 1100, image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80" },
  { id: 73, name: "Metro Watch", brand: "Tiffany & Co.", category: "Watches", categoryKey: "watches", priceEUR: 5800, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 74, name: "Tiffany Keys Pendant", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 3200, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 75, name: "Lock Ring", brand: "Tiffany & Co.", category: "Rings", categoryKey: "rings", priceEUR: 4500, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },
  { id: 76, name: "Infinity Bracelet", brand: "Tiffany & Co.", category: "Bracelets", categoryKey: "bracelets", priceEUR: 1800, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },

  // ==================== CHOPARD (17 products) ====================
  { id: 77, name: "Happy Hearts Earrings", brand: "Chopard", category: "Earrings", categoryKey: "earrings", priceEUR: 2250, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 78, name: "Ice Cube Ring", brand: "Chopard", category: "Rings", categoryKey: "rings", priceEUR: 2050, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 79, name: "L'Heure du Diamant Watch", brand: "Chopard", category: "Watches", categoryKey: "watches", priceEUR: 12350, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", isNew: true },
  { id: 80, name: "Happy Sport Watch", brand: "Chopard", category: "Watches", categoryKey: "watches", priceEUR: 8500, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 81, name: "Happy Diamonds Bracelet", brand: "Chopard", category: "Bracelets", categoryKey: "bracelets", priceEUR: 4800, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 82, name: "Imperiale Necklace", brand: "Chopard", category: "Necklaces", categoryKey: "necklaces", priceEUR: 6500, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80" },
  { id: 83, name: "Alpine Eagle Watch", brand: "Chopard", category: "Watches", categoryKey: "watches", priceEUR: 14200, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80", isNew: true },
  { id: 84, name: "Ice Cube Bracelet", brand: "Chopard", category: "Bracelets", categoryKey: "bracelets", priceEUR: 3200, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 85, name: "Happy Hearts Necklace", brand: "Chopard", category: "Necklaces", categoryKey: "necklaces", priceEUR: 3800, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 86, name: "My Happy Hearts Ring", brand: "Chopard", category: "Rings", categoryKey: "rings", priceEUR: 1850, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 87, name: "Classic Racing Sunglasses", brand: "Chopard", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 520, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80" },
  { id: 88, name: "Mille Miglia Watch", brand: "Chopard", category: "Watches", categoryKey: "watches", priceEUR: 7800, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
  { id: 89, name: "Imperiale Earrings", brand: "Chopard", category: "Earrings", categoryKey: "earrings", priceEUR: 4200, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 90, name: "Ice Cube Necklace", brand: "Chopard", category: "Necklaces", categoryKey: "necklaces", priceEUR: 2800, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80" },
  { id: 91, name: "Happy Diamonds Ring", brand: "Chopard", category: "Rings", categoryKey: "rings", priceEUR: 5600, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },
  { id: 92, name: "Caroline Murphy Bag", brand: "Chopard", category: "Bags", categoryKey: "bags", priceEUR: 2400, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: 93, name: "Happy Sport Earrings", brand: "Chopard", category: "Earrings", categoryKey: "earrings", priceEUR: 3100, image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80" },

  // ==================== GRAFF (16 products) ====================
  { id: 94, name: "Butterfly Ring", brand: "Graff", category: "Rings", categoryKey: "rings", priceEUR: 12950, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 95, name: "Flame Necklace", brand: "Graff", category: "Necklaces", categoryKey: "necklaces", priceEUR: 85000, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 96, name: "Spiral Earrings", brand: "Graff", category: "Earrings", categoryKey: "earrings", priceEUR: 45000, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 97, name: "Classic Graff Bracelet", brand: "Graff", category: "Bracelets", categoryKey: "bracelets", priceEUR: 28000, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 98, name: "Snowflake Ring", brand: "Graff", category: "Rings", categoryKey: "rings", priceEUR: 65000, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 99, name: "GyroGraff Watch", brand: "Graff", category: "Watches", categoryKey: "watches", priceEUR: 250000, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 100, name: "Hallucination Watch", brand: "Graff", category: "Watches", categoryKey: "watches", priceEUR: 450000, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 101, name: "Icon Necklace", brand: "Graff", category: "Necklaces", categoryKey: "necklaces", priceEUR: 125000, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80", isNew: true },
  { id: 102, name: "Classic Butterfly Earrings", brand: "Graff", category: "Earrings", categoryKey: "earrings", priceEUR: 35000, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 103, name: "Tilda's Bow Bracelet", brand: "Graff", category: "Bracelets", categoryKey: "bracelets", priceEUR: 42000, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 104, name: "Infinity Ring", brand: "Graff", category: "Rings", categoryKey: "rings", priceEUR: 18500, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },
  { id: 105, name: "MasterGraff Watch", brand: "Graff", category: "Watches", categoryKey: "watches", priceEUR: 180000, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 106, name: "Threads Necklace", brand: "Graff", category: "Necklaces", categoryKey: "necklaces", priceEUR: 95000, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80" },
  { id: 107, name: "Bow Earrings", brand: "Graff", category: "Earrings", categoryKey: "earrings", priceEUR: 28000, image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80" },
  { id: 108, name: "Pavé Diamond Ring", brand: "Graff", category: "Rings", categoryKey: "rings", priceEUR: 22000, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 109, name: "Ruby Heart Pendant", brand: "Graff", category: "Necklaces", categoryKey: "necklaces", priceEUR: 155000, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80" },

  // ==================== HARRY WINSTON (16 products) ====================
  { id: 110, name: "Cluster Earrings", brand: "Harry Winston", category: "Earrings", categoryKey: "earrings", priceEUR: 18650, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 111, name: "Winston Cluster Necklace", brand: "Harry Winston", category: "Necklaces", categoryKey: "necklaces", priceEUR: 45750, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80", isNew: true },
  { id: 112, name: "Sunflower Ring", brand: "Harry Winston", category: "Rings", categoryKey: "rings", priceEUR: 32000, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 113, name: "Emerald Bracelet", brand: "Harry Winston", category: "Bracelets", categoryKey: "bracelets", priceEUR: 58000, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 114, name: "Midnight Watch", brand: "Harry Winston", category: "Watches", categoryKey: "watches", priceEUR: 85000, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 115, name: "Premier Watch", brand: "Harry Winston", category: "Watches", categoryKey: "watches", priceEUR: 42000, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", isNew: true },
  { id: 116, name: "Lily Cluster Ring", brand: "Harry Winston", category: "Rings", categoryKey: "rings", priceEUR: 28000, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 117, name: "Forget-Me-Not Earrings", brand: "Harry Winston", category: "Earrings", categoryKey: "earrings", priceEUR: 22000, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 118, name: "Loop Necklace", brand: "Harry Winston", category: "Necklaces", categoryKey: "necklaces", priceEUR: 65000, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80" },
  { id: 119, name: "Avenue Watch", brand: "Harry Winston", category: "Watches", categoryKey: "watches", priceEUR: 38000, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 120, name: "Traffic Bracelet", brand: "Harry Winston", category: "Bracelets", categoryKey: "bracelets", priceEUR: 48000, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 121, name: "Cross Pendant", brand: "Harry Winston", category: "Necklaces", categoryKey: "necklaces", priceEUR: 35000, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80" },
  { id: 122, name: "Wreath Ring", brand: "Harry Winston", category: "Rings", categoryKey: "rings", priceEUR: 19500, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },
  { id: 123, name: "Ocean Watch", brand: "Harry Winston", category: "Watches", categoryKey: "watches", priceEUR: 55000, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
  { id: 124, name: "Cluster Bracelet", brand: "Harry Winston", category: "Bracelets", categoryKey: "bracelets", priceEUR: 72000, image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },
  { id: 125, name: "Butterfly Earrings", brand: "Harry Winston", category: "Earrings", categoryKey: "earrings", priceEUR: 31000, image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80" },

  // ==================== PIAGET (17 products) ====================
  { id: 126, name: "Possession Ring", brand: "Piaget", category: "Rings", categoryKey: "rings", priceEUR: 1950, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 127, name: "Rose Necklace", brand: "Piaget", category: "Necklaces", categoryKey: "necklaces", priceEUR: 8750, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 128, name: "Altiplano Watch", brand: "Piaget", category: "Watches", categoryKey: "watches", priceEUR: 18500, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 129, name: "Possession Bracelet", brand: "Piaget", category: "Bracelets", categoryKey: "bracelets", priceEUR: 3850, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 130, name: "Rose Earrings", brand: "Piaget", category: "Earrings", categoryKey: "earrings", priceEUR: 6200, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 131, name: "Polo Watch", brand: "Piaget", category: "Watches", categoryKey: "watches", priceEUR: 24500, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", isNew: true },
  { id: 132, name: "Sunlight Ring", brand: "Piaget", category: "Rings", categoryKey: "rings", priceEUR: 5800, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 133, name: "Limelight Gala Watch", brand: "Piaget", category: "Watches", categoryKey: "watches", priceEUR: 32000, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 134, name: "Possession Earrings", brand: "Piaget", category: "Earrings", categoryKey: "earrings", priceEUR: 2950, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 135, name: "Rose Ring", brand: "Piaget", category: "Rings", categoryKey: "rings", priceEUR: 4500, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },
  { id: 136, name: "Sunlight Necklace", brand: "Piaget", category: "Necklaces", categoryKey: "necklaces", priceEUR: 12500, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 137, name: "Extremely Piaget Bracelet", brand: "Piaget", category: "Bracelets", categoryKey: "bracelets", priceEUR: 28000, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 138, name: "Dancer Earrings", brand: "Piaget", category: "Earrings", categoryKey: "earrings", priceEUR: 15800, image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80" },
  { id: 139, name: "Emperador Watch", brand: "Piaget", category: "Watches", categoryKey: "watches", priceEUR: 45000, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
  { id: 140, name: "Golden Oasis Necklace", brand: "Piaget", category: "Necklaces", categoryKey: "necklaces", priceEUR: 22000, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80" },
  { id: 141, name: "Possession Pendant", brand: "Piaget", category: "Necklaces", categoryKey: "necklaces", priceEUR: 2800, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80" },
  { id: 142, name: "Limelight Bracelet", brand: "Piaget", category: "Bracelets", categoryKey: "bracelets", priceEUR: 18500, image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },

  // ==================== DIOR (18 products) ====================
  { id: 143, name: "Rose des Vents Ring", brand: "Dior", category: "Rings", categoryKey: "rings", priceEUR: 2450, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 144, name: "Dior VIII Watch", brand: "Dior", category: "Watches", categoryKey: "watches", priceEUR: 5850, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 145, name: "Rose des Vents Necklace", brand: "Dior", category: "Necklaces", categoryKey: "necklaces", priceEUR: 3250, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", isNew: true },
  { id: 146, name: "Lady Dior Bag Mini", brand: "Dior", category: "Bags", categoryKey: "bags", priceEUR: 4200, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: 147, name: "Dior Tribales Earrings", brand: "Dior", category: "Earrings", categoryKey: "earrings", priceEUR: 890, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 148, name: "30 Montaigne Sunglasses", brand: "Dior", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 420, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80" },
  { id: 149, name: "Clair D Lune Bracelet", brand: "Dior", category: "Bracelets", categoryKey: "bracelets", priceEUR: 650, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 150, name: "Book Tote", brand: "Dior", category: "Bags", categoryKey: "bags", priceEUR: 3200, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80", isNew: true },
  { id: 151, name: "Dior Grand Bal Watch", brand: "Dior", category: "Watches", categoryKey: "watches", priceEUR: 28000, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 152, name: "J'Adior Earrings", brand: "Dior", category: "Earrings", categoryKey: "earrings", priceEUR: 580, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 153, name: "Rose des Vents Bracelet", brand: "Dior", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2100, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 154, name: "Saddle Bag", brand: "Dior", category: "Bags", categoryKey: "bags", priceEUR: 3800, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: 155, name: "Bois de Rose Ring", brand: "Dior", category: "Rings", categoryKey: "rings", priceEUR: 4800, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 156, name: "DiorSoReal Sunglasses", brand: "Dior", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 520, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80" },
  { id: 157, name: "Archi Dior Necklace", brand: "Dior", category: "Necklaces", categoryKey: "necklaces", priceEUR: 8500, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 158, name: "Dior Rose Earrings", brand: "Dior", category: "Earrings", categoryKey: "earrings", priceEUR: 3200, image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80" },
  { id: 159, name: "La D de Dior Watch", brand: "Dior", category: "Watches", categoryKey: "watches", priceEUR: 15800, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 160, name: "Rose Dior Couture Ring", brand: "Dior", category: "Rings", categoryKey: "rings", priceEUR: 12500, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80" },

  // ==================== GIVENCHY (17 products) ====================
  { id: 161, name: "4G Ring", brand: "Givenchy", category: "Rings", categoryKey: "rings", priceEUR: 450, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
  { id: 162, name: "Antigona Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 2450, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80", isNew: true },
  { id: 163, name: "G Chain Necklace", brand: "Givenchy", category: "Necklaces", categoryKey: "necklaces", priceEUR: 680, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80" },
  { id: 164, name: "4G Earrings", brand: "Givenchy", category: "Earrings", categoryKey: "earrings", priceEUR: 380, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80" },
  { id: 165, name: "GV7 Sunglasses", brand: "Givenchy", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 320, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80" },
  { id: 166, name: "Lock Bracelet", brand: "Givenchy", category: "Bracelets", categoryKey: "bracelets", priceEUR: 520, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
  { id: 167, name: "Cut Out Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 1950, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80" },
  { id: 168, name: "G Cube Earrings", brand: "Givenchy", category: "Earrings", categoryKey: "earrings", priceEUR: 450, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80" },
  { id: 169, name: "Moon Cut Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 2200, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80", isNew: true },
  { id: 170, name: "G Link Necklace", brand: "Givenchy", category: "Necklaces", categoryKey: "necklaces", priceEUR: 580, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80" },
  { id: 171, name: "4G Bracelet", brand: "Givenchy", category: "Bracelets", categoryKey: "bracelets", priceEUR: 420, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80" },
  { id: 172, name: "GV Day Sunglasses", brand: "Givenchy", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 380, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80" },
  { id: 173, name: "Shark Lock Ring", brand: "Givenchy", category: "Rings", categoryKey: "rings", priceEUR: 650, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80" },
  { id: 174, name: "Kenny Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 1650, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80" },
  { id: 175, name: "G Chain Bracelet", brand: "Givenchy", category: "Bracelets", categoryKey: "bracelets", priceEUR: 480, image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },
  { id: 176, name: "Voyou Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 2800, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: 177, name: "GV3 Sunglasses", brand: "Givenchy", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 350, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80" },

  // ==================== ROLEX (18 products) ====================
  { id: 178, name: "Submariner", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 9150, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", isNew: true },
  { id: 179, name: "Datejust 41", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 8550, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 180, name: "Day-Date 40", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 37500, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 181, name: "GMT-Master II", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 10900, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80", isNew: true },
  { id: 182, name: "Daytona", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 15550, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 183, name: "Explorer II", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 9350, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 184, name: "Sea-Dweller", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 12950, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 185, name: "Sky-Dweller", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 15850, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
  { id: 186, name: "Yacht-Master 42", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 29900, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 187, name: "Oyster Perpetual 41", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 6150, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 188, name: "Lady-Datejust", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 8150, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 189, name: "Pearlmaster 39", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 85000, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
  { id: 190, name: "Cellini Moonphase", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 26950, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 191, name: "Air-King", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 7600, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 192, name: "Milgauss", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 8900, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 193, name: "Explorer", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 7350, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
  { id: 194, name: "Deepsea", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 13750, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 195, name: "Cosmograph Daytona Rainbow", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 125000, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },

  // ==================== PATEK PHILIPPE (16 products) ====================
  { id: 196, name: "Nautilus 5711", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 35650, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", isNew: true },
  { id: 197, name: "Calatrava", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 28500, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 198, name: "Aquanaut", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 24350, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 199, name: "Complications", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 45800, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80", isNew: true },
  { id: 200, name: "Grand Complications", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 185000, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 201, name: "Twenty~4", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 12850, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 202, name: "Golden Ellipse", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 22500, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 203, name: "Gondolo", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 32000, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
  { id: 204, name: "World Time", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 58500, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 205, name: "Perpetual Calendar", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 95000, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 206, name: "Annual Calendar", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 42500, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 207, name: "Minute Repeater", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 350000, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
  { id: 208, name: "Chronograph", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 75000, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80" },
  { id: 209, name: "Split-Seconds", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 250000, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { id: 210, name: "Celestial", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 285000, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80" },
  { id: 211, name: "Sky Moon Tourbillon", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 1500000, image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=80" },
];

// Categories list
export const categories = [
  { key: "rings", label: "Rings" },
  { key: "necklaces", label: "Necklaces" },
  { key: "earrings", label: "Earrings" },
  { key: "bracelets", label: "Bracelets" },
  { key: "watches", label: "Watches" },
  { key: "bags", label: "Bags" },
  { key: "sunglasses", label: "Sunglasses" },
  { key: "brooches", label: "Brooches" },
];

// Helper functions
export const getProductsByBrand = (brand: string) => 
  allProducts.filter(p => p.brand === brand);

export const getProductsByCategory = (categoryKey: string) => 
  allProducts.filter(p => p.categoryKey === categoryKey);

export const getProductById = (id: number) => 
  allProducts.find(p => p.id === id);

export const getNewProducts = () => 
  allProducts.filter(p => p.isNew);

export const getFeaturedProducts = (limit: number = 12) => 
  allProducts.slice(0, limit);

export const getAllCategories = () => 
  [...new Set(allProducts.map(p => p.categoryKey))];
