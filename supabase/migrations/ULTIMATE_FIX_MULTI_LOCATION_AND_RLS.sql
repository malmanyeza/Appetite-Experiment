-- CONSOLIDATED FIX: Multi-Location + Visibility RLS
-- This script ensures all tables exist, columns are correct, 
-- and visibility is open for the mobile app.

-- 1. Create restaurant_locations table
CREATE TABLE IF NOT EXISTS public.restaurant_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  location_name text NOT NULL,
  city text NOT NULL,
  suburb text NOT NULL,
  physical_address text,
  landmark_notes text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  phone text,
  email text,
  is_open boolean DEFAULT true NOT NULL,
  opening_hours text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Create location_menu_items table
CREATE TABLE IF NOT EXISTS public.location_menu_items (
  location_id uuid REFERENCES public.restaurant_locations(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  is_available boolean DEFAULT true NOT NULL,
  PRIMARY KEY (location_id, menu_item_id)
);

-- 3. Update orders table to include location_id
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.restaurant_locations(id);

-- 4. Enable RLS
ALTER TABLE public.restaurant_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_menu_items ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies for a clean state
DROP POLICY IF EXISTS "Public can view locations" ON public.restaurant_locations;
DROP POLICY IF EXISTS "Owners can manage their locations" ON public.restaurant_locations;
DROP POLICY IF EXISTS "Public can view location menu items" ON public.location_menu_items;
DROP POLICY IF EXISTS "Owners can manage location menu items" ON public.location_menu_items;
DROP POLICY IF EXISTS "Public can view restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public can see open restaurants" ON public.restaurants;

-- 6. Create robust visibility policies (Relaxed for SELECT)
-- Customers can view any location or restaurant details
CREATE POLICY "Public can view locations" ON public.restaurant_locations FOR SELECT USING (true);
CREATE POLICY "Public can view location menu items" ON public.location_menu_items FOR SELECT USING (true);
CREATE POLICY "Public can view restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Public can view menu items" ON public.menu_items FOR SELECT USING (true);

-- 7. Create management policies for owners (Using manager_id)
CREATE POLICY "Owners can manage their locations" ON public.restaurant_locations 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.manager_id = auth.uid())
);

CREATE POLICY "Owners can manage location menu items" ON public.location_menu_items 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_locations rl
    JOIN public.restaurants r ON rl.restaurant_id = r.id
    WHERE rl.id = location_id AND r.manager_id = auth.uid()
  )
);

-- 8. Backfill existing restaurants into locations (if they are missing a location)
DO $$
DECLARE
    r RECORD;
    new_loc_id UUID;
BEGIN
    FOR r IN SELECT * FROM public.restaurants LOOP
        IF NOT EXISTS (SELECT 1 FROM public.restaurant_locations WHERE restaurant_id = r.id) THEN
            INSERT INTO public.restaurant_locations (
                restaurant_id, 
                location_name, 
                city, 
                suburb, 
                lat, 
                lng, 
                is_open, 
                opening_hours
            ) VALUES (
                r.id, 
                'Main Branch', 
                r.city, 
                r.suburb, 
                COALESCE(r.lat, 0), 
                COALESCE(r.lng, 0), 
                r.is_open, 
                r.opening_hours
            ) RETURNING id INTO new_loc_id;

            UPDATE public.orders SET location_id = new_loc_id WHERE restaurant_id = r.id AND location_id IS NULL;
        END IF;
    END LOOP;
END $$;

-- 9. Updated RPC function (DROP first to avoid return type mismatch error)
DROP FUNCTION IF EXISTS public.get_restaurants_with_distance(NUMERIC, NUMERIC);
CREATE OR REPLACE FUNCTION public.get_restaurants_with_distance(
    u_lat NUMERIC,
    u_lng NUMERIC
)
RETURNS TABLE (
    id UUID,
    restaurant_id UUID,
    name TEXT,
    description TEXT,
    cover_image_url TEXT,
    categories TEXT[],
    avg_prep_time TEXT,
        delivery_radius_km NUMERIC,
        is_open BOOLEAN,
        distance_km NUMERIC,
        suburb TEXT,
        city TEXT
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            rl.id as id,
            r.id as restaurant_id,
            r.name,
            r.description,
            r.cover_image_url,
            r.categories,
            r.avg_prep_time,
            r.delivery_radius_km,
            rl.is_open,
            public.get_distance_km(rl.lat::NUMERIC, rl.lng::NUMERIC, u_lat::NUMERIC, u_lng::NUMERIC) AS distance_km,
            rl.suburb,
            rl.city
        FROM 
            public.restaurant_locations rl
    JOIN
        public.restaurants r ON rl.restaurant_id = r.id
    WHERE
        rl.is_open = true
        AND rl.lat IS NOT NULL
        AND rl.lng IS NOT NULL
    ORDER BY 
        distance_km ASC;
END;
$$ LANGUAGE plpgsql;
