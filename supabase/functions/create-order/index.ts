import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, studentData } = await req.json()
    
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!
    
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          email: studentData.email,
          name: studentData.name,
          grade: studentData.grade,
          board: studentData.board,
          subjects: JSON.stringify(studentData.interested_subjects)
        }
      })
    })
    
    const order = await orderResponse.json()
    
    if (!orderResponse.ok) {
      throw new Error(order.error?.description || 'Order creation failed')
    }
    
    return new Response(
      JSON.stringify({ success: true, order }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})