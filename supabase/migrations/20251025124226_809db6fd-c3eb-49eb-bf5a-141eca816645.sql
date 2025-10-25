-- Deletar assinaturas duplicadas do Fluxio, mantendo apenas a mais recente de cada usuário
DELETE FROM subscriptions 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at DESC) as rn
    FROM subscriptions
    WHERE name = 'Fluxio'
  ) t
  WHERE t.rn > 1
);

-- Criar índice único para prevenir duplicatas de assinaturas do Fluxio ativas
CREATE UNIQUE INDEX IF NOT EXISTS unique_fluxio_per_user 
ON subscriptions (user_id) 
WHERE name = 'Fluxio' AND status = 'active';