CREATE OR REPLACE FUNCTION public.calcular_economia_assinaturas(user_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  subscription_record RECORD;
  cheapest_plan RECORD;
  economia_total NUMERIC := 0;
  economia_detalhes JSON[] := '{}';
  economia_item JSON;
  economia_estimada NUMERIC;
  tem_economia_precisa BOOLEAN := false;
BEGIN
  -- Buscar todas as assinaturas do usuário
  FOR subscription_record IN 
    SELECT s.*, s.servico
    FROM public.subscriptions s
    WHERE s.user_id = user_id_param
  LOOP
    IF subscription_record.servico IS NOT NULL THEN
      -- Economia precisa: encontrar o plano mais barato para este serviço
      SELECT sp.nome_plano, sp.valor
      INTO cheapest_plan
      FROM public.servicos_planos sp
      WHERE sp.servico = subscription_record.servico
      ORDER BY sp.valor ASC
      LIMIT 1;
      
      IF cheapest_plan.valor IS NOT NULL THEN
        DECLARE
          economia_potencial NUMERIC := subscription_record.price - cheapest_plan.valor;
        BEGIN
          IF economia_potencial > 0 THEN
            economia_total := economia_total + economia_potencial;
            tem_economia_precisa := true;
            
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
    ELSE
      -- Economia estimada: usar 15% como estimativa média de economia potencial
      economia_estimada := subscription_record.price * 0.15;
      IF economia_estimada > 5 THEN -- Só considerar se a economia for maior que R$ 5
        economia_total := economia_total + economia_estimada;
        
        -- Criar item de detalhes estimado
        economia_item := json_build_object(
          'servico', 'Serviço não definido',
          'planoAtual', json_build_object(
            'nome', subscription_record.name,
            'valor', subscription_record.price
          ),
          'planoMaisBarato', json_build_object(
            'nome', 'Estimativa de plano mais barato',
            'valor', subscription_record.price - economia_estimada
          ),
          'economiaPotencial', economia_estimada,
          'estimativa', true
        );
        
        economia_detalhes := economia_detalhes || economia_item;
      END IF;
    END IF;
  END LOOP;
  
  -- Retornar resultado
  RETURN json_build_object(
    'economia_total', economia_total,
    'detalhes', economia_detalhes,
    'tem_economia_precisa', tem_economia_precisa
  );
END;
$function$