-- Adicionar coluna para rastrear último email de winback enviado
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_winback_email_sent TIMESTAMP WITH TIME ZONE;