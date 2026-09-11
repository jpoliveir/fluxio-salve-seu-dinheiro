# Corrigir preço e ativação do plano

## Alterações
- Transformar os campos de preço de adicionar e editar assinatura em entrada monetária brasileira: somente dígitos, vírgula fixa e valor deslocado em centavos (`1990` → `19,90`).
- Converter o valor exibido corretamente antes da validação e gravação, preservando o preço numérico no banco.
- Revisar os eventos recebidos do Asaas e corrigir o vínculo entre pagamento, usuário e plano para que uma cobrança confirmada ative o plano.
- Fazer a tela de sucesso aguardar e consultar novamente por alguns instantes, sem afirmar ativação enquanto o plano ainda estiver pendente.

## Verificação
- Testar a digitação e edição do preço no navegador.
- Validar a função de pagamento e confirmar que o plano retornado deixa de ser Free após um evento confirmado.

## Detalhes técnicos
- Centralizar formatação/conversão BRL em utilitários reutilizáveis.
- Manter a validação do webhook por token e o acesso privilegiado somente dentro da função segura.
