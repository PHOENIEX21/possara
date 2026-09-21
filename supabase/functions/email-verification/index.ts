
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

function randomCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1000000).padStart(6, "0");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function requestIp(req: Request) {
  const forwarded = req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  return forwarded.slice(0, 128);
}

async function consumeRateLimit(
  admin: ReturnType<typeof createClient>,
  serviceRoleKey: string,
  action: string,
  rawKey: string,
  limit: number,
  windowSeconds: number,
) {
  const keyHash = await sha256(`${action}:${rawKey}:${serviceRoleKey}`);
  const { data, error } = await admin.rpc("consume_auth_abuse_limit", {
    p_action: action,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("auth rate-limit check failed", action, error);
    return { allowed: false, retryAfterSeconds: 60 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: row?.allowed === true,
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
  };
}

function brevoConfig() {
  return {
    apiKey: Deno.env.get("BREVO_API_KEY") ?? Deno.env.get("SENDINBLUE_API_KEY"),
    fromEmail: Deno.env.get("BREVO_FROM_EMAIL") ?? Deno.env.get("BREVO_SENDER_EMAIL"),
    fromName: Deno.env.get("BREVO_FROM_NAME") ?? Deno.env.get("BREVO_SENDER_NAME") ?? "POSSARA",
  };
}

async function sendVerificationEmail(email: string, code: string) {
  const config = brevoConfig();
  if (!config.apiKey || !config.fromEmail) return false;

  const htmlContent =
    '<!doctype html><html><body style="margin:0;background:#f7f6fb;font-family:Arial,sans-serif;color:#191724">' +
    '<div style="max-width:560px;margin:0 auto;padding:32px 20px">' +
    '<div style="background:#fff;border-radius:20px;padding:30px;border:1px solid #ece9f3">' +
    '<div style="font-size:22px;font-weight:800;letter-spacing:.04em">POSSARA</div>' +
    '<h1 style="font-size:24px;margin:24px 0 10px">Verify your email</h1>' +
    '<p style="line-height:1.6;color:#5d5969">Enter this code in POSSARA to verify your email address.</p>' +
    '<div style="margin:24px 0;padding:18px;border-radius:14px;background:#f4f0ff;text-align:center;font-size:32px;font-weight:800;letter-spacing:.22em">' +
    code +
    '</div>' +
    '<p style="line-height:1.6;color:#5d5969">The code expires in 15 minutes. You can request a new code from the verification screen.</p>' +
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
        subject: "Your POSSARA verification code",
        tags: ["possara-email-verification"],
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error(
        "Brevo verification delivery failed",
        response.status,
        (await response.text()).slice(0, 600),
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Brevo verification delivery exception", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: "Verification service is not configured." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ ok: false, error: "Sign in to verify your email." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user?.id || !user.email) {
    return json({ ok: false, error: "Your session is no longer valid. Sign in again." }, 401);
  }

  const email = user.email.trim().toLowerCase();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email_verified_at")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("verification profile lookup failed", profileError);
    return json({ ok: false, error: "Could not check email verification right now." }, 500);
  }

  const verified = Boolean(profile?.email_verified_at);
  let body: { action?: string; code?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const action = body.action ?? "status";

  if (action === "verify" || action === "resend") {
    const limit = await consumeRateLimit(
      admin,
      serviceRoleKey,
      action === "verify" ? "email_verify_ip" : "email_resend_ip",
      requestIp(req),
      action === "verify" ? 60 : 20,
      3600,
    );
    if (!limit.allowed) {
      return json({
        ok: false,
        verified: false,
        retryAfterSeconds: limit.retryAfterSeconds,
        error: "Too many verification requests from this network. Try again later.",
      }, 429);
    }
  }

  if (action === "status") {
    const { data: challenge } = await admin
      .from("email_verification_challenges")
      .select("expires_at,resend_available_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const config = brevoConfig();
    return json({
      ok: true,
      verified,
      email,
      deliveryConfigured: Boolean(config.apiKey && config.fromEmail),
      expiresAt: challenge?.expires_at ?? null,
      resendAvailableAt: challenge?.resend_available_at ?? null,
    });
  }

  if (verified) return json({ ok: true, verified: true, email });

  if (action === "verify") {
    const code = String(body.code ?? "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) {
      return json({ ok: false, verified: false, error: "Enter the 6-digit verification code." }, 400);
    }

    const { data: challenge, error: challengeError } = await admin
      .from("email_verification_challenges")
      .select("email,code_hash,expires_at,attempts")
      .eq("user_id", user.id)
      .maybeSingle();

    if (challengeError) {
      console.error("verification challenge lookup failed", challengeError);
      return json({ ok: false, error: "Could not verify the code right now." }, 500);
    }
    if (!challenge) {
      return json({ ok: false, verified: false, error: "Request a new verification code first." }, 400);
    }
    if (String(challenge.email).toLowerCase() !== email) {
      return json({ ok: false, verified: false, error: "This verification code is no longer valid. Request a new one." }, 400);
    }
    if (Number(challenge.attempts ?? 0) >= 8) {
      return json({ ok: false, verified: false, error: "Too many incorrect attempts. Request a new code." }, 429);
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      return json({ ok: false, verified: false, error: "That code has expired. Request a new one." }, 400);
    }

    const codeHash = await sha256(user.id + ":" + email + ":" + code + ":" + serviceRoleKey);
    if (codeHash !== challenge.code_hash) {
      await admin
        .from("email_verification_challenges")
        .update({
          attempts: Number(challenge.attempts ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      return json({ ok: false, verified: false, error: "That verification code is incorrect." }, 400);
    }

    const verifiedAt = new Date().toISOString();
    const { error: verifyProfileError } = await admin
      .from("profiles")
      .update({ email_verified_at: verifiedAt })
      .eq("id", user.id);

    if (verifyProfileError) {
      console.error("profile verification update failed", verifyProfileError);
      return json({ ok: false, error: "POSSARA could not finish verification right now." }, 500);
    }

    await admin
      .from("email_verification_challenges")
      .update({ verified_at: verifiedAt, updated_at: verifiedAt })
      .eq("user_id", user.id);

    return json({ ok: true, verified: true, email });
  }

  if (action === "resend") {
    const config = brevoConfig();
    if (!config.apiKey || !config.fromEmail) {
      return json({
        ok: false,
        verified: false,
        emailSafe: true,
        error: "Email delivery is not configured yet. Your account is safe; try again after email delivery is configured.",
      }, 503);
    }

    const now = new Date();
    const { data: existing, error: existingError } = await admin
      .from("email_verification_challenges")
      .select("resend_available_at,send_window_started_at,send_count")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error("resend challenge lookup failed", existingError);
      return json({ ok: false, error: "Could not prepare a new code right now." }, 500);
    }

    if (existing?.resend_available_at) {
      const retryAt = new Date(existing.resend_available_at).getTime();
      if (retryAt > now.getTime()) {
        return json({
          ok: false,
          verified: false,
          retryAfterSeconds: Math.ceil((retryAt - now.getTime()) / 1000),
          error: "A code was sent recently. Wait a moment before requesting another.",
        }, 429);
      }
    }

    const existingWindowStart = existing?.send_window_started_at
      ? new Date(existing.send_window_started_at)
      : now;
    const withinWindow = now.getTime() - existingWindowStart.getTime() < 60 * 60_000;
    const currentCount = withinWindow ? Number(existing?.send_count ?? 0) : 0;
    if (currentCount >= 5) {
      return json({
        ok: false,
        verified: false,
        error: "Too many verification emails were requested. Try again in about an hour.",
      }, 429);
    }

    const code = randomCode();
    const codeHash = await sha256(user.id + ":" + email + ":" + code + ":" + serviceRoleKey);
    const expiresAt = new Date(now.getTime() + 15 * 60_000);
    const windowStartedAt = withinWindow ? existingWindowStart : now;

    const { error: upsertError } = await admin
      .from("email_verification_challenges")
      .upsert({
        user_id: user.id,
        email,
        code_hash: codeHash,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        resend_available_at: now.toISOString(),
        send_window_started_at: windowStartedAt.toISOString(),
        send_count: currentCount,
        verified_at: null,
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("resend challenge upsert failed", upsertError);
      return json({ ok: false, error: "Could not prepare a new code right now." }, 500);
    }

    const sent = await sendVerificationEmail(email, code);
    if (!sent) {
      await admin
        .from("email_verification_challenges")
        .update({ resend_available_at: now.toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      return json({
        ok: false,
        verified: false,
        emailSafe: true,
        error: "POSSARA could not send the email right now. Your account is safe; try resend again shortly.",
      }, 503);
    }

    const sentAt = new Date();
    const resendAvailableAt = new Date(sentAt.getTime() + 60_000);
    await admin
      .from("email_verification_challenges")
      .update({
        last_sent_at: sentAt.toISOString(),
        resend_available_at: resendAvailableAt.toISOString(),
        send_window_started_at: windowStartedAt.toISOString(),
        send_count: currentCount + 1,
        updated_at: sentAt.toISOString(),
      })
      .eq("user_id", user.id);

    return json({
      ok: true,
      verified: false,
      sent: true,
      email,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: resendAvailableAt.toISOString(),
    });
  }

  return json({ ok: false, error: "Unknown verification action." }, 400);
});
