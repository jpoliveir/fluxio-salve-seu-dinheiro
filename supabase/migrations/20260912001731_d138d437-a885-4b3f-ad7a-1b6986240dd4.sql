-- 1. Restrict price_suggestions INSERT to own rows
DROP POLICY IF EXISTS "Service can insert suggestions" ON public.price_suggestions;
CREATE POLICY "Users can insert their own suggestions"
ON public.price_suggestions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Revoke EXECUTE on SECURITY DEFINER functions that should not be callable via API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_user_id() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.send_onboarding_reminders() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.send_renewal_reminders() FROM anon, authenticated;

-- 3. App RPCs: only signed-in users, never anonymous
REVOKE ALL ON FUNCTION public.calcular_economia_assinaturas(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_economia_assinaturas(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_price_consensus(text, text, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_price_consensus(text, text, numeric) TO authenticated;