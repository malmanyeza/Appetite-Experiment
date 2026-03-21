-- Migration: Fix Restaurant Visibility RLS
-- Existing policies are too restrictive (using is_open = true), 
-- preventing details from loading if closed.

-- 1. Drop old policies
DROP POLICY IF EXISTS "Public can view restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;

-- 2. Create more open SELECT policies
-- Customers should be able to see any restaurant's details/menu, 
-- even if it's currently closed or newly created.
CREATE POLICY "Public can view restaurants" ON public.restaurants 
  FOR SELECT USING (true);

CREATE POLICY "Public can view menu items" ON public.menu_items 
  FOR SELECT USING (true);

-- Ensure owners still have full control (this remains unchanged or reinforced)
-- Owners can manage their restaurants via manager_id or memberships.
-- Owners can manage their menu items via restaurant ownership.
