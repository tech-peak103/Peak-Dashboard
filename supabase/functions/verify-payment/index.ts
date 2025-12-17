import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, studentData } = await req.json()
    
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!
   
    
    // Verify signature
    const text = razorpay_order_id + "|" + razorpay_payment_id
    const encoder = new TextEncoder()
    const keyData = encoder.encode(RAZORPAY_KEY_SECRET)
    const algorithm = { name: "HMAC", hash: "SHA-256" }
    
    const key = await crypto.subtle.importKey("raw", keyData, algorithm, false, ["sign"])
    const signature = await crypto.subtle.sign(algorithm.name, key, encoder.encode(text))
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    if (razorpay_signature !== expectedSignature) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data: existingUser } = await supabase
      .from('students')
      .select('email')
      .eq('email', studentData.email)
      .single()
    
    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email already registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { error: insertError } = await supabase
  .from('students')
  .insert([{
     name: studentData.name,
        email: studentData.email,
        phone: studentData.phone,
        grade: studentData.grade,
        board: studentData.board,
        address: studentData.address,
        password: studentData.password,
        interested_subjects: studentData.interested_subjects || [],
        registered_at: studentData.registered_at || new Date().toISOString(),
        registration_mode: studentData.registration_mode || 'online',
        payment_id: razorpay_payment_id,
        payment_status: 'completed',
        payment_amount: studentData.payment_amount,
        payment_date: new Date().toISOString(),
        dashboard_access: false,
        paid_subjects: {},
        test_access: {}
  }])

    
    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, message: 'Database save failed', error: insertError.message,
      details: insertError  }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    await supabase.from('incomplete_registrations').delete().eq('email', studentData.email)
    
    return new Response(
      JSON.stringify({ success: true, message: 'Payment verified' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})  
