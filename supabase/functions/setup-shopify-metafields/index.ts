import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const graphqlUrl = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;

    console.log('Setting up Shopify metafield definitions...');

    // Define metafield definitions for products
    const metafieldDefinitions = [
      {
        name: "Fulfillment Type",
        namespace: "jwleria",
        key: "fulfillment_type",
        type: "single_line_text_field",
        description: "Whether product is ready to ship or pre-order",
        ownerType: "PRODUCT",
        validations: [
          {
            name: "choices",
            value: '["ready_to_ship", "preorder", "made_to_order"]'
          }
        ]
      },
      {
        name: "Lead Time",
        namespace: "jwleria",
        key: "lead_time",
        type: "single_line_text_field",
        description: "Estimated shipping time for pre-order items (e.g., '2-3 weeks')",
        ownerType: "PRODUCT"
      },
      {
        name: "Lead Time Days",
        namespace: "jwleria",
        key: "lead_time_days",
        type: "number_integer",
        description: "Lead time in days for pre-order items",
        ownerType: "PRODUCT"
      },
      {
        name: "Limited Edition",
        namespace: "jwleria",
        key: "limited_edition",
        type: "boolean",
        description: "Whether this is a limited edition product",
        ownerType: "PRODUCT"
      }
    ];

    const results: { definition: string; success: boolean; error?: string }[] = [];

    for (const def of metafieldDefinitions) {
      const mutation = `
        mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              name
              namespace
              key
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      try {
        const response = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              definition: def
            }
          }),
        });

        const data = await response.json();
        
        if (data.errors) {
          results.push({
            definition: `${def.namespace}.${def.key}`,
            success: false,
            error: data.errors[0]?.message || 'Unknown error'
          });
          console.log(`Failed to create ${def.namespace}.${def.key}:`, data.errors);
        } else if (data.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
          const errorMsg = data.data.metafieldDefinitionCreate.userErrors[0].message;
          // If already exists, consider it success
          if (errorMsg.includes('already exists') || errorMsg.includes('Taken')) {
            results.push({
              definition: `${def.namespace}.${def.key}`,
              success: true,
              error: 'Already exists'
            });
            console.log(`Metafield ${def.namespace}.${def.key} already exists`);
          } else {
            results.push({
              definition: `${def.namespace}.${def.key}`,
              success: false,
              error: errorMsg
            });
            console.log(`Failed to create ${def.namespace}.${def.key}:`, errorMsg);
          }
        } else {
          results.push({
            definition: `${def.namespace}.${def.key}`,
            success: true
          });
          console.log(`Created metafield definition: ${def.namespace}.${def.key}`);
        }
      } catch (error) {
        results.push({
          definition: `${def.namespace}.${def.key}`,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('Metafield setup completed!');

    return new Response(JSON.stringify({
      success: true,
      message: 'Metafield definitions setup completed',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Setup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
