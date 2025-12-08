-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_postal_code TEXT,
    shipping_country TEXT NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    notes TEXT,
    tracking_number TEXT,
    estimated_delivery DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create order items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    product_brand TEXT NOT NULL,
    product_image TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order status history table for tracking
CREATE TABLE public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    status order_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies - allow anyone to view orders by email (for order tracking)
CREATE POLICY "Anyone can view their orders by email" 
ON public.orders 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view order items" 
ON public.order_items 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view order status history" 
ON public.order_status_history 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert order status history" 
ON public.order_status_history 
FOR INSERT 
WITH CHECK (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_order_updated_at();

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'JWL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate order number
CREATE TRIGGER set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();

-- Create function to log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_history (order_id, status, notes)
        VALUES (NEW.id, NEW.status, 'Status changed from ' || OLD.status || ' to ' || NEW.status);
        
        -- Update timestamps based on status
        IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
            NEW.shipped_at = now();
        END IF;
        IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
            NEW.delivered_at = now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to log status changes
CREATE TRIGGER log_status_change
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();