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
const PLAN_CONFIG: Record<string, { value: number; description: string }> = {
  premium: { value: 14.90, description: "Fluxio Premium - assinatura mensal" },
  enterprise: { value: 29.90, description: "Fluxio Ultimate - assinatura mensal" },
};

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

    const origin = req.headers.get("origin") ?? "https://fluxio.app";

    // externalReference liga o checkout ao usuário + plano, consultado no webhook
    const externalReference = `${user.id}:${plan}`;

    logStep("Criando checkout na Asaas", { userId: user.id, plan });

    const checkoutPayload = {
      billingTypes: ["PIX", "CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      callback: {
        successUrl: `${origin}/payment-success`,
        cancelUrl: `${origin}/payment-canceled`,
        expiredUrl: `${origin}/payment-canceled`,
      },
      items: [
        {
          name: planConfig.description,
          description: planConfig.description,
          quantity: 1,
          value: planConfig.value,
        },
      ],
      customerData: {
        email: user.email,
      },
      subscription: {
        cycle: "MONTHLY",
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
