# Blindar preços: sugestões não podem afetar planos pagos

## Contexto
- As sugestões de preço (consenso entre usuários) continuam funcionando como estão — elas servem apenas para sugerir atualização do valor das **assinaturas dos usuários** (Netflix, Spotify etc.).
- Os preços dos planos Fluxio (Premium R$14,90, Ultimate R$29,90) são fixos. Verificado: em `create-checkout` o valor sai de `PLAN_CONFIG` no servidor; o cliente não envia preço.

## O que fazer

1. **Revisar o fluxo de checkout de ponta a ponta**
   - Confirmar que `create-checkout` ignora qualquer valor vindo do cliente (só aceita `plan`), que o webhook da Asaas define o plano apenas pelo `externalReference` gerado no servidor, e que nenhum valor digitado pelo usuário pode alterar o valor cobrado.

2. **Revisar o fluxo de sugestões de preço**
   - Confirmar que `price_suggestions` e a função de consenso (`get_price_consensus`) só tocam valores da tabela `subscriptions` do próprio usuário e a tabela de catálogo `servicos_planos` — nunca os preços dos planos de checkout.

3. **Blindagem extra no banco**
   - Garantir que a política de inserção em `price_suggestions` exige que a sugestão pertença ao próprio usuário (já corrigido no item `price_suggestions_insert_no_check`).
   - Confirmar que usuários comuns não têm permissão de escrita em `servicos_planos` (somente o admin oliveirapaulojoao1@gmail.com) — assim nenhum usuário pode alterar valores de referência.

4. **Validação**
   - Testar no preview: criar assinatura com valor digitado, gerar sugestão, e confirmar que o preço dos planos na página de preços e o valor do checkout continuam R$14,90 / R$29,90.

## Notas técnicas
- Nenhuma mudança de preço será necessária se a revisão confirmar o estado atual; as alterações esperadas são apenas de validação/reforço de políticas.
- As demais sugestões de preço ao usuário (banner/popup) permanecem inalteradas.
