import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONSENSUS_THRESHOLD = 0.35; // 35% of users must report same price
const MIN_REPORTS = 3; // Minimum reports needed to consider consensus

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscriptionName, price, category, userId, subscriptionId } = await req.json();
    
    console.log('[SYNC-PRICING] Received:', { subscriptionName, price, category });

    if (!subscriptionName || !price) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[SYNC-PRICING] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch current services
    const { data: currentServices, error: fetchError } = await supabase
      .from('servicos_planos')
      .select('servico, nome_plano, valor');

    if (fetchError) {
      console.error('[SYNC-PRICING] Error fetching services:', fetchError);
      throw fetchError;
    }

    // Use AI to identify service and plan
    const aiPrompt = `Identifique o serviço e plano baseado no nome da assinatura.

ASSINATURA: "${subscriptionName}"
PREÇO: R$ ${price}
CATEGORIA: ${category || 'não informada'}

SERVIÇOS NA BASE:
${JSON.stringify(currentServices?.map(s => ({ servico: s.servico, plano: s.nome_plano })) || [], null, 2)}

Responda APENAS com JSON válido:
{
  "servico": "Nome do Serviço (exato como na base ou novo)",
  "nome_plano": "Nome do Plano (ex: Básico, Padrão, Premium)",
  "is_new_service": true/false,
  "confidence": 0.0-1.0
}

Se não conseguir identificar, use confidence: 0.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Você identifica serviços de streaming/assinaturas. Retorne APENAS JSON válido.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[SYNC-PRICING] AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, message: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content?.trim() || '';
    
    // Clean markdown
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let identification;
    try {
      identification = JSON.parse(content);
    } catch (e) {
      console.error('[SYNC-PRICING] Parse error:', e, content);
      return new Response(
        JSON.stringify({ success: false, message: 'Could not identify service' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SYNC-PRICING] AI identification:', identification);

    if (identification.confidence < 0.5) {
      return new Response(
        JSON.stringify({ success: true, action: 'none', message: 'Low confidence identification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { servico, nome_plano, is_new_service } = identification;

    // Record the price report
    if (userId) {
      const { error: reportError } = await supabase
        .from('price_reports')
        .insert({
          user_id: userId,
          servico,
          nome_plano,
          valor_reportado: price
        });

      if (reportError && reportError.code !== '23505') {
        console.error('[SYNC-PRICING] Report insert error:', reportError);
      }
    }

    // Check consensus for existing services
    if (!is_new_service) {
      // Get all reports for this service/plan
      const { data: reports, error: reportsError } = await supabase
        .from('price_reports')
        .select('valor_reportado')
        .eq('servico', servico)
        .eq('nome_plano', nome_plano)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (reportsError) {
        console.error('[SYNC-PRICING] Reports fetch error:', reportsError);
      }

      const totalReports = reports?.length || 0;
      
      if (totalReports >= MIN_REPORTS) {
        // Count occurrences of each price
        const priceCounts: Record<string, number> = {};
        reports?.forEach(r => {
          const key = r.valor_reportado.toString();
          priceCounts[key] = (priceCounts[key] || 0) + 1;
        });

        // Find most common price
        let mostCommonPrice = 0;
        let mostCommonCount = 0;
        Object.entries(priceCounts).forEach(([priceStr, count]) => {
          if (count > mostCommonCount) {
            mostCommonCount = count;
            mostCommonPrice = parseFloat(priceStr);
          }
        });

        const consensusPercentage = mostCommonCount / totalReports;
        console.log('[SYNC-PRICING] Consensus check:', { totalReports, mostCommonPrice, consensusPercentage });

        // Get current price
        const currentService = currentServices?.find(s => s.servico === servico && s.nome_plano === nome_plano);
        const currentPrice = currentService?.valor || 0;

        if (consensusPercentage >= CONSENSUS_THRESHOLD && Math.abs(mostCommonPrice - currentPrice) > 2) {
          // Update the price in servicos_planos
          const { error: updateError } = await supabase
            .from('servicos_planos')
            .update({ valor: mostCommonPrice, updated_at: new Date().toISOString() })
            .eq('servico', servico)
            .eq('nome_plano', nome_plano);

          if (updateError) {
            console.error('[SYNC-PRICING] Update error:', updateError);
          } else {
            console.log('[SYNC-PRICING] Price updated via consensus:', { servico, nome_plano, oldPrice: currentPrice, newPrice: mostCommonPrice });

            // Create suggestions for affected users
            const { data: affectedSubs } = await supabase
              .from('subscriptions')
              .select('id, user_id, price')
              .eq('servico', servico)
              .neq('price', mostCommonPrice);

            if (affectedSubs && affectedSubs.length > 0) {
              const suggestions = affectedSubs.map(sub => ({
                user_id: sub.user_id,
                subscription_id: sub.id,
                servico,
                nome_plano,
                current_price: sub.price,
                suggested_price: mostCommonPrice
              }));

              await supabase
                .from('price_suggestions')
                .upsert(suggestions, { onConflict: 'user_id,subscription_id,suggested_price' });
            }

            return new Response(
              JSON.stringify({
                success: true,
                action: 'updated',
                servico,
                nome_plano,
                old_price: currentPrice,
                new_price: mostCommonPrice,
                consensus: Math.round(consensusPercentage * 100)
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'reported',
          servico,
          nome_plano,
          total_reports: totalReports,
          message: totalReports < MIN_REPORTS 
            ? `Aguardando mais ${MIN_REPORTS - totalReports} relatórios para consenso`
            : 'Preço registrado, aguardando consenso de 35%'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle new service - only add after consensus
    if (is_new_service) {
      const { data: newServiceReports } = await supabase
        .from('price_reports')
        .select('valor_reportado')
        .eq('servico', servico)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const totalNewReports = newServiceReports?.length || 0;

      if (totalNewReports >= MIN_REPORTS) {
        // Check consensus for new service
        const priceCounts: Record<string, number> = {};
        newServiceReports?.forEach(r => {
          const key = r.valor_reportado.toString();
          priceCounts[key] = (priceCounts[key] || 0) + 1;
        });

        let mostCommonPrice = 0;
        let mostCommonCount = 0;
        Object.entries(priceCounts).forEach(([priceStr, count]) => {
          if (count > mostCommonCount) {
            mostCommonCount = count;
            mostCommonPrice = parseFloat(priceStr);
          }
        });

        const consensusPercentage = mostCommonCount / totalNewReports;

        if (consensusPercentage >= CONSENSUS_THRESHOLD) {
          const { error: insertError } = await supabase
            .from('servicos_planos')
            .insert({ servico, nome_plano, valor: mostCommonPrice });

          if (!insertError) {
            console.log('[SYNC-PRICING] New service added via consensus:', { servico, nome_plano, price: mostCommonPrice });
            return new Response(
              JSON.stringify({
                success: true,
                action: 'inserted',
                servico,
                nome_plano,
                valor: mostCommonPrice,
                consensus: Math.round(consensusPercentage * 100)
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'pending_new',
          servico,
          nome_plano,
          total_reports: totalNewReports,
          message: `Novo serviço detectado, aguardando ${MIN_REPORTS} relatórios para adicionar`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, action: 'none' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SYNC-PRICING] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
