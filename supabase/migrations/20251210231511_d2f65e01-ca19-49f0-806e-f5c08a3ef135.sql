-- Drop unused legacy order tracking system
-- Tables must be dropped first (CASCADE removes dependent triggers)

-- Drop tables with CASCADE to remove dependent triggers
DROP TABLE IF EXISTS public.order_status_history CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- Now drop the functions (triggers are gone)
DROP FUNCTION IF EXISTS public.lookup_order_by_credentials(text, text);
DROP FUNCTION IF EXISTS public.lookup_order_items_by_credentials(text, text);
DROP FUNCTION IF EXISTS public.lookup_order_history_by_credentials(text, text);
DROP FUNCTION IF EXISTS public.generate_order_number();
DROP FUNCTION IF EXISTS public.log_order_status_change();
DROP FUNCTION IF EXISTS public.update_order_updated_at();

-- Drop the enum type
DROP TYPE IF EXISTS public.order_status CASCADE;