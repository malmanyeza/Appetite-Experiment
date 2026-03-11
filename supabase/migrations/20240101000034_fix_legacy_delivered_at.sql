-- Retroactively fix delivered_at for orders that are already marked as 'delivered'
-- We use updated_at as a proxy for when it was delivered since it was likely the last status change.

UPDATE public.orders
SET delivered_at = updated_at
WHERE status = 'delivered' AND delivered_at IS NULL;
