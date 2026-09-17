import { createClient } from "npm:@supabase/supabase-js@2.112.4";

type Source = {
  id: string;
  name: string;
  endpoint_url: string;
  format: "rss" | "atom" | "json_feed" | "json_api" | "grants_gov" | "reliefweb";
  enabled: boolean;
  trust_tier: "official" | "partner" | "trusted_aggregator";
  default_category_slug: string | null;
  default_location: string | null;
  default_organization_name: string | null;
  check_every_minutes: number;
  adapter: Record<string, unknown>;
  auto_publish: boolean;
  requires_setup: boolean;
  last_checked_at: string | null;
  consecutive_failures: number;
};

type CandidateInput = {
  externalId: string;
  url: string;
  title: string;
  description?: string | null;
  eligibility?: string | null;
  deadline?: string | null;
  location?: string | null;
  organizationName?: string | null;
  categorySlug?: string | null;
  tags?: string[];
  raw?: Record<string, unknown>;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,apikey,content-type,x-possara-discovery-secret",
  "access-control-allow-methods": "POST,OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });
}

function cleanText(value: unknown, max = 12000) {
  if (value == null) return "";
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return value.trim();
  }
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function readXmlTag(block: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
    if (match?.[1]) return cleanText(match[1]);
  }
  return "";
}

function readXmlLink(block: string) {
  const atom = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  if (atom?.[1]) return cleanText(atom[1], 2000);
  return readXmlTag(block, ["link"]);
}

function inferDeadline(text: string) {
  const patterns = [
    /(?:deadline|closes?|closing date|apply by)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /(?:deadline|closes?|closing date|apply by)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i,
    /(?:deadline|closes?|closing date|apply by)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = parseDate(match[1]);
      if (parsed) return parsed;
    }
  }
  return null;
}

function inferCategorySlug(title: string, description: string, fallback: string | null) {
  const text = `${title} ${description}`.toLowerCase();
  if (/\bintern(ship|ships)?\b/.test(text)) return "internships";
  if (/\bfellow(ship|ships)?\b/.test(text)) return "fellowships";
  if (/\bscholar(ship|ships)?\b/.test(text)) return "scholarships";
  if (/\bgrant(s)?\b|\bfunding call\b/.test(text)) return fallback === "jobs" ? fallback : "grants";
  if (/\bcompetition(s)?\b|\bchallenge(s)?\b/.test(text)) return "competitions";
  if (/\badmission(s)?\b|\bapply for (a )?(degree|programme|program)\b/.test(text)) return "admissions";
  if (/\btraining\b|\bworkshop\b|\bbootcamp\b/.test(text)) return "training";
  if (/\bvolunteer(ing)?\b/.test(text)) return "volunteering";
  if (/\bmentor(ship)?\b/.test(text)) return "mentorship";
  return fallback;
}

function parseFeed(xml: string, source: Source): CandidateInput[] {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  return blocks.slice(0, 80).map((block, index) => {
    const title = readXmlTag(block, ["title"]);
    const url = readXmlLink(block);
    const guid = readXmlTag(block, ["guid", "id"]);
    const description = readXmlTag(block, ["content:encoded", "content", "description", "summary"]);
    const categories = [...block.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)].map((m) => cleanText(m[1], 120)).filter(Boolean);
    return {
      externalId: guid || url || `${title}-${index}`,
      url,
      title,
      description,
      deadline: inferDeadline(`${title} ${description}`),
      location: source.default_location,
      organizationName: source.default_organization_name,
      categorySlug: inferCategorySlug(title, description, source.default_category_slug),
      tags: categories.slice(0, 12),
      raw: { feed: source.name },
    };
  }).filter((item) => item.title && item.url);
}

function getPath(value: unknown, path: string) {
  if (!path) return value;
  return path.split(".").reduce<unknown>((current, key) => {
    if (current == null || typeof current !== "object") return undefined;
    if (Array.isArray(current)) {
      const index = Number(key);
      return Number.isInteger(index) ? current[index] : undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, value);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

async function parseGrantsGov(source: Source): Promise<CandidateInput[]> {
  const adapter = source.adapter ?? {};
  const rows = Math.max(5, Math.min(Number(adapter.rows ?? 40), 80));
  const body = {
    rows,
    keyword: String(adapter.keyword ?? ""),
    oppNum: "",
    eligibilities: "",
    agencies: "",
    oppStatuses: String(adapter.oppStatuses ?? "forecasted|posted"),
    aln: "",
    fundingCategories: "",
  };
  const response = await fetchWithTimeout(source.endpoint_url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Grants.gov returned ${response.status}`);
  const payload = await response.json();
  const hits = Array.isArray(payload?.data?.oppHits) ? payload.data.oppHits.slice(0, rows) : [];
  const detailEndpoint = String(adapter.detailEndpoint ?? "https://api.grants.gov/v1/api/fetchOpportunity");

  const results: CandidateInput[] = [];
  for (let i = 0; i < hits.length; i += 5) {
    const batch = hits.slice(i, i + 5);
    const detailed = await Promise.all(batch.map(async (hit: Record<string, unknown>) => {
      let detail: Record<string, unknown> | null = null;
      try {
        const detailResponse = await fetchWithTimeout(detailEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ opportunityId: Number(hit.id) }),
        }, 10000);
        if (detailResponse.ok) detail = (await detailResponse.json())?.data ?? null;
      } catch {
        detail = null;
      }
      const details = ((detail?.synopsis ?? detail?.forecast ?? {}) as Record<string, unknown>);
      const applicantTypes = Array.isArray(details.applicantTypes) ? details.applicantTypes as Record<string, unknown>[] : [];
      const title = cleanText(hit.title, 500);
      const id = String(hit.id ?? hit.number ?? title);
      const description = cleanText(details.synopsisDesc ?? details.forecastDesc ?? `${hit.agencyName ?? "Government agency"} funding opportunity.`, 12000);
      return {
        externalId: id,
        url: `https://www.grants.gov/search-results-detail/${encodeURIComponent(id)}`,
        title,
        description,
        eligibility: applicantTypes.map((item) => cleanText(item.description, 200)).filter(Boolean).join("; ") || null,
        deadline: parseDate(hit.closeDate ?? details.responseDate ?? details.estimatedApplicationDueDate),
        location: source.default_location ?? "United States",
        organizationName: cleanText(hit.agencyName ?? details.agencyName ?? source.default_organization_name ?? "Grants.gov", 200),
        categorySlug: "grants",
        tags: [cleanText(hit.agencyCode, 50), cleanText(hit.number, 120)].filter(Boolean),
        raw: { opportunityId: hit.id, number: hit.number, agencyCode: hit.agencyCode, openDate: hit.openDate, closeDate: hit.closeDate, oppStatus: hit.oppStatus },
      } satisfies CandidateInput;
    }));
    results.push(...detailed.filter((item) => item.title && item.url));
  }
  return results;
}

async function parseReliefWeb(source: Source): Promise<CandidateInput[]> {
  const adapter = source.adapter ?? {};
  const appname = String(adapter.appname ?? "").trim();
  if (!appname) throw new Error("ReliefWeb source needs an approved appname before it can run.");
  const limit = Math.max(5, Math.min(Number(adapter.limit ?? 50), 100));
  const url = new URL(source.endpoint_url);
  url.searchParams.set("appname", appname);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("preset", "latest");
  url.searchParams.set("profile", "full");
  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) throw new Error(`ReliefWeb returned ${response.status}`);
  const payload = await response.json();
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return items.map((entry: Record<string, unknown>) => {
    const fields = (entry.fields ?? {}) as Record<string, unknown>;
    const sources = Array.isArray(fields.source) ? fields.source as Record<string, unknown>[] : [];
    const countries = Array.isArray(fields.country) ? fields.country as Record<string, unknown>[] : [];
    const org = cleanText(sources[0]?.name ?? source.default_organization_name ?? "ReliefWeb", 200);
    const location = countries.map((item) => cleanText(item.name, 120)).filter(Boolean).join(", ") || source.default_location;
    const targetUrl = String(fields.url ?? fields.event_url ?? "");
    const title = cleanText(fields.title, 500);
    const description = cleanText(fields.body ?? fields.description, 12000);
    return {
      externalId: String(entry.id ?? targetUrl),
      url: targetUrl,
      title,
      description,
      eligibility: cleanText(fields.how_to_apply ?? fields.how_to_register, 4000) || null,
      deadline: parseDate(fields.closing_date ?? fields.registration_deadline),
      location,
      organizationName: org,
      categorySlug: inferCategorySlug(title, description, source.default_category_slug),
      tags: [],
      raw: { id: entry.id },
    };
  }).filter((item: CandidateInput) => item.title && item.url);
}

async function parseJsonSource(source: Source): Promise<CandidateInput[]> {
  const adapter = source.adapter ?? {};
  const method = String(adapter.method ?? "GET").toUpperCase();
  const init: RequestInit = { method, headers: { "content-type": "application/json" } };
  if (method !== "GET" && adapter.body) init.body = JSON.stringify(adapter.body);
  const response = await fetchWithTimeout(source.endpoint_url, init);
  if (!response.ok) throw new Error(`${source.name} returned ${response.status}`);
  const payload = await response.json();

  if (source.format === "json_feed") {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items.map((item: Record<string, unknown>) => {
      const title = cleanText(item.title, 500);
      const description = cleanText(item.content_text ?? item.content_html ?? item.summary, 12000);
      return {
        externalId: String(item.id ?? item.url ?? item.external_url ?? title),
        url: String(item.url ?? item.external_url ?? ""),
        title,
        description,
        deadline: inferDeadline(`${title} ${description}`),
        location: source.default_location,
        organizationName: source.default_organization_name,
        categorySlug: inferCategorySlug(title, description, source.default_category_slug),
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => cleanText(tag, 100)).filter(Boolean).slice(0, 12) : [],
        raw: { id: item.id, date_published: item.date_published },
      };
    }).filter((item: CandidateInput) => item.title && item.url);
  }

  const itemsPath = String(adapter.itemsPath ?? "items");
  const fields = (adapter.fields ?? {}) as Record<string, string>;
  const items = getPath(payload, itemsPath);
  if (!Array.isArray(items)) throw new Error(`JSON adapter itemsPath '${itemsPath}' did not resolve to an array.`);
  return items.slice(0, 100).map((item: unknown, index) => {
    const title = cleanText(getPath(item, fields.title ?? "title"), 500);
    const url = String(getPath(item, fields.url ?? "url") ?? "");
    const description = cleanText(getPath(item, fields.description ?? "description"), 12000);
    const explicitCategory = cleanText(getPath(item, fields.category ?? "category"), 100) || null;
    return {
      externalId: String(getPath(item, fields.id ?? "id") ?? url ?? `${title}-${index}`),
      url,
      title,
      description,
      eligibility: cleanText(getPath(item, fields.eligibility ?? "eligibility"), 4000) || null,
      deadline: parseDate(getPath(item, fields.deadline ?? "deadline")) ?? inferDeadline(`${title} ${description}`),
      location: cleanText(getPath(item, fields.location ?? "location"), 300) || source.default_location,
      organizationName: cleanText(getPath(item, fields.organization ?? "organization"), 200) || source.default_organization_name,
      categorySlug: explicitCategory ?? inferCategorySlug(title, description, source.default_category_slug),
      tags: [],
      raw: { index },
    };
  }).filter((item) => item.title && item.url);
}

async function fetchSource(source: Source) {
  if (source.format === "grants_gov") return parseGrantsGov(source);
  if (source.format === "reliefweb") return parseReliefWeb(source);
  if (source.format === "json_feed" || source.format === "json_api") return parseJsonSource(source);
  const response = await fetchWithTimeout(source.endpoint_url, { headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" } });
  if (!response.ok) throw new Error(`${source.name} returned ${response.status}`);
  return parseFeed(await response.text(), source);
}

async function authorize(req: Request) {
  const suppliedSecret = req.headers.get("x-possara-discovery-secret") ?? "";
  if (suppliedSecret) {
    const { data: expected } = await admin.rpc("get_opportunity_discovery_cron_secret");
    if (typeof expected === "string" && expected.length === suppliedSecret.length) {
      let diff = 0;
      for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ suppliedSecret.charCodeAt(i);
      if (diff === 0) return { kind: "cron" as const, userId: null };
    }
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return null;
  const { data: role } = await admin.from("user_roles").select("role,is_verified,is_banned").eq("user_id", userData.user.id).maybeSingle();
  if (role?.role === "admin" && role.is_verified === true && role.is_banned === false) return { kind: "admin" as const, userId: userData.user.id };
  return null;
}

async function ingestCandidate(source: Source, item: CandidateInput) {
  const url = canonicalUrl(item.url);
  const title = cleanText(item.title, 500);
  if (!title || !/^https?:\/\//i.test(url)) return { kind: "skipped" as const };
  const externalId = cleanText(item.externalId || url, 500);
  const description = cleanText(item.description, 12000) || null;
  const eligibility = cleanText(item.eligibility, 4000) || null;
  const contentHash = await sha256(JSON.stringify({ title, description, eligibility, deadline: item.deadline, location: item.location, url }));

  const [{ data: existingCandidate }, { data: existingOpportunity }] = await Promise.all([
    admin.from("opportunity_candidates").select("id,status,content_hash,published_opportunity_id").eq("source_id", source.id).eq("external_id", externalId).maybeSingle(),
    admin.from("opportunities").select("id").eq("link", url).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  let status = existingCandidate?.status ?? "pending";
  let duplicateOf = null as string | null;
  if (!existingCandidate && existingOpportunity?.id) {
    status = "duplicate";
    duplicateOf = existingOpportunity.id;
  } else if (existingCandidate && existingCandidate.content_hash !== contentHash) {
    if (existingCandidate.status === "published" || existingCandidate.status === "expired") status = "needs_review";
    else if (existingCandidate.status === "pending" || existingCandidate.status === "needs_review") status = "pending";
  }

  const row = {
    source_id: source.id,
    external_id: externalId,
    canonical_url: url,
    title,
    description,
    eligibility,
    deadline: item.deadline,
    location: cleanText(item.location, 300) || source.default_location,
    organization_name: cleanText(item.organizationName, 200) || source.default_organization_name,
    category_slug: cleanText(item.categorySlug, 100) || source.default_category_slug,
    tags: (item.tags ?? []).map((tag) => cleanText(tag, 100)).filter(Boolean).slice(0, 16),
    content_hash: contentHash,
    raw_payload: item.raw ?? {},
    status,
    duplicate_of_opportunity_id: duplicateOf,
    last_seen_at: new Date().toISOString(),
  };
  const { data, error } = await admin.from("opportunity_candidates").upsert(row, { onConflict: "source_id,external_id" }).select("id,status").single();
  if (error) throw error;

  if (source.auto_publish && source.trust_tier !== "trusted_aggregator" && data.status === "pending") {
    const { error: publishError } = await admin.rpc("service_publish_opportunity_candidate", { p_candidate_id: data.id });
    if (publishError) console.warn("Auto-publish skipped:", publishError.message);
  }

  if (!existingCandidate) return { kind: status === "duplicate" ? "duplicate" as const : "new" as const };
  return { kind: existingCandidate.content_hash === contentHash ? "unchanged" as const : "updated" as const };
}

async function runDiscovery(force = false) {
  const { data: sources, error } = await admin.from("opportunity_sources").select("*").eq("enabled", true).order("name");
  if (error) throw error;
  const now = Date.now();
  const selected = ((sources ?? []) as Source[]).filter((source) => {
    if (force || !source.last_checked_at) return true;
    return now - new Date(source.last_checked_at).getTime() >= source.check_every_minutes * 60_000;
  }).slice(0, 12);

  const summary: Record<string, unknown>[] = [];
  for (const source of selected) {
    const { data: run } = await admin.from("opportunity_discovery_runs").insert({ source_id: source.id, mode: "discover", status: "running" }).select("id").single();
    let fetched = 0, added = 0, updated = 0, duplicates = 0;
    try {
      if (source.requires_setup) throw new Error(source.name + " still requires setup before it can run.");
      const candidates = await fetchSource(source);
      fetched = candidates.length;
      for (const candidate of candidates.slice(0, 80)) {
        const result = await ingestCandidate(source, candidate);
        if (result.kind === "new") added++;
        else if (result.kind === "updated") updated++;
        else if (result.kind === "duplicate") duplicates++;
      }
      const finished = new Date().toISOString();
      await admin.from("opportunity_sources").update({ last_checked_at: finished, last_success_at: finished, last_error: null, consecutive_failures: 0, updated_at: finished }).eq("id", source.id);
      if (run?.id) await admin.from("opportunity_discovery_runs").update({ status: "success", fetched_count: fetched, new_count: added, updated_count: updated, duplicate_count: duplicates, finished_at: finished }).eq("id", run.id);
      summary.push({ source: source.name, status: "success", fetched, added, updated, duplicates });
    } catch (sourceError) {
      const message = sourceError instanceof Error ? sourceError.message : String(sourceError);
      const finished = new Date().toISOString();
      await admin.from("opportunity_sources").update({ last_checked_at: finished, last_error: message.slice(0, 1000), consecutive_failures: (source.consecutive_failures ?? 0) + 1, updated_at: finished }).eq("id", source.id);
      if (run?.id) await admin.from("opportunity_discovery_runs").update({ status: "failed", fetched_count: fetched, new_count: added, updated_count: updated, duplicate_count: duplicates, error_message: message.slice(0, 1500), finished_at: finished }).eq("id", run.id);
      summary.push({ source: source.name, status: "failed", error: message });
    }
  }
  return summary;
}

async function checkLink(url: string) {
  try {
    let response = await fetchWithTimeout(url, { method: "HEAD" }, 8000);
    if (response.status === 405 || response.status === 403) response = await fetchWithTimeout(url, { method: "GET", headers: { Range: "bytes=0-2048" } }, 8000);
    return response.status;
  } catch {
    return 0;
  }
}

async function runRecheck() {
  await admin.rpc("close_expired_discovered_opportunities");
  const { data: rows, error } = await admin.from("opportunities").select("id,link,deadline,discovery_candidate_id,status").eq("source", "automated_discovery").eq("status", "active").not("discovery_candidate_id", "is", null).order("last_verified_at", { ascending: true }).limit(100);
  if (error) throw error;
  let healthy = 0, flagged = 0, closed = 0;
  for (const opportunity of rows ?? []) {
    if (!opportunity.link || !opportunity.discovery_candidate_id) continue;
    const status = await checkLink(opportunity.link);
    const { data: candidate } = await admin.from("opportunity_candidates").select("consecutive_link_failures").eq("id", opportunity.discovery_candidate_id).maybeSingle();
    if (status >= 200 && status < 400) {
      healthy++;
      await admin.from("opportunity_candidates").update({ link_http_status: status, consecutive_link_failures: 0, last_link_checked_at: new Date().toISOString() }).eq("id", opportunity.discovery_candidate_id);
      await admin.from("opportunities").update({ last_verified_at: new Date().toISOString() }).eq("id", opportunity.id);
    } else if (status === 404 || status === 410) {
      const failures = (candidate?.consecutive_link_failures ?? 0) + 1;
      await admin.from("opportunity_candidates").update({ link_http_status: status, consecutive_link_failures: failures, last_link_checked_at: new Date().toISOString(), status: failures >= 2 ? "expired" : "needs_review" }).eq("id", opportunity.discovery_candidate_id);
      if (failures >= 2) {
        closed++;
        await admin.from("opportunities").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", opportunity.id);
      } else flagged++;
    } else {
      await admin.from("opportunity_candidates").update({ link_http_status: status || null, last_link_checked_at: new Date().toISOString() }).eq("id", opportunity.discovery_candidate_id);
    }
  }
  return { checked: rows?.length ?? 0, healthy, flagged, closed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "Function is missing Supabase server configuration." }, 500);

  const caller = await authorize(req);
  if (!caller) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "recheck" ? "recheck" : "discover";
    const result = mode === "recheck" ? await runRecheck() : await runDiscovery(Boolean(body?.force));
    return json({ ok: true, mode, result, caller: caller.kind });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Opportunity discovery failed." }, 500);
  }
});
