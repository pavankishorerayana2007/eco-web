-- ============================================================================
-- QUANTUM MARKET - COMPLETE SUPABASE POSTGRESQL SCHEMA
-- Ready for execution in the Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SYSTEM SETTINGS TABLE (Platform parameters like commission rate)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial commission rate (5%)
INSERT INTO public.system_settings (key, value)
VALUES ('platform_commission', '{"rate": 5.00}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. USER PROFILES TABLE (Mirrors auth.users and manages roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('buyer', 'owner', 'admin')),
    mobile TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    shop_name TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Invited', 'Deleted')),
    store_status TEXT NOT NULL DEFAULT 'active' CHECK (store_status IN ('active', 'paused')),
    store_pause_message TEXT,
    store_paused_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STORE PAUSE HISTORY (Tracks pause/resume announcements for audit)
CREATE TABLE IF NOT EXISTS public.store_pause_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS TABLE (Single & Combo products)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY, -- e.g. 'P1', 'P2' or custom UUID
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('single', 'combo')),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    product_type TEXT DEFAULT 'Packaged',
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
    original_quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
    package_size NUMERIC(10,3) DEFAULT 0,
    package_unit TEXT,
    unit TEXT NOT NULL DEFAULT 'pcs',
    expiry_date DATE,
    brand TEXT,
    discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 90),
    location TEXT DEFAULT 'Main store',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled', 'Deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMBO ITEMS TABLE (Sub-products inside bundles)
CREATE TABLE IF NOT EXISTS public.combo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    quantity NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'pcs'
);

-- 6. PRODUCT LOGS (Immutable audit trail of stock, price, status changes)
CREATE TABLE IF NOT EXISTS public.product_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, -- 'Created', 'Edited', 'Quantity increased', 'Quantity decreased', 'Status'
    details TEXT NOT NULL,
    quantity_delta NUMERIC(10,3) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- e.g. 'QM-100101'
    buyer_id UUID NOT NULL REFERENCES public.profiles(id),
    buyer_email TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id),
    subtotal NUMERIC(10,2) NOT NULL,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'on')),
    payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Awaiting Verification', 'Paid', 'Failed', 'Cancelled')),
    order_status TEXT NOT NULL DEFAULT 'Placed' CHECK (order_status IN ('Awaiting Payment', 'Placed', 'Delivered', 'Cancelled')),
    buyer_name TEXT NOT NULL,
    buyer_mobile TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_city TEXT NOT NULL,
    delivery_state TEXT NOT NULL,
    delivery_pincode TEXT NOT NULL,
    delivery_instructions TEXT,
    delivery_location TEXT,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    utr_reference TEXT,
    proof_url TEXT,
    proof_submitted_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    buyer_received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ORDER ITEMS TABLE (Individual line items per order)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC(10,3) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    unit TEXT,
    product_type TEXT,
    package_size TEXT,
    quantity_display TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ORDER HISTORY (State transition timeline)
CREATE TABLE IF NOT EXISTS public.order_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. COMMISSION PAYMENTS TABLE (Owner paying platform commission)
CREATE TABLE IF NOT EXISTS public.commission_payments (
    id TEXT PRIMARY KEY, -- e.g. 'CP-1001'
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    reference TEXT NOT NULL,
    proof_url TEXT,
    status TEXT NOT NULL DEFAULT 'Pending Verification' CHECK (status IN ('Pending Verification', 'Paid', 'Rejected')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by TEXT
);

-- 11. BUYER PAYMENTS TABLE (Online QR payment or COD confirmation proofs)
CREATE TABLE IF NOT EXISTS public.buyer_payments (
    id TEXT PRIMARY KEY, -- e.g. 'BP-2001'
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id),
    buyer_id UUID NOT NULL REFERENCES public.profiles(id),
    kind TEXT NOT NULL CHECK (kind IN ('online', 'cod')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL,
    reference TEXT NOT NULL,
    proof_url TEXT,
    status TEXT NOT NULL DEFAULT 'Pending Verification' CHECK (status IN ('Pending Verification', 'Paid', 'Rejected')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

-- 12. COMMISSION AUDIT LOG (Platform rate or owner balance reductions)
CREATE TABLE IF NOT EXISTS public.commission_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id TEXT NOT NULL, -- UUID of owner or 'ALL'
    original_value NUMERIC(10,2) NOT NULL,
    new_value NUMERIC(10,2) NOT NULL,
    reduction NUMERIC(10,2) NOT NULL,
    reason TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_role TEXT NOT NULL CHECK (recipient_role IN ('buyer', 'owner', 'admin')),
    recipient_id TEXT, -- User UUID or NULL for all role members
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    navigation_json JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_products_owner ON public.products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_owner ON public.orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_role, recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_commission_owner ON public.commission_payments(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_buyer_payments_order ON public.buyer_payments(order_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_pause_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Service role bypasses all RLS checks automatically in Supabase,
-- but explicit policies are provided for client-side queries:

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Active products from active owners viewable by everyone" 
ON public.products FOR SELECT USING (
    status = 'Active' OR 
    auth.uid() = owner_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Owners can insert their own products" 
ON public.products FOR INSERT WITH CHECK (
    auth.uid() = owner_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner' AND status = 'Active')
);

CREATE POLICY "Owners can update their own products" 
ON public.products FOR UPDATE USING (
    auth.uid() = owner_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Combo items policies
CREATE POLICY "Combo items viewable by everyone" 
ON public.combo_items FOR SELECT USING (true);

CREATE POLICY "Owners can manage combo items" 
ON public.combo_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.products 
        WHERE products.id = combo_items.product_id 
        AND (products.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
);

-- Orders policies
CREATE POLICY "Buyers can view their own orders" 
ON public.orders FOR SELECT USING (
    buyer_id = auth.uid() OR 
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Buyers can insert their own orders" 
ON public.orders FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers and owners can update relevant orders" 
ON public.orders FOR UPDATE USING (
    buyer_id = auth.uid() OR 
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Order items policies
CREATE POLICY "Order items viewable by participants" 
ON public.order_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND (orders.buyer_id = auth.uid() OR orders.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
);

CREATE POLICY "Order items insertable on order creation" 
ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND orders.buyer_id = auth.uid()
    )
);

-- Notifications policies
CREATE POLICY "Users can view their notifications" 
ON public.notifications FOR SELECT USING (
    recipient_id = auth.uid()::text OR 
    (recipient_id IS NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = recipient_role))
);

CREATE POLICY "Users can mark their notifications as read" 
ON public.notifications FOR UPDATE USING (
    recipient_id = auth.uid()::text OR 
    (recipient_id IS NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = recipient_role))
);

-- System Settings policy
CREATE POLICY "Settings viewable by authenticated users" 
ON public.system_settings FOR SELECT USING (true);

-- Store Pause History policy
CREATE POLICY "Store pause history viewable by everyone" 
ON public.store_pause_history FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Automatically create a profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        mobile, 
        status
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
        COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
        'Active'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
