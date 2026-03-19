const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageTimestamp } = await req.json().catch(() => ({}));

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetUrl = 'https://a2018011207583011294.szwego.com/weshop/store/_ZMAqfyWVgeIJzxk_lFSY2lWup1lK3tSA';
    if (pageTimestamp) {
      targetUrl += `?pageTimestamp=${pageTimestamp}`;
    }

    console.log('Scraping Szwego store:', targetUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['html'],
        waitFor: 5000,
        onlyMainContent: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || 'Scrape failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the HTML to extract product data
    const html = data.data?.html || data.html || '';
    const products = parseProducts(html);

    console.log(`Extracted ${products.length} products`);

    return new Response(
      JSON.stringify({ success: true, products }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseProducts(html: string) {
  const products: any[] = [];
  
  // Szwego renders product cards with goods data. Try to extract from script tags or data attributes
  // Look for JSON data embedded in the page
  const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  
  for (const script of scriptMatches) {
    const content = script.replace(/<\/?script[^>]*>/gi, '');
    // Look for goods data in window.__INITIAL_STATE__ or similar patterns
    const stateMatch = content.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/) ||
                       content.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/) ||
                       content.match(/"items"\s*:\s*\[([\s\S]*?)\]/);
    if (stateMatch) {
      try {
        const parsed = JSON.parse(stateMatch[1]);
        if (Array.isArray(parsed)) {
          products.push(...parsed);
        } else if (parsed.items) {
          products.push(...parsed.items);
        }
      } catch {}
    }
  }

  // If no JSON data found, try to extract from HTML elements
  if (products.length === 0) {
    // Extract image URLs and titles from product card elements
    const imgPattern = /src="(https:\/\/xcimg\.szwego\.com\/[^"]+)"/g;
    const titlePattern = /class="[^"]*title[^"]*"[^>]*>([^<]+)</gi;
    
    const images: string[] = [];
    const titles: string[] = [];
    
    let match;
    while ((match = imgPattern.exec(html)) !== null) {
      if (!images.includes(match[1]) && !match[1].includes('icon_') && !match[1].includes('logo')) {
        images.push(match[1]);
      }
    }
    while ((match = titlePattern.exec(html)) !== null) {
      titles.push(match[1].trim());
    }
    
    // Pair images with titles
    for (let i = 0; i < Math.max(images.length, titles.length); i++) {
      products.push({
        title: titles[i] || `Product ${i + 1}`,
        imgsSrc: [images[i] || '/placeholder.svg'],
        tags: [{ tagName: '' }],
        time_stamp: Date.now() - i * 1000,
      });
    }
  }

  return products;
}
