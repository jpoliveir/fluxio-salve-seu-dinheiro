-- Criar tabela de serviços e planos
CREATE TABLE public.servicos_planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico TEXT NOT NULL,
  nome_plano TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar campo servico na tabela subscriptions
ALTER TABLE public.subscriptions ADD COLUMN servico TEXT;

-- Inserir alguns dados de exemplo na tabela servicos_planos
INSERT INTO public.servicos_planos (servico, nome_plano, valor) VALUES
('Netflix', 'Básico', 18.90),
('Netflix', 'Padrão', 32.90),
('Netflix', 'Premium', 45.90),
('Spotify', 'Individual', 21.90),
('Spotify', 'Familiar', 34.90),
('Disney+', 'Mensal', 27.90),
('Amazon Prime', 'Mensal', 14.90),
('YouTube Premium', 'Individual', 20.90),
('YouTube Premium', 'Familiar', 33.90),
('Apple Music', 'Individual', 21.90),
('Apple Music', 'Familiar', 34.90),
('HBO Max', 'Básico', 29.90),
('HBO Max', 'Premium', 45.90),
('Globoplay', 'Básico', 24.90),
('Globoplay', 'Premium', 49.90);

-- Criar função para calcular economia de assinaturas
CREATE OR REPLACE FUNCTION public.calcular_economia_assinaturas(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Enable RLS na nova tabela
ALTER TABLE public.servicos_planos ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura da tabela servicos_planos para todos os usuários autenticados
CREATE POLICY "servicos_planos_read_all" ON public.servicos_planos
FOR SELECT
TO authenticated
USING (true);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_servicos_planos_updated_at
BEFORE UPDATE ON public.servicos_planos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();