-- Fix admin access to system_settings to allow INSERT/UPSERT
DROP POLICY IF EXISTS "Allow full access for admins" ON public.system_settings;
CREATE POLICY "Allow full access for admins" ON public.system_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
