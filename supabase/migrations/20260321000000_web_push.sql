-- Create web push subscriptions table
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, subscription)
);

-- Enable RLS
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.web_push_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON public.web_push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Allow service role access (for edge functions)
DROP POLICY IF EXISTS "Service role can do everything" ON public.web_push_subscriptions;
CREATE POLICY "Service role can do everything" ON public.web_push_subscriptions
  FOR ALL USING (true)
  WITH CHECK (true);
