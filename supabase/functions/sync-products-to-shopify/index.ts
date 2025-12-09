import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Product data from jWleria design
const products = [
  // CARTIER
  { name: "Love Bracelet", brand: "Cartier", category: "Bracelets", price: 6850, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", tags: ["new", "ready-to-ship"] },
  { name: "Juste un Clou Ring", brand: "Cartier", category: "Rings", price: 2450, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Trinity Ring", brand: "Cartier", category: "Rings", price: 2150, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80", tags: ["pre-order"] },
  { name: "Panthère Ring", brand: "Cartier", category: "Rings", price: 8050, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Love Ring", brand: "Cartier", category: "Rings", price: 1550, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80", tags: ["pre-order"] },
  { name: "Panthère Necklace", brand: "Cartier", category: "Necklaces", price: 15200, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", tags: ["new"] },
  { name: "Clash de Cartier Ring", brand: "Cartier", category: "Rings", price: 3100, image: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Ballon Bleu Watch", brand: "Cartier", category: "Watches", price: 8950, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", tags: ["pre-order"] },
  { name: "Tank Française Watch", brand: "Cartier", category: "Watches", price: 7450, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Santos Watch", brand: "Cartier", category: "Watches", price: 9850, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80", tags: ["new"] },
  { name: "Juste un Clou Bracelet", brand: "Cartier", category: "Bracelets", price: 4350, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Love Earrings", brand: "Cartier", category: "Earrings", price: 2800, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", tags: ["pre-order"] },
  { name: "Panthère Earrings", brand: "Cartier", category: "Earrings", price: 5950, image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "C de Cartier Bag", brand: "Cartier", category: "Bags", price: 3200, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80", tags: [] },
  { name: "Panthère Sunglasses", brand: "Cartier", category: "Sunglasses", price: 890, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80", tags: ["ready-to-ship"] },
  // BULGARI
  { name: "Serpenti Viper Ring", brand: "Bulgari", category: "Rings", price: 3200, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "B.zero1 Bracelet", brand: "Bulgari", category: "Bracelets", price: 2800, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", tags: ["pre-order"] },
  { name: "Divas' Dream Necklace", brand: "Bulgari", category: "Necklaces", price: 4950, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", tags: ["new", "ready-to-ship"] },
  { name: "Serpenti Bracelet", brand: "Bulgari", category: "Bracelets", price: 5150, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80", tags: [] },
  { name: "B.zero1 Ring", brand: "Bulgari", category: "Rings", price: 1850, image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Serpenti Tubogas Watch", brand: "Bulgari", category: "Watches", price: 12500, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", tags: ["pre-order"] },
  { name: "Serpenti Seduttori Watch", brand: "Bulgari", category: "Watches", price: 9800, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", tags: ["new"] },
  // VAN CLEEF
  { name: "Alhambra Necklace", brand: "Van Cleef & Arpels", category: "Necklaces", price: 4950, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", tags: ["new", "ready-to-ship"] },
  { name: "Frivole Earrings", brand: "Van Cleef & Arpels", category: "Earrings", price: 5550, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", tags: ["pre-order"] },
  { name: "Perlée Bracelet", brand: "Van Cleef & Arpels", category: "Bracelets", price: 3750, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", tags: ["ready-to-ship"] },
  // TIFFANY
  { name: "T Wire Bracelet", brand: "Tiffany & Co.", category: "Bracelets", price: 1650, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Elsa Peretti Bean Necklace", brand: "Tiffany & Co.", category: "Necklaces", price: 1850, image: "https://images.unsplash.com/photo-1599458448510-59aecaea4752?w=800&q=80", tags: ["pre-order"] },
  { name: "Return to Tiffany Pendant", brand: "Tiffany & Co.", category: "Necklaces", price: 850, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", tags: ["new", "ready-to-ship"] },
  // CHOPARD
  { name: "Happy Hearts Earrings", brand: "Chopard", category: "Earrings", price: 2250, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Ice Cube Ring", brand: "Chopard", category: "Rings", price: 2050, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", tags: ["pre-order"] },
  { name: "L'Heure du Diamant Watch", brand: "Chopard", category: "Watches", price: 12350, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", tags: ["new"] },
  // ROLEX
  { name: "Datejust 41", brand: "Rolex", category: "Watches", price: 8950, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Submariner Date", brand: "Rolex", category: "Watches", price: 10200, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", tags: ["new", "pre-order"] },
  { name: "Day-Date 40", brand: "Rolex", category: "Watches", price: 38500, image: "https://images.unsplash.com/photo-1623998021446-45cd9b269056?w=800&q=80", tags: [] },
  // PATEK PHILIPPE
  { name: "Nautilus 5711", brand: "Patek Philippe", category: "Watches", price: 35000, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", tags: ["new", "pre-order"] },
  { name: "Aquanaut 5167", brand: "Patek Philippe", category: "Watches", price: 24500, image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80", tags: ["ready-to-ship"] },
  // DIOR
  { name: "Rose des Vents Ring", brand: "Dior", category: "Rings", price: 2950, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", tags: ["new", "ready-to-ship"] },
  { name: "Tribales Earrings", brand: "Dior", category: "Earrings", price: 890, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", tags: ["pre-order"] },
  { name: "Lady Dior Bag", brand: "Dior", category: "Bags", price: 5200, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80", tags: ["ready-to-ship"] },
  // GIVENCHY
  { name: "G Cube Earrings", brand: "Givenchy", category: "Earrings", price: 450, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "4G Necklace", brand: "Givenchy", category: "Necklaces", price: 650, image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80", tags: ["new", "pre-order"] },
  { name: "Antigona Bag", brand: "Givenchy", category: "Bags", price: 2450, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80", tags: [] },
  // GRAFF
  { name: "Butterfly Ring", brand: "Graff", category: "Rings", price: 45000, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", tags: ["new", "pre-order"] },
  { name: "Snowflake Earrings", brand: "Graff", category: "Earrings", price: 38000, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", tags: ["ready-to-ship"] },
  // HARRY WINSTON
  { name: "Cluster Ring", brand: "Harry Winston", category: "Rings", price: 65000, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", tags: ["new", "pre-order"] },
  { name: "Winston Cluster Earrings", brand: "Harry Winston", category: "Earrings", price: 85000, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", tags: [] },
  // PIAGET
  { name: "Possession Ring", brand: "Piaget", category: "Rings", price: 2850, image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", tags: ["ready-to-ship"] },
  { name: "Rose Earrings", brand: "Piaget", category: "Earrings", price: 8500, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", tags: ["new", "pre-order"] },
];

// Collections to create
const collections = [
  { title: "Best Sellers", handle: "best-sellers" },
  { title: "New Arrivals", handle: "new-arrivals" },
  { title: "Featured", handle: "featured" },
  { title: "Rings", handle: "rings" },
  { title: "Necklaces", handle: "necklaces" },
  { title: "Bracelets", handle: "bracelets" },
  { title: "Earrings", handle: "earrings" },
  { title: "Watches", handle: "watches" },
  { title: "Bags", handle: "bags" },
  { title: "Sunglasses", handle: "sunglasses" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminToken = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN');
    const storeDomain = Deno.env.get('VITE_SHOPIFY_STORE_DOMAIN') || '3bzncm-0m.myshopify.com';
    
    if (!adminToken) {
      throw new Error('SHOPIFY_ADMIN_API_TOKEN is not configured');
    }

    const apiVersion = '2024-01';
    const baseUrl = `https://${storeDomain}/admin/api/${apiVersion}`;
    
    const results = {
      collections: { created: 0, failed: 0, errors: [] as string[] },
      products: { created: 0, failed: 0, errors: [] as string[] },
    };

    console.log('Starting sync to Shopify...');
    console.log(`Store: ${storeDomain}`);

    // Get the Online Store publication ID first
    let publicationId = '';
    try {
      const pubQuery = `
        query {
          publications(first: 10) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `;
      const pubResponse = await fetch(`${baseUrl}/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: pubQuery }),
      });
      const pubData = await pubResponse.json();
      const publications = pubData.data?.publications?.edges || [];
      const onlineStore = publications.find((p: { node: { name: string } }) => 
        p.node.name === 'Online Store' || p.node.name.includes('Online')
      );
      if (onlineStore) {
        publicationId = onlineStore.node.id;
        console.log(`Found Online Store publication: ${publicationId}`);
      }
    } catch (e) {
      console.log('Could not fetch publications');
    }

    // Create collections first
    console.log('Creating collections...');
    const collectionIds: Record<string, string> = {};
    
    for (const collection of collections) {
      try {
        const response = await fetch(`${baseUrl}/custom_collections.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            custom_collection: {
              title: collection.title,
              handle: collection.handle,
              published: true,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          collectionIds[collection.handle] = data.custom_collection.id;
          results.collections.created++;
          console.log(`Created collection: ${collection.title}`);
        } else {
          const errorText = await response.text();
          // If collection already exists, try to get its ID
          if (errorText.includes('Handle has already been taken')) {
            const existingResponse = await fetch(`${baseUrl}/custom_collections.json?handle=${collection.handle}`, {
              headers: { 'X-Shopify-Access-Token': adminToken },
            });
            if (existingResponse.ok) {
              const existingData = await existingResponse.json();
              if (existingData.custom_collections?.[0]?.id) {
                collectionIds[collection.handle] = existingData.custom_collections[0].id;
                console.log(`Collection already exists: ${collection.title}`);
              }
            }
          } else {
            results.collections.failed++;
            results.collections.errors.push(`${collection.title}: ${errorText}`);
          }
        }
      } catch (error: unknown) {
        results.collections.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.collections.errors.push(`${collection.title}: ${errorMsg}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Create products
    console.log('Creating products...');
    
    for (const product of products) {
      try {
        const productData = {
          product: {
            title: product.name,
            body_html: `<p>Luxury ${product.category.toLowerCase()} from ${product.brand}. Experience the finest craftsmanship and timeless elegance.</p>`,
            vendor: product.brand,
            product_type: product.category,
            tags: product.tags.join(', '),
            status: 'active',
            published: true,
            variants: [
              {
                price: product.price.toString(),
                inventory_management: null,
                inventory_policy: 'continue',
              },
            ],
            images: [
              {
                src: product.image,
                alt: `${product.brand} ${product.name}`,
              },
            ],
          },
        };

        const response = await fetch(`${baseUrl}/products.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });

        if (response.ok) {
          const data = await response.json();
          const productId = data.product.id;
          results.products.created++;
          console.log(`Created product: ${product.name}`);

          // Publish product to Online Store sales channel using GraphQL
          if (publicationId) {
            try {
              const publishMutation = `
                mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
                  publishablePublish(id: $id, input: $input) {
                    publishable {
                      availablePublicationsCount {
                        count
                      }
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }
              `;
              
              await fetch(`${baseUrl}/graphql.json`, {
                method: 'POST',
                headers: {
                  'X-Shopify-Access-Token': adminToken,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: publishMutation,
                  variables: {
                    id: `gid://shopify/Product/${productId}`,
                    input: [{ publicationId }]
                  }
                }),
              });
              console.log(`Published product to storefront: ${product.name}`);
            } catch (pubError) {
              console.log(`Note: Could not publish ${product.name} to storefront channel`);
            }
          }

          // Add product to appropriate collections
          const categoryHandle = product.category.toLowerCase();
          if (collectionIds[categoryHandle]) {
            await fetch(`${baseUrl}/collects.json`, {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': adminToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                collect: {
                  product_id: productId,
                  collection_id: collectionIds[categoryHandle],
                },
              }),
            });
          }

          // Add to new-arrivals if has 'new' tag
          if (product.tags.includes('new') && collectionIds['new-arrivals']) {
            await fetch(`${baseUrl}/collects.json`, {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': adminToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                collect: {
                  product_id: productId,
                  collection_id: collectionIds['new-arrivals'],
                },
              }),
            });
          }

          // Add first 8 products to best-sellers
          if (results.products.created <= 8 && collectionIds['best-sellers']) {
            await fetch(`${baseUrl}/collects.json`, {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': adminToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                collect: {
                  product_id: productId,
                  collection_id: collectionIds['best-sellers'],
                },
              }),
            });
          }

          // Add first 12 products to featured
          if (results.products.created <= 12 && collectionIds['featured']) {
            await fetch(`${baseUrl}/collects.json`, {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': adminToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                collect: {
                  product_id: productId,
                  collection_id: collectionIds['featured'],
                },
              }),
            });
          }
        } else {
          const errorText = await response.text();
          results.products.failed++;
          results.products.errors.push(`${product.name}: ${errorText}`);
          console.error(`Failed to create product: ${product.name}`, errorText);
        }
      } catch (error: unknown) {
        results.products.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.products.errors.push(`${product.name}: ${errorMsg}`);
        console.error(`Error creating product: ${product.name}`, error);
      }

      // Rate limiting - Shopify has limits
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    console.log('Sync completed!');
    console.log(`Collections: ${results.collections.created} created, ${results.collections.failed} failed`);
    console.log(`Products: ${results.products.created} created, ${results.products.failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Sync completed',
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Sync error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
