import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Clean phone number (remove + and spaces, ensure it starts with country code)
    const cleanPhone = to.replace(/[\s\+]/g, "");
    const phoneNumber = cleanPhone.startsWith("260") ? `+${cleanPhone}` : `+260${cleanPhone}`;

    // Use Twilio API for SMS (or another SMS provider)
    // For now, we'll use a simple log (in production, integrate with actual SMS service)
    console.log("SMS notification:", {
      to: phoneNumber,
      message,
    });

    // TODO: Integrate with actual SMS service (Twilio, etc.)
    // Example with Twilio:
    /*
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: phoneNumber,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio API error: ${error}`);
      }
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "SMS notification queued",
        // In development, log the SMS content
        ...(Deno.env.get("ENVIRONMENT") === "development" && {
          debug: {
            to: phoneNumber,
            message,
          },
        }),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("SMS notification error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send SMS notification" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

