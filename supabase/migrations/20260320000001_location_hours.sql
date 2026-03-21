-- Migration: Add location-specific operating hours
-- This allows each branch to have its own opening/closing times.

-- 1. Add columns to restaurant_locations
ALTER TABLE public.restaurant_locations 
ADD COLUMN IF NOT EXISTS opening_time TIME,
ADD COLUMN IF NOT EXISTS closing_time TIME,
ADD COLUMN IF NOT EXISTS days_open TEXT[] DEFAULT '{Mon,Tue,Wed,Thu,Fri,Sat,Sun}'::TEXT[];

-- 2. Backfill existing locations with their parent restaurant's hours (if available)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, opening_time, closing_time, days_open FROM public.restaurants LOOP
        UPDATE public.restaurant_locations 
        SET 
            opening_time = r.opening_time::TIME,
            closing_time = r.closing_time::TIME,
            days_open = r.days_open
        WHERE restaurant_id = r.id;
    END LOOP;
END $$;
