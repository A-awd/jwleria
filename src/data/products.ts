import pantheonImage from "@/assets/pantheon.jpg";
import eclipseImage from "@/assets/eclipse.jpg";
import haloImage from "@/assets/halo.jpg";
import obliqueImage from "@/assets/oblique.jpg";
import lintelImage from "@/assets/lintel.jpg";
import shadowlineImage from "@/assets/shadowline.jpg";

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

// Helper to cycle through available images
const images = [pantheonImage, eclipseImage, haloImage, obliqueImage, lintelImage, shadowlineImage];
const getImage = (index: number) => images[index % images.length];

// All luxury brands
export const luxuryBrands = [
  "Cartier", "Bulgari", "Van Cleef & Arpels", "Tiffany & Co.", 
  "Chopard", "Graff", "Harry Winston", "Piaget",
  "Dior", "Givenchy", "Rolex", "Patek Philippe"
];

// Comprehensive product catalog - 15-20 products per brand
export const allProducts: Product[] = [
  // ==================== CARTIER (20 products) ====================
  { id: 1, name: "Love Bracelet", brand: "Cartier", category: "Bracelets", categoryKey: "bracelets", priceEUR: 6850, image: getImage(0), isNew: true },
  { id: 2, name: "Juste un Clou Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 2450, image: getImage(1) },
  { id: 3, name: "Trinity Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 2150, image: getImage(2) },
  { id: 4, name: "Panthère Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 8050, image: getImage(3) },
  { id: 5, name: "Love Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 1550, image: getImage(4) },
  { id: 6, name: "Panthère Necklace", brand: "Cartier", category: "Necklaces", categoryKey: "necklaces", priceEUR: 15200, image: getImage(5), isNew: true },
  { id: 7, name: "Clash de Cartier Ring", brand: "Cartier", category: "Rings", categoryKey: "rings", priceEUR: 3100, image: getImage(0) },
  { id: 8, name: "Ballon Bleu Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 8950, image: getImage(1) },
  { id: 9, name: "Tank Française Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 7450, image: getImage(2) },
  { id: 10, name: "Santos Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 9850, image: getImage(3), isNew: true },
  { id: 11, name: "Juste un Clou Bracelet", brand: "Cartier", category: "Bracelets", categoryKey: "bracelets", priceEUR: 4350, image: getImage(4) },
  { id: 12, name: "Love Earrings", brand: "Cartier", category: "Earrings", categoryKey: "earrings", priceEUR: 2800, image: getImage(5) },
  { id: 13, name: "Panthère Earrings", brand: "Cartier", category: "Earrings", categoryKey: "earrings", priceEUR: 5950, image: getImage(0) },
  { id: 14, name: "C de Cartier Bag", brand: "Cartier", category: "Bags", categoryKey: "bags", priceEUR: 3200, image: getImage(1) },
  { id: 15, name: "Panthère Sunglasses", brand: "Cartier", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 890, image: getImage(2) },
  { id: 16, name: "Santos Sunglasses", brand: "Cartier", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 950, image: getImage(3) },
  { id: 17, name: "Trinity Earrings", brand: "Cartier", category: "Earrings", categoryKey: "earrings", priceEUR: 3250, image: getImage(4) },
  { id: 18, name: "Amulette Pendant", brand: "Cartier", category: "Necklaces", categoryKey: "necklaces", priceEUR: 4800, image: getImage(5) },
  { id: 19, name: "Pasha Watch", brand: "Cartier", category: "Watches", categoryKey: "watches", priceEUR: 11500, image: getImage(0) },
  { id: 20, name: "Clash Bracelet", brand: "Cartier", category: "Bracelets", categoryKey: "bracelets", priceEUR: 5600, image: getImage(1) },

  // ==================== BULGARI (20 products) ====================
  { id: 21, name: "Serpenti Viper Ring", brand: "Bulgari", category: "Rings", categoryKey: "rings", priceEUR: 3200, image: getImage(1) },
  { id: 22, name: "B.zero1 Bracelet", brand: "Bulgari", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2800, image: getImage(2) },
  { id: 23, name: "Divas' Dream Necklace", brand: "Bulgari", category: "Necklaces", categoryKey: "necklaces", priceEUR: 4950, image: getImage(3), isNew: true },
  { id: 24, name: "Serpenti Bracelet", brand: "Bulgari", category: "Bracelets", categoryKey: "bracelets", priceEUR: 5150, image: getImage(4) },
  { id: 25, name: "B.zero1 Ring", brand: "Bulgari", category: "Rings", categoryKey: "rings", priceEUR: 1850, image: getImage(5) },
  { id: 26, name: "Serpenti Tubogas Watch", brand: "Bulgari", category: "Watches", categoryKey: "watches", priceEUR: 12500, image: getImage(0) },
  { id: 27, name: "Serpenti Seduttori Watch", brand: "Bulgari", category: "Watches", categoryKey: "watches", priceEUR: 9800, image: getImage(1), isNew: true },
  { id: 28, name: "Divas' Dream Earrings", brand: "Bulgari", category: "Earrings", categoryKey: "earrings", priceEUR: 3600, image: getImage(2) },
  { id: 29, name: "Serpenti Forever Bag", brand: "Bulgari", category: "Bags", categoryKey: "bags", priceEUR: 2950, image: getImage(3) },
  { id: 30, name: "Serpenti Eyes Sunglasses", brand: "Bulgari", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 420, image: getImage(4) },
  { id: 31, name: "Fiorever Ring", brand: "Bulgari", category: "Rings", categoryKey: "rings", priceEUR: 4200, image: getImage(5) },
  { id: 32, name: "Fiorever Necklace", brand: "Bulgari", category: "Necklaces", categoryKey: "necklaces", priceEUR: 5800, image: getImage(0) },
  { id: 33, name: "Serpenti Viper Bracelet", brand: "Bulgari", category: "Bracelets", categoryKey: "bracelets", priceEUR: 7200, image: getImage(1) },
  { id: 34, name: "B.zero1 Necklace", brand: "Bulgari", category: "Necklaces", categoryKey: "necklaces", priceEUR: 2400, image: getImage(2) },
  { id: 35, name: "Octo Finissimo Watch", brand: "Bulgari", category: "Watches", categoryKey: "watches", priceEUR: 15800, image: getImage(3) },
  { id: 36, name: "Serpenti Cabochon Bag", brand: "Bulgari", category: "Bags", categoryKey: "bags", priceEUR: 3800, image: getImage(4) },
  { id: 37, name: "Parentesi Earrings", brand: "Bulgari", category: "Earrings", categoryKey: "earrings", priceEUR: 2100, image: getImage(5) },
  { id: 38, name: "Allegra Sunglasses", brand: "Bulgari", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 380, image: getImage(0) },
  { id: 39, name: "Monete Necklace", brand: "Bulgari", category: "Necklaces", categoryKey: "necklaces", priceEUR: 8500, image: getImage(1), isNew: true },
  { id: 40, name: "Serpenti Viper Earrings", brand: "Bulgari", category: "Earrings", categoryKey: "earrings", priceEUR: 4500, image: getImage(2) },

  // ==================== VAN CLEEF & ARPELS (18 products) ====================
  { id: 41, name: "Alhambra Necklace", brand: "Van Cleef & Arpels", category: "Necklaces", categoryKey: "necklaces", priceEUR: 4950, image: getImage(2), isNew: true },
  { id: 42, name: "Frivole Earrings", brand: "Van Cleef & Arpels", category: "Earrings", categoryKey: "earrings", priceEUR: 5550, image: getImage(3) },
  { id: 43, name: "Perlée Bracelet", brand: "Van Cleef & Arpels", category: "Bracelets", categoryKey: "bracelets", priceEUR: 3750, image: getImage(4) },
  { id: 44, name: "Magic Alhambra Earrings", brand: "Van Cleef & Arpels", category: "Earrings", categoryKey: "earrings", priceEUR: 7650, image: getImage(5) },
  { id: 45, name: "Vintage Alhambra Ring", brand: "Van Cleef & Arpels", category: "Rings", categoryKey: "rings", priceEUR: 3200, image: getImage(0), isNew: true },
  { id: 46, name: "Alhambra Watch", brand: "Van Cleef & Arpels", category: "Watches", categoryKey: "watches", priceEUR: 18500, image: getImage(1) },
  { id: 47, name: "Sweet Alhambra Bracelet", brand: "Van Cleef & Arpels", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2100, image: getImage(2) },
  { id: 48, name: "Frivole Ring", brand: "Van Cleef & Arpels", category: "Rings", categoryKey: "rings", priceEUR: 4800, image: getImage(3) },
  { id: 49, name: "Perlée Signature Ring", brand: "Van Cleef & Arpels", category: "Rings", categoryKey: "rings", priceEUR: 2950, image: getImage(4) },
  { id: 50, name: "Lotus Earrings", brand: "Van Cleef & Arpels", category: "Earrings", categoryKey: "earrings", priceEUR: 12500, image: getImage(5) },
  { id: 51, name: "Cadenas Watch", brand: "Van Cleef & Arpels", category: "Watches", categoryKey: "watches", priceEUR: 25000, image: getImage(0) },
  { id: 52, name: "Cosmos Necklace", brand: "Van Cleef & Arpels", category: "Necklaces", categoryKey: "necklaces", priceEUR: 35000, image: getImage(1) },
  { id: 53, name: "Perlée Clover Bracelet", brand: "Van Cleef & Arpels", category: "Bracelets", categoryKey: "bracelets", priceEUR: 8900, image: getImage(2) },
  { id: 54, name: "Two Butterfly Ring", brand: "Van Cleef & Arpels", category: "Rings", categoryKey: "rings", priceEUR: 15800, image: getImage(3) },
  { id: 55, name: "Lucky Spring Necklace", brand: "Van Cleef & Arpels", category: "Necklaces", categoryKey: "necklaces", priceEUR: 6200, image: getImage(4), isNew: true },
  { id: 56, name: "Bouton d'or Earrings", brand: "Van Cleef & Arpels", category: "Earrings", categoryKey: "earrings", priceEUR: 9800, image: getImage(5) },
  { id: 57, name: "Midnight Zodiac Watch", brand: "Van Cleef & Arpels", category: "Watches", categoryKey: "watches", priceEUR: 45000, image: getImage(0) },
  { id: 58, name: "Rose de Noël Brooch", brand: "Van Cleef & Arpels", category: "Brooches", categoryKey: "brooches", priceEUR: 28000, image: getImage(1) },

  // ==================== TIFFANY & CO. (18 products) ====================
  { id: 59, name: "T Wire Bracelet", brand: "Tiffany & Co.", category: "Bracelets", categoryKey: "bracelets", priceEUR: 1650, image: getImage(3) },
  { id: 60, name: "Elsa Peretti Bean Necklace", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 1850, image: getImage(4) },
  { id: 61, name: "Return to Tiffany Pendant", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 850, image: getImage(5), isNew: true },
  { id: 62, name: "Bone Cuff Bracelet", brand: "Tiffany & Co.", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2950, image: getImage(0) },
  { id: 63, name: "T Square Ring", brand: "Tiffany & Co.", category: "Rings", categoryKey: "rings", priceEUR: 1250, image: getImage(1) },
  { id: 64, name: "Atlas Watch", brand: "Tiffany & Co.", category: "Watches", categoryKey: "watches", priceEUR: 4500, image: getImage(2) },
  { id: 65, name: "HardWear Link Necklace", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 3800, image: getImage(3), isNew: true },
  { id: 66, name: "Elsa Peretti Diamonds Earrings", brand: "Tiffany & Co.", category: "Earrings", categoryKey: "earrings", priceEUR: 2400, image: getImage(4) },
  { id: 67, name: "Victoria Earrings", brand: "Tiffany & Co.", category: "Earrings", categoryKey: "earrings", priceEUR: 8500, image: getImage(5) },
  { id: 68, name: "Tiffany T Sunglasses", brand: "Tiffany & Co.", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 450, image: getImage(0) },
  { id: 69, name: "Return to Tiffany Tote", brand: "Tiffany & Co.", category: "Bags", categoryKey: "bags", priceEUR: 1950, image: getImage(1) },
  { id: 70, name: "Schlumberger Ring", brand: "Tiffany & Co.", category: "Rings", categoryKey: "rings", priceEUR: 12500, image: getImage(2) },
  { id: 71, name: "Knot Bracelet", brand: "Tiffany & Co.", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2200, image: getImage(3) },
  { id: 72, name: "Paloma Picasso Olive Leaf", brand: "Tiffany & Co.", category: "Earrings", categoryKey: "earrings", priceEUR: 1100, image: getImage(4) },
  { id: 73, name: "Metro Watch", brand: "Tiffany & Co.", category: "Watches", categoryKey: "watches", priceEUR: 5800, image: getImage(5) },
  { id: 74, name: "Tiffany Keys Pendant", brand: "Tiffany & Co.", category: "Necklaces", categoryKey: "necklaces", priceEUR: 3200, image: getImage(0) },
  { id: 75, name: "Lock Ring", brand: "Tiffany & Co.", category: "Rings", categoryKey: "rings", priceEUR: 4500, image: getImage(1) },
  { id: 76, name: "Infinity Bracelet", brand: "Tiffany & Co.", category: "Bracelets", categoryKey: "bracelets", priceEUR: 1800, image: getImage(2) },

  // ==================== CHOPARD (17 products) ====================
  { id: 77, name: "Happy Hearts Earrings", brand: "Chopard", category: "Earrings", categoryKey: "earrings", priceEUR: 2250, image: getImage(4) },
  { id: 78, name: "Ice Cube Ring", brand: "Chopard", category: "Rings", categoryKey: "rings", priceEUR: 2050, image: getImage(5) },
  { id: 79, name: "L'Heure du Diamant Watch", brand: "Chopard", category: "Watches", categoryKey: "watches", priceEUR: 12350, image: getImage(0), isNew: true },
  { id: 80, name: "Happy Sport Watch", brand: "Chopard", category: "Watches", categoryKey: "watches", priceEUR: 8500, image: getImage(1) },
  { id: 81, name: "Happy Diamonds Bracelet", brand: "Chopard", category: "Bracelets", categoryKey: "bracelets", priceEUR: 4800, image: getImage(2) },
  { id: 82, name: "Imperiale Necklace", brand: "Chopard", category: "Necklaces", categoryKey: "necklaces", priceEUR: 6500, image: getImage(3) },
  { id: 83, name: "Alpine Eagle Watch", brand: "Chopard", category: "Watches", categoryKey: "watches", priceEUR: 14200, image: getImage(4), isNew: true },
  { id: 84, name: "Ice Cube Bracelet", brand: "Chopard", category: "Bracelets", categoryKey: "bracelets", priceEUR: 3200, image: getImage(5) },
  { id: 85, name: "Happy Hearts Necklace", brand: "Chopard", category: "Necklaces", categoryKey: "necklaces", priceEUR: 3800, image: getImage(0) },
  { id: 86, name: "My Happy Hearts Ring", brand: "Chopard", category: "Rings", categoryKey: "rings", priceEUR: 1850, image: getImage(1) },
  { id: 87, name: "Classic Racing Sunglasses", brand: "Chopard", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 520, image: getImage(2) },
  { id: 88, name: "Mille Miglia Watch", brand: "Chopard", category: "Watches", categoryKey: "watches", priceEUR: 7800, image: getImage(3) },
  { id: 89, name: "Imperiale Earrings", brand: "Chopard", category: "Earrings", categoryKey: "earrings", priceEUR: 4200, image: getImage(4) },
  { id: 90, name: "Ice Cube Necklace", brand: "Chopard", category: "Necklaces", categoryKey: "necklaces", priceEUR: 2800, image: getImage(5) },
  { id: 91, name: "Happy Diamonds Ring", brand: "Chopard", category: "Rings", categoryKey: "rings", priceEUR: 5600, image: getImage(0) },
  { id: 92, name: "Caroline Murphy Bag", brand: "Chopard", category: "Bags", categoryKey: "bags", priceEUR: 2400, image: getImage(1) },
  { id: 93, name: "Happy Sport Earrings", brand: "Chopard", category: "Earrings", categoryKey: "earrings", priceEUR: 3100, image: getImage(2) },

  // ==================== GRAFF (16 products) ====================
  { id: 94, name: "Butterfly Ring", brand: "Graff", category: "Rings", categoryKey: "rings", priceEUR: 12950, image: getImage(5) },
  { id: 95, name: "Flame Necklace", brand: "Graff", category: "Necklaces", categoryKey: "necklaces", priceEUR: 85000, image: getImage(0), isNew: true },
  { id: 96, name: "Spiral Earrings", brand: "Graff", category: "Earrings", categoryKey: "earrings", priceEUR: 45000, image: getImage(1) },
  { id: 97, name: "Classic Graff Bracelet", brand: "Graff", category: "Bracelets", categoryKey: "bracelets", priceEUR: 28000, image: getImage(2) },
  { id: 98, name: "Snowflake Ring", brand: "Graff", category: "Rings", categoryKey: "rings", priceEUR: 65000, image: getImage(3) },
  { id: 99, name: "GyroGraff Watch", brand: "Graff", category: "Watches", categoryKey: "watches", priceEUR: 250000, image: getImage(4) },
  { id: 100, name: "Hallucination Watch", brand: "Graff", category: "Watches", categoryKey: "watches", priceEUR: 450000, image: getImage(5) },
  { id: 101, name: "Icon Necklace", brand: "Graff", category: "Necklaces", categoryKey: "necklaces", priceEUR: 125000, image: getImage(0), isNew: true },
  { id: 102, name: "Classic Butterfly Earrings", brand: "Graff", category: "Earrings", categoryKey: "earrings", priceEUR: 35000, image: getImage(1) },
  { id: 103, name: "Tilda's Bow Bracelet", brand: "Graff", category: "Bracelets", categoryKey: "bracelets", priceEUR: 42000, image: getImage(2) },
  { id: 104, name: "Infinity Ring", brand: "Graff", category: "Rings", categoryKey: "rings", priceEUR: 18500, image: getImage(3) },
  { id: 105, name: "MasterGraff Watch", brand: "Graff", category: "Watches", categoryKey: "watches", priceEUR: 180000, image: getImage(4) },
  { id: 106, name: "Threads Necklace", brand: "Graff", category: "Necklaces", categoryKey: "necklaces", priceEUR: 95000, image: getImage(5) },
  { id: 107, name: "Bow Earrings", brand: "Graff", category: "Earrings", categoryKey: "earrings", priceEUR: 28000, image: getImage(0) },
  { id: 108, name: "Pavé Diamond Ring", brand: "Graff", category: "Rings", categoryKey: "rings", priceEUR: 22000, image: getImage(1) },
  { id: 109, name: "Ruby Heart Pendant", brand: "Graff", category: "Necklaces", categoryKey: "necklaces", priceEUR: 155000, image: getImage(2) },

  // ==================== HARRY WINSTON (16 products) ====================
  { id: 110, name: "Cluster Earrings", brand: "Harry Winston", category: "Earrings", categoryKey: "earrings", priceEUR: 18650, image: getImage(5) },
  { id: 111, name: "Winston Cluster Necklace", brand: "Harry Winston", category: "Necklaces", categoryKey: "necklaces", priceEUR: 45750, image: getImage(0), isNew: true },
  { id: 112, name: "Sunflower Ring", brand: "Harry Winston", category: "Rings", categoryKey: "rings", priceEUR: 32000, image: getImage(1) },
  { id: 113, name: "Emerald Bracelet", brand: "Harry Winston", category: "Bracelets", categoryKey: "bracelets", priceEUR: 58000, image: getImage(2) },
  { id: 114, name: "Midnight Watch", brand: "Harry Winston", category: "Watches", categoryKey: "watches", priceEUR: 85000, image: getImage(3) },
  { id: 115, name: "Premier Watch", brand: "Harry Winston", category: "Watches", categoryKey: "watches", priceEUR: 42000, image: getImage(4), isNew: true },
  { id: 116, name: "Lily Cluster Ring", brand: "Harry Winston", category: "Rings", categoryKey: "rings", priceEUR: 28000, image: getImage(5) },
  { id: 117, name: "Forget-Me-Not Earrings", brand: "Harry Winston", category: "Earrings", categoryKey: "earrings", priceEUR: 22000, image: getImage(0) },
  { id: 118, name: "Loop Necklace", brand: "Harry Winston", category: "Necklaces", categoryKey: "necklaces", priceEUR: 65000, image: getImage(1) },
  { id: 119, name: "Avenue Watch", brand: "Harry Winston", category: "Watches", categoryKey: "watches", priceEUR: 38000, image: getImage(2) },
  { id: 120, name: "Traffic Bracelet", brand: "Harry Winston", category: "Bracelets", categoryKey: "bracelets", priceEUR: 48000, image: getImage(3) },
  { id: 121, name: "Winston Gate Bracelet", brand: "Harry Winston", category: "Bracelets", categoryKey: "bracelets", priceEUR: 35000, image: getImage(4) },
  { id: 122, name: "Micropavé Ring", brand: "Harry Winston", category: "Rings", categoryKey: "rings", priceEUR: 15000, image: getImage(5) },
  { id: 123, name: "Cluster Pendant", brand: "Harry Winston", category: "Necklaces", categoryKey: "necklaces", priceEUR: 25000, image: getImage(0) },
  { id: 124, name: "Sunflower Earrings", brand: "Harry Winston", category: "Earrings", categoryKey: "earrings", priceEUR: 42000, image: getImage(1) },
  { id: 125, name: "Opus Watch", brand: "Harry Winston", category: "Watches", categoryKey: "watches", priceEUR: 285000, image: getImage(2) },

  // ==================== PIAGET (17 products) ====================
  { id: 126, name: "Rose Ring", brand: "Piaget", category: "Rings", categoryKey: "rings", priceEUR: 3450, image: getImage(5) },
  { id: 127, name: "Possession Ring", brand: "Piaget", category: "Rings", categoryKey: "rings", priceEUR: 2250, image: getImage(0), isNew: true },
  { id: 128, name: "Altiplano Watch", brand: "Piaget", category: "Watches", categoryKey: "watches", priceEUR: 18500, image: getImage(1) },
  { id: 129, name: "Possession Bracelet", brand: "Piaget", category: "Bracelets", categoryKey: "bracelets", priceEUR: 4200, image: getImage(2) },
  { id: 130, name: "Piaget Rose Earrings", brand: "Piaget", category: "Earrings", categoryKey: "earrings", priceEUR: 5800, image: getImage(3) },
  { id: 131, name: "Limelight Gala Watch", brand: "Piaget", category: "Watches", categoryKey: "watches", priceEUR: 32000, image: getImage(4), isNew: true },
  { id: 132, name: "Sunlight Necklace", brand: "Piaget", category: "Necklaces", categoryKey: "necklaces", priceEUR: 8500, image: getImage(5) },
  { id: 133, name: "Polo Watch", brand: "Piaget", category: "Watches", categoryKey: "watches", priceEUR: 14500, image: getImage(0) },
  { id: 134, name: "Possession Necklace", brand: "Piaget", category: "Necklaces", categoryKey: "necklaces", priceEUR: 3800, image: getImage(1) },
  { id: 135, name: "Rose Bracelet", brand: "Piaget", category: "Bracelets", categoryKey: "bracelets", priceEUR: 12500, image: getImage(2) },
  { id: 136, name: "Extremely Piaget Ring", brand: "Piaget", category: "Rings", categoryKey: "rings", priceEUR: 28000, image: getImage(3) },
  { id: 137, name: "Sunny Side of Life Earrings", brand: "Piaget", category: "Earrings", categoryKey: "earrings", priceEUR: 9200, image: getImage(4) },
  { id: 138, name: "Dancer Watch", brand: "Piaget", category: "Watches", categoryKey: "watches", priceEUR: 48000, image: getImage(5) },
  { id: 139, name: "Sunlight Ring", brand: "Piaget", category: "Rings", categoryKey: "rings", priceEUR: 6500, image: getImage(0) },
  { id: 140, name: "Piaget Polo Bracelet", brand: "Piaget", category: "Bracelets", categoryKey: "bracelets", priceEUR: 5200, image: getImage(1) },
  { id: 141, name: "Golden Oasis Necklace", brand: "Piaget", category: "Necklaces", categoryKey: "necklaces", priceEUR: 45000, image: getImage(2) },
  { id: 142, name: "Treasures Earrings", brand: "Piaget", category: "Earrings", categoryKey: "earrings", priceEUR: 15000, image: getImage(3) },

  // ==================== DIOR (18 products) ====================
  { id: 143, name: "Rose des Vents Bracelet", brand: "Dior", category: "Bracelets", categoryKey: "bracelets", priceEUR: 2800, image: getImage(0), isNew: true },
  { id: 144, name: "Gem Dior Ring", brand: "Dior", category: "Rings", categoryKey: "rings", priceEUR: 4500, image: getImage(1) },
  { id: 145, name: "Rose des Vents Necklace", brand: "Dior", category: "Necklaces", categoryKey: "necklaces", priceEUR: 3200, image: getImage(2) },
  { id: 146, name: "Tribales Earrings", brand: "Dior", category: "Earrings", categoryKey: "earrings", priceEUR: 890, image: getImage(3) },
  { id: 147, name: "Lady Dior Bag Mini", brand: "Dior", category: "Bags", categoryKey: "bags", priceEUR: 4900, image: getImage(4), isNew: true },
  { id: 148, name: "Lady Dior Bag Medium", brand: "Dior", category: "Bags", categoryKey: "bags", priceEUR: 5800, image: getImage(5) },
  { id: 149, name: "Saddle Bag", brand: "Dior", category: "Bags", categoryKey: "bags", priceEUR: 3500, image: getImage(0) },
  { id: 150, name: "30 Montaigne Bag", brand: "Dior", category: "Bags", categoryKey: "bags", priceEUR: 4200, image: getImage(1) },
  { id: 151, name: "Dior Bobby Bag", brand: "Dior", category: "Bags", categoryKey: "bags", priceEUR: 3800, image: getImage(2), isNew: true },
  { id: 152, name: "DiorSoReal Sunglasses", brand: "Dior", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 420, image: getImage(3) },
  { id: 153, name: "DiorClub Sunglasses", brand: "Dior", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 480, image: getImage(4) },
  { id: 154, name: "Caro Necklace", brand: "Dior", category: "Necklaces", categoryKey: "necklaces", priceEUR: 1200, image: getImage(5) },
  { id: 155, name: "J'Adior Earrings", brand: "Dior", category: "Earrings", categoryKey: "earrings", priceEUR: 650, image: getImage(0) },
  { id: 156, name: "La D de Dior Watch", brand: "Dior", category: "Watches", categoryKey: "watches", priceEUR: 8500, image: getImage(1) },
  { id: 157, name: "Dior Grand Bal Watch", brand: "Dior", category: "Watches", categoryKey: "watches", priceEUR: 28000, image: getImage(2) },
  { id: 158, name: "Mimirose Ring", brand: "Dior", category: "Rings", categoryKey: "rings", priceEUR: 2100, image: getImage(3) },
  { id: 159, name: "Archi Dior Ring", brand: "Dior", category: "Rings", categoryKey: "rings", priceEUR: 5800, image: getImage(4) },
  { id: 160, name: "Oui Ring", brand: "Dior", category: "Rings", categoryKey: "rings", priceEUR: 1850, image: getImage(5) },

  // ==================== GIVENCHY (16 products) ====================
  { id: 161, name: "Antigona Bag Mini", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 1890, image: getImage(1), isNew: true },
  { id: 162, name: "Antigona Bag Medium", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 2490, image: getImage(2) },
  { id: 163, name: "Kenny Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 1650, image: getImage(3) },
  { id: 164, name: "Moon Cut Out Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 1990, image: getImage(4), isNew: true },
  { id: 165, name: "G Chain Necklace", brand: "Givenchy", category: "Necklaces", categoryKey: "necklaces", priceEUR: 590, image: getImage(5) },
  { id: 166, name: "G Cube Earrings", brand: "Givenchy", category: "Earrings", categoryKey: "earrings", priceEUR: 450, image: getImage(0) },
  { id: 167, name: "4G Ring", brand: "Givenchy", category: "Rings", categoryKey: "rings", priceEUR: 380, image: getImage(1) },
  { id: 168, name: "G Link Bracelet", brand: "Givenchy", category: "Bracelets", categoryKey: "bracelets", priceEUR: 520, image: getImage(2) },
  { id: 169, name: "GV Day Sunglasses", brand: "Givenchy", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 350, image: getImage(3) },
  { id: 170, name: "4G Sunglasses", brand: "Givenchy", category: "Sunglasses", categoryKey: "sunglasses", priceEUR: 380, image: getImage(4) },
  { id: 171, name: "Voyou Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 2890, image: getImage(5), isNew: true },
  { id: 172, name: "Shark Lock Bracelet", brand: "Givenchy", category: "Bracelets", categoryKey: "bracelets", priceEUR: 680, image: getImage(0) },
  { id: 173, name: "G Chain Ring", brand: "Givenchy", category: "Rings", categoryKey: "rings", priceEUR: 420, image: getImage(1) },
  { id: 174, name: "Pandora Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 1750, image: getImage(2) },
  { id: 175, name: "4G Pendant", brand: "Givenchy", category: "Necklaces", categoryKey: "necklaces", priceEUR: 490, image: getImage(3) },
  { id: 176, name: "G Tote Bag", brand: "Givenchy", category: "Bags", categoryKey: "bags", priceEUR: 1450, image: getImage(4) },

  // ==================== ROLEX (18 products) ====================
  { id: 177, name: "Submariner", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 9950, image: getImage(0), isNew: true },
  { id: 178, name: "Datejust 41", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 8550, image: getImage(1) },
  { id: 179, name: "Day-Date 40", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 38500, image: getImage(2) },
  { id: 180, name: "GMT-Master II", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 11250, image: getImage(3), isNew: true },
  { id: 181, name: "Daytona", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 15550, image: getImage(4) },
  { id: 182, name: "Explorer II", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 9800, image: getImage(5) },
  { id: 183, name: "Yacht-Master 42", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 12500, image: getImage(0) },
  { id: 184, name: "Sea-Dweller", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 13750, image: getImage(1) },
  { id: 185, name: "Oyster Perpetual 41", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 6550, image: getImage(2) },
  { id: 186, name: "Sky-Dweller", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 16950, image: getImage(3), isNew: true },
  { id: 187, name: "Milgauss", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 8950, image: getImage(4) },
  { id: 188, name: "Air-King", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 7850, image: getImage(5) },
  { id: 189, name: "Lady-Datejust 28", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 7250, image: getImage(0) },
  { id: 190, name: "Cellini Moonphase", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 28500, image: getImage(1) },
  { id: 191, name: "Deepsea", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 14950, image: getImage(2) },
  { id: 192, name: "Pearlmaster 39", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 85000, image: getImage(3) },
  { id: 193, name: "Cosmograph Rainbow", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 125000, image: getImage(4) },
  { id: 194, name: "Datejust 36", brand: "Rolex", category: "Watches", categoryKey: "watches", priceEUR: 7950, image: getImage(5) },

  // ==================== PATEK PHILIPPE (17 products) ====================
  { id: 195, name: "Nautilus 5711", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 35000, image: getImage(0), isNew: true },
  { id: 196, name: "Aquanaut 5167", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 24500, image: getImage(1) },
  { id: 197, name: "Calatrava 5227", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 32000, image: getImage(2) },
  { id: 198, name: "Annual Calendar 5205", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 45000, image: getImage(3) },
  { id: 199, name: "World Time 5231", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 58000, image: getImage(4), isNew: true },
  { id: 200, name: "Perpetual Calendar 5320", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 95000, image: getImage(5) },
  { id: 201, name: "Grand Complications 5270", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 180000, image: getImage(0) },
  { id: 202, name: "Nautilus Chronograph", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 52000, image: getImage(1) },
  { id: 203, name: "Twenty~4 Automatic", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 28500, image: getImage(2), isNew: true },
  { id: 204, name: "Complications 5205R", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 48000, image: getImage(3) },
  { id: 205, name: "Golden Ellipse 5738", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 35000, image: getImage(4) },
  { id: 206, name: "Gondolo 5124", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 28000, image: getImage(5) },
  { id: 207, name: "Minute Repeater 5078", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 350000, image: getImage(0) },
  { id: 208, name: "Split-Seconds Chronograph", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 420000, image: getImage(1) },
  { id: 209, name: "Celestial 6102", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 280000, image: getImage(2) },
  { id: 210, name: "Chronograph 5172", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 72000, image: getImage(3) },
  { id: 211, name: "Pilot Travel Time 5524", brand: "Patek Philippe", category: "Watches", categoryKey: "watches", priceEUR: 55000, image: getImage(4) },
];

// Get products by brand
export const getProductsByBrand = (brand: string): Product[] => {
  return allProducts.filter(product => product.brand === brand);
};

// Get featured products (for carousel)
export const getFeaturedProducts = (count: number = 8): Product[] => {
  // Get a mix of products from different brands
  const featured: Product[] = [];
  const brandsUsed = new Set<string>();
  
  for (const product of allProducts) {
    if (featured.length >= count) break;
    if (!brandsUsed.has(product.brand) || product.isNew) {
      featured.push(product);
      brandsUsed.add(product.brand);
    }
  }
  
  return featured;
};

// Get all categories
export const categories = ["Rings", "Necklaces", "Bracelets", "Earrings", "Watches", "Bags", "Sunglasses", "Brooches"];

// Get products by category
export const getProductsByCategory = (category: string): Product[] => {
  return allProducts.filter(product => product.category === category);
};
