
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

async function verifyTurnstile(req: Request, token: string) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
  if (!secret) return { ok: true, configured: false };
  if (!token) return { ok: false, configured: true };

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  const ip = requestIp(req);
  if (ip !== "unknown") form.set("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    if (!response.ok) return { ok: false, configured: true };
    const result = await response.json();
    return { ok: result?.success === true, configured: true };
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return { ok: false, configured: true };
  }
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
  if (!config.apiKey || !config.fromEmail) {
    console.error("Brevo is not configured: BREVO_API_KEY and BREVO_FROM_EMAIL are required.");
    return false;
  }

  const htmlContent =
    '<!doctype html><html><body style="margin:0;background:#f7f6fb;font-family:Arial,sans-serif;color:#191724">' +
    '<div style="max-width:560px;margin:0 auto;padding:32px 20px">' +
    '<div style="background:#fff;border-radius:20px;padding:30px;border:1px solid #ece9f3">' +
    '<div style="font-size:22px;font-weight:800;letter-spacing:.04em">POSSARA</div>' +
    '<h1 style="font-size:24px;margin:24px 0 10px">Verify your email</h1>' +
    '<p style="line-height:1.6;color:#5d5969">Use this code to confirm that this email address belongs to you.</p>' +
    '<div style="margin:24px 0;padding:18px;border-radius:14px;background:#f4f0ff;text-align:center;font-size:32px;font-weight:800;letter-spacing:.22em">' +
    code +
    '</div>' +
    '<p style="line-height:1.6;color:#5d5969">The code expires in 15 minutes. If you did not create a POSSARA account, you can ignore this email.</p>' +
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
        subject: "Verify your POSSARA email",
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

  try {
    const payload = await req.json();
    const email = String(payload?.email ?? "").trim().toLowerCase();
    const password = String(payload?.password ?? "");
    const fullName = String(payload?.fullName ?? "").trim();
    const username = String(payload?.username ?? "").trim().toLowerCase();
    const captchaToken = String(payload?.captchaToken ?? "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json({ ok: false, error: "Enter a valid email address." });
    }
    if (password.length < 8 || password.length > 128) {
      return json({ ok: false, error: "Password must be 8–128 characters." });
    }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return json({ ok: false, error: "Username must be 3–24 lowercase letters, numbers or underscores." });
    }
    if (!fullName || fullName.length > 120) {
      return json({ ok: false, error: "Enter a valid full name." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: "Signup service is not configured." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const ipLimit = await consumeRateLimit(admin, serviceRoleKey, "signup_ip", requestIp(req), 8, 3600);
    if (!ipLimit.allowed) {
      return json({
        ok: false,
        error: "Too many account creation attempts from this network. Try again later.",
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      }, 429);
    }

    const emailLimit = await consumeRateLimit(admin, serviceRoleKey, "signup_email", email, 5, 3600);
    if (!emailLimit.allowed) {
      return json({
        ok: false,
        error: "Too many account creation attempts for this email. Try again later.",
        retryAfterSeconds: emailLimit.retryAfterSeconds,
      }, 429);
    }

    const botCheck = await verifyTurnstile(req, captchaToken);
    if (!botCheck.ok) {
      return json({ ok: false, error: "Complete the security check and try again." }, 400);
    }

    const { data: existingUsername, error: usernameError } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (usernameError) {
      return json({ ok: false, error: "Could not validate the username right now." }, 500);
    }
    if (existingUsername) {
      return json({ ok: false, error: "That username is already taken." });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
        possara_requires_email_verification: true,
      },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
        return json({ ok: false, error: "An account already exists with this email. Sign in instead." });
      }
      if (lower.includes("password")) return json({ ok: false, error: error.message });
      console.error("createUser failed", error);
      return json({ ok: false, error: "POSSARA could not create the account right now." }, 500);
    }

    if (!data.user?.id) {
      return json({ ok: false, error: "POSSARA did not receive the new account record." }, 500);
    }

    const code = randomCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60_000);
    const codeHash = await sha256(
      data.user.id + ":" + email + ":" + code + ":" + serviceRoleKey,
    );

    const { error: challengeError } = await admin
      .from("email_verification_challenges")
      .upsert({
        user_id: data.user.id,
        email,
        code_hash: codeHash,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        last_sent_at: null,
        resend_available_at: now.toISOString(),
        send_window_started_at: now.toISOString(),
        send_count: 0,
        verified_at: null,
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

    let emailSent = false;
    if (challengeError) {
      console.error("verification challenge creation failed", challengeError);
    } else {
      emailSent = await sendVerificationEmail(email, code);
      if (emailSent) {
        await admin
          .from("email_verification_challenges")
          .update({
            last_sent_at: now.toISOString(),
            resend_available_at: new Date(now.getTime() + 60_000).toISOString(),
            send_window_started_at: now.toISOString(),
            send_count: 1,
            updated_at: now.toISOString(),
          })
          .eq("user_id", data.user.id);
      }
    }

    return json({
      ok: true,
      userId: data.user.id,
      verificationRequired: true,
      emailSent,
    });
  } catch (error) {
    console.error("signup-direct exception", error);
    return json({ ok: false, error: "Invalid signup request." }, 400);
  }
});
