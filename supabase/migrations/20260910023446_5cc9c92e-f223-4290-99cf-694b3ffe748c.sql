CREATE TABLE public.bank_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pluggy_item_id text NOT NULL,
  institution_name text,
  status text NOT NULL DEFAULT 'active',
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, pluggy_item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their bank connections" ON public.bank_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their bank connections" ON public.bank_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their bank connections" ON public.bank_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their bank connections" ON public.bank_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_bank_connections_updated_at
BEFORE UPDATE ON public.bank_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bank_transactions_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  pluggy_transaction_id text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL,
  imported_subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, pluggy_transaction_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions_cache TO authenticated;
GRANT ALL ON public.bank_transactions_cache TO service_role;

ALTER TABLE public.bank_transactions_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their cached transactions" ON public.bank_transactions_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their cached transactions" ON public.bank_transactions_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their cached transactions" ON public.bank_transactions_cache FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their cached transactions" ON public.bank_transactions_cache FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_bank_transactions_cache_connection ON public.bank_transactions_cache(connection_id);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS bank_connection_id uuid REFERENCES public.bank_connections(id) ON DELETE SET NULL;