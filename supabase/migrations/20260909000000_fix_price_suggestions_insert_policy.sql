-- A policy anterior permitia que QUALQUER usuário autenticado inserisse
-- sugestões de preço associadas a qualquer user_id/subscription_id,
-- pois usava WITH CHECK (true) sem restringir o dono da linha.
-- Sugestões são geradas apenas pelo backend (via service_role, que já
-- ignora RLS), então usuários autenticados não precisam - e não devem -
-- ter permissão de INSERT direto nessa tabela.

DROP POLICY IF EXISTS "Service can insert suggestions" ON public.price_suggestions;

-- Nenhuma policy de INSERT é recriada para o papel "authenticated":
-- isso bloqueia inserts diretos do cliente. A função de backend que
-- gera as sugestões usa a service_role key, que sempre ignora RLS.
