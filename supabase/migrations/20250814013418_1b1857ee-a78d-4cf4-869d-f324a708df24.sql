-- Adicionar campo de status para classificação das assinaturas
ALTER TABLE public.subscriptions 
ADD COLUMN subscription_status TEXT DEFAULT 'essencial' 
CHECK (subscription_status IN ('essencial', 'nao_essencial', 'otimizavel'));

-- Atualizar trigger para updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();