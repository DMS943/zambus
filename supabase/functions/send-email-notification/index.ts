import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, template, booking } = await req.json();

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Email templates
    const getEmailBody = (template: string, booking: any) => {
      const baseUrl = Deno.env.get("SITE_URL") || "http://localhost:8080";
      
      switch (template) {
        case "created":
          return `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #2563eb;">Booking Confirmed!</h1>
                  <p>Dear Customer,</p>
                  <p>Your bus booking has been successfully created.</p>
                  
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Booking Details</h2>
                    <p><strong>Booking Reference:</strong> ${booking.reference}</p>
                    <p><strong>Route:</strong> ${booking.origin} → ${booking.destination}</p>
                    <p><strong>Date:</strong> ${booking.date}</p>
                    <p><strong>Departure Time:</strong> ${booking.time}</p>
                    <p><strong>Total Amount:</strong> K${(booking.price / 100).toLocaleString()}</p>
                    <p><strong>Status:</strong> ${booking.status}</p>
                  </div>
                  
                  <p>Please complete your payment to confirm your booking.</p>
                  <p>You can view your booking details at: <a href="${baseUrl}/bookings">${baseUrl}/bookings</a></p>
                  
                  <p>Thank you for choosing ZamBus!</p>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                    This is an automated email. Please do not reply.
                  </p>
                </div>
              </body>
            </html>
          `;
        
        case "confirmed":
          return `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #10b981;">Payment Confirmed!</h1>
                  <p>Dear Customer,</p>
                  <p>Your payment has been successfully processed and your booking is now confirmed.</p>
                  
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Booking Details</h2>
                    <p><strong>Booking Reference:</strong> ${booking.reference}</p>
                    <p><strong>Route:</strong> ${booking.origin} → ${booking.destination}</p>
                    <p><strong>Date:</strong> ${booking.date}</p>
                    <p><strong>Departure Time:</strong> ${booking.time}</p>
                  </div>
                  
                  <p><strong>Important:</strong> Please arrive at the bus station at least 30 minutes before departure.</p>
                  <p>Bring a valid ID and show this booking reference at check-in.</p>
                  
                  <p>You can download your ticket at: <a href="${baseUrl}/bookings">${baseUrl}/bookings</a></p>
                  
                  <p>Thank you for choosing ZamBus. Have a safe journey!</p>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                    This is an automated email. Please do not reply.
                  </p>
                </div>
              </body>
            </html>
          `;
        
        case "cancelled":
          return `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #ef4444;">Booking Cancelled</h1>
                  <p>Dear Customer,</p>
                  <p>Your booking has been cancelled.</p>
                  
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Booking Details</h2>
                    <p><strong>Booking Reference:</strong> ${booking.reference}</p>
                    <p><strong>Route:</strong> ${booking.origin} → ${booking.destination}</p>
                    <p><strong>Date:</strong> ${booking.date}</p>
                  </div>
                  
                  <p>If you have any questions about this cancellation or need to request a refund, please contact our support team.</p>
                  <p>Support: <a href="${baseUrl}/support">${baseUrl}/support</a></p>
                  
                  <p>We hope to serve you again in the future.</p>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                    This is an automated email. Please do not reply.
                  </p>
                </div>
              </body>
            </html>
          `;
        
        default:
          return `<p>Your booking ${booking.reference} status has been updated to ${booking.status}.</p>`;
      }
    };

    // Use Supabase's built-in email service or integrate with Resend/SendGrid
    // For now, we'll use a simple log (in production, integrate with actual email service)
    console.log("Email notification:", {
      to,
      subject,
      body: getEmailBody(template || "created", booking || {}),
    });

    // TODO: Integrate with actual email service (Resend, SendGrid, etc.)
    // Example with Resend:
    /*
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ZamBus <noreply@zambus.co.zm>",
          to: [to],
          subject: subject,
          html: getEmailBody(template || "created", booking || {}),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send email");
      }
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email notification queued",
        // In development, log the email content
        ...(Deno.env.get("ENVIRONMENT") === "development" && {
          debug: {
            to,
            subject,
            body: getEmailBody(template || "created", booking || {}),
          },
        }),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Email notification error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send email notification" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

