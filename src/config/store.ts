// JWleria Store Configuration
// All store settings in one place for easy management

export const STORE_CONFIG = {
  // Store Identity
  name: "jWleria",
  tagline: "Luxury Personal Shopping",
  email: "hello@jwleria.com",
  phone: "+966 50 123 4567",
  
  // WhatsApp Configuration
  whatsapp: {
    // Phone number in international format without + or spaces
    number: "966501234567",
    // Default message template - {brand}, {product}, {id} will be replaced
    messageTemplate: "Hi jWleria, I am interested in this item: {brand} {product} (ID: {id})",
  },
  
  // Currency Configuration
  defaultCurrency: "SAR",
  baseCurrency: "EUR", // Prices stored in EUR, converted to display currency
  
  // Fulfillment Settings
  defaultLeadTime: "2 to 4 weeks",
  fulfillmentType: "preorder" as const,
  
  // Social Media
  social: {
    instagram: "https://instagram.com/jwleria",
    tiktok: "https://tiktok.com/@jwleria",
  },
  
  // Analytics IDs (empty by default - fill in your actual IDs)
  analytics: {
    googleAnalyticsId: "", // e.g., "G-XXXXXXXXXX"
    metaPixelId: "",       // e.g., "1234567890123456"
    tiktokPixelId: "",     // e.g., "XXXXXXXXXX"
    snapchatPixelId: "",   // e.g., "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  },
};

// Helper to generate WhatsApp link
export const getWhatsAppLink = (brand: string, productName: string, productId: string | number): string => {
  const message = STORE_CONFIG.whatsapp.messageTemplate
    .replace("{brand}", brand)
    .replace("{product}", productName)
    .replace("{id}", String(productId));
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${STORE_CONFIG.whatsapp.number}?text=${encodedMessage}`;
};

// Helper to generate general WhatsApp link
export const getGeneralWhatsAppLink = (): string => {
  const message = encodeURIComponent("Hi jWleria, I have a question about your luxury products.");
  return `https://wa.me/${STORE_CONFIG.whatsapp.number}?text=${message}`;
};
