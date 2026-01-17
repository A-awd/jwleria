import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SzwegoProduct {
  id: string;
  name: string;
  description: string;
  images: string[];
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  sku: string;
  category: string;
  brand: string;
  variants: any[];
  attributes: Record<string, string>;
  tags: string[];
}

interface ImportResult {
  success: boolean;
  productsImported: number;
  categoriesImported: number;
  failedProducts: { name: string; reason: string }[];
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeUrl, action } = await req.json();
    
    if (!storeUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Store URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting Szwego import from:', storeUrl);

    // Step 1: Map the website to discover all URLs
    console.log('Step 1: Mapping website structure...');
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: storeUrl,
        limit: 5000,
        includeSubdomains: false,
      }),
    });

    const mapData = await mapResponse.json();
    console.log('Map response:', JSON.stringify(mapData).substring(0, 500));

    if (!mapResponse.ok) {
      console.error('Map failed:', mapData);
      
      // Try scraping the main page directly
      console.log('Attempting direct scrape of main page...');
      return await scrapeMainPage(storeUrl, firecrawlApiKey, supabase);
    }

    const urls = mapData.links || [];
    console.log(`Found ${urls.length} URLs`);

    // Step 2: Scrape the main store page for products
    console.log('Step 2: Scraping main store page...');
    const scrapeResult = await scrapeMainPage(storeUrl, firecrawlApiKey, supabase);
    
    return scrapeResult;

  } catch (error) {
    console.error('Error in szwego-import:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function scrapeMainPage(storeUrl: string, apiKey: string, supabase: any) {
  try {
    // Scrape with multiple formats to get as much data as possible
    console.log('Scraping store page with multiple formats...');
    
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: storeUrl,
        formats: ['markdown', 'html', 'links'],
        onlyMainContent: false,
        waitFor: 5000, // Wait 5 seconds for dynamic content
      }),
    });

    const scrapeData = await scrapeResponse.json();
    console.log('Scrape response status:', scrapeResponse.status);
    console.log('Scrape data keys:', Object.keys(scrapeData));

    if (!scrapeResponse.ok) {
      console.error('Scrape failed:', scrapeData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: scrapeData.error || 'Failed to scrape store',
          details: 'Szwego websites use advanced anti-bot protection. The scrape was blocked.',
          suggestion: 'Try using CSV import or manual product entry instead.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the scraped content
    const content = scrapeData.data || scrapeData;
    const markdown = content.markdown || '';
    const html = content.html || '';
    const links = content.links || [];
    const metadata = content.metadata || {};

    console.log('Content length - Markdown:', markdown.length, 'HTML:', html.length, 'Links:', links.length);

    // Try to extract product information from the content
    const extractedProducts = extractProductsFromContent(markdown, html, links);
    
    // Try to extract categories
    const extractedCategories = extractCategoriesFromContent(markdown, html, links);

    const result: ImportResult = {
      success: true,
      productsImported: 0,
      categoriesImported: 0,
      failedProducts: [],
      errors: [],
    };

    // Import categories first
    if (extractedCategories.length > 0) {
      console.log(`Found ${extractedCategories.length} potential categories`);
      for (const category of extractedCategories) {
        try {
          const { error } = await supabase
            .from('categories')
            .upsert({
              name_en: category.name,
              name_ar: category.name,
              slug: generateSlug(category.name),
              is_active: true,
            }, { onConflict: 'slug' });
          
          if (!error) {
            result.categoriesImported++;
          }
        } catch (err) {
          console.error('Error importing category:', err);
        }
      }
    }

    // Import products
    if (extractedProducts.length > 0) {
      console.log(`Found ${extractedProducts.length} potential products`);
      for (const product of extractedProducts) {
        try {
          const { error } = await supabase
            .from('products')
            .insert({
              name_en: product.name,
              name_ar: product.name,
              slug: generateSlug(product.name),
              description_en: product.description,
              description_ar: product.description,
              price: product.price || 0,
              compare_at_price: product.compareAtPrice,
              sku: product.sku || generateSku(),
              images: product.images,
              is_active: true,
              is_featured: false,
              is_new_arrival: true,
            });
          
          if (!error) {
            result.productsImported++;
          } else {
            result.failedProducts.push({ name: product.name, reason: error.message });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          result.failedProducts.push({ name: product.name, reason: errorMessage });
        }
      }
    }

    // Create import report
    await createImportReport(supabase, result, storeUrl, {
      markdown: markdown.substring(0, 5000),
      linksFound: links.length,
      metadata,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Import completed',
        result,
        rawData: {
          markdownLength: markdown.length,
          htmlLength: html.length,
          linksCount: links.length,
          sampleLinks: links.slice(0, 20),
          metadata,
          markdownPreview: markdown.substring(0, 2000),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrapeMainPage:', error);
    throw error;
  }
}

function extractProductsFromContent(markdown: string, html: string, links: string[]): SzwegoProduct[] {
  const products: SzwegoProduct[] = [];
  
  // Try to find product patterns in the content
  // Szwego typically has product listings with images and prices
  
  // Extract image URLs that look like product images
  const imageRegex = /https?:\/\/[^\s<>"]+\.(jpg|jpeg|png|webp|gif)/gi;
  const images = [...new Set([...markdown.matchAll(imageRegex), ...html.matchAll(imageRegex)].map(m => m[0]))];
  
  // Try to find price patterns (Chinese Yuan, USD, etc.)
  const priceRegex = /(?:¥|￥|\$|USD|CNY)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi;
  const prices = [...markdown.matchAll(priceRegex), ...html.matchAll(priceRegex)].map(m => parseFloat(m[1].replace(',', '')));
  
  // Try to find product titles (usually in headers or strong text)
  const titleRegex = /(?:#+\s*|<h[1-6][^>]*>|<strong>)([^<\n]+)/gi;
  const titles = [...markdown.matchAll(titleRegex), ...html.matchAll(titleRegex)].map(m => m[1].trim()).filter(t => t.length > 3 && t.length < 200);
  
  console.log(`Extracted: ${images.length} images, ${prices.length} prices, ${titles.length} titles`);
  
  // Create products from extracted data
  // Group images and try to match with titles/prices
  const productImages = images.filter(img => 
    img.includes('product') || 
    img.includes('item') || 
    img.includes('goods') ||
    img.includes('szwego') ||
    img.includes('weshop')
  );
  
  if (productImages.length > 0) {
    // Create placeholder products from images
    for (let i = 0; i < Math.min(productImages.length, 50); i++) {
      products.push({
        id: `szwego-${i + 1}`,
        name: titles[i] || `Imported Product ${i + 1}`,
        description: '',
        images: [productImages[i]],
        price: prices[i] || null,
        compareAtPrice: null,
        currency: 'CNY',
        sku: generateSku(),
        category: 'Imported',
        brand: 'Imported',
        variants: [],
        attributes: {},
        tags: ['imported', 'szwego'],
      });
    }
  }
  
  return products;
}

function extractCategoriesFromContent(markdown: string, html: string, links: string[]): { name: string; slug: string }[] {
  const categories: { name: string; slug: string }[] = [];
  
  // Look for category patterns in links
  const categoryLinks = links.filter(link => 
    link.includes('category') || 
    link.includes('collection') || 
    link.includes('catalog')
  );
  
  for (const link of categoryLinks) {
    const match = link.match(/\/([^\/]+)\/?$/);
    if (match) {
      const name = match[1].replace(/-/g, ' ').replace(/_/g, ' ');
      categories.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        slug: generateSlug(name),
      });
    }
  }
  
  return categories;
}

async function createImportReport(supabase: any, result: ImportResult, sourceUrl: string, rawData: any) {
  try {
    // Store import report in a simple format
    // You could also create a dedicated table for this
    console.log('Import Report:', {
      timestamp: new Date().toISOString(),
      sourceUrl,
      productsImported: result.productsImported,
      categoriesImported: result.categoriesImported,
      failedProducts: result.failedProducts,
      rawDataSummary: {
        markdownLength: rawData.markdown?.length || 0,
        linksFound: rawData.linksFound || 0,
      }
    });
  } catch (error) {
    console.error('Error creating import report:', error);
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateSku(): string {
  return `IMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
