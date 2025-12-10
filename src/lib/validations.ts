import { z } from "zod";

// Contact form validation
export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  phone: z
    .string()
    .trim()
    .max(20, { message: "Phone must be less than 20 characters" })
    .optional(),
  message: z
    .string()
    .trim()
    .min(1, { message: "Message is required" })
    .max(2000, { message: "Message must be less than 2000 characters" }),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// Newsletter subscription validation
export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
});

export type NewsletterData = z.infer<typeof newsletterSchema>;

// Product inquiry validation (for WhatsApp pre-fill)
export const productInquirySchema = z.object({
  productId: z.number().positive(),
  productName: z.string().max(500),
  brandName: z.string().max(200),
  customerMessage: z
    .string()
    .trim()
    .max(1000, { message: "Message must be less than 1000 characters" })
    .optional(),
});

export type ProductInquiryData = z.infer<typeof productInquirySchema>;

// Search validation
export const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .max(200, { message: "Search query must be less than 200 characters" }),
});

export type SearchData = z.infer<typeof searchSchema>;

// Price filter validation
export const priceFilterSchema = z.object({
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
}).refine(
  (data) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined) {
      return data.minPrice <= data.maxPrice;
    }
    return true;
  },
  { message: "Min price must be less than or equal to max price" }
);

export type PriceFilterData = z.infer<typeof priceFilterSchema>;

// General text sanitization helper
export const sanitizeText = (text: string): string => {
  return text
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .trim();
};

// URL validation for external links
export const urlSchema = z
  .string()
  .url({ message: "Invalid URL" })
  .refine(
    (url) => url.startsWith("https://") || url.startsWith("http://"),
    { message: "URL must start with http:// or https://" }
  );
