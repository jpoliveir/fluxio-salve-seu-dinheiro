-- Migração do gateway de pagamento: Kiwify/Stripe -> Asaas (único gateway)
-- Renomeia a tabela e colunas específicas do Kiwify para nomes genéricos/Asaas.

ALTER TABLE public.kiwify_subscriptions RENAME TO asaas_subscriptions;

ALTER TABLE public.asaas_subscriptions
  RENAME COLUMN kiwify_subscription_id TO asaas_subscription_id;

ALTER TABLE public.asaas_subscriptions
  RENAME COLUMN kiwify_order_id TO asaas_payment_id;

-- Guarda o customer id do Asaas para não precisar buscar por e-mail a cada evento
ALTER TABLE public.asaas_subscriptions
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- Índices já existentes (idx em user_id, etc.) acompanham o rename automaticamente.
-- RLS: a tabela já tinha RLS habilitado (ver migration original) e o rename preserva
-- ENABLE ROW LEVEL SECURITY e as policies existentes.

COMMENT ON TABLE public.asaas_subscriptions IS 'Assinaturas pagas via Asaas (gateway único do Fluxio). Escrita apenas via edge functions com service_role.';
