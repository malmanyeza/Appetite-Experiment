-- 1. Add delivered_at column if it does not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Retroactively fix delivered_at for legacy orders 
-- (using updated_at as a proxy for the delivery moment)
UPDATE public.orders
SET delivered_at = updated_at
WHERE status = 'delivered' AND delivered_at IS NULL;

-- 3. Create/Update Trigger Function to auto-set delivered_at
CREATE OR REPLACE FUNCTION set_order_delivered_at()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is changing to delivered, set the timestamp
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status <> 'delivered') THEN
        NEW.delivered_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply Trigger (drop first to handle potential existing trigger)
DROP TRIGGER IF EXISTS set_order_delivered_at_trigger ON public.orders;
CREATE TRIGGER set_order_delivered_at_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION set_order_delivered_at();
