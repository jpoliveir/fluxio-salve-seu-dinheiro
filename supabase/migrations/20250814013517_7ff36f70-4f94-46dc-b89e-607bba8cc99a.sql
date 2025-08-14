-- Adicionar campo de status para classificação das assinaturas
ALTER TABLE public.subscriptions 
ADD COLUMN subscription_status TEXT DEFAULT 'essencial' 
CHECK (subscription_status IN ('essencial', 'nao_essencial', 'otimizavel'));