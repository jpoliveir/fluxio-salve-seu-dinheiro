-- Corrigir acesso público à tabela de preços
-- Apenas usuários autenticados devem ver os planos
DROP POLICY IF EXISTS "servicos_planos_read_all" ON public.servicos_planos;

CREATE POLICY "authenticated_users_can_view_service_plans"
ON public.servicos_planos
FOR SELECT
TO authenticated
USING (true);

-- Garantir que profiles tem RLS adequado e relação correta
-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- Adicionar política para inserção automática de perfil se não existir
CREATE POLICY "users_can_insert_own_profile_once"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Melhorar segurança: garantir que user_id em subscriptions não pode ser nulo
-- e deve sempre corresponder ao usuário autenticado
ALTER TABLE public.subscriptions 
ALTER COLUMN user_id SET NOT NULL;

-- Adicionar constraint para garantir integridade
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Criar função para validar que o user_id corresponde ao usuário autenticado
CREATE OR REPLACE FUNCTION public.validate_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  RETURN NEW;
END;
$$;

-- Adicionar trigger para validar user_id em INSERT e UPDATE
DROP TRIGGER IF EXISTS validate_subscription_user_id ON public.subscriptions;
CREATE TRIGGER validate_subscription_user_id
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_id();

-- Garantir que timestamps são sempre atualizados
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.subscriptions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();