// JWleria Native Product Database
// All products are sourced on demand - standard delivery 5-7 days worldwide

export interface ProductTranslations {
  name: string;
  description: string;
  material?: string;
}

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
  // All products sourced on demand - 5-7 days delivery
  isPreOrder: boolean;
  leadTime: string;
  isNew?: boolean;
  isLimitedEdition?: boolean;
  tags?: string[];
  // Localized content
  translations?: {
    en?: ProductTranslations;
    es?: ProductTranslations;
    ar?: ProductTranslations;
    fr?: ProductTranslations;
  };
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

// Standard lead time for all products
export const STANDARD_LEAD_TIME = "5-7";

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

// Get localized product data
export const getLocalizedProduct = (product: Product, locale: 'en' | 'es' | 'ar' | 'fr'): Product => {
  const translations = product.translations?.[locale];
  if (!translations) return product;
  
  return {
    ...product,
    name: translations.name || product.name,
    description: translations.description || product.description,
    material: translations.material || product.material,
  };
};

// Comprehensive product catalog - ALL PRODUCTS SOURCED ON DEMAND (5-7 days)
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["iconic", "gold", "love"],
    translations: {
      en: { name: "Love Bracelet", description: "The iconic Love bracelet, designed as a symbol of everlasting love. Crafted in 18K gold with the signature screw motifs.", material: "18K Rose Gold" },
      es: { name: "Pulsera Love", description: "La icónica pulsera Love, diseñada como símbolo de amor eterno. Elaborada en oro de 18K con los motivos de tornillo característicos.", material: "Oro Rosa de 18K" },
      ar: { name: "سوار لوف", description: "سوار لوف الأيقوني، مصمم كرمز للحب الأبدي. مصنوع من الذهب عيار 18 مع زخارف البراغي المميزة.", material: "ذهب وردي عيار 18" },
      fr: { name: "Bracelet Love", description: "L'iconique bracelet Love, conçu comme un symbole d'amour éternel. Fabriqué en or 18K avec les motifs de vis emblématiques.", material: "Or Rose 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["bold", "modern", "gold"],
    translations: {
      en: { name: "Juste un Clou Ring", description: "A bold statement ring in the shape of a nail, reimagining everyday objects with high jewelry craftsmanship.", material: "18K Yellow Gold" },
      es: { name: "Anillo Juste un Clou", description: "Un anillo audaz en forma de clavo, reimaginando objetos cotidianos con artesanía de alta joyería.", material: "Oro Amarillo de 18K" },
      ar: { name: "خاتم جست آن كلو", description: "خاتم جريء على شكل مسمار، يعيد تخيل الأشياء اليومية بحرفية المجوهرات الراقية.", material: "ذهب أصفر عيار 18" },
      fr: { name: "Bague Juste un Clou", description: "Une bague audacieuse en forme de clou, réinventant les objets du quotidien avec un savoir-faire joaillier d'exception.", material: "Or Jaune 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["classic", "trinity", "gold"],
    translations: {
      en: { name: "Trinity Ring", description: "Three intertwined bands in pink, yellow, and white gold, symbolizing love, fidelity, and friendship.", material: "18K Tri-Color Gold" },
      es: { name: "Anillo Trinity", description: "Tres bandas entrelazadas en oro rosa, amarillo y blanco, simbolizando amor, fidelidad y amistad.", material: "Oro Tricolor de 18K" },
      ar: { name: "خاتم ترينيتي", description: "ثلاث حلقات متشابكة من الذهب الوردي والأصفر والأبيض، ترمز إلى الحب والإخلاص والصداقة.", material: "ذهب ثلاثي الألوان عيار 18" },
      fr: { name: "Bague Trinity", description: "Trois anneaux entrelacés en or rose, jaune et blanc, symbolisant l'amour, la fidélité et l'amitié.", material: "Or Trois Couleurs 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    isLimitedEdition: true,
    tags: ["panthère", "statement", "diamonds"],
    translations: {
      en: { name: "Panthère Ring", description: "The legendary Panthère motif brought to life with exceptional craftsmanship and precious gemstones.", material: "18K White Gold, Onyx, Emeralds, Diamonds" },
      es: { name: "Anillo Panthère", description: "El legendario motivo Panthère cobra vida con una artesanía excepcional y piedras preciosas.", material: "Oro Blanco 18K, Ónix, Esmeraldas, Diamantes" },
      ar: { name: "خاتم بانتير", description: "زخرفة النمر الأسطورية تنبض بالحياة مع حرفية استثنائية وأحجار كريمة.", material: "ذهب أبيض 18 قيراط، عقيق، زمرد، ألماس" },
      fr: { name: "Bague Panthère", description: "Le légendaire motif Panthère prend vie avec un savoir-faire exceptionnel et des pierres précieuses.", material: "Or Blanc 18K, Onyx, Émeraudes, Diamants" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["love", "classic", "gold"],
    translations: {
      en: { name: "Love Ring", description: "The Love ring features the iconic screw motifs of the Love collection in a timeless band design.", material: "18K Rose Gold" },
      es: { name: "Anillo Love", description: "El anillo Love presenta los icónicos motivos de tornillo de la colección Love en un diseño de banda atemporal.", material: "Oro Rosa de 18K" },
      ar: { name: "خاتم لوف", description: "يتميز خاتم لوف بزخارف البراغي الأيقونية من مجموعة لوف في تصميم حلقة خالد.", material: "ذهب وردي عيار 18" },
      fr: { name: "Bague Love", description: "La bague Love présente les motifs de vis iconiques de la collection Love dans un design de bande intemporel.", material: "Or Rose 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["panthère", "statement", "diamonds"],
    translations: {
      en: { name: "Panthère Necklace", description: "An exquisite necklace featuring the majestic Panthère, crafted with meticulous attention to detail.", material: "18K White Gold, Onyx, Diamonds" },
      es: { name: "Collar Panthère", description: "Un collar exquisito con el majestuoso Panthère, elaborado con meticulosa atención al detalle.", material: "Oro Blanco 18K, Ónix, Diamantes" },
      ar: { name: "قلادة بانتير", description: "قلادة رائعة تتميز بنمر بانتير المهيب، مصنوعة باهتمام دقيق بالتفاصيل.", material: "ذهب أبيض 18 قيراط، عقيق، ألماس" },
      fr: { name: "Collier Panthère", description: "Un collier exquis mettant en vedette la majestueuse Panthère, fabriqué avec une attention méticuleuse aux détails.", material: "Or Blanc 18K, Onyx, Diamants" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["modern", "bold", "gold"],
    translations: {
      en: { name: "Clash de Cartier Ring", description: "Bold studs and geometric beads create a striking ring that embodies duality and rebellion.", material: "18K Rose Gold" },
      es: { name: "Anillo Clash de Cartier", description: "Tachuelas audaces y cuentas geométricas crean un anillo impactante que encarna la dualidad y la rebeldía.", material: "Oro Rosa de 18K" },
      ar: { name: "خاتم كلاش دي كارتييه", description: "مسامير جريئة وخرز هندسي تخلق خاتمًا مذهلاً يجسد الازدواجية والتمرد.", material: "ذهب وردي عيار 18" },
      fr: { name: "Bague Clash de Cartier", description: "Des clous audacieux et des perles géométriques créent une bague frappante qui incarne la dualité et la rébellion.", material: "Or Rose 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["watch", "classic", "steel"],
    translations: {
      en: { name: "Ballon Bleu Watch", description: "The perfectly round Ballon Bleu with its distinctive blue cabochon crown, a modern icon of watchmaking.", material: "Stainless Steel" },
      es: { name: "Reloj Ballon Bleu", description: "El perfectamente redondo Ballon Bleu con su distintiva corona de cabujón azul, un ícono moderno de la relojería.", material: "Acero Inoxidable" },
      ar: { name: "ساعة بالون بلو", description: "بالون بلو المستديرة تمامًا مع تاجها الأزرق المميز، أيقونة حديثة في صناعة الساعات.", material: "ستيل" },
      fr: { name: "Montre Ballon Bleu", description: "Le Ballon Bleu parfaitement rond avec sa couronne cabochon bleue distinctive, une icône moderne de l'horlogerie.", material: "Acier Inoxydable" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["watch", "tank", "steel"],
    translations: {
      en: { name: "Tank Française Watch", description: "The Tank Française features the iconic rectangular case with a fluid bracelet design.", material: "Stainless Steel" },
      es: { name: "Reloj Tank Française", description: "El Tank Française presenta la icónica caja rectangular con un diseño de pulsera fluido.", material: "Acero Inoxidable" },
      ar: { name: "ساعة تانك فرانسيز", description: "تتميز تانك فرانسيز بالعلبة المستطيلة الأيقونية مع تصميم سوار انسيابي.", material: "ستيل" },
      fr: { name: "Montre Tank Française", description: "La Tank Française présente le boîtier rectangulaire emblématique avec un bracelet au design fluide.", material: "Acier Inoxydable" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["watch", "santos", "iconic"],
    translations: {
      en: { name: "Santos Watch", description: "The legendary Santos, created for aviation pioneer Alberto Santos-Dumont, the first modern wristwatch.", material: "Stainless Steel & 18K Yellow Gold" },
      es: { name: "Reloj Santos", description: "El legendario Santos, creado para el pionero de la aviación Alberto Santos-Dumont, el primer reloj de pulsera moderno.", material: "Acero Inoxidable y Oro Amarillo 18K" },
      ar: { name: "ساعة سانتوس", description: "سانتوس الأسطورية، صُنعت لرائد الطيران ألبرتو سانتوس دومون، أول ساعة يد حديثة.", material: "ستيل وذهب أصفر 18 قيراط" },
      fr: { name: "Montre Santos", description: "La légendaire Santos, créée pour le pionnier de l'aviation Alberto Santos-Dumont, la première montre-bracelet moderne.", material: "Acier Inoxydable et Or Jaune 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["bold", "modern", "gold"],
    translations: {
      en: { name: "Juste un Clou Bracelet", description: "The nail bracelet, a bold and contemporary piece that transforms the ordinary into the extraordinary.", material: "18K Yellow Gold" },
      es: { name: "Pulsera Juste un Clou", description: "La pulsera de clavo, una pieza audaz y contemporánea que transforma lo ordinario en extraordinario.", material: "Oro Amarillo de 18K" },
      ar: { name: "سوار جست آن كلو", description: "سوار المسمار، قطعة جريئة ومعاصرة تحول العادي إلى استثنائي.", material: "ذهب أصفر عيار 18" },
      fr: { name: "Bracelet Juste un Clou", description: "Le bracelet clou, une pièce audacieuse et contemporaine qui transforme l'ordinaire en extraordinaire.", material: "Or Jaune 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["love", "hoops", "gold"],
    translations: {
      en: { name: "Love Earrings", description: "Elegant hoop earrings featuring the iconic Love screw motifs.", material: "18K Rose Gold" },
      es: { name: "Pendientes Love", description: "Elegantes pendientes de aro con los icónicos motivos de tornillo Love.", material: "Oro Rosa de 18K" },
      ar: { name: "أقراط لوف", description: "أقراط حلقية أنيقة تتميز بزخارف براغي لوف الأيقونية.", material: "ذهب وردي عيار 18" },
      fr: { name: "Boucles d'Oreilles Love", description: "Élégantes créoles arborant les motifs de vis iconiques de la collection Love.", material: "Or Rose 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["serpenti", "iconic", "diamonds"],
    translations: {
      en: { name: "Serpenti Viper Ring", description: "The serpent's seductive coils wrap around the finger in this contemporary interpretation of the iconic motif.", material: "18K Rose Gold, Diamonds" },
      es: { name: "Anillo Serpenti Viper", description: "Las seductoras espirales de la serpiente envuelven el dedo en esta interpretación contemporánea del motivo icónico.", material: "Oro Rosa 18K, Diamantes" },
      ar: { name: "خاتم سربنتي فايبر", description: "لفائف الأفعى المغرية تلتف حول الإصبع في هذا التفسير المعاصر للزخرفة الأيقونية.", material: "ذهب وردي 18 قيراط، ألماس" },
      fr: { name: "Bague Serpenti Viper", description: "Les enroulements séduisants du serpent s'enroulent autour du doigt dans cette interprétation contemporaine du motif iconique.", material: "Or Rose 18K, Diamants" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["bzero1", "ceramic", "iconic"],
    translations: {
      en: { name: "B.zero1 Bracelet", description: "The spiral design inspired by Rome's iconic Colosseum, a symbol of Bulgari's heritage.", material: "18K Rose Gold & Ceramic" },
      es: { name: "Pulsera B.zero1", description: "El diseño en espiral inspirado en el icónico Coliseo de Roma, un símbolo de la herencia de Bulgari.", material: "Oro Rosa 18K y Cerámica" },
      ar: { name: "سوار بي زيرو 1", description: "التصميم الحلزوني المستوحى من كولوسيوم روما الأيقوني، رمز تراث بولغاري.", material: "ذهب وردي 18 قيراط وسيراميك" },
      fr: { name: "Bracelet B.zero1", description: "Le design en spirale inspiré du Colisée iconique de Rome, un symbole de l'héritage de Bulgari.", material: "Or Rose 18K et Céramique" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["divas", "mother of pearl", "diamonds"],
    translations: {
      en: { name: "Divas' Dream Necklace", description: "Fan-shaped motifs inspired by the mosaics of ancient Rome's thermal baths.", material: "18K Rose Gold, Mother of Pearl, Diamonds" },
      es: { name: "Collar Divas' Dream", description: "Motivos en forma de abanico inspirados en los mosaicos de las termas de la antigua Roma.", material: "Oro Rosa 18K, Nácar, Diamantes" },
      ar: { name: "قلادة ديفاز دريم", description: "زخارف على شكل مروحة مستوحاة من فسيفساء الحمامات الحرارية في روما القديمة.", material: "ذهب وردي 18 قيراط، عرق اللؤلؤ، ألماس" },
      fr: { name: "Collier Divas' Dream", description: "Motifs en éventail inspirés des mosaïques des thermes de la Rome antique.", material: "Or Rose 18K, Nacre, Diamants" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["serpenti", "statement", "gold"],
    translations: {
      en: { name: "Serpenti Bracelet", description: "The serpent wraps sensually around the wrist, its scales crafted with extraordinary precision.", material: "18K Rose Gold" },
      es: { name: "Pulsera Serpenti", description: "La serpiente se envuelve sensualmente alrededor de la muñeca, sus escamas elaboradas con extraordinaria precisión.", material: "Oro Rosa de 18K" },
      ar: { name: "سوار سربنتي", description: "الأفعى تلتف بشكل حسي حول المعصم، حراشفها مصنوعة بدقة استثنائية.", material: "ذهب وردي عيار 18" },
      fr: { name: "Bracelet Serpenti", description: "Le serpent s'enroule sensuellement autour du poignet, ses écailles façonnées avec une précision extraordinaire.", material: "Or Rose 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["bzero1", "iconic", "gold"],
    translations: {
      en: { name: "B.zero1 Ring", description: "The iconic spiral ring that celebrates Bulgari's audacious creativity and Roman heritage.", material: "18K White Gold" },
      es: { name: "Anillo B.zero1", description: "El icónico anillo en espiral que celebra la creatividad audaz de Bulgari y su herencia romana.", material: "Oro Blanco de 18K" },
      ar: { name: "خاتم بي زيرو 1", description: "الخاتم الحلزوني الأيقوني الذي يحتفي بإبداع بولغاري الجريء وتراثها الروماني.", material: "ذهب أبيض عيار 18" },
      fr: { name: "Bague B.zero1", description: "La bague spirale iconique qui célèbre la créativité audacieuse de Bulgari et son héritage romain.", material: "Or Blanc 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["serpenti", "watch", "tubogas"],
    translations: {
      en: { name: "Serpenti Tubogas Watch", description: "The serpent wraps around the wrist multiple times, with the watch face as its head.", material: "18K Rose Gold & Stainless Steel" },
      es: { name: "Reloj Serpenti Tubogas", description: "La serpiente se envuelve alrededor de la muñeca varias veces, con la esfera del reloj como su cabeza.", material: "Oro Rosa 18K y Acero Inoxidable" },
      ar: { name: "ساعة سربنتي توبوجاز", description: "الأفعى تلتف حول المعصم عدة مرات، مع وجه الساعة كرأسها.", material: "ذهب وردي 18 قيراط وستيل" },
      fr: { name: "Montre Serpenti Tubogas", description: "Le serpent s'enroule plusieurs fois autour du poignet, avec le cadran de la montre comme sa tête.", material: "Or Rose 18K et Acier Inoxydable" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["alhambra", "iconic", "mother of pearl"],
    translations: {
      en: { name: "Alhambra Necklace", description: "The iconic four-leaf clover motif, a symbol of luck crafted with exceptional attention to detail.", material: "18K Yellow Gold, Mother of Pearl" },
      es: { name: "Collar Alhambra", description: "El icónico motivo de trébol de cuatro hojas, un símbolo de suerte elaborado con excepcional atención al detalle.", material: "Oro Amarillo 18K, Nácar" },
      ar: { name: "قلادة الحمراء", description: "زخرفة البرسيم الأيقونية ذات الأربع أوراق، رمز الحظ المصنوع باهتمام استثنائي بالتفاصيل.", material: "ذهب أصفر 18 قيراط، عرق اللؤلؤ" },
      fr: { name: "Collier Alhambra", description: "L'iconique motif trèfle à quatre feuilles, un symbole de chance fabriqué avec une attention exceptionnelle aux détails.", material: "Or Jaune 18K, Nacre" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["frivole", "floral", "gold"],
    translations: {
      en: { name: "Frivole Earrings", description: "Delicate floral-inspired earrings with dancing mirror-polished petals that catch the light.", material: "18K Yellow Gold" },
      es: { name: "Pendientes Frivole", description: "Delicados pendientes de inspiración floral con pétalos pulidos como espejos que captan la luz.", material: "Oro Amarillo de 18K" },
      ar: { name: "أقراط فريفول", description: "أقراط رقيقة مستوحاة من الزهور مع بتلات مصقولة كالمرآة تلتقط الضوء.", material: "ذهب أصفر عيار 18" },
      fr: { name: "Boucles d'Oreilles Frivole", description: "Délicates boucles d'oreilles d'inspiration florale avec des pétales polis miroir qui captent la lumière.", material: "Or Jaune 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["perlée", "beads", "gold"],
    translations: {
      en: { name: "Perlée Bracelet", description: "Golden beads of varying sizes create a playful yet sophisticated bracelet design.", material: "18K Yellow Gold" },
      es: { name: "Pulsera Perlée", description: "Cuentas doradas de varios tamaños crean un diseño de pulsera lúdico pero sofisticado.", material: "Oro Amarillo de 18K" },
      ar: { name: "سوار بيرليه", description: "خرز ذهبي بأحجام متفاوتة يخلق تصميم سوار مرح لكنه راقٍ.", material: "ذهب أصفر عيار 18" },
      fr: { name: "Bracelet Perlée", description: "Des perles dorées de tailles variées créent un design de bracelet ludique mais sophistiqué.", material: "Or Jaune 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["t collection", "modern", "gold"],
    translations: {
      en: { name: "T Wire Bracelet", description: "The clean, modern wire bracelet featuring the iconic T motif at each end.", material: "18K Rose Gold" },
      es: { name: "Pulsera T Wire", description: "La pulsera de alambre limpia y moderna con el icónico motivo T en cada extremo.", material: "Oro Rosa de 18K" },
      ar: { name: "سوار تي واير", description: "سوار السلك العصري النظيف الذي يتميز بزخرفة T الأيقونية في كل طرف.", material: "ذهب وردي عيار 18" },
      fr: { name: "Bracelet T Wire", description: "Le bracelet fil épuré et moderne arborant l'iconique motif T à chaque extrémité.", material: "Or Rose 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["elsa peretti", "iconic", "gold"],
    translations: {
      en: { name: "Elsa Peretti Bean Necklace", description: "Elsa Peretti's organic bean design, a timeless symbol of beginnings and new life.", material: "18K Yellow Gold" },
      es: { name: "Collar Elsa Peretti Bean", description: "El diseño orgánico de frijol de Elsa Peretti, un símbolo atemporal de comienzos y nueva vida.", material: "Oro Amarillo de 18K" },
      ar: { name: "قلادة إلسا بيريتي بين", description: "تصميم الفاصولياء العضوي لإلسا بيريتي، رمز خالد للبدايات والحياة الجديدة.", material: "ذهب أصفر عيار 18" },
      fr: { name: "Collier Elsa Peretti Bean", description: "Le design organique de haricot d'Elsa Peretti, un symbole intemporel des débuts et de la nouvelle vie.", material: "Or Jaune 18K" }
    }
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
    leadTime: STANDARD_LEAD_TIME,
    tags: ["return to tiffany", "heart", "silver"],
    translations: {
      en: { name: "Return to Tiffany Pendant", description: "The heart tag pendant, inspired by Tiffany's key ring tradition since 1969.", material: "Sterling Silver" },
      es: { name: "Colgante Return to Tiffany", description: "El colgante de etiqueta de corazón, inspirado en la tradición de llaveros de Tiffany desde 1969.", material: "Plata de Ley" },
      ar: { name: "قلادة ريتيرن تو تيفاني", description: "قلادة بعلامة قلب، مستوحاة من تقليد حلقات المفاتيح في تيفاني منذ 1969.", material: "فضة استرلينية" },
      fr: { name: "Pendentif Return to Tiffany", description: "Le pendentif étiquette cœur, inspiré de la tradition des porte-clés Tiffany depuis 1969.", material: "Argent Sterling" }
    }
  },
  
  // CHOPARD
  { 
    id: 71, 
    name: "Happy Diamonds Ring", 
    brand: "Chopard", 
    brandSlug: "chopard",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 18750, 
    priceEUR: 4500, 
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
    description: "The signature moving diamonds dance freely between two sapphire crystals.",
    material: "18K White Gold, Diamonds",
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    tags: ["happy diamonds", "iconic", "diamonds"],
    translations: {
      en: { name: "Happy Diamonds Ring", description: "The signature moving diamonds dance freely between two sapphire crystals.", material: "18K White Gold, Diamonds" },
      es: { name: "Anillo Happy Diamonds", description: "Los diamantes móviles característicos bailan libremente entre dos cristales de zafiro.", material: "Oro Blanco 18K, Diamantes" },
      ar: { name: "خاتم هابي دايموندز", description: "الماسات المتحركة المميزة ترقص بحرية بين بلورتين من الياقوت.", material: "ذهب أبيض 18 قيراط، ألماس" },
      fr: { name: "Bague Happy Diamonds", description: "Les diamants mobiles signature dansent librement entre deux cristaux de saphir.", material: "Or Blanc 18K, Diamants" }
    }
  },
  { 
    id: 72, 
    name: "Ice Cube Bracelet", 
    brand: "Chopard", 
    brandSlug: "chopard",
    category: "Bracelets", 
    categoryKey: "bracelets", 
    priceSAR: 12900, 
    priceEUR: 3100, 
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80",
    description: "Geometric perfection in the form of golden cubes, a modern classic from Chopard.",
    material: "18K Rose Gold",
    isNew: true,
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    tags: ["ice cube", "geometric", "gold"],
    translations: {
      en: { name: "Ice Cube Bracelet", description: "Geometric perfection in the form of golden cubes, a modern classic from Chopard.", material: "18K Rose Gold" },
      es: { name: "Pulsera Ice Cube", description: "Perfección geométrica en forma de cubos dorados, un clásico moderno de Chopard.", material: "Oro Rosa de 18K" },
      ar: { name: "سوار آيس كيوب", description: "الكمال الهندسي على شكل مكعبات ذهبية، كلاسيكية حديثة من شوبارد.", material: "ذهب وردي عيار 18" },
      fr: { name: "Bracelet Ice Cube", description: "La perfection géométrique sous forme de cubes dorés, un classique moderne de Chopard.", material: "Or Rose 18K" }
    }
  },
  
  // ROLEX
  { 
    id: 81, 
    name: "Datejust 36", 
    brand: "Rolex", 
    brandSlug: "rolex",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 35000, 
    priceEUR: 8400, 
    image: "https://images.unsplash.com/photo-1587836374828-a05ac9c0b488?w=800&q=80",
    description: "The quintessential classic watch, featuring the iconic date display with Cyclops lens.",
    material: "Oystersteel & 18K Yellow Gold",
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    tags: ["datejust", "classic", "rolesor"],
    translations: {
      en: { name: "Datejust 36", description: "The quintessential classic watch, featuring the iconic date display with Cyclops lens.", material: "Oystersteel & 18K Yellow Gold" },
      es: { name: "Datejust 36", description: "El reloj clásico por excelencia, con la icónica pantalla de fecha con lente Cyclops.", material: "Oystersteel y Oro Amarillo 18K" },
      ar: { name: "ديت جست 36", description: "الساعة الكلاسيكية المثالية، تتميز بعرض التاريخ الأيقوني مع عدسة سايكلوبس.", material: "أويستر ستيل وذهب أصفر 18 قيراط" },
      fr: { name: "Datejust 36", description: "La montre classique par excellence, avec l'iconique affichage de la date et la loupe Cyclope.", material: "Oystersteel et Or Jaune 18K" }
    }
  },
  { 
    id: 82, 
    name: "Submariner Date", 
    brand: "Rolex", 
    brandSlug: "rolex",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 42000, 
    priceEUR: 10100, 
    image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80",
    description: "The legendary diving watch, waterproof to 300 metres with a unidirectional rotating bezel.",
    material: "Oystersteel",
    isNew: true,
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    tags: ["submariner", "diver", "iconic"],
    translations: {
      en: { name: "Submariner Date", description: "The legendary diving watch, waterproof to 300 metres with a unidirectional rotating bezel.", material: "Oystersteel" },
      es: { name: "Submariner Date", description: "El legendario reloj de buceo, resistente al agua hasta 300 metros con bisel giratorio unidireccional.", material: "Oystersteel" },
      ar: { name: "سابمارينر ديت", description: "ساعة الغوص الأسطورية، مقاومة للماء حتى 300 متر مع إطار دوار أحادي الاتجاه.", material: "أويستر ستيل" },
      fr: { name: "Submariner Date", description: "La légendaire montre de plongée, étanche à 300 mètres avec lunette tournante unidirectionnelle.", material: "Oystersteel" }
    }
  },
  { 
    id: 83, 
    name: "Day-Date 40", 
    brand: "Rolex", 
    brandSlug: "rolex",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 152000, 
    priceEUR: 36500, 
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
    description: "The watch of presidents and leaders, displaying the day of the week spelled out in full.",
    material: "18K Yellow Gold",
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    isLimitedEdition: true,
    tags: ["day-date", "president", "gold"],
    translations: {
      en: { name: "Day-Date 40", description: "The watch of presidents and leaders, displaying the day of the week spelled out in full.", material: "18K Yellow Gold" },
      es: { name: "Day-Date 40", description: "El reloj de presidentes y líderes, mostrando el día de la semana escrito completo.", material: "Oro Amarillo de 18K" },
      ar: { name: "داي-ديت 40", description: "ساعة الرؤساء والقادة، تعرض يوم الأسبوع مكتوبًا بالكامل.", material: "ذهب أصفر عيار 18" },
      fr: { name: "Day-Date 40", description: "La montre des présidents et des leaders, affichant le jour de la semaine écrit en toutes lettres.", material: "Or Jaune 18K" }
    }
  },
  
  // PATEK PHILIPPE
  { 
    id: 91, 
    name: "Nautilus 5711", 
    brand: "Patek Philippe", 
    brandSlug: "patek-philippe",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 195000, 
    priceEUR: 46850, 
    image: "https://images.unsplash.com/photo-1587836374828-a05ac9c0b488?w=800&q=80",
    description: "The ultimate sports-elegant timepiece with the iconic porthole-inspired case design.",
    material: "Stainless Steel",
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    isLimitedEdition: true,
    tags: ["nautilus", "iconic", "steel"],
    translations: {
      en: { name: "Nautilus 5711", description: "The ultimate sports-elegant timepiece with the iconic porthole-inspired case design.", material: "Stainless Steel" },
      es: { name: "Nautilus 5711", description: "El máximo reloj deportivo-elegante con el icónico diseño de caja inspirado en un ojo de buey.", material: "Acero Inoxidable" },
      ar: { name: "نوتيلوس 5711", description: "الساعة الرياضية الأنيقة المثالية مع تصميم العلبة الأيقوني المستوحى من نافذة السفينة.", material: "ستيل" },
      fr: { name: "Nautilus 5711", description: "La montre sport-élégante ultime avec le design de boîtier iconique inspiré d'un hublot.", material: "Acier Inoxydable" }
    }
  },
  { 
    id: 92, 
    name: "Calatrava 5227", 
    brand: "Patek Philippe", 
    brandSlug: "patek-philippe",
    category: "Watches", 
    categoryKey: "watches", 
    priceSAR: 125000, 
    priceEUR: 30000, 
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
    description: "Pure elegance embodied in the quintessential round dress watch.",
    material: "18K White Gold",
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    tags: ["calatrava", "dress", "gold"],
    translations: {
      en: { name: "Calatrava 5227", description: "Pure elegance embodied in the quintessential round dress watch.", material: "18K White Gold" },
      es: { name: "Calatrava 5227", description: "Pura elegancia encarnada en el reloj de vestir redondo por excelencia.", material: "Oro Blanco de 18K" },
      ar: { name: "كالاترافا 5227", description: "الأناقة الخالصة مجسدة في ساعة الملابس الرسمية المستديرة المثالية.", material: "ذهب أبيض عيار 18" },
      fr: { name: "Calatrava 5227", description: "L'élégance pure incarnée dans la montre habillée ronde par excellence.", material: "Or Blanc 18K" }
    }
  },
  
  // DIOR
  { 
    id: 101, 
    name: "Rose des Vents Ring", 
    brand: "Dior", 
    brandSlug: "dior",
    category: "Rings", 
    categoryKey: "rings", 
    priceSAR: 9200, 
    priceEUR: 2210, 
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
    description: "A precious medallion bearing the lucky star, a symbol close to Monsieur Dior's heart.",
    material: "18K Yellow Gold, Mother of Pearl, Diamond",
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    tags: ["rose des vents", "star", "medallion"],
    translations: {
      en: { name: "Rose des Vents Ring", description: "A precious medallion bearing the lucky star, a symbol close to Monsieur Dior's heart.", material: "18K Yellow Gold, Mother of Pearl, Diamond" },
      es: { name: "Anillo Rose des Vents", description: "Un medallón precioso con la estrella de la suerte, un símbolo cercano al corazón de Monsieur Dior.", material: "Oro Amarillo 18K, Nácar, Diamante" },
      ar: { name: "خاتم روز دي فون", description: "ميدالية ثمينة تحمل نجمة الحظ، رمز قريب من قلب مسيو ديور.", material: "ذهب أصفر 18 قيراط، عرق اللؤلؤ، ألماس" },
      fr: { name: "Bague Rose des Vents", description: "Un précieux médaillon portant l'étoile porte-bonheur, un symbole cher au cœur de Monsieur Dior.", material: "Or Jaune 18K, Nacre, Diamant" }
    }
  },
  { 
    id: 102, 
    name: "Lady Dior Bag Small", 
    brand: "Dior", 
    brandSlug: "dior",
    category: "Bags", 
    categoryKey: "bags", 
    priceSAR: 21000, 
    priceEUR: 5050, 
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
    description: "The iconic Lady Dior bag in supple lambskin with the signature Cannage stitching.",
    material: "Lambskin Leather",
    isNew: true,
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    tags: ["lady dior", "iconic", "leather"],
    translations: {
      en: { name: "Lady Dior Bag Small", description: "The iconic Lady Dior bag in supple lambskin with the signature Cannage stitching.", material: "Lambskin Leather" },
      es: { name: "Bolso Lady Dior Pequeño", description: "El icónico bolso Lady Dior en suave piel de cordero con el distintivo acolchado Cannage.", material: "Piel de Cordero" },
      ar: { name: "حقيبة ليدي ديور صغيرة", description: "حقيبة ليدي ديور الأيقونية من جلد الحمل الناعم مع خياطة كاناج المميزة.", material: "جلد حمل" },
      fr: { name: "Sac Lady Dior Petit", description: "L'iconique sac Lady Dior en agneau souple avec le matelassage Cannage signature.", material: "Cuir d'Agneau" }
    }
  },
  
  // GIVENCHY
  { 
    id: 111, 
    name: "Antigona Bag Medium", 
    brand: "Givenchy", 
    brandSlug: "givenchy",
    category: "Bags", 
    categoryKey: "bags", 
    priceSAR: 11200, 
    priceEUR: 2690, 
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
    description: "The structured Antigona with its distinctive geometric shape, a modern icon.",
    material: "Calfskin Leather",
    isPreOrder: true,
    leadTime: STANDARD_LEAD_TIME,
    tags: ["antigona", "structured", "leather"],
    translations: {
      en: { name: "Antigona Bag Medium", description: "The structured Antigona with its distinctive geometric shape, a modern icon.", material: "Calfskin Leather" },
      es: { name: "Bolso Antigona Mediano", description: "La estructurada Antigona con su distintiva forma geométrica, un ícono moderno.", material: "Cuero de Becerro" },
      ar: { name: "حقيبة أنتيغونا متوسطة", description: "حقيبة أنتيغونا المهيكلة بشكلها الهندسي المميز، أيقونة حديثة.", material: "جلد العجل" },
      fr: { name: "Sac Antigona Moyen", description: "L'Antigona structuré avec sa forme géométrique distinctive, une icône moderne.", material: "Cuir de Veau" }
    }
  },
];

// Merge function for combining hardcoded + Supabase products
export const mergeProducts = (supabaseProducts: Product[]): Product[] => {
  const merged = [...allProducts];
  for (const sp of supabaseProducts) {
    const exists = merged.some(
      (p) => p.name.toLowerCase() === sp.name.toLowerCase() && p.brand.toLowerCase() === sp.brand.toLowerCase()
    );
    if (!exists) {
      merged.push(sp);
    }
  }
  return merged;
};
