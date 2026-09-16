import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Brain, MessageSquareText } from "lucide-react";
import { useStudyTopic } from "../hooks/useStudy";

export function StudyTopic(){
  const {id}=useParams<{id:string}>();
  const {data:topic,isLoading,error}=useStudyTopic(id);
  if(isLoading)return <div className="feed-skeleton"/>;
  if(error||!topic)return <p className="text-flag">This Study lesson could not be loaded.</p>;
  return <article className="mx-auto max-w-3xl">
    <Link to="/study" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-brand-dark"><ArrowLeft size={15}/> Study</Link>
    <div className="rounded-3xl border border-paper-dim bg-white p-6 shadow-sm">
      <span className="rounded-full bg-paper-dim px-3 py-1 text-xs font-medium">{topic.class_level} · {topic.subject}</span>
      <h1 className="mt-4 text-3xl font-semibold">{topic.title}</h1>
      <p className="mt-2 text-ink-light">{topic.summary}</p>
      <div className="mt-6 whitespace-pre-line text-[16px] leading-8 text-ink">{topic.reading_body}</div>
      {topic.exam_targets?.length>0&&<p className="mt-6 text-sm text-ink-faint">Useful for: {topic.exam_targets.join(" · ")}</p>}
      <div className="mt-6 flex flex-wrap gap-2 border-t border-paper-dim pt-5">
        <Link to={`/study/practice/${topic.id}`} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-medium text-white"><Brain size={16}/> Practise this topic</Link>
        <Link to={`/study/together?topic=${topic.id}`} className="inline-flex items-center gap-2 rounded-full border border-ink-faint/30 px-5 py-2 text-sm font-medium"><MessageSquareText size={16}/> Discuss this topic</Link>
      </div>
    </div>
  </article>;
}
