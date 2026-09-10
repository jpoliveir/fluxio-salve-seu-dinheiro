# Conexão de cartões via Open Finance (Pluggy)

Objetivo: o usuário Ultimate conecta seus bancos/cartões, o Fluxio lê as cobranças recorrentes e sugere quais virar assinaturas no painel. Nada é cadastrado sem a confirmação dele.

## Como vai funcionar para o usuário

1. No painel aparece um cartão "Conectar meu banco" — visível só para quem está no plano Ultimate. Nos outros planos aparece um convite para fazer upgrade.
2. Ao clicar, abre a tela oficial do Pluggy onde ele escolhe o banco e faz o login com segurança. O Fluxio nunca vê a senha do banco.
3. Depois de conectar, o Fluxio busca as últimas transações do cartão e monta uma lista de "possíveis assinaturas" (cobranças que se repetem todo mês com valor parecido, e nomes de serviços conhecidos como Netflix, Spotify, etc.).
4. Ele marca o que quer importar, confere nome e valor, e confirma. Só então as assinaturas entram no painel.
5. Um botão "Atualizar" refaz a leitura quando ele quiser, sem duplicar o que já foi importado.

## Antes de começar

Preciso de duas credenciais da sua conta Pluggy (painel Pluggy > Aplicações): o Client ID e o Client Secret. Vou pedir por um formulário seguro; os valores não passam pelo chat. Dá para começar com as credenciais de sandbox (bancos de teste) e depois trocar para produção.

## Detalhes técnicos

Banco de dados (nova migração):
- `bank_connections`: `id`, `user_id`, `pluggy_item_id`, `institution_name`, `status`, `last_synced_at`, timestamps. RLS: dono lê/edita/apaga; `service_role` total; GRANTs explícitos.
- `bank_transactions_cache` (opcional, só para deduplicação): `user_id`, `connection_id`, `pluggy_transaction_id` (único), `description`, `amount`, `date`, `imported_subscription_id`. RLS por dono.
- `subscriptions`: novas colunas `source` (default `manual`) e `bank_connection_id` para marcar o que veio do banco e evitar reimportação.

Edge functions (todas validando JWT em código e checando plano Ultimate via `asaas_subscriptions`/`check-subscription`):
- `pluggy-connect-token`: autentica na API Pluggy com `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET`, devolve um connect token de curta duração para o widget.
- `pluggy-sync`: recebe o `itemId`, salva/atualiza `bank_connections`, busca contas e transações dos últimos 90 dias, roda a detecção de recorrência e devolve a lista de candidatas (sem gravar em `subscriptions`).
- `pluggy-import`: recebe as candidatas confirmadas e insere em `subscriptions` com `source = 'open_finance'`, respeitando as regras e triggers existentes.
- Opcional depois: webhook `pluggy-webhook` (`verify_jwt = false`, token no header) para atualizar conexões automaticamente.

Detecção de recorrência: agrupa transações por descrição normalizada, exige 2+ ocorrências em meses distintos com valor dentro de 10% de variação, define o ciclo (mensal/anual) e a próxima cobrança pela data da última. Casa o nome com `servicos_planos` para preencher serviço e categoria; o que não casar entra como categoria `outros`.

Frontend:
- `src/hooks/usePluggyConnect.tsx`: carrega o widget Pluggy Connect, obtém o token e dispara o sync.
- `src/components/BankConnectionCard.tsx`: estado da conexão, botão conectar/atualizar/desconectar, gate por plano Ultimate.
- `src/components/ImportSubscriptionsDialog.tsx`: lista de candidatas com checkbox, nome e valor editáveis, botão "Importar selecionadas".
- Integração no `src/pages/Dashboard.tsx`, com invalidação das queries de assinaturas após importar.

Segurança: credenciais Pluggy ficam apenas em secrets e são usadas somente nas edge functions; nenhuma credencial bancária é armazenada; toda leitura de conexões passa por RLS do dono.
