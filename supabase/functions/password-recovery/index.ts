
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function brevoConfig() {
  return {
    apiKey: Deno.env.get("BREVO_API_KEY") ?? Deno.env.get("SENDINBLUE_API_KEY"),
    fromEmail: Deno.env.get("BREVO_FROM_EMAIL") ?? Deno.env.get("BREVO_SENDER_EMAIL"),
    fromName: Deno.env.get("BREVO_FROM_NAME") ?? Deno.env.get("BREVO_SENDER_NAME") ?? "POSSARA",
  };
}

async function sendRecoveryEmail(email: string, actionLink: string) {
  const config = brevoConfig();
  if (!config.apiKey || !config.fromEmail) return false;

  const htmlContent =
    '<!doctype html><html><body style="margin:0;background:#f7f6fb;font-family:Arial,sans-serif;color:#191724">' +
    '<div style="max-width:560px;margin:0 auto;padding:32px 20px">' +
    '<div style="background:#fff;border-radius:20px;padding:30px;border:1px solid #ece9f3">' +
    '<div style="font-size:22px;font-weight:800;letter-spacing:.04em">POSSARA</div>' +
    '<h1 style="font-size:24px;margin:24px 0 10px">Reset your password</h1>' +
    '<p style="line-height:1.6;color:#5d5969">We received a request to reset your POSSARA password.</p>' +
    '<p style="margin:26px 0"><a href="' +
    actionLink +
    '" style="display:inline-block;background:#191724;color:#fff;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700">Choose a new password</a></p>' +
    '<p style="line-height:1.6;color:#5d5969">If you did not request this, ignore this email. The recovery link is single-use and expires according to POSSARA authentication security settings.</p>' +
    '</div></div></body></html>';

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: config.fromName, email: config.fromEmail },
        to: [{ email }],
        subject: "Reset your POSSARA password",
        tags: ["possara-password-recovery"],
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error(
        "Brevo password recovery delivery failed",
        response.status,
        (await response.text()).slice(0, 600),
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Brevo password recovery exception", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const generic = {
    ok: true,
    message: "If an account exists for that email, POSSARA will send a password reset link.",
  };

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const redirectTo = String(body?.redirectTo ?? "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json({ ok: false, error: "Enter a valid email address." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const config = brevoConfig();

    if (!supabaseUrl || !serviceRoleKey || !config.apiKey || !config.fromEmail) {
      console.error("Password recovery service is missing Supabase or Brevo configuration.");
      return json({
        ok: false,
        error: "Password reset email is temporarily unavailable. Please try again later.",
      }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const emailHash = await sha256(email + ":" + serviceRoleKey);
    const now = new Date();
    const { data: limitRow } = await admin
      .from("password_recovery_limits")
      .select("last_sent_at,window_started_at,send_count")
      .eq("email_hash", emailHash)
      .maybeSingle();

    if (
      limitRow?.last_sent_at &&
      now.getTime() - new Date(limitRow.last_sent_at).getTime() < 60_000
    ) {
      return json(generic);
    }

    const windowStart = limitRow?.window_started_at
      ? new Date(limitRow.window_started_at)
      : now;
    const withinWindow = now.getTime() - windowStart.getTime() < 60 * 60_000;
    const count = withinWindow ? Number(limitRow?.send_count ?? 0) : 0;
    if (count >= 5) return json(generic);

    const safeRedirect =
      redirectTo && /^https?:\/\//i.test(redirectTo)
        ? redirectTo
        : undefined;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: safeRedirect ? { redirectTo: safeRedirect } : undefined,
    });

    if (linkError || !linkData.properties?.action_link) {
      return json(generic);
    }

    const sent = await sendRecoveryEmail(email, linkData.properties.action_link);
    if (!sent) {
      return json({
        ok: false,
        error: "Password reset email is temporarily unavailable. Please try again later.",
      }, 503);
    }

    await admin
      .from("password_recovery_limits")
      .upsert({
        email_hash: emailHash,
        last_sent_at: now.toISOString(),
        window_started_at: (withinWindow ? windowStart : now).toISOString(),
        send_count: count + 1,
        updated_at: now.toISOString(),
      }, { onConflict: "email_hash" });

    return json(generic);
  } catch (error) {
    console.error("password-recovery exception", error);
    return json({
      ok: false,
      error: "Password reset email is temporarily unavailable. Please try again later.",
    }, 503);
  }
});
