import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscriptionName, price, category } = await req.json();
    
    console.log('[SYNC-PRICING] Received subscription:', { subscriptionName, price, category });

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

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch current services from servicos_planos
    const { data: currentServices, error: fetchError } = await supabase
      .from('servicos_planos')
      .select('servico, nome_plano, valor');

    if (fetchError) {
      console.error('[SYNC-PRICING] Error fetching current services:', fetchError);
      throw fetchError;
    }

    console.log('[SYNC-PRICING] Current services count:', currentServices?.length || 0);

    // Use AI to analyze the subscription and determine updates
    const aiPrompt = `Analise a seguinte assinatura cadastrada por um usuário e determine se devemos atualizar nossa base de preços.

ASSINATURA DO USUÁRIO:
- Nome: "${subscriptionName}"
- Preço informado: R$ ${price}
- Categoria: ${category || 'não informada'}

NOSSA BASE DE SERVIÇOS ATUAL:
${JSON.stringify(currentServices, null, 2)}

INSTRUÇÕES:
1. Identifique o serviço e plano baseado no nome da assinatura
2. Se o serviço existe na base, verifique se o preço está desatualizado (diferença > R$2)
3. Se é um serviço novo e popular (streaming, música, jogos, produtividade), adicione-o

Responda APENAS com um JSON válido no seguinte formato:
{
  "action": "update" | "insert" | "none",
  "servico": "Nome do Serviço",
  "nome_plano": "Nome do Plano",
  "valor": 00.00,
  "reason": "Motivo da decisão"
}

Exemplos de serviços populares para adicionar: Max (antigo HBO Max), Apple TV+, Paramount+, Crunchyroll, Mubi, etc.
Se não conseguir identificar o serviço ou não for relevante, use action: "none".`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em serviços de streaming e assinaturas digitais no Brasil. Analise os dados e retorne APENAS JSON válido, sem markdown ou texto adicional.'
          },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[SYNC-PRICING] AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, message: 'Rate limit exceeded, try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, message: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    console.log('[SYNC-PRICING] AI raw response:', content);

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, message: 'Empty AI response' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse AI response - clean markdown if present
    let decision;
    try {
      let cleanContent = content.trim();
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      decision = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[SYNC-PRICING] Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid AI response format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SYNC-PRICING] AI decision:', decision);

    // Execute the action
    if (decision.action === 'none') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'none', 
          message: decision.reason || 'No update needed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (decision.action === 'update') {
      // Update existing price
      const { error: updateError } = await supabase
        .from('servicos_planos')
        .update({ valor: decision.valor, updated_at: new Date().toISOString() })
        .eq('servico', decision.servico)
        .eq('nome_plano', decision.nome_plano);

      if (updateError) {
        console.error('[SYNC-PRICING] Update error:', updateError);
        throw updateError;
      }

      console.log('[SYNC-PRICING] Updated price:', decision);
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'update',
          servico: decision.servico,
          nome_plano: decision.nome_plano,
          novo_valor: decision.valor,
          message: decision.reason 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (decision.action === 'insert') {
      // Insert new service
      const { error: insertError } = await supabase
        .from('servicos_planos')
        .insert({
          servico: decision.servico,
          nome_plano: decision.nome_plano,
          valor: decision.valor
        });

      if (insertError) {
        // Ignore duplicate key errors
        if (insertError.code === '23505') {
          console.log('[SYNC-PRICING] Service already exists, skipping insert');
          return new Response(
            JSON.stringify({ 
              success: true, 
              action: 'none',
              message: 'Service already exists' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.error('[SYNC-PRICING] Insert error:', insertError);
        throw insertError;
      }

      console.log('[SYNC-PRICING] Inserted new service:', decision);
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'insert',
          servico: decision.servico,
          nome_plano: decision.nome_plano,
          valor: decision.valor,
          message: decision.reason 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, action: 'none', message: 'No action taken' }),
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
