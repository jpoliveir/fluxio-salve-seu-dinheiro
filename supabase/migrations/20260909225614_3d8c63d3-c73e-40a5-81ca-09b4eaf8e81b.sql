ALTER TABLE public.kiwify_subscriptions RENAME TO asaas_subscriptions;

ALTER TABLE public.asaas_subscriptions
  RENAME COLUMN kiwify_subscription_id TO asaas_subscription_id;

ALTER TABLE public.asaas_subscriptions
  RENAME COLUMN kiwify_order_id TO asaas_payment_id;

ALTER TABLE public.asaas_subscriptions
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asaas_subscriptions TO authenticated;
GRANT ALL ON public.asaas_subscriptions TO service_role;

COMMENT ON TABLE public.asaas_subscriptions IS 'Assinaturas pagas via Asaas (gateway unico do Fluxio). Escrita apenas via edge functions com service_role.';