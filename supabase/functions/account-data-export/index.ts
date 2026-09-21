import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: "Export service is unavailable." }, 503);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ ok: false, error: "Sign in to export your data." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user?.id) return json({ ok: false, error: "Your session is no longer valid." }, 401);

  const specs = [
    ["profile", "profiles", "id"],
    ["preferences", "user_preferences", "user_id"],
    ["role", "user_roles", "user_id"],
    ["organization_memberships", "organization_members", "user_id"],
    ["owned_organizations", "organizations", "owner_id"],
    ["advertisements", "advertisements", "submitted_by"],
    ["posts", "posts", "author_id"],
    ["comments", "comments", "author_id"],
    ["reactions", "reactions", "user_id"],
    ["comment_likes", "comment_likes", "user_id"],
    ["comment_reactions", "comment_reactions", "user_id"],
    ["following", "follows", "follower_id"],
    ["followers", "follows", "following_id"],
    ["sent_messages", "messages", "sender_id"],
    ["received_messages", "messages", "recipient_id"],
    ["saves", "saves", "user_id"],
    ["moments", "stories", "author_id"],
    ["moment_views", "story_views", "viewer_id"],
    ["notifications", "notifications", "user_id"],
    ["reports", "reports", "reporter_id"],
    ["submitted_opportunities", "opportunities", "author_id"],
    ["job_applications", "job_applications", "applicant_id"],
    ["job_postings", "job_postings", "posted_by"],
    ["growth_passport", "growth_passport_items", "user_id"],
    ["study_profile", "study_profiles", "user_id"],
    ["study_attempts", "study_attempts", "user_id"],
    ["study_answers", "study_answers", "author_id"],
    ["study_threads", "study_threads", "author_id"],
    ["birthday_wishes_sent", "birthday_wishes", "sender_id"],
    ["birthday_wishes_received", "birthday_wishes", "recipient_id"],
    ["account_deletion_request", "account_deletion_requests", "user_id"],
  ] as const;

  const results: Record<string, unknown> = {};
  const warnings: string[] = [];

  await Promise.all(specs.map(async ([label, table, field]) => {
    const { data, error } = await admin.from(table).select("*").eq(field, user.id).limit(5000);
    if (error) {
      warnings.push(`${label}: ${error.message}`);
      results[label] = [];
      return;
    }
    results[label] = data ?? [];
  }));

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      providers: user.app_metadata?.providers ?? [],
    },
    data: results,
    warnings,
    note: warnings.length
      ? "Some optional data categories could not be exported automatically. Contact POSSARA administration if you need a complete assisted export."
      : "This export contains the account-linked data POSSARA could retrieve automatically.",
  });
});
