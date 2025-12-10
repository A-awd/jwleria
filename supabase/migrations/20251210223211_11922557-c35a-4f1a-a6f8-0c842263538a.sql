-- Add restrictive UPDATE and DELETE RLS policies for orders table
CREATE POLICY "No direct order updates" 
ON public.orders 
FOR UPDATE 
USING (false);

CREATE POLICY "No direct order deletes" 
ON public.orders 
FOR DELETE 
USING (false);

-- Add restrictive UPDATE and DELETE RLS policies for order_items table
CREATE POLICY "No direct order items updates" 
ON public.order_items 
FOR UPDATE 
USING (false);

CREATE POLICY "No direct order items deletes" 
ON public.order_items 
FOR DELETE 
USING (false);

-- Add restrictive UPDATE and DELETE RLS policies for order_status_history table
CREATE POLICY "No direct history updates" 
ON public.order_status_history 
FOR UPDATE 
USING (false);

CREATE POLICY "No direct history deletes" 
ON public.order_status_history 
FOR DELETE 
USING (false);