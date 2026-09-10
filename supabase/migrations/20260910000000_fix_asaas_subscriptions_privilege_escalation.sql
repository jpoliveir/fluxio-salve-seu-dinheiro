-- CRÍTICO: as policies "Users can update/delete their own kiwify subscriptions"
-- (herdadas do rename para asaas_subscriptions) permitiam que qualquer usuário
-- autenticado alterasse sua PRÓPRIA linha de assinatura livremente, incluindo
-- as colunas status e plan. Como a condição era só "auth.uid() = user_id",
-- sem WITH CHECK restringindo os valores, um usuário podia se autopromover
-- para status='active' e plan='enterprise' direto pela API do Supabase,
-- sem pagar nada e sem passar pelo webhook da Asaas.
--
-- Escrita em asaas_subscriptions deve acontecer SOMENTE via edge functions
-- com service_role (asaas-webhook), que já ignora RLS. Usuários continuam
-- podendo apenas visualizar a própria assinatura (policy de SELECT mantida).

DROP POLICY IF EXISTS "Users can update their own kiwify subscriptions" ON public.asaas_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own kiwify subscriptions" ON public.asaas_subscriptions;

-- Revoga os privilégios de escrita direta concedidos ao role "authenticated"
-- (a leitura via SELECT continua permitida e filtrada pela policy existente).
REVOKE INSERT, UPDATE, DELETE ON public.asaas_subscriptions FROM authenticated;
