-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to send renewal reminder emails
CREATE OR REPLACE FUNCTION send_renewal_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Schedule the function to run daily at 10:00 AM
SELECT cron.schedule(
  'send-renewal-reminders',
  '0 10 * * *', -- Every day at 10:00 AM
  'SELECT send_renewal_reminders();'
);

-- Add a column to track sent reminders to avoid duplicates
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS last_reminder_sent DATE;