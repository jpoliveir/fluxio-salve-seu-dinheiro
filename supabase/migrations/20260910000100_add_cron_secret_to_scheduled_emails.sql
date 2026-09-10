-- As edge functions de e-mail agendado agora exigem o header x-cron-secret
-- (ver commit de segurança que adiciona essa checagem no código delas).
-- Gera um segredo aleatório no Vault do Supabase em vez de hardcodar um
-- valor no código versionado no Git.
SELECT vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'cron_secret',
  'Enviado como header x-cron-secret para autenticar as edge functions de e-mail agendadas (send-renewal-reminders, send-onboarding-reminders, send-winback-emails)'
)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION send_renewal_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ytpdbvglbhhdaufjuvtt.supabase.co/functions/v1/send-renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cGRidmdsYmhoZGF1Zmp1dnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODg1NDIsImV4cCI6MjA3MDM2NDU0Mn0.HTsQxEHTWu8mEXvziVoLi1qoV95VsNi9xrNVM_xvjWI',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{"scheduled": true}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION send_onboarding_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ytpdbvglbhhdaufjuvtt.supabase.co/functions/v1/send-onboarding-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cGRidmdsYmhoZGF1Zmp1dnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODg1NDIsImV4cCI6MjA3MDM2NDU0Mn0.HTsQxEHTWu8mEXvziVoLi1qoV95VsNi9xrNVM_xvjWI',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{"scheduled": true}'::jsonb
  );
END;
$$;

-- Nota: não encontrei um agendamento SQL (pg_cron) para send-winback-emails
-- neste repositório. Se ela estiver agendada pela UI de Cron do Supabase
-- (Edge Functions > Cron), adicione manualmente o header x-cron-secret
-- com o mesmo valor lá, ou me avise se preferir migrar para pg_cron também.

COMMENT ON FUNCTION send_renewal_reminders() IS 'Dispara lembretes de renovação. Chama a edge function autenticando com x-cron-secret (Vault: cron_secret).';
COMMENT ON FUNCTION send_onboarding_reminders() IS 'Dispara lembretes de onboarding. Chama a edge function autenticando com x-cron-secret (Vault: cron_secret).';
