import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Brain, MessageSquareText, Target, Users } from "lucide-react";
import { useAuth } from "../store/auth";
import { useSaveStudyProfile, useStudyProfile, useStudyProgress, useStudyTopics } from "../hooks/useStudy";

const CLASS_LEVELS = ["JSS1","JSS2","JSS3","SS1","SS2","SS3"];
const EXAMS = ["BECE","WAEC","NECO","JAMB"];
const SUBJECTS = ["Mathematics","English Language","Biology","Chemistry","Physics","Economics","Government","Literature","Computer Studies"];

function StudySetup() {
  const save = useSaveStudyProfile();
  const [classLevel, setClassLevel] = useState("JSS3");
  const [examTargets, setExamTargets] = useState<string[]>(["BECE"]);
  const [subjects, setSubjects] = useState<string[]>(["Mathematics", "English Language"]);
  const [discoverable, setDiscoverable] = useState(true);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save.mutateAsync({ education_stage: "secondary", class_level: classLevel, exam_targets: examTargets, subjects, study_discoverable: discoverable });
  }

  return <section className="rounded-3xl border border-paper-dim bg-white p-5 shadow-sm">
    <div className="max-w-2xl">
      <p className="eyebrow">Set up Study</p>
      <h2 className="mt-1 text-xl font-semibold">Make Study fit your class.</h2>
      <p className="mt-1 text-sm text-ink-light">Choose only what helps POSSARA show the right lessons, practice and student discussions. We do not ask for your exact age or school here.</p>
      <form onSubmit={submit} className="mt-5 space-y-5">
        <label className="block text-sm font-medium">Class
          <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="mt-1 w-full max-w-xs rounded-xl border border-ink-faint/30 bg-white px-3 py-2 outline-none focus:border-brand">
            {CLASS_LEVELS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <div><p className="text-sm font-medium">Preparing for</p><div className="mt-2 flex flex-wrap gap-2">{EXAMS.map((x) => <button type="button" key={x} onClick={() => toggle(examTargets, x, setExamTargets)} className={`rounded-full border px-3 py-1.5 text-sm ${examTargets.includes(x)?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/30 text-ink-light"}`}>{x}</button>)}</div></div>
        <div><p className="text-sm font-medium">Subjects</p><div className="mt-2 flex flex-wrap gap-2">{SUBJECTS.map((x) => <button type="button" key={x} onClick={() => toggle(subjects, x, setSubjects)} className={`rounded-full border px-3 py-1.5 text-sm ${subjects.includes(x)?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/30 text-ink-light"}`}>{x}</button>)}</div></div>
        <label className="flex items-start gap-2 text-sm text-ink-light"><input type="checkbox" checked={discoverable} onChange={(e)=>setDiscoverable(e.target.checked)} className="mt-1"/><span>Let other students discover me through Study. This only exposes Study choices, not private account information.</span></label>
        {save.error && <p className="text-sm text-flag">{(save.error as Error).message}</p>}
        <button disabled={save.isPending || subjects.length===0} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-40">{save.isPending?"Saving…":"Start POSSARA Study"}</button>
      </form>
    </div>
  </section>;
}

export function Study() {
  const { userId } = useAuth();
  const { data: profile, isLoading: profileLoading } = useStudyProfile();
  const { data: topics, isLoading: topicsLoading } = useStudyTopics(profile?.class_level ?? undefined, profile?.subjects ?? undefined);
  const { data: attempts } = useStudyProgress();

  const progress = useMemo(() => {
    if (!attempts?.length) return null;
    const correct = attempts.filter((a: any) => a.is_correct).length;
    return { correct, total: attempts.length, percent: Math.round((correct / attempts.length) * 100) };
  }, [attempts]);

  if (userId && profileLoading) return <div className="feed-skeleton"/>;
  if (userId && !profile) return <div className="page-stack"><StudyHeader/><StudySetup/></div>;

  return <div className="page-stack">
    <StudyHeader />

    {!userId && <div className="rounded-2xl border border-brand/20 bg-brand-light/40 p-4 text-sm text-ink-light">You can read available Study material now. <Link to="/signin" className="font-semibold text-brand-dark underline">Sign in</Link> to save your class, record practice and join discussions.</div>}

    {userId && profile && <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-ink-faint">Your class</p><p className="mt-1 text-lg font-semibold">{profile.class_level}</p><p className="mt-1 text-xs text-ink-light">{profile.exam_targets.length ? profile.exam_targets.join(" · ") : "General study"}</p></div>
      <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-ink-faint">Practice history</p><p className="mt-1 text-lg font-semibold">{progress ? `${progress.percent}%` : "Not started"}</p><p className="mt-1 text-xs text-ink-light">{progress ? `${progress.correct} correct from ${progress.total} attempts` : "Try your first topic challenge."}</p></div>
      <Link to="/study/together" className="rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5"><p className="text-xs text-ink-faint">Study together</p><p className="mt-1 flex items-center gap-2 text-lg font-semibold"><Users size={18}/> Ask & solve</p><p className="mt-1 text-xs text-ink-light">Work through academic problems with other students.</p></Link>
    </section>}

    <section>
      <div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">Learn</p><h2 className="text-xl font-semibold">Read by class and subject</h2></div>{userId && <Link to="/study/settings" className="text-sm font-medium text-brand-dark">Change Study profile</Link>}</div>
      {topicsLoading && <div className="feed-skeleton"/>}
      {!topicsLoading && topics?.length===0 && <div className="rounded-2xl border border-paper-dim bg-white p-5 text-sm text-ink-light">No published lesson is available for this exact class/subject combination yet. The Study system is live; content will be added class by class without pretending coverage is complete.</div>}
      <div className="grid gap-3 sm:grid-cols-2">{topics?.map((topic) => <Link key={topic.id} to={`/study/topic/${topic.id}`} className="rounded-2xl border border-paper-dim bg-white p-5 shadow-sm transition hover:-translate-y-0.5"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium">{topic.class_level} · {topic.subject}</span><BookOpen size={18} className="text-brand"/></div><h3 className="mt-3 font-semibold">{topic.title}</h3><p className="mt-1 text-sm leading-6 text-ink-light">{topic.summary}</p><div className="mt-4 flex items-center gap-4 text-xs font-medium text-brand-dark"><span>Read lesson</span><span>Practice →</span></div></Link>)}</div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2">
      <Link to="/study/practice" className="rounded-2xl border border-paper-dim bg-white p-5 shadow-sm"><Brain size={22} className="text-brand"/><h2 className="mt-3 text-lg font-semibold">Practice</h2><p className="mt-1 text-sm text-ink-light">Original multiple-choice questions with explanations and saved attempts.</p></Link>
      <Link to="/study/together" className="rounded-2xl border border-paper-dim bg-white p-5 shadow-sm"><MessageSquareText size={22} className="text-brand"/><h2 className="mt-3 text-lg font-semibold">Study Together</h2><p className="mt-1 text-sm text-ink-light">Ask a subject question, explain your thinking and mark the answer that solved it.</p></Link>
    </section>
  </div>;
}

function StudyHeader(){return <section className="rounded-3xl bg-ink p-6 text-white"><div className="flex items-center gap-2 text-sm font-medium text-white/70"><Target size={16}/> POSSARA Study</div><h1 className="mt-2 max-w-2xl text-3xl font-semibold">Learn. Practise. Solve it together.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">A focused student space for class-based reading, exam practice and useful academic discussion — connected to the opportunities already on POSSARA.</p></section>}
