REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_onboarding_reminders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_renewal_reminders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calcular_economia_assinaturas(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_price_consensus(text, text, numeric) FROM PUBLIC;

ALTER FUNCTION public.calcular_economia_assinaturas(uuid) SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.calcular_economia_assinaturas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_price_consensus(text, text, numeric) TO authenticated;