-- Atualizar a assinatura Premium Anual para Netflix já que o usuário disse que selecionou Netflix
UPDATE subscriptions 
SET servico = 'Netflix' 
WHERE name = 'Premium Anual' AND servico IS NULL;