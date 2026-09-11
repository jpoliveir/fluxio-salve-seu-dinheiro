import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// value em reais, description exibida no checkout hospedado pela Asaas
// name: limite de 30 caracteres imposto pela Asaas
const PLAN_CONFIG: Record<string, { value: number; name: string; description: string }> = {
  premium: { value: 14.90, name: "Fluxio Premium", description: "Fluxio Premium - assinatura mensal" },
  enterprise: { value: 29.90, name: "Fluxio Ultimate", description: "Fluxio Ultimate - assinatura mensal" },
};

async function ensureWebhook(apiUrl: string, apiKey: string, webhookToken: string, webhookUrl: string) {
  const listResponse = await fetch(`${apiUrl}/webhooks`, {
    headers: { "access_token": apiKey },
  });

  if (!listResponse.ok) {
    throw new Error("Não foi possível verificar o webhook da Asaas");
  }

  const webhookList = await listResponse.json();
  const existingWebhook = webhookList?.data?.find((webhook: { id?: string; url?: string }) => webhook.url === webhookUrl);
  const webhookEndpoint = existingWebhook?.id
    ? `${apiUrl}/webhooks/${existingWebhook.id}`
    : `${apiUrl}/webhooks`;
  const webhookResponse = await fetch(webhookEndpoint, {
    method: existingWebhook?.id ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      "access_token": apiKey,
    },
    body: JSON.stringify({
      name: "Fluxio Assinaturas",
      url: webhookUrl,
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: webhookToken,
      emailEnabledForProvider: false,
      events: [
        "PAYMENT_CONFIRMED",
        "PAYMENT_RECEIVED",
        "PAYMENT_OVERDUE",
        "PAYMENT_DELETED",
        "PAYMENT_REFUNDED",
        "PAYMENT_CHARGEBACK_REQUESTED",
      ],
    }),
  });

  if (!webhookResponse.ok) {
    const webhookError = await webhookResponse.json().catch(() => ({}));
    logStep("Erro ao registrar webhook", { status: webhookResponse.status, body: webhookError });
    throw new Error("Não foi possível configurar a confirmação automática do pagamento");
  }

  logStep(existingWebhook ? "Webhook atualizado na Asaas" : "Webhook registrado na Asaas");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { plan } = await req.json();
    const planConfig = PLAN_CONFIG[plan];
    if (!planConfig) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasApiKey) throw new Error("ASAAS_API_KEY não configurada");
    // Ambiente: use https://api-sandbox.asaas.com/v3 em ASAAS_API_URL enquanto testa
    const asaasApiUrl = Deno.env.get("ASAAS_API_URL") ?? "https://api.asaas.com/v3";

    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!webhookToken || !supabaseUrl) {
      throw new Error("Confirmação automática de pagamento não configurada");
    }

    await ensureWebhook(
      asaasApiUrl,
      asaasApiKey,
      webhookToken,
      `${supabaseUrl}/functions/v1/asaas-webhook`,
    );

    const origin = req.headers.get("origin") ?? "https://fluxio.app";

    // externalReference liga o checkout ao usuário + plano, consultado no webhook
    const externalReference = `${user.id}:${plan}`;

    logStep("Criando checkout na Asaas", { userId: user.id, plan });

    // PIX exige uma chave Pix cadastrada na conta Asaas; habilite via ASAAS_ENABLE_PIX=true
    const billingTypes = Deno.env.get("ASAAS_ENABLE_PIX") === "true"
      ? ["PIX", "CREDIT_CARD"]
      : ["CREDIT_CARD"];

    // A Asaas exige nextDueDate na assinatura; os dados do cliente (nome/CPF)
    // são coletados na própria página de checkout.
    const nextDueDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const checkoutPayload = {
      billingTypes,
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      callback: {
        successUrl: `${origin}/payment-success`,
        cancelUrl: `${origin}/payment-canceled`,
        expiredUrl: `${origin}/payment-canceled`,
      },
      items: [
        {
          name: planConfig.name.slice(0, 30),
          description: planConfig.description,
          quantity: 1,
          value: planConfig.value,
        },
      ],
      subscription: {
        cycle: "MONTHLY",
        nextDueDate,
      },
      externalReference,
    };

    const asaasResponse = await fetch(`${asaasApiUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify(checkoutPayload),
    });

    const asaasData = await asaasResponse.json();

    if (!asaasResponse.ok) {
      logStep("Erro ao criar checkout na Asaas", { status: asaasResponse.status, body: asaasData });
      throw new Error(asaasData?.errors?.[0]?.description || "Falha ao criar checkout na Asaas");
    }

    logStep("Checkout criado", { checkoutId: asaasData.id });

    return new Response(JSON.stringify({ url: asaasData.link }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CREATE-CHECKOUT] Error:', errorMessage);
    return new Response(JSON.stringify({
      error: errorMessage,
      details: "Verifique se ASAAS_API_KEY está configurada nos secrets da edge function.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
