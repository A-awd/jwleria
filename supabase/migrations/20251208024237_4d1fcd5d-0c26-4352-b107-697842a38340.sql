-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view their orders by email" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can view order status history" ON public.order_status_history;

-- Create secure lookup function for orders (requires both order_number AND email)
CREATE OR REPLACE FUNCTION public.lookup_order_by_credentials(p_order_number TEXT, p_email TEXT)
RETURNS SETOF orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM orders 
  WHERE order_number = p_order_number 
  AND LOWER(customer_email) = LOWER(p_email);
$$;

-- Create secure lookup function for order items
CREATE OR REPLACE FUNCTION public.lookup_order_items_by_credentials(p_order_number TEXT, p_email TEXT)
RETURNS SETOF order_items
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.* FROM order_items oi
  INNER JOIN orders o ON o.id = oi.order_id
  WHERE o.order_number = p_order_number 
  AND LOWER(o.customer_email) = LOWER(p_email);
$$;

-- Create secure lookup function for order status history
CREATE OR REPLACE FUNCTION public.lookup_order_history_by_credentials(p_order_number TEXT, p_email TEXT)
RETURNS SETOF order_status_history
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT osh.* FROM order_status_history osh
  INNER JOIN orders o ON o.id = osh.order_id
  WHERE o.order_number = p_order_number 
  AND LOWER(o.customer_email) = LOWER(p_email);
$$;

-- Create restrictive RLS policies (deny direct table access, force use of secure functions)
-- Orders: No direct SELECT access
CREATE POLICY "No direct order access"
ON public.orders
FOR SELECT
USING (false);

-- Order items: No direct SELECT access
CREATE POLICY "No direct order items access"
ON public.order_items
FOR SELECT
USING (false);

-- Order status history: No direct SELECT access
CREATE POLICY "No direct order history access"
ON public.order_status_history
FOR SELECT
USING (false);