-- Fix the function to have proper search_path
CREATE OR REPLACE FUNCTION send_renewal_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the edge function to process reminders
  PERFORM net.http_post(
    url := 'https://ytpdbvglbhhdaufjuvtt.supabase.co/functions/v1/send-renewal-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cGRidmdsYmhoZGF1Zmp1dnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODg1NDIsImV4cCI6MjA3MDM2NDU0Mn0.HTsQxEHTWu8mEXvziVoLi1qoV95VsNi9xrNVM_xvjWI"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
END;
$$;