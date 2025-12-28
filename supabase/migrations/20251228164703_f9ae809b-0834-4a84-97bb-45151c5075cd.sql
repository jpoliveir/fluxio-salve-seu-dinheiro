-- Create table to track price reports from users
CREATE TABLE public.price_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  servico TEXT NOT NULL,
  nome_plano TEXT NOT NULL,
  valor_reportado NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own price reports
CREATE POLICY "Users can insert price reports"
ON public.price_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.price_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_price_reports_servico_plano ON public.price_reports(servico, nome_plano);
CREATE INDEX idx_price_reports_created ON public.price_reports(created_at DESC);

-- Create a function to get price consensus
CREATE OR REPLACE FUNCTION public.get_price_consensus(
  p_servico TEXT,
  p_nome_plano TEXT,
  p_threshold NUMERIC DEFAULT 0.35
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_reports INTEGER;
  most_common_price NUMERIC;
  most_common_count INTEGER;
  consensus_percentage NUMERIC;
  current_price NUMERIC;
BEGIN
  -- Get reports from last 30 days
  SELECT COUNT(*) INTO total_reports
  FROM price_reports
  WHERE servico = p_servico 
    AND nome_plano = p_nome_plano
    AND created_at > now() - interval '30 days';

  IF total_reports < 3 THEN
    RETURN json_build_object(
      'has_consensus', false,
      'reason', 'insufficient_data',
      'total_reports', total_reports
    );
  END IF;

  -- Find most common reported price
  SELECT valor_reportado, COUNT(*) INTO most_common_price, most_common_count
  FROM price_reports
  WHERE servico = p_servico 
    AND nome_plano = p_nome_plano
    AND created_at > now() - interval '30 days'
  GROUP BY valor_reportado
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  consensus_percentage := most_common_count::NUMERIC / total_reports::NUMERIC;

  -- Get current price from servicos_planos
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
    'price_differs', current_price IS DISTINCT FROM most_common_price
  );
END;
$$;

-- Create table to track pending price suggestions for users
CREATE TABLE public.price_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  servico TEXT NOT NULL,
  nome_plano TEXT NOT NULL,
  current_price NUMERIC NOT NULL,
  suggested_price NUMERIC NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subscription_id, suggested_price)
);

-- Enable RLS
ALTER TABLE public.price_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions
CREATE POLICY "Users can view their suggestions"
ON public.price_suggestions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own suggestions (dismiss/apply)
CREATE POLICY "Users can update their suggestions"
ON public.price_suggestions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Service role can insert suggestions
CREATE POLICY "Service can insert suggestions"
ON public.price_suggestions
FOR INSERT
TO authenticated
WITH CHECK (true);