import { useState } from "react";
import { Flag } from "lucide-react";
import { useSubmitReport } from "../hooks/useReports";
import { useAuth } from "../store/auth";

interface ReportButtonProps { postId?: string; opportunityId?: string; }
const REASONS = ["Misleading or false information", "Spam", "Inappropriate content", "Scam or fraud", "Other"];
export function ReportButton({ postId, opportunityId }: ReportButtonProps) {
  const { userId } = useAuth();
  const submitReport = useSubmitReport();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  if (!userId) return null;
  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (!reason) return; await submitReport.mutateAsync({ postId, opportunityId, reason }); setSubmitted(true); }
  if (submitted) return <span className="text-xs text-ink-faint">Reported — thanks for flagging this.</span>;
  if (!open) return <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-flag"><Flag size={12} /> Report</button>;
  return <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 text-xs"><select value={reason} onChange={(e) => setReason(e.target.value)} required className="rounded-full border border-ink-faint/30 px-2 py-1 text-xs"><option value="">Why are you reporting this?</option>{REASONS.map((r) => <option key={r} value={r}>{r}</option>)}</select><button type="submit" disabled={!reason || submitReport.isPending} className="rounded-full bg-flag px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">Submit</button><button type="button" onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">Cancel</button></form>;
}
