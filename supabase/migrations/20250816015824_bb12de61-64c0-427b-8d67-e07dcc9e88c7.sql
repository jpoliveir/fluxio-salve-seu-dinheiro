-- Corrigir a função para seguir as melhores práticas de segurança
CREATE OR REPLACE FUNCTION public.calcular_economia_assinaturas(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record RECORD;
  cheapest_plan RECORD;
  economia_total NUMERIC := 0;
  economia_detalhes JSON[] := '{}';
  economia_item JSON;
BEGIN
  -- Buscar todas as assinaturas do usuário que tenham o campo servico preenchido
  FOR subscription_record IN 
    SELECT s.*, s.servico
    FROM public.subscriptions s
    WHERE s.user_id = user_id_param AND s.servico IS NOT NULL
  LOOP
    -- Encontrar o plano mais barato para este serviço
    SELECT sp.nome_plano, sp.valor
    INTO cheapest_plan
    FROM public.servicos_planos sp
    WHERE sp.servico = subscription_record.servico
    ORDER BY sp.valor ASC
    LIMIT 1;
    
    IF cheapest_plan.valor IS NOT NULL THEN
      -- Calcular economia potencial
      DECLARE
        economia_potencial NUMERIC := subscription_record.price - cheapest_plan.valor;
      BEGIN
        IF economia_potencial > 0 THEN
          economia_total := economia_total + economia_potencial;
          
          -- Criar item de detalhes
          economia_item := json_build_object(
            'servico', subscription_record.servico,
            'planoAtual', json_build_object(
              'nome', subscription_record.name,
              'valor', subscription_record.price
            ),
            'planoMaisBarato', json_build_object(
              'nome', cheapest_plan.nome_plano,
              'valor', cheapest_plan.valor
            ),
            'economiaPotencial', economia_potencial
          );
          
          economia_detalhes := economia_detalhes || economia_item;
        END IF;
      END;
    END IF;
  END LOOP;
  
  -- Retornar resultado
  RETURN json_build_object(
    'economia_total', economia_total,
    'detalhes', economia_detalhes
  );
END;
$$;