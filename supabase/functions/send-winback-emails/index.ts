import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WINBACK-EMAILS] ${step}${detailsStr}`);
};

const PLAN_FEATURES = [
  'Assinaturas ilimitadas',
  'Análise de economia potencial',
  'Relatórios avançados',
  'Categorização inteligente',
  'Alertas de cobrança',
  'Suporte prioritário',
];

async function sendWinbackEmail(resend: Resend, email: string, displayName: string, wasSubscriber: boolean) {
  const subject = wasSubscriber 
    ? '💔 Sentimos sua falta no Fluxio - Volte a economizar!'
    : '🚀 Você ainda não conhece todo o potencial do Fluxio!';
  
  const headline = wasSubscriber
    ? 'Queremos você de volta!'
    : 'Desbloqueie todo o potencial do Fluxio!';
  
  const introText = wasSubscriber
    ? 'Você já experimentou os benefícios do Fluxio Premium e sabemos que fez diferença no controle das suas assinaturas. Por que não voltar a economizar?'
    : 'Você está usando o Fluxio, mas ainda não desbloqueou todas as funcionalidades que podem te ajudar a economizar ainda mais! Conheça os benefícios Premium:';

  const featuresHtml = PLAN_FEATURES.map(f => `<li style="margin-bottom: 8px;">✓ ${f}</li>`).join('');

  try {
    const { data, error } = await resend.emails.send({
      from: "Fluxio <noreply@resend.dev>",
      to: [email],
      subject,
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
                        ${headline}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 22px;">
                        Olá, ${displayName}! 👋
                      </h2>
                      
                      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                        ${introText}
                      </p>
                      
                      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #bbf7d0;">
                        <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
                          🎁 Benefícios Premium:
                        </h3>
                        <ul style="color: #15803d; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 0; list-style: none;">
                          ${featuresHtml}
                        </ul>
                      </div>
                      
                      <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #fde68a;">
                        <p style="color: #92400e; font-size: 16px; line-height: 1.6; margin: 0; text-align: center;">
                          <strong>💰 Usuários Premium economizam em média R$ 150/mês</strong><br>
                          identificando assinaturas esquecidas e preços melhores!
                        </p>
                      </div>
                      
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="https://fluxio.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                              ${wasSubscriber ? 'Reativar Premium →' : 'Ver Planos →'}
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
                      <p style="color: #a1a1aa; font-size: 11px; margin: 10px 0 0 0;">
                        <a href="https://fluxio.app/unsubscribe" style="color: #a1a1aa;">Cancelar inscrição</a>
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
      logStep("Error sending winback email", { email, error });
      return false;
    }
    logStep("Winback email sent", { email, emailId: data?.id });
    return true;
  } catch (error) {
    logStep("Exception sending winback email", { email, error: String(error) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    logStep("RESEND_API_KEY not configured");
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const resend = new Resend(resendApiKey);

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Starting winback email job");

    // Data de 45 dias atrás
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    const fortyFiveDaysAgoStr = fortyFiveDaysAgo.toISOString().split('T')[0];

    // Buscar todos os usuários
    const { data: users, error: usersError } = await supabaseClient.auth.admin.listUsers();
    if (usersError) {
      logStep("Error fetching users", { error: usersError.message });
      throw usersError;
    }

    logStep("Found users", { count: users.users.length });

    // Buscar todas as assinaturas Kiwify
    const { data: allSubscriptions, error: subsError } = await supabaseClient
      .from('kiwify_subscriptions')
      .select('*');

    if (subsError) {
      logStep("Error fetching subscriptions", { error: subsError.message });
      throw subsError;
    }

    // Buscar profiles para saber último email de winback enviado
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, display_name, last_winback_email_sent');

    if (profilesError) {
      logStep("Error fetching profiles", { error: profilesError.message });
    }

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const subscriptionsMap = new Map<string, any>();
    
    allSubscriptions?.forEach(sub => {
      const existing = subscriptionsMap.get(sub.user_id);
      if (!existing || new Date(sub.created_at) > new Date(existing.created_at)) {
        subscriptionsMap.set(sub.user_id, sub);
      }
    });

    let emailsSent = 0;
    let skipped = 0;

    for (const user of users.users) {
      const profile = profilesMap.get(user.id);
      const subscription = subscriptionsMap.get(user.id);
      
      // Verificar se já enviamos email nos últimos 45 dias
      if (profile?.last_winback_email_sent) {
        const lastSent = new Date(profile.last_winback_email_sent);
        const daysSinceLastEmail = Math.floor((Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastEmail < 45) {
          logStep("Skipping user - email sent recently", { 
            email: user.email, 
            daysSinceLastEmail 
          });
          skipped++;
          continue;
        }
      }

      // Se tem assinatura ativa, pular
      if (subscription?.status === 'active') {
        logStep("Skipping user - active subscription", { email: user.email });
        skipped++;
        continue;
      }

      // Determinar se era assinante ou nunca assinou
      const wasSubscriber = subscription !== undefined;
      const displayName = profile?.display_name || user.email?.split('@')[0] || 'usuário';

      // Enviar email
      const success = await sendWinbackEmail(
        resend, 
        user.email!, 
        displayName, 
        wasSubscriber
      );

      if (success) {
        emailsSent++;
        
        // Atualizar data do último email enviado
        await supabaseClient
          .from('profiles')
          .update({ last_winback_email_sent: new Date().toISOString() })
          .eq('id', user.id);
      }

      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logStep("Winback job completed", { emailsSent, skipped });

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent, 
      skipped 
    }), {
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
