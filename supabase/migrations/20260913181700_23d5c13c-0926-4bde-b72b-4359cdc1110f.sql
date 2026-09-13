-- Trigger functions: only the database itself should execute these
REVOKE EXECUTE ON FUNCTION public.validate_user_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Cron/scheduler functions: only service_role (edge functions / pg_cron) should call these
REVOKE EXECUTE ON FUNCTION public.send_renewal_reminders() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_onboarding_reminders() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_renewal_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.send_onboarding_reminders() TO service_role;

-- Price consensus: called by the sync-pricing edge function with service role key
REVOKE EXECUTE ON FUNCTION public.get_price_consensus(text, text, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_price_consensus(text, text, numeric) TO service_role;