-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON public.system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow full access for admins
CREATE POLICY "Allow full access for admins" ON public.system_settings
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert default settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('delivery_fee_config', '{"base_fee": 2.0, "per_km_fee": 0.5, "service_commission_pct": 20.0}', 'Configuration for delivery fees and platform commission')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
