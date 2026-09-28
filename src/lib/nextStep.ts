export type NextStepOpportunity = {
  id: string; title: string; path: string; deadline: string | null; status: string | null;
};

export function openOpportunities(items: NextStepOpportunity[], now: number) {
  return items.filter(item => (item.status === "active" || item.status === "open") &&
    (!item.deadline || Date.parse(item.deadline) > now));
}

export function chooseNextStep(saved: NextStepOpportunity[], matches: NextStepOpportunity[], now: number) {
  const openSaved = openOpportunities(saved, now);
  const urgent = openSaved.filter(item => item.deadline && Date.parse(item.deadline) <= now + 7 * 86400000)
    .sort((a, b) => Date.parse(a.deadline!) - Date.parse(b.deadline!))[0];
  if (urgent) return { opportunity: urgent, reason: "deadline" as const };
  const match = openOpportunities(matches, now)[0];
  if (match) return { opportunity: match, reason: "match" as const };
  if (openSaved[0]) return { opportunity: openSaved[0], reason: "saved" as const };
  return null;
}

// RFC 5545 excludes control characters from property values.
// eslint-disable-next-line no-control-regex
const calendarText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
function fold(line: string) {
  let result = "", width = 0;
  const encoder = new TextEncoder();
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (width + size > 75) { result += "\r\n "; width = 1; }
    result += char; width += size;
  }
  return result;
}

export function deadlineCalendar(item: NextStepOpportunity, origin: string, now = Date.now()) {
  const deadline = new Date(item.deadline ?? "");
  if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= now) throw new Error("This deadline is no longer available.");
  if (!/^\/(opportunities|jobs)\/[a-zA-Z0-9-]+$/.test(item.path)) throw new Error("Invalid opportunity link.");
  const url = new URL(item.path, origin).href;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//POSSARA//Opportunity deadlines//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${encodeURIComponent(item.path)}@possara`, `DTSTAMP:${stamp(new Date(now))}`, `DTSTART:${stamp(deadline)}`,
    `SUMMARY:${calendarText("Deadline: " + item.title)}`, `DESCRIPTION:${calendarText("Review the listing and submit before this deadline.\n" + url)}`, `URL:${url}`, "TRANSP:TRANSPARENT"];
  // Do not create an alarm whose firing time is already in the past.
  if (deadline.getTime() - now > 86400000) lines.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Your opportunity closes tomorrow", "END:VALARM");
  return [...lines, "END:VEVENT", "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
}
