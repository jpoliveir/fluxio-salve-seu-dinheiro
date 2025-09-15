-- Adicionar logs na função para debugar o problema
CREATE OR REPLACE FUNCTION public.calcular_economia_assinaturas(user_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  subscription_record RECORD;
  plano_opcao RECORD;
  economia_total NUMERIC := 0;
  economia_detalhes JSON[] := '{}';
  economia_item JSON;
  economia_estimada NUMERIC;
  tem_economia_precisa BOOLEAN := false;
  servico_encontrado TEXT;
  opcoes_planos JSON[] := '{}';
BEGIN
  -- Buscar todas as assinaturas do usuário
  FOR subscription_record IN 
    SELECT s.*, s.servico, s.name as subscription_name, s.id as subscription_id
    FROM public.subscriptions s
    WHERE s.user_id = user_id_param
  LOOP
    servico_encontrado := NULL;
    opcoes_planos := '{}';
    
    -- Debug: Log da assinatura atual
    RAISE NOTICE 'Processando assinatura: % - Serviço: %', subscription_record.subscription_name, subscription_record.servico;
    
    -- Primeiro, tentar usar o campo servico se preenchido
    IF subscription_record.servico IS NOT NULL AND subscription_record.servico != '' AND subscription_record.servico != 'none' THEN
      servico_encontrado := subscription_record.servico;
      RAISE NOTICE 'Serviço encontrado pelo campo servico: %', servico_encontrado;
    ELSE
      -- Tentar fazer correspondência pelo nome da assinatura
      SELECT DISTINCT sp.servico INTO servico_encontrado
      FROM public.servicos_planos sp
      WHERE LOWER(subscription_record.subscription_name) LIKE '%' || LOWER(sp.servico) || '%'
         OR LOWER(sp.servico) LIKE '%' || LOWER(subscription_record.subscription_name) || '%'
      LIMIT 1;
      
      IF servico_encontrado IS NOT NULL THEN
        RAISE NOTICE 'Serviço encontrado por correspondência na tabela: %', servico_encontrado;
      END IF;
      
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
        
        IF servico_encontrado IS NOT NULL THEN
          RAISE NOTICE 'Serviço encontrado por detecção manual: %', servico_encontrado;
        END IF;
      END IF;
    END IF;

    IF servico_encontrado IS NOT NULL THEN
      RAISE NOTICE 'Buscando planos para o serviço: %', servico_encontrado;
      -- Buscar TODAS as opções de planos mais baratos para este serviço
      FOR plano_opcao IN 
        SELECT sp.nome_plano, sp.valor
        FROM public.servicos_planos sp
        WHERE sp.servico = servico_encontrado
          AND sp.valor < subscription_record.price
        ORDER BY sp.valor ASC
      LOOP
        DECLARE
          economia_potencial NUMERIC := subscription_record.price - plano_opcao.valor;
        BEGIN
          IF economia_potencial > 0 THEN
            opcoes_planos := opcoes_planos || json_build_object(
              'nome', plano_opcao.nome_plano,
              'valor', plano_opcao.valor,
              'economia', economia_potencial
            );
          END IF;
        END;
      END LOOP;
      
      RAISE NOTICE 'Encontradas % opções de economia', array_length(opcoes_planos, 1);
      
      -- Se há opções de economia, adicionar aos detalhes
      IF array_length(opcoes_planos, 1) > 0 THEN
        tem_economia_precisa := true;
        
        -- Calcular economia do plano mais barato para o total
        DECLARE
          maior_economia NUMERIC := (opcoes_planos[1]->>'economia')::NUMERIC;
        BEGIN
          economia_total := economia_total + maior_economia;
          
          -- Criar item de detalhes com todas as opções
          economia_item := json_build_object(
            'servico', servico_encontrado,
            'planoAtual', json_build_object(
              'nome', subscription_record.subscription_name,
              'valor', subscription_record.price
            ),
            'opcoes', opcoes_planos,
            'subscriptionId', subscription_record.subscription_id
          );
          
          economia_detalhes := economia_detalhes || economia_item;
        END;
      END IF;
    ELSE
      RAISE NOTICE 'Nenhum serviço encontrado para: %', subscription_record.subscription_name;
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
          'opcoes', ARRAY[json_build_object(
            'nome', 'Estimativa de plano mais barato',
            'valor', subscription_record.price - economia_estimada,
            'economia', economia_estimada
          )],
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