-- Adicionar mais planos reais para comparação
INSERT INTO public.servicos_planos (servico, nome_plano, valor) VALUES
-- Mais opções Netflix
('Netflix', 'Mobile', 9.90),
('Netflix', 'Básico HD', 22.90),

-- Planos anuais com desconto
('Netflix', 'Padrão Anual', 29.90),
('Netflix', 'Premium Anual', 39.90),
('Spotify', 'Individual Anual', 18.90),
('Spotify', 'Estudante', 11.90),
('Apple Music', 'Individual Anual', 18.90),
('Apple Music', 'Estudante', 11.90),
('YouTube Premium', 'Individual Anual', 17.90),
('YouTube Premium', 'Estudante', 11.90),

-- Planos família mais baratos
('Disney+', 'Anual', 23.90),
('HBO Max', 'Básico Anual', 24.90),
('Amazon Prime', 'Anual', 9.90),
('Globoplay', 'Básico Anual', 19.90),

-- Novos serviços
('Paramount+', 'Essencial', 19.90),
('Paramount+', 'Premium', 29.90),
('Crunchyroll', 'Mega Fan', 24.90),
('Crunchyroll', 'Fan', 14.90),
('Star+', 'Mensal', 32.90),
('Star+', 'Anual', 27.90),
('Discovery+', 'Mensal', 21.90),
('Discovery+', 'Anual', 17.90),

-- Serviços de produtividade
('Microsoft 365', 'Personal', 25.00),
('Microsoft 365', 'Family', 35.00),
('Google One', '100GB', 6.99),
('Google One', '200GB', 9.99),
('Adobe Creative Cloud', 'Individual', 85.00),
('Adobe Creative Cloud', 'Estudante', 45.00),
('Canva Pro', 'Individual', 54.90),
('Notion', 'Personal Pro', 32.00),

-- Serviços de delivery
('iFood Pro', 'Mensal', 19.90),
('Uber One', 'Mensal', 24.90),
('Amazon Prime (Delivery)', 'Mensal', 14.90),

-- Jogos
('PlayStation Plus', 'Essential', 29.90),
('PlayStation Plus', 'Extra', 52.90),
('Xbox Game Pass', 'Ultimate', 45.00),
('Xbox Game Pass', 'PC', 29.90),
('Nintendo Switch Online', 'Individual', 20.00),

-- Fitness
('Gympass', 'Bronze', 69.90),
('Gympass', 'Silver', 109.90),
('Nike Training Club', 'Premium', 39.90)

ON CONFLICT (id) DO NOTHING;