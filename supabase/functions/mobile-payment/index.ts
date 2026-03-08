import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { bookingId, phoneNumber, amount, provider } = await req.json();

    if (!bookingId || !phoneNumber || !amount) {
      throw new Error("Missing required fields: bookingId, phoneNumber, amount");
    }

    console.log(`Processing mobile payment for booking ${bookingId}`, {
      phoneNumber,
      amount,
      provider: provider || "MTN"
    });

    // Here you would integrate with actual mobile money APIs
    // For now, we'll simulate the payment process
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock success response (in real implementation, this would depend on the actual API response)
    const mockSuccess = Math.random() > 0.1; // 90% success rate for demo
    
    if (mockSuccess) {
      // Update booking status to confirmed
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_method: `mobile_money_${provider?.toLowerCase() || 'mtn'}`,
          payment_reference: `MM_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('Error updating booking:', updateError);
        throw new Error('Failed to update booking status');
      }

      console.log(`Payment successful for booking ${bookingId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment processed successfully",
          transactionId: `TXN_${Date.now()}`,
          status: "confirmed"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Payment failed
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          payment_method: `mobile_money_${provider?.toLowerCase() || 'mtn'}`,
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('Error updating booking status:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment failed. Please try again or contact support.",
          error: "PAYMENT_DECLINED"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

  } catch (error) {
    console.error("Mobile payment error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});