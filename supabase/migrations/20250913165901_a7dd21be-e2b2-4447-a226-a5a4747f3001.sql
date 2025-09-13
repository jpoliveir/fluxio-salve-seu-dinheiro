-- Add column to track when the last reminder was sent to users without subscriptions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_onboarding_reminder_sent DATE;

-- Create a function to send onboarding reminder emails
CREATE OR REPLACE FUNCTION send_onboarding_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the edge function to process onboarding reminders
  PERFORM net.http_post(
    url := 'https://ytpdbvglbhhdaufjuvtt.supabase.co/functions/v1/send-onboarding-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cGRidmdsYmhoZGF1Zmp1dnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODg1NDIsImV4cCI6MjA3MDM2NDU0Mn0.HTsQxEHTWu8mEXvziVoLi1qoV95VsNi9xrNVM_xvjWI"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
END;
$$;

-- Schedule the function to run every 3 days at 9:00 AM
SELECT cron.schedule(
  'send-onboarding-reminders',
  '0 9 */3 * *', -- Every 3 days at 9:00 AM
  'SELECT send_onboarding_reminders();'
);