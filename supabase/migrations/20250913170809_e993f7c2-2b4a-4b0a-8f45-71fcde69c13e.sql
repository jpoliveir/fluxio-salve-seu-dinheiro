-- Atualizar a função para incluir mais correspondências de serviços
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
  servico_encontrado TEXT;
BEGIN
  -- Buscar todas as assinaturas do usuário
  FOR subscription_record IN 
    SELECT s.*, s.servico, s.name as subscription_name, s.id as subscription_id
    FROM public.subscriptions s
    WHERE s.user_id = user_id_param
  LOOP
    servico_encontrado := NULL;
    
    -- Primeiro, tentar usar o campo servico se preenchido
    IF subscription_record.servico IS NOT NULL AND subscription_record.servico != '' AND subscription_record.servico != 'none' THEN
      servico_encontrado := subscription_record.servico;
    ELSE
      -- Tentar fazer correspondência pelo nome da assinatura
      -- Remover case sensitivity e procurar por correspondências
      SELECT DISTINCT sp.servico INTO servico_encontrado
      FROM public.servicos_planos sp
      WHERE LOWER(subscription_record.subscription_name) LIKE '%' || LOWER(sp.servico) || '%'
         OR LOWER(sp.servico) LIKE '%' || LOWER(subscription_record.subscription_name) || '%'
      LIMIT 1;
      
      -- Se não encontrou correspondência exata, tentar correspondências mais específicas
      IF servico_encontrado IS NULL THEN
        -- Netflix
        IF LOWER(subscription_record.subscription_name) LIKE '%netflix%' THEN
          servico_encontrado := 'Netflix';
        -- Spotify
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%spotify%' THEN
          servico_encontrado := 'Spotify';
        -- YouTube
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%youtube%' OR LOWER(subscription_record.subscription_name) LIKE '%yt%' THEN
          servico_encontrado := 'YouTube Premium';
        -- Apple Music
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%apple%music%' THEN
          servico_encontrado := 'Apple Music';
        -- Disney+
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%disney%' THEN
          servico_encontrado := 'Disney+';
        -- HBO Max
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%hbo%' THEN
          servico_encontrado := 'HBO Max';
        -- Amazon Prime
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%amazon%prime%' OR LOWER(subscription_record.subscription_name) LIKE '%prime%' THEN
          servico_encontrado := 'Amazon Prime';
        -- Globoplay
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%globo%' THEN
          servico_encontrado := 'Globoplay';
        -- Paramount+
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%paramount%' THEN
          servico_encontrado := 'Paramount+';
        -- Crunchyroll
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%crunchyroll%' THEN
          servico_encontrado := 'Crunchyroll';
        -- Star+
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%star%' THEN
          servico_encontrado := 'Star+';
        -- Discovery+
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%discovery%' THEN
          servico_encontrado := 'Discovery+';
        -- Microsoft 365
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%microsoft%' OR LOWER(subscription_record.subscription_name) LIKE '%office%' THEN
          servico_encontrado := 'Microsoft 365';
        -- Google One
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%google%one%' THEN
          servico_encontrado := 'Google One';
        -- Adobe
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%adobe%' THEN
          servico_encontrado := 'Adobe Creative Cloud';
        -- Canva
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%canva%' THEN
          servico_encontrado := 'Canva Pro';
        -- Notion
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%notion%' THEN
          servico_encontrado := 'Notion';
        -- iFood
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%ifood%' THEN
          servico_encontrado := 'iFood Pro';
        -- Uber
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%uber%' THEN
          servico_encontrado := 'Uber One';
        -- PlayStation
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%playstation%' OR LOWER(subscription_record.subscription_name) LIKE '%ps%plus%' THEN
          servico_encontrado := 'PlayStation Plus';
        -- Xbox
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%xbox%' OR LOWER(subscription_record.subscription_name) LIKE '%game%pass%' THEN
          servico_encontrado := 'Xbox Game Pass';
        -- Nintendo
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%nintendo%' THEN
          servico_encontrado := 'Nintendo Switch Online';
        -- Gympass
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%gympass%' THEN
          servico_encontrado := 'Gympass';
        -- Nike
        ELSIF LOWER(subscription_record.subscription_name) LIKE '%nike%' THEN
          servico_encontrado := 'Nike Training Club';
        END IF;
      END IF;
    END IF;

    IF servico_encontrado IS NOT NULL THEN
      -- Economia precisa: encontrar o plano mais barato para este serviço
      SELECT sp.nome_plano, sp.valor
      INTO cheapest_plan
      FROM public.servicos_planos sp
      WHERE sp.servico = servico_encontrado
      ORDER BY sp.valor ASC
      LIMIT 1;
      
      IF cheapest_plan.valor IS NOT NULL AND cheapest_plan.valor < subscription_record.price THEN
        DECLARE
          economia_potencial NUMERIC := subscription_record.price - cheapest_plan.valor;
        BEGIN
          IF economia_potencial > 0 THEN
            economia_total := economia_total + economia_potencial;
            tem_economia_precisa := true;
            
            -- Criar item de detalhes
            economia_item := json_build_object(
              'servico', servico_encontrado,
              'planoAtual', json_build_object(
                'nome', subscription_record.subscription_name,
                'valor', subscription_record.price
              ),
              'planoMaisBarato', json_build_object(
                'nome', cheapest_plan.nome_plano || ' (' || servico_encontrado || ')',
                'valor', cheapest_plan.valor
              ),
              'economiaPotencial', economia_potencial,
              'subscriptionId', subscription_record.subscription_id
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
          'servico', 'Serviço não identificado',
          'planoAtual', json_build_object(
            'nome', subscription_record.subscription_name,
            'valor', subscription_record.price
          ),
          'planoMaisBarato', json_build_object(
            'nome', 'Estimativa de plano mais barato',
            'valor', subscription_record.price - economia_estimada
          ),
          'economiaPotencial', economia_estimada,
          'estimativa', true,
          'subscriptionId', subscription_record.subscription_id
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