import { useState, useCallback, useEffect } from 'react';
import { CartLineItem, Cart, ShopifyMoney } from '@/types/shopify';

// Shopify Cart API GraphQL mutations
const CART_CREATE_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    title
                    handle
                  }
                  image {
                    url
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    title
                    handle
                  }
                  image {
                    url
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    title
                    handle
                  }
                  image {
                    url
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    title
                    handle
                  }
                  image {
                    url
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_QUERY = `
  query Cart($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
      totalQuantity
      cost {
        subtotalAmount {
          amount
          currencyCode
        }
      }
      lines(first: 100) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                price {
                  amount
                  currencyCode
                }
                product {
                  id
                  title
                  handle
                }
                image {
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface ShopifyCartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: ShopifyMoney;
    product: {
      id: string;
      title: string;
      handle: string;
    };
    image?: {
      url: string;
    };
  };
}

interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: ShopifyMoney;
  };
  lines: {
    edges: Array<{ node: ShopifyCartLine }>;
  };
}

interface CartResponse {
  cart: ShopifyCart | null;
  userErrors?: Array<{ field: string; message: string }>;
}

function mapShopifyCart(shopifyCart: ShopifyCart): Cart {
  return {
    id: shopifyCart.id,
    checkoutUrl: shopifyCart.checkoutUrl,
    totalQuantity: shopifyCart.totalQuantity,
    subtotal: shopifyCart.cost.subtotalAmount,
    lines: shopifyCart.lines.edges.map(({ node }) => ({
      id: node.id,
      variantId: node.merchandise.id,
      productId: node.merchandise.product.id,
      title: node.merchandise.product.title,
      variantTitle: node.merchandise.title !== 'Default Title' ? node.merchandise.title : undefined,
      quantity: node.quantity,
      price: parseFloat(node.merchandise.price.amount),
      image: node.merchandise.image?.url,
      handle: node.merchandise.product.handle,
    })),
  };
}

const CART_ID_KEY = 'shopify_cart_id';

export function useShopifyCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeDomain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
  const storefrontToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
  const apiVersion = '2024-01';

  const isConfigured = Boolean(storeDomain && storefrontToken);

  const graphqlFetch = useCallback(async <T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> => {
    if (!isConfigured) {
      throw new Error('Shopify is not configured');
    }

    const response = await fetch(
      `https://${storeDomain}/api/${apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const json = await response.json();

    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error');
    }

    return json.data;
  }, [storeDomain, storefrontToken, isConfigured, apiVersion]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      if (!isConfigured) return;

      const cartId = localStorage.getItem(CART_ID_KEY);
      if (!cartId) return;

      setIsLoading(true);
      try {
        const data = await graphqlFetch<{ cart: ShopifyCart | null }>(
          CART_QUERY,
          { cartId }
        );

        if (data.cart) {
          setCart(mapShopifyCart(data.cart));
        } else {
          // Cart no longer exists, clear localStorage
          localStorage.removeItem(CART_ID_KEY);
        }
      } catch (err) {
        console.error('Failed to load cart:', err);
        localStorage.removeItem(CART_ID_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [isConfigured, graphqlFetch]);

  const createCart = useCallback(async (
    lines: Array<{ merchandiseId: string; quantity: number }>
  ): Promise<Cart> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await graphqlFetch<{ cartCreate: CartResponse }>(
        CART_CREATE_MUTATION,
        { input: { lines } }
      );

      if (data.cartCreate.userErrors?.length) {
        throw new Error(data.cartCreate.userErrors[0].message);
      }

      if (!data.cartCreate.cart) {
        throw new Error('Failed to create cart');
      }

      const newCart = mapShopifyCart(data.cartCreate.cart);
      localStorage.setItem(CART_ID_KEY, newCart.id);
      setCart(newCart);
      return newCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create cart';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [graphqlFetch]);

  const addToCart = useCallback(async (
    variantId: string,
    quantity: number = 1
  ): Promise<Cart> => {
    setIsLoading(true);
    setError(null);

    try {
      // If no cart exists, create one
      if (!cart) {
        return await createCart([{ merchandiseId: variantId, quantity }]);
      }

      const data = await graphqlFetch<{ cartLinesAdd: CartResponse }>(
        CART_LINES_ADD_MUTATION,
        {
          cartId: cart.id,
          lines: [{ merchandiseId: variantId, quantity }],
        }
      );

      if (data.cartLinesAdd.userErrors?.length) {
        throw new Error(data.cartLinesAdd.userErrors[0].message);
      }

      if (!data.cartLinesAdd.cart) {
        throw new Error('Failed to add to cart');
      }

      const updatedCart = mapShopifyCart(data.cartLinesAdd.cart);
      setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to cart';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cart, createCart, graphqlFetch]);

  const updateLineItem = useCallback(async (
    lineId: string,
    quantity: number
  ): Promise<Cart> => {
    if (!cart) {
      throw new Error('No cart exists');
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await graphqlFetch<{ cartLinesUpdate: CartResponse }>(
        CART_LINES_UPDATE_MUTATION,
        {
          cartId: cart.id,
          lines: [{ id: lineId, quantity }],
        }
      );

      if (data.cartLinesUpdate.userErrors?.length) {
        throw new Error(data.cartLinesUpdate.userErrors[0].message);
      }

      if (!data.cartLinesUpdate.cart) {
        throw new Error('Failed to update cart');
      }

      const updatedCart = mapShopifyCart(data.cartLinesUpdate.cart);
      setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update cart';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cart, graphqlFetch]);

  const removeFromCart = useCallback(async (
    lineId: string
  ): Promise<Cart> => {
    if (!cart) {
      throw new Error('No cart exists');
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await graphqlFetch<{ cartLinesRemove: CartResponse }>(
        CART_LINES_REMOVE_MUTATION,
        {
          cartId: cart.id,
          lineIds: [lineId],
        }
      );

      if (data.cartLinesRemove.userErrors?.length) {
        throw new Error(data.cartLinesRemove.userErrors[0].message);
      }

      if (!data.cartLinesRemove.cart) {
        throw new Error('Failed to remove from cart');
      }

      const updatedCart = mapShopifyCart(data.cartLinesRemove.cart);
      setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove from cart';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cart, graphqlFetch]);

  const clearCart = useCallback(() => {
    localStorage.removeItem(CART_ID_KEY);
    setCart(null);
  }, []);

  const goToCheckout = useCallback(() => {
    if (cart?.checkoutUrl) {
      window.location.href = cart.checkoutUrl;
    }
  }, [cart]);

  return {
    cart,
    isLoading,
    error,
    isConfigured,
    addToCart,
    updateLineItem,
    removeFromCart,
    clearCart,
    goToCheckout,
    totalItems: cart?.totalQuantity ?? 0,
    subtotal: cart?.subtotal ? parseFloat(cart.subtotal.amount) : 0,
  };
}

export default useShopifyCart;
