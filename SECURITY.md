# Segurança do Fluxio

## Melhorias de Segurança Implementadas

### 1. Autenticação e Autorização

#### RLS (Row Level Security)
- ✅ Todas as tabelas têm RLS habilitado
- ✅ Políticas garantem que usuários só acessam seus próprios dados
- ✅ Trigger de validação garante que `user_id` sempre corresponde ao usuário autenticado

#### Sessões e Tokens
- ✅ Sessões persistentes com refresh automático
- ✅ Tokens gerenciados pelo Supabase
- ✅ Logout limpa todas as sessões

### 2. Validação de Inputs

#### Schema de Validação (Zod)
Todos os formulários usam validação com Zod:

```typescript
// Email: máximo 255 caracteres, formato válido
emailSchema.parse(email);

// Senha: mínimo 6, máximo 100 caracteres
passwordSchema.parse(password);

// Assinaturas: validação de preço, categoria, etc.
subscriptionSchema.parse(data);
```

#### Proteções Implementadas
- ✅ Validação client-side antes do envio
- ✅ Validação server-side via RLS e triggers
- ✅ Sanitização de inputs
- ✅ Limites de caracteres
- ✅ Tipos de dados validados

### 3. Proteção de Dados Sensíveis

#### Console Logs
- ✅ Removidos todos os console.logs com dados sensíveis
- ✅ Erros tratados sem expor informações

#### Acesso a Dados
- ✅ Tabela `servicos_planos` restrita a usuários autenticados
- ✅ Cada usuário acessa apenas suas assinaturas
- ✅ Foreign keys com CASCADE para integridade

### 4. Single Page Application (SPA)

#### Navegação
- ✅ Usa `Link` do React Router em vez de tags `<a>`
- ✅ Não há recarregamentos de página
- ✅ Estado mantido durante navegação

#### Rotas Protegidas
```typescript
// Rotas que exigem autenticação
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Rotas públicas redirecionam se já autenticado
<AuthenticatedRedirect>
  <Auth />
</AuthenticatedRedirect>
```

### 5. Segurança do Banco de Dados

#### Triggers de Segurança
```sql
-- Valida que user_id corresponde ao usuário autenticado
CREATE TRIGGER validate_subscription_user_id
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_id();
```

#### Timestamps Automáticos
```sql
-- Atualiza automaticamente updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

#### Foreign Keys
- ✅ `subscriptions.user_id` → `auth.users(id)` ON DELETE CASCADE
- ✅ Garante integridade referencial
- ✅ Dados órfãos são automaticamente removidos

### 6. Índices para Performance
```sql
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_profiles_id ON profiles(id);
```

## Avisos de Segurança Pendentes

Os seguintes avisos requerem ação do usuário no painel do Supabase:

### 1. OTP Expiry (WARN)
**Problema**: Tempo de expiração de OTP excede o recomendado

**Como corrigir**:
1. Acesse Authentication → Settings no Supabase
2. Ajuste "OTP Expiry" para 3600 segundos (1 hora)
3. [Documentação](https://supabase.com/docs/guides/platform/going-into-prod#security)

### 2. Leaked Password Protection (WARN)
**Problema**: Proteção contra senhas vazadas está desabilitada

**Como corrigir**:
1. Acesse Authentication → Providers → Email
2. Habilite "Password Protection"
3. [Documentação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

### 3. Postgres Version (WARN)
**Problema**: Versão do Postgres tem patches de segurança disponíveis

**Como corrigir**:
1. Acesse Project Settings → General
2. Clique em "Upgrade" na seção Database
3. [Documentação](https://supabase.com/docs/guides/platform/upgrading)

### 4. Extension in Public Schema (WARN)
**Problema**: Extensões instaladas no schema público

**Como corrigir**:
- Este aviso é informativo
- Não requer ação imediata
- [Documentação](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)

## Boas Práticas de Segurança

### Para Desenvolvedores

1. **Nunca** faça commit de secrets ou API keys
2. **Sempre** valide inputs no client E server
3. **Use** prepared statements (Supabase faz automaticamente)
4. **Mantenha** dependências atualizadas
5. **Revise** RLS policies regularmente

### Para Usuários

1. **Use** senhas fortes e únicas
2. **Habilite** autenticação de dois fatores (quando disponível)
3. **Revise** dispositivos conectados periodicamente
4. **Não compartilhe** suas credenciais

## Contato de Segurança

Para reportar vulnerabilidades de segurança:
- Email: security@fluxio.app
- Não divulgue vulnerabilidades publicamente

## Atualizações

- **2025-10-11**: Implementação inicial de segurança
  - RLS policies
  - Validação de inputs
  - Triggers de segurança
  - Remoção de logs sensíveis
