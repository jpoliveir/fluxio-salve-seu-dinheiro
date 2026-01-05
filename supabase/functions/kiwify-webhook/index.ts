import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[KIWIFY-WEBHOOK] ${step}${detailsStr}`);
};

// Mapeamento de produtos Kiwify para planos
const PRODUCT_PLAN_MAP: Record<string, string> = {
  'ZR58V3S': 'premium',
  '53f1YYG': 'ultimate',
};

const PLAN_NAMES: Record<string, string> = {
  'premium': 'Premium',
  'ultimate': 'Ultimate',
};

const PLAN_FEATURES: Record<string, string[]> = {
  'premium': [
    'Assinaturas ilimitadas',
    'Análise de economia potencial',
    'Relatórios avançados',
    'Categorização inteligente',
    'Alertas de cobrança',
  ],
  'ultimate': [
    'Todos os recursos Premium',
    'Múltiplos usuários',
    'Integração com bancos',
    'API personalizada',
    'Suporte prioritário',
  ],
};

async function sendWelcomeEmail(email: string, plan: string, userName?: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    logStep("RESEND_API_KEY not configured, skipping email");
    return;
  }

  const resend = new Resend(resendApiKey);
  const planName = PLAN_NAMES[plan] || plan;
  const features = PLAN_FEATURES[plan] || [];
  const displayName = userName || email.split('@')[0];

  const featuresHtml = features.map(f => `<li style="margin-bottom: 8px;">✓ ${f}</li>`).join('');

  try {
    const { data, error } = await resend.emails.send({
      from: "Fluxio <noreply@resend.dev>",
      to: [email],
      subject: `🎉 Bem-vindo ao Fluxio ${planName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                        🚀 Fluxio ${planName}
                      </h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                        Sua assinatura foi ativada com sucesso!
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 22px;">
                        Olá, ${displayName}! 👋
                      </h2>
                      
                      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                        Obrigado por escolher o <strong>Fluxio ${planName}</strong>! Estamos muito felizes em ter você conosco. Agora você tem acesso a todos os recursos exclusivos do seu plano.
                      </p>
                      
                      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                        <h3 style="color: #18181b; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
                          🎁 Seus benefícios ${planName}:
                        </h3>
                        <ul style="color: #52525b; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 0; list-style: none;">
                          ${featuresHtml}
                        </ul>
                      </div>
                      
                      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                        Acesse seu dashboard agora para começar a gerenciar suas assinaturas de forma inteligente e economizar dinheiro!
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="https://fluxio.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                              Acessar Dashboard →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f4f4f5; padding: 25px 30px; text-align: center; border-top: 1px solid #e4e4e7;">
                      <p style="color: #71717a; font-size: 14px; margin: 0 0 10px 0;">
                        Precisa de ajuda? Responda este email que teremos prazer em ajudar.
                      </p>
                      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                        © 2025 Fluxio. Todos os direitos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      logStep("Error sending welcome email", { error });
    } else {
      logStep("Welcome email sent successfully", { emailId: data?.id });
    }
  } catch (error) {
    logStep("Exception sending welcome email", { error: String(error) });
  }
}

async function sendCancellationEmail(email: string, plan: string, reason: string, userName?: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    logStep("RESEND_API_KEY not configured, skipping cancellation email");
    return;
  }

  const resend = new Resend(resendApiKey);
  const planName = PLAN_NAMES[plan] || plan;
  const features = PLAN_FEATURES[plan] || [];
  const displayName = userName || email.split('@')[0];

  const reasonText = reason === 'cancelled' 
    ? 'foi cancelada' 
    : reason === 'expired' 
      ? 'expirou' 
      : 'foi encerrada';

  const featuresHtml = features.map(f => `<li style="margin-bottom: 8px;">❌ ${f}</li>`).join('');

  try {
    const { data, error } = await resend.emails.send({
      from: "Fluxio <noreply@resend.dev>",
      to: [email],
      subject: `😢 Sua assinatura Fluxio ${planName} ${reasonText}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                        😢 Sentiremos sua falta
                      </h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                        Sua assinatura ${planName} ${reasonText}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 22px;">
                        Olá, ${displayName}
                      </h2>
                      
                      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                        Lamentamos informar que sua assinatura <strong>Fluxio ${planName}</strong> ${reasonText}. Você não terá mais acesso aos seguintes benefícios exclusivos:
                      </p>
                      
                      <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #fecaca;">
                        <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
                          🚫 Benefícios que você perdeu:
                        </h3>
                        <ul style="color: #7f1d1d; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 0; list-style: none;">
                          ${featuresHtml}
                        </ul>
                      </div>
                      
                      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                        Se você mudou de ideia ou cancelou por engano, é fácil reativar sua assinatura e voltar a economizar com o Fluxio!
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="https://fluxio.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                              Reativar Assinatura →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                        Você ainda pode usar o Fluxio gratuitamente com funcionalidades limitadas.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f4f4f5; padding: 25px 30px; text-align: center; border-top: 1px solid #e4e4e7;">
                      <p style="color: #71717a; font-size: 14px; margin: 0 0 10px 0;">
                        Precisa de ajuda ou tem dúvidas? Responda este email.
                      </p>
                      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                        © 2025 Fluxio. Todos os direitos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      logStep("Error sending cancellation email", { error });
    } else {
      logStep("Cancellation email sent successfully", { emailId: data?.id });
    }
  } catch (error) {
    logStep("Exception sending cancellation email", { error: String(error) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const signature = req.headers.get("x-kiwify-signature");
    const webhookSecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
    
    if (webhookSecret && signature) {
      logStep("Signature received", { signature: signature?.substring(0, 20) + "..." });
    }

    const body = await req.json();
    logStep("Webhook payload", { 
      order_id: body.order_id,
      order_status: body.order_status,
      product_id: body.Product?.product_id,
      customer_email: body.Customer?.email
    });

    const orderStatus = body.order_status;
    const customerEmail = body.Customer?.email?.toLowerCase();
    const customerName = body.Customer?.full_name;
    const orderId = body.order_id;
    const subscriptionId = body.Subscription?.id;
    
    const checkoutUrl = body.checkout_link || '';
    const productCode = checkoutUrl.split('/').pop() || body.Product?.product_id || '';
    
    logStep("Processing", { orderStatus, customerEmail, productCode });

    if (!customerEmail) {
      logStep("No customer email found");
      return new Response(JSON.stringify({ error: "Customer email required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let plan = PRODUCT_PLAN_MAP[productCode];
    if (!plan) {
      const amount = body.Commissions?.charge_amount || 0;
      if (amount >= 2500) {
        plan = 'ultimate';
      } else if (amount >= 1000) {
        plan = 'premium';
      } else {
        plan = 'premium';
      }
    }
    logStep("Determined plan", { plan, productCode });

    const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) {
      logStep("Error listing users", { error: userError.message });
      throw userError;
    }
    
    const user = users.users.find(u => u.email?.toLowerCase() === customerEmail);
    
    if (!user) {
      logStep("User not found, storing pending subscription", { email: customerEmail });
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User not found, subscription will be activated when user registers" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("User found", { userId: user.id, email: user.email });

    let subscriptionStatus = 'active';
    let isNewActivation = false;
    
    if (orderStatus === 'refunded' || orderStatus === 'chargedback') {
      subscriptionStatus = 'refunded';
    } else if (orderStatus === 'cancelled') {
      subscriptionStatus = 'cancelled';
    } else if (orderStatus === 'expired') {
      subscriptionStatus = 'expired';
    } else if (orderStatus === 'paid' || orderStatus === 'approved') {
      subscriptionStatus = 'active';
      isNewActivation = true;
    }

    logStep("Mapped status", { original: orderStatus, mapped: subscriptionStatus, isNewActivation });

    const { data: existingSub } = await supabaseClient
      .from('kiwify_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const wasInactive = !existingSub || existingSub.length === 0 || existingSub[0].status !== 'active';
    const shouldSendWelcomeEmail = isNewActivation && wasInactive;

    if (existingSub && existingSub.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('kiwify_subscriptions')
        .update({
          plan,
          status: subscriptionStatus,
          kiwify_subscription_id: subscriptionId,
          kiwify_order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub[0].id);

      if (updateError) {
        logStep("Error updating subscription", { error: updateError.message });
        throw updateError;
      }
      logStep("Updated existing subscription", { id: existingSub[0].id });
    } else {
      const { error: insertError } = await supabaseClient
        .from('kiwify_subscriptions')
        .insert({
          user_id: user.id,
          email: customerEmail,
          plan,
          status: subscriptionStatus,
          kiwify_subscription_id: subscriptionId,
          kiwify_order_id: orderId,
        });

      if (insertError) {
        logStep("Error inserting subscription", { error: insertError.message });
        throw insertError;
      }
      logStep("Created new subscription");
    }

    // Enviar email de boas-vindas apenas para novas ativações
    if (shouldSendWelcomeEmail) {
      logStep("Sending welcome email");
      await sendWelcomeEmail(customerEmail, plan, customerName);
    }

    // Enviar email de cancelamento
    const isCancellation = subscriptionStatus === 'cancelled' || subscriptionStatus === 'expired' || subscriptionStatus === 'refunded';
    if (isCancellation && existingSub && existingSub.length > 0 && existingSub[0].status === 'active') {
      logStep("Sending cancellation email");
      await sendCancellationEmail(customerEmail, plan, subscriptionStatus, customerName);
    }

    logStep("Webhook processed successfully");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
