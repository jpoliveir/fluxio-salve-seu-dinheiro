-- 1) asaas_sub_selfwrite: remover escrita direta de usuários autenticados
DROP POLICY IF EXISTS "Users can update their own kiwify subscriptions" ON public.asaas_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own kiwify subscriptions" ON public.asaas_subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.asaas_subscriptions FROM authenticated;
GRANT SELECT ON public.asaas_subscriptions TO authenticated;

-- 2) sub_limit_clientonly: enforcement do limite de plano no banco
CREATE OR REPLACE FUNCTION public.enforce_subscription_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_plan TEXT;
  plan_limit INT;
  current_count INT;
BEGIN
  -- Assinatura interna do Fluxio não conta no limite
  IF NEW.name ILIKE 'Fluxio%' THEN
    RETURN NEW;
  END IF;

  -- Plano ativo do usuário (padrão: free)
  SELECT plan INTO current_plan
  FROM public.asaas_subscriptions
  WHERE user_id = NEW.user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  plan_limit := CASE current_plan
    WHEN 'premium' THEN 10
    WHEN 'enterprise' THEN 20
    ELSE 3
  END;

  SELECT COUNT(*) INTO current_count
  FROM public.subscriptions
  WHERE user_id = NEW.user_id
    AND name NOT ILIKE 'Fluxio%';

  IF current_count >= plan_limit THEN
    RAISE EXCEPTION 'Limite de % assinaturas do seu plano atingido. Faça upgrade para adicionar mais.', plan_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_subscription_limit_trigger ON public.subscriptions;
CREATE TRIGGER enforce_subscription_limit_trigger
BEFORE INSERT ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limit();

-- 3) price_consensus_selfvote: consenso por usuários distintos
CREATE OR REPLACE FUNCTION public.get_price_consensus(p_servico text, p_nome_plano text, p_threshold numeric DEFAULT 0.35)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_reports INTEGER;
  total_users INTEGER;
  most_common_price NUMERIC;
  most_common_users INTEGER;
  consensus_percentage NUMERIC;
  current_price NUMERIC;
BEGIN
  -- Contar relatórios e usuários distintos dos últimos 30 dias
  SELECT COUNT(*), COUNT(DISTINCT user_id) INTO total_reports, total_users
  FROM price_reports
  WHERE servico = p_servico
    AND nome_plano = p_nome_plano
    AND created_at > now() - interval '30 days';

  IF total_users < 3 THEN
    RETURN json_build_object(
      'has_consensus', false,
      'reason', 'insufficient_data',
      'total_reports', total_reports,
      'total_users', total_users
    );
  END IF;

  -- Preço com mais USUÁRIOS distintos reportando (último relatório por usuário)
  WITH ultimos AS (
    SELECT DISTINCT ON (user_id) user_id, valor_reportado
    FROM price_reports
    WHERE servico = p_servico
      AND nome_plano = p_nome_plano
      AND created_at > now() - interval '30 days'
    ORDER BY user_id, created_at DESC
  )
  SELECT valor_reportado, COUNT(*) INTO most_common_price, most_common_users
  FROM ultimos
  GROUP BY valor_reportado
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  consensus_percentage := most_common_users::NUMERIC / total_users::NUMERIC;

  SELECT valor INTO current_price
  FROM servicos_planos
  WHERE servico = p_servico AND nome_plano = p_nome_plano
  LIMIT 1;

  RETURN json_build_object(
    'has_consensus', consensus_percentage >= p_threshold,
    'consensus_percentage', ROUND(consensus_percentage * 100, 1),
    'suggested_price', most_common_price,
    'current_price', current_price,
    'total_reports', total_reports,
    'total_users', total_users,
    'price_differs', current_price IS DISTINCT FROM most_common_price
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_price_consensus(text, text, numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_subscription_limit() FROM anon, authenticated;