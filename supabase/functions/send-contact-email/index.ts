import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RECIPIENT_EMAIL = "vladsec@proton.me";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  name: string;
  email: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received request to send-contact-email");
    
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      throw new Error("Missing API key configuration");
    }

    const { name, email, message }: EmailRequest = await req.json();
    
    console.log("Parsed request data:", { name, email, messageLength: message.length });

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      throw new Error("Invalid email format");
    }

    console.log("Sending email to:", RECIPIENT_EMAIL);
    
    // Send email using Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Contact Form <onboarding@resend.dev>",
        to: [RECIPIENT_EMAIL],
        subject: `New Contact Form Message from ${name}`,
        html: `
          <h2>New message from your website contact form</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
        reply_to: email,
      }),
    });

    const responseText = await res.text();
    console.log("Resend API response:", {
      status: res.status,
      statusText: res.statusText,
      body: responseText
    });

    if (!res.ok) {
      console.error("Resend API error:", responseText);
      throw new Error(`Failed to send email: ${responseText}`);
    }

    console.log("Email sent successfully");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
};

serve(handler);