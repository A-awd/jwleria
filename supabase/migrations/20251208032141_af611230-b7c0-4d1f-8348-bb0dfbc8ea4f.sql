-- Remove overly permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order status history" ON public.order_status_history;

-- Create service-role-only INSERT policies (Edge Functions use service role)
-- These policies deny all client-side inserts while allowing service role to insert

CREATE POLICY "Service role can insert orders" 
ON public.orders 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can insert order items" 
ON public.order_items 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can insert order status history" 
ON public.order_status_history 
FOR INSERT 
TO service_role
WITH CHECK (true);