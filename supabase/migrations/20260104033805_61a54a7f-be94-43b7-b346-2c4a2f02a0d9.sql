-- Tabela para armazenar assinaturas Kiwify
CREATE TABLE public.kiwify_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('premium', 'ultimate')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'refunded')),
  kiwify_subscription_id TEXT,
  kiwify_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Índices para busca
CREATE INDEX idx_kiwify_subscriptions_user_id ON public.kiwify_subscriptions(user_id);
CREATE INDEX idx_kiwify_subscriptions_email ON public.kiwify_subscriptions(email);
CREATE INDEX idx_kiwify_subscriptions_status ON public.kiwify_subscriptions(status);

-- Enable RLS
ALTER TABLE public.kiwify_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem suas próprias assinaturas
CREATE POLICY "Users can view their own kiwify subscriptions"
ON public.kiwify_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_kiwify_subscriptions_updated_at
BEFORE UPDATE ON public.kiwify_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();