-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create brands table
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    name_fr TEXT,
    name_es TEXT,
    description_en TEXT,
    description_ar TEXT,
    description_fr TEXT,
    description_es TEXT,
    logo_url TEXT,
    country TEXT,
    founded_year INTEGER,
    specialty TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    name_fr TEXT,
    name_es TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create products table with advanced fields
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    -- Names in 4 languages
    name_en TEXT NOT NULL,
    name_ar TEXT,
    name_fr TEXT,
    name_es TEXT,
    -- Descriptions in 4 languages
    description_en TEXT,
    description_ar TEXT,
    description_fr TEXT,
    description_es TEXT,
    -- Materials in 4 languages
    material_en TEXT,
    material_ar TEXT,
    material_fr TEXT,
    material_es TEXT,
    -- Pricing
    price DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'SAR',
    -- Physical specs
    weight_grams DECIMAL(10,2),
    dimensions TEXT,
    -- Images (JSON array of URLs)
    images JSONB DEFAULT '[]'::jsonb,
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    -- Metadata
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create function to check user role (Security Definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin', 'editor')
    )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for brands (public read, admin write)
CREATE POLICY "Anyone can view active brands"
ON public.brands FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all brands"
ON public.brands FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage brands"
ON public.brands FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update brands"
ON public.brands FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete brands"
ON public.brands FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Anyone can view active categories"
ON public.categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all categories"
ON public.categories FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage categories"
ON public.categories FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products (public read, admin write)
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all products"
ON public.products FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage products"
ON public.products FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON public.brands
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()));