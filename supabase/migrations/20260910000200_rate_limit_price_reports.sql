-- price_reports não tinha nenhum limite: um usuário autenticado podia
-- inundar a tabela com reports falsos, distorcendo o cálculo de
-- get_price_consensus() para todo mundo.
--
-- Duas travas:
-- 1) no máximo 1 report por usuário para o mesmo serviço+plano a cada 24h
-- 2) no máximo 20 reports por usuário (qualquer serviço) a cada 24h

CREATE OR REPLACE FUNCTION public.enforce_price_report_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  same_plan_count integer;
  total_count integer;
BEGIN
  SELECT count(*) INTO same_plan_count
  FROM public.price_reports
  WHERE user_id = NEW.user_id
    AND servico = NEW.servico
    AND nome_plano = NEW.nome_plano
    AND created_at > now() - interval '24 hours';

  IF same_plan_count > 0 THEN
    RAISE EXCEPTION 'Você já reportou um preço para % - % nas últimas 24 horas', NEW.servico, NEW.nome_plano
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO total_count
  FROM public.price_reports
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';

  IF total_count >= 20 THEN
    RAISE EXCEPTION 'Limite diário de reports de preço atingido (máx. 20 a cada 24h)'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_price_reports_rate_limit ON public.price_reports;
CREATE TRIGGER trg_price_reports_rate_limit
BEFORE INSERT ON public.price_reports
FOR EACH ROW EXECUTE FUNCTION public.enforce_price_report_rate_limit();
