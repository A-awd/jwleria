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

    const baseUrl = `https://A2018011207583011294.szwego.com/weshop/goods/all?&albumId=_ZMAqfyWVgeIJzxk_lFSY2lWup1lK3tSA${pageTimestamp ? `&pageTimestamp=${pageTimestamp}` : ''}`;

    console.log('Fetching Szwego API:', baseUrl);

    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://a2018011207583011294.szwego.com/',
      },
    });

    const data = await response.json();

    console.log(`Got ${data?.result?.items?.length || 0} items, isLoadMore: ${data?.result?.pagination?.isLoadMore}`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
