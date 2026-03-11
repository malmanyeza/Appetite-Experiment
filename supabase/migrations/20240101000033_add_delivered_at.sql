-- Add delivered_at column and automated trigger for completion mapping

-- 1. Add column to orders table
ALTER TABLE public.orders 
ADD COLUMN delivered_at timestamptz;

-- 2. Create function to automatically set delivered_at when status changes to 'delivered'
CREATE OR REPLACE FUNCTION public.handle_order_completion()
RETURNS trigger AS $$
BEGIN
  IF (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered')) THEN
    NEW.delivered_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger
CREATE TRIGGER set_order_delivered_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE PROCEDURE public.handle_order_completion();
