import { z } from "zod";

// Validação para email
export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Email inválido" })
  .max(255, { message: "Email deve ter no máximo 255 caracteres" });

// Validação para senha
export const passwordSchema = z
  .string()
  .min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
  .max(100, { message: "Senha deve ter no máximo 100 caracteres" });

// Validação para nome
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Nome não pode estar vazio" })
  .max(100, { message: "Nome deve ter no máximo 100 caracteres" });

// Schema de autenticação
export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema.optional(),
});

// Validação para assinatura
export const subscriptionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Nome não pode estar vazio" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  price: z
    .number()
    .min(0.50, { message: "Preço mínimo é R$ 0,50" })
    .max(9999.99, { message: "Preço máximo é R$ 9.999,99" })
    .refine(
      (val) => Number((val * 100).toFixed(0)) === val * 100,
      { message: "Preço deve ter no máximo 2 casas decimais" }
    ),
  category: z.enum(["alimentacao", "musica", "streaming", "outros"], {
    errorMap: () => ({ message: "Categoria inválida" }),
  }),
  billing_cycle: z.enum(["monthly", "yearly"], {
    errorMap: () => ({ message: "Ciclo de cobrança inválido" }),
  }),
  next_charge_date: z.string().optional(),
  servico: z.string().max(100).optional(),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type AuthInput = z.infer<typeof authSchema>;
