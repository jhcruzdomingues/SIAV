// Backend Mercado Pago - Supabase Edge Function (Produção)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Lida com a requisição de preflight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { plan, period, user } = body

    // Pegue seu token nas variáveis de ambiente do Supabase
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    
    if (!MP_ACCESS_TOKEN) {
      throw new Error("Token do Mercado Pago não configurado no backend.")
    }

    // Definir valores baseados no plano
    const price = plan === 'professional' ? (period === 'yearly' ? 178.80 : 19.90) : (period === 'yearly' ? 99.00 : 9.90)
    const title = `Assinatura SIAV - Plano ${plan === 'professional' ? 'Profissional' : 'Estudante'} (${period === 'yearly' ? 'Anual' : 'Mensal'})`

    // Payload para a API do Mercado Pago
    const preferenceData = {
      items: [
        {
          title: title,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: price,
        }
      ],
      payer: {
        email: user.email,
        name: user.name,
      },
      back_urls: {
        success: "https://siav.netlify.app/?status=success",
        failure: "https://siav.netlify.app/?status=failure",
        pending: "https://siav.netlify.app/?status=pending"
      },
      auto_return: "approved",
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    })

    const preference = await response.json()

    return new Response(JSON.stringify(preference), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})