import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RECIPIENT_EMAIL = "vladsec@proton.me";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    console.log("Processing contact form submission");
    const { name, email, message }: EmailRequest = await req.json();
    
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service is not properly configured");
    }

    // Log the submission details
    console.log("Form submission details:", {
      name,
      fromEmail: email,
      toEmail: RECIPIENT_EMAIL,
      messagePreview: message.substring(0, 50) + "..."
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Contact Form <onboarding@resend.dev>",
        to: [RECIPIENT_EMAIL],
        reply_to: email,
        subject: `New Contact Form Message from ${name}`,
        html: `
          <h2>New message from your website contact form</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      }),
    });

    const responseData = await res.text();
    console.log("Resend API response:", {
      status: res.status,
      statusText: res.statusText,
      body: responseData
    });

    if (!res.ok) {
      throw new Error(`Failed to send email: ${responseData}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Message sent successfully! I'll get back to you soon."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: true,
        message: error.message || "Failed to send message. Please try again later."
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);