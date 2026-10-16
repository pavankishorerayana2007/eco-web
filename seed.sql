-- ============================================================================
-- QUANTUM MARKET - SEED DATA FOR DEMO & TESTING
-- Run this in the Supabase SQL Editor AFTER running schema.sql
-- Note: Replace UUIDs with actual auth.users UUIDs if creating through Supabase Auth
-- ============================================================================

-- Create default system setting for commission rate
INSERT INTO public.system_settings (key, value)
VALUES ('platform_commission', '{"rate": 5.00}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Note on Users:
-- In Supabase, users are created in auth.users.
-- When creating users via your Supabase Dashboard -> Authentication -> Users:
-- 1. admin@quantum.shop (Role: admin, Full Name: Super Admin)
-- 2. owner@quantum.shop (Role: owner, Full Name: Rajesh Kumar, Shop: Rajesh Stores)
-- 3. meera@quantum.shop (Role: owner, Full Name: Meera Nair, Shop: Meera Wellness)
-- 4. buyer@demo.com (Role: buyer, Full Name: Anita Rao)
-- 
-- The public.handle_new_user trigger will automatically insert their profile!
-- You can set user metadata during invite or update public.profiles directly:

-- Sample update once users are created in Supabase Auth:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@quantum.shop';
-- UPDATE public.profiles SET role = 'owner', shop_name = 'Rajesh Stores' WHERE email = 'owner@quantum.shop';
-- UPDATE public.profiles SET role = 'owner', shop_name = 'Meera Wellness' WHERE email = 'meera@quantum.shop';
-- UPDATE public.profiles SET role = 'buyer' WHERE email = 'buyer@demo.com';
