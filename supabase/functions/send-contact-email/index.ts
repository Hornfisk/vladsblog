import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RECIPIENT_EMAIL = Deno.env.get("RECIPIENT_EMAIL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://vlads.blog",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// In-memory rate limiting: max 3 submissions per IP per 60 seconds
const rateLimit = new Map<string, number>();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 3;

interface EmailRequest {
  name: string;
  email: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const now = Date.now();
  const lastRequest = rateLimit.get(ip) ?? 0;
  if (now - lastRequest < RATE_WINDOW_MS) {
    return new Response(
      JSON.stringify({ error: true, message: "Too many requests. Please wait before sending again." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  rateLimit.set(ip, now);

  try {
    const { name, email, message }: EmailRequest = await req.json();

    // Server-side input validation
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: true, message: "All fields are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (name.length > 100 || message.length > 5000 || email.length > 254) {
      return new Response(
        JSON.stringify({ error: true, message: "Input too long." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return new Response(
        JSON.stringify({ error: true, message: "Invalid email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      throw new Error("Email service is not properly configured");
    }
    if (!RECIPIENT_EMAIL) {
      throw new Error("Recipient email is not configured");
    }

    // HTML-escape all user-supplied values before interpolating into email body
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

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
        subject: `New Contact Form Message from ${safeName}`,
        html: `
          <h2>New message from your website contact form</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Message:</strong></p>
          <p>${safeMessage}</p>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to send email: ${body}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Message sent successfully!" }),
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
        message: error.message || "Failed to send message. Please try again later.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
