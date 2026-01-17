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
  currency: string;
  sku: string;
  category: string;
  brand: string;
}

interface ImportResult {
  success: boolean;
  productsImported: number;
  categoriesImported: number;
  failedProducts: { name: string; reason: string }[];
  productLinks: string[];
  categoryLinks: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeUrl, action, limit } = await req.json();
    
    if (!storeUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Store URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting Szwego import from:', storeUrl);

    // Step 1: Scrape the main store page
    console.log('Scraping main store page...');
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: storeUrl,
        formats: ['markdown', 'html', 'links'],
        onlyMainContent: false,
        waitFor: 5000,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    
    if (!scrapeResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: scrapeData.error || 'Failed to scrape store',
          suggestion: 'Szwego uses anti-bot protection. Try CSV import instead.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = scrapeData.data || scrapeData;
    const links = content.links || [];
    const html = content.html || '';
    const markdown = content.markdown || '';
    const metadata = content.metadata || {};

    // Extract product and category links
    const productLinks = links.filter((link: string) => link.includes('/weshop/goods/') && !link.includes('goods_list'));
    const categoryLinks = links.filter((link: string) => link.includes('tagId=') || link.includes('groupId='));

    console.log(`Found ${productLinks.length} product links, ${categoryLinks.length} category links`);

    const result: ImportResult = {
      success: true,
      productsImported: 0,
      categoriesImported: 0,
      failedProducts: [],
      productLinks,
      categoryLinks,
    };

    // Extract images from HTML
    const imageRegex = /https:\/\/xcimg\.szwego\.com[^\s"'<>]+\.(jpg|jpeg|png|webp)/gi;
    const allImages: string[] = [...new Set(html.match(imageRegex) || [])] as string[];
    const productImages = allImages.filter((img: string) => img.includes('imgHD') || img.includes('cmp_'));

    console.log(`Found ${productImages.length} product images`);

    // Scrape individual products (limit to avoid timeout)
    const maxProducts = limit || 20;
    const productsToScrape = productLinks.slice(0, maxProducts);

    for (let i = 0; i < productsToScrape.length; i++) {
      const productUrl = productsToScrape[i];
      console.log(`Scraping product ${i + 1}/${productsToScrape.length}: ${productUrl}`);

      try {
        const productResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: productUrl,
            formats: ['markdown', 'html'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        if (!productResponse.ok) {
          result.failedProducts.push({ name: productUrl, reason: 'Failed to scrape' });
          continue;
        }

        const productData = await productResponse.json();
        const productContent = productData.data || productData;
        const productHtml = productContent.html || '';
        const productMarkdown = productContent.markdown || '';
        const productMeta = productContent.metadata || {};

        // Extract product details
        const productName = productMeta.title || productMeta.ogTitle || `Product ${i + 1}`;
        const productImageMatches = productHtml.match(imageRegex) || [];
        const productImageUrls = [...new Set(productImageMatches)].slice(0, 10);

        // Extract price from content
        const priceMatch = productMarkdown.match(/(?:¥|￥|\$|USD|CNY)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null;

        // Extract description
        const descriptionMatch = productMarkdown.match(/(?:Description|详情|描述)[:\s]*([^\n]+)/i);
        const description = descriptionMatch ? descriptionMatch[1].trim() : productMarkdown.substring(0, 500);

        // Generate unique SKU
        const sku = `SZW-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Insert product into database
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            name_en: productName,
            name_ar: productName,
            slug: generateSlug(productName + '-' + i),
            description_en: description,
            description_ar: description,
            price: price || 0,
            currency: 'CNY',
            sku,
            images: productImageUrls,
            is_active: true,
            is_featured: false,
            tags: ['imported', 'szwego'],
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          result.failedProducts.push({ name: productName, reason: insertError.message });
        } else {
          result.productsImported++;
          console.log(`Successfully imported: ${productName}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        result.failedProducts.push({ name: productUrl, reason: errorMsg });
      }
    }

    // Extract and import categories from category links
    const categoryNames = new Set<string>();
    for (const link of categoryLinks) {
      const tagMatch = link.match(/tagId=(\d+)/);
      const groupMatch = link.match(/groupId=(\d+)/);
      if (tagMatch) categoryNames.add(`Category-${tagMatch[1]}`);
      if (groupMatch) categoryNames.add(`Group-${groupMatch[1]}`);
    }

    // Try to extract category names from markdown
    const categoryNameMatches = markdown.match(/(?:Category|分类|類別)[:\s]*([^\n|]+)/gi);
    if (categoryNameMatches) {
      categoryNameMatches.forEach((match: string) => {
        const name = match.replace(/(?:Category|分类|類別)[:\s]*/i, '').trim();
        if (name && name.length > 1 && name.length < 50) {
          categoryNames.add(name);
        }
      });
    }

    for (const categoryName of categoryNames) {
      try {
        const { error } = await supabase
          .from('categories')
          .upsert({
            name_en: categoryName,
            name_ar: categoryName,
            slug: generateSlug(categoryName),
            is_active: true,
          }, { onConflict: 'slug' });

        if (!error) {
          result.categoriesImported++;
        }
      } catch (err) {
        console.error('Category import error:', err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Import completed',
        result,
        rawData: {
          storeInfo: {
            name: metadata.title || metadata.ogTitle,
            image: metadata.ogImage,
          },
          markdownLength: markdown.length,
          htmlLength: html.length,
          linksCount: links.length,
          productLinksCount: productLinks.length,
          categoryLinksCount: categoryLinks.length,
          imagesFound: productImages.length,
          sampleProductLinks: productLinks.slice(0, 10),
          sampleCategoryLinks: categoryLinks.slice(0, 10),
          sampleImages: productImages.slice(0, 10),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in szwego-import:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
    .trim();
}
