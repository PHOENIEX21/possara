import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarPlus, Compass, X } from "lucide-react";
import { useAuth } from "../store/auth";
import { useOwnProfile } from "../hooks/useProfile";
import { useSavedOpportunities } from "../hooks/useSavedOpportunities";
import { useNextStepMatches } from "../hooks/useNextStepMatches";
import { chooseNextStep, deadlineCalendar } from "../lib/nextStep";

export function NextStepCard() {
  const { userId } = useAuth();
  return userId ? <MemberNextStep key={userId} userId={userId}/> : null;
}

function MemberNextStep({ userId }: { userId: string }) {
  const profile = useOwnProfile();
  const saved = useSavedOpportunities();
  const matches = useNextStepMatches();
  const [now, setNow] = useState(Date.now);
  const storageKey = `possara:next-step:v1:${userId}`;
  const [hiddenUntil, setHiddenUntil] = useState(() => { try { return Number(localStorage.getItem(storageKey)) || 0; } catch { return 0; } });
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 60000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", update); };
  }, []);
  function setHidden(value: number) {
    setHiddenUntil(value);
    try { localStorage.setItem(storageKey, String(value)); } catch { /* Keep the current-session choice. */ }
  }
  const choice = chooseNextStep((saved.data ?? []).map(item => ({ ...item, path: `/opportunities/${item.id}` })), matches.data ?? [], now);
  const p = profile.data;
  const incomplete = p && (!(p.goal_categories?.length) || (!p.skills?.length && !p.profession?.trim()) || (!p.country?.trim() && !p.location?.trim() && !p.remote_opportunities));
  if (saved.isLoading || matches.isLoading || profile.isLoading || (!choice && !incomplete)) return null;
  if (hiddenUntil > now) return <button type="button" onClick={() => setHidden(0)} className="mx-1 my-3 inline-flex items-center gap-2 text-xs font-semibold text-brand-dark"><Compass size={14}/>Show my next step</button>;
  const title = choice?.opportunity.title ?? "Make POSSARA more personal";
  const reason = choice?.reason === "deadline" ? "You saved this. Its deadline is coming up." : choice?.reason === "match" ? "Suggested from your profile. Check the requirements to see if it fits." : choice ? "You saved this for later. Pick up where you left off." : "Add your skills, interests and location to discover opportunities that fit you.";
  const deadline = choice?.opportunity.deadline;
  function saveCalendar() {
    if (!choice) return;
    try {
      const blob = new Blob([deadlineCalendar(choice.opportunity, window.location.origin)], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "possara-opportunity-deadline.ics";
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setNotice("Calendar file ready. Open it in your calendar to add the deadline.");
    } catch (error) { setNotice((error as Error).message); }
  }
  return <section aria-labelledby="next-step-heading" className="my-4 overflow-hidden rounded-3xl border border-brand/15 bg-gradient-to-br from-[#f0eaff] via-white to-[#fff2e8] p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-brand-dark"><Compass size={19}/><h2 id="next-step-heading" className="text-sm font-bold">Your next step</h2></div><button type="button" onClick={() => setHidden(Date.now() + 86400000)} aria-label="Hide next step for 24 hours" className="-mr-1 -mt-1 rounded-full p-2 text-ink-faint hover:bg-white"><X size={16}/></button></div>
    <h3 className="mt-1 text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{title}</h3>
    <p className="mt-1.5 text-sm leading-relaxed text-ink-light">{reason}</p>
    {deadline && <p className="mt-2 text-xs font-semibold text-brand-dark">Closes <time dateTime={deadline}>{new Date(deadline).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</time></p>}
    <div className="mt-3 flex flex-wrap items-center gap-2"><Link to={choice?.opportunity.path ?? "/profile/me?edit=1"} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">{choice ? "Take a look" : "Personalize my profile"}<ArrowUpRight size={16}/></Link>{deadline && <button type="button" onClick={saveCalendar} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-brand-dark"><CalendarPlus size={15}/>Add to calendar</button>}<Link to="/saved" className="px-2 py-2 text-xs font-semibold text-ink-light hover:underline">My saved opportunities</Link></div>
    {notice && <p role="status" className="mt-2 text-xs text-ink-light">{notice}</p>}
  </section>;
}
