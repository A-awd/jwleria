import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGES = ['en', 'es', 'ar', 'fr'] as const;
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  ar: 'Arabic',
  fr: 'French'
};

interface ProductToTranslate {
  productId: string;
  title: string;
  description: string;
  variantTitles?: string[];
}

interface TranslationResult {
  title: string;
  description: string;
  variantTitles?: string[];
}

async function translateContent(
  content: ProductToTranslate,
  targetLang: string,
  apiKey: string
): Promise<TranslationResult> {
  const prompt = `You are a professional luxury jewelry translator. Translate the following product information to ${LANGUAGE_NAMES[targetLang]}.

IMPORTANT RULES:
- Maintain the luxury, elegant tone appropriate for high-end jewelry
- Keep brand names unchanged (Cartier, Bulgari, Rolex, etc.)
- Keep technical terms like "18K gold", "diamonds", "carats" appropriately translated
- For Arabic, use formal Modern Standard Arabic
- Do NOT add any extra text or explanations

Product Title: ${content.title}

Product Description: ${content.description}

${content.variantTitles?.length ? `Variant Names: ${content.variantTitles.join(', ')}` : ''}

Respond ONLY with a JSON object in this exact format:
{
  "title": "translated title",
  "description": "translated description"${content.variantTitles?.length ? `,
  "variantTitles": ["translated variant 1", "translated variant 2"]` : ''}
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI API error: ${response.status}`, errorText);
    throw new Error(`Translation API error: ${response.status}`);
  }

  const data = await response.json();
  const content_response = data.choices?.[0]?.message?.content;
  
  if (!content_response) {
    throw new Error('No translation received from AI');
  }

  // Parse the JSON response
  const jsonMatch = content_response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse translation response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function saveTranslationsToShopify(
  productId: string,
  translations: Record<string, TranslationResult>,
  shopifyDomain: string,
  adminToken: string
): Promise<void> {
  // Save translations as metafields
  const metafields = [];
  
  for (const [lang, translation] of Object.entries(translations)) {
    metafields.push({
      namespace: 'jwleria_translations',
      key: `title_${lang}`,
      value: translation.title,
      type: 'single_line_text_field'
    });
    metafields.push({
      namespace: 'jwleria_translations',
      key: `description_${lang}`,
      value: translation.description,
      type: 'multi_line_text_field'
    });
    if (translation.variantTitles?.length) {
      metafields.push({
        namespace: 'jwleria_translations',
        key: `variants_${lang}`,
        value: JSON.stringify(translation.variantTitles),
        type: 'json'
      });
    }
  }

  // Update product metafields via REST API
  const numericId = productId.replace('gid://shopify/Product/', '');
  
  for (const metafield of metafields) {
    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/products/${numericId}/metafields.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metafield }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to save metafield ${metafield.key}:`, errorText);
    }
  }
}

async function fetchProductFromShopify(
  productId: string,
  shopifyDomain: string,
  adminToken: string
): Promise<ProductToTranslate | null> {
  const numericId = productId.replace('gid://shopify/Product/', '');
  
  const response = await fetch(
    `https://${shopifyDomain}/admin/api/2024-01/products/${numericId}.json`,
    {
      headers: {
        'X-Shopify-Access-Token': adminToken,
      },
    }
  );

  if (!response.ok) {
    console.error('Failed to fetch product:', await response.text());
    return null;
  }

  const data = await response.json();
  const product = data.product;

  return {
    productId: productId,
    title: product.title,
    description: product.body_html || '',
    variantTitles: product.variants?.map((v: any) => v.title).filter((t: string) => t !== 'Default Title'),
  };
}

async function fetchAllProducts(
  shopifyDomain: string,
  adminToken: string
): Promise<ProductToTranslate[]> {
  const products: ProductToTranslate[] = [];
  let nextPageInfo: string | null = null;
  let hasMore = true;
  
  while (hasMore) {
    const fetchUrl: string = nextPageInfo 
      ? `https://${shopifyDomain}/admin/api/2024-01/products.json?limit=50&page_info=${nextPageInfo}`
      : `https://${shopifyDomain}/admin/api/2024-01/products.json?limit=50`;
    
    const fetchResponse: Response = await fetch(fetchUrl, {
      headers: {
        'X-Shopify-Access-Token': adminToken,
      },
    });

    if (!fetchResponse.ok) {
      console.error('Failed to fetch products:', await fetchResponse.text());
      break;
    }

    const data = await fetchResponse.json();
    
    for (const product of data.products) {
      products.push({
        productId: `gid://shopify/Product/${product.id}`,
        title: product.title,
        description: product.body_html || '',
        variantTitles: product.variants?.map((v: any) => v.title).filter((t: string) => t !== 'Default Title'),
      });
    }

    // Check for pagination
    const linkHeaderValue: string | null = fetchResponse.headers.get('Link');
    if (linkHeaderValue && linkHeaderValue.includes('rel="next"')) {
      const pageMatch: RegExpMatchArray | null = linkHeaderValue.match(/page_info=([^>&]*)/);
      nextPageInfo = pageMatch ? pageMatch[1] : null;
      hasMore = nextPageInfo !== null;
    } else {
      hasMore = false;
    }
  }

  return products;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SHOPIFY_ADMIN_TOKEN = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN');
    const SHOPIFY_DOMAIN = Deno.env.get('VITE_SHOPIFY_STORE_DOMAIN');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    if (!SHOPIFY_ADMIN_TOKEN || !SHOPIFY_DOMAIN) {
      throw new Error('Shopify credentials not configured');
    }

    const { action, productId } = await req.json();

    const results: any[] = [];
    let productsToTranslate: ProductToTranslate[] = [];

    if (action === 'translate_single' && productId) {
      const product = await fetchProductFromShopify(productId, SHOPIFY_DOMAIN, SHOPIFY_ADMIN_TOKEN);
      if (product) {
        productsToTranslate = [product];
      }
    } else if (action === 'translate_all') {
      productsToTranslate = await fetchAllProducts(SHOPIFY_DOMAIN, SHOPIFY_ADMIN_TOKEN);
    } else {
      throw new Error('Invalid action. Use "translate_single" with productId or "translate_all"');
    }

    console.log(`Translating ${productsToTranslate.length} products...`);

    for (const product of productsToTranslate) {
      try {
        console.log(`Translating product: ${product.title}`);
        const translations: Record<string, TranslationResult> = {};

        // English is kept as-is (source language)
        translations['en'] = {
          title: product.title,
          description: product.description,
          variantTitles: product.variantTitles,
        };

        // Translate to other languages
        for (const lang of ['es', 'ar', 'fr']) {
          console.log(`  - Translating to ${LANGUAGE_NAMES[lang]}...`);
          translations[lang] = await translateContent(product, lang, LOVABLE_API_KEY);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Save to Shopify
        await saveTranslationsToShopify(product.productId, translations, SHOPIFY_DOMAIN, SHOPIFY_ADMIN_TOKEN);

        results.push({
          productId: product.productId,
          title: product.title,
          status: 'success',
          translations: Object.keys(translations),
        });
      } catch (error) {
        console.error(`Error translating product ${product.title}:`, error);
        results.push({
          productId: product.productId,
          title: product.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        translated: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in translate-product function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
