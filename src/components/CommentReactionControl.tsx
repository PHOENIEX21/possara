import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MemberFollowButton } from "./MemberFollowButton";
import { X } from "lucide-react";
import {
  useCommentReactionPeople,
  useToggleCommentReaction,
  type CommentReactionType,
  type CommentWithAuthor,
} from "../hooks/useComments";

const REACTIONS: { type: CommentReactionType; emoji: string; label: string }[] = [
  { type: "like", emoji: "❤️", label: "Love" },
  { type: "spark", emoji: "✨", label: "Spark" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "useful", emoji: "👍", label: "Useful" },
];

const HOLD_MS = 420;

function compact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function CommentReactionControl({ postId, comment }: { postId: string; comment: CommentWithAuthor }) {
  const toggle = useToggleCommentReaction(postId);
  const [pickerOpen,setPickerOpen]=useState(false);
  const [peopleOpen,setPeopleOpen]=useState(false);
  const people=useCommentReactionPeople(comment.id,peopleOpen);
  const timer=useRef<number|null>(null);
  const longOpened=useRef(false);
  const selected=REACTIONS.find((item)=>item.type===comment.viewer_reaction) ?? null;

  function clearTimer(){
    if(timer.current!==null){window.clearTimeout(timer.current);timer.current=null;}
  }
  function startHold(){
    clearTimer();
    longOpened.current=false;
    timer.current=window.setTimeout(()=>{longOpened.current=true;setPickerOpen(true);timer.current=null;},HOLD_MS);
  }
  function finishPress(){
    const long=longOpened.current;
    clearTimer();
    if(!long&&!pickerOpen){
      toggle.mutate({commentId:comment.id,reaction:selected?.type ?? "like",currentReaction:comment.viewer_reaction});
    }
    longOpened.current=false;
  }
  function choose(type:CommentReactionType){
    toggle.mutate({commentId:comment.id,reaction:type,currentReaction:comment.viewer_reaction});
    setPickerOpen(false);
  }

  return <>
    <span className="relative inline-flex items-center">
      {pickerOpen&&<div className="absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-2xl border border-black/[.06] bg-white p-2 shadow-xl">
        {REACTIONS.map((reaction)=>(
          <button key={reaction.type} type="button" onClick={()=>choose(reaction.type)} className={`flex min-w-[58px] flex-col items-center rounded-xl px-2 py-2 text-[11px] font-medium hover:bg-paper ${comment.viewer_reaction===reaction.type?"bg-brand-light text-brand-dark":"text-ink-light"}`}>
            <span className="text-lg leading-none">{reaction.emoji}</span><span className="mt-1">{reaction.label}</span>
          </button>
        ))}
      </div>}
      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={finishPress}
        onPointerCancel={clearTimer}
        onPointerLeave={clearTimer}
        onContextMenu={(event)=>{event.preventDefault();clearTimer();setPickerOpen(true);}}
        className={`text-[12px] font-semibold ${selected?"text-brand-dark":"text-ink-faint hover:text-ink"}`}
        title={selected? `${selected.label} · press and hold for more` : "Tap to react · press and hold for more"}
      >
        {selected ? `${selected.emoji} ${selected.label}` : "React"}
      </button>
      {pickerOpen&&<button type="button" aria-label="Close reaction picker" className="fixed inset-0 z-20 cursor-default" onClick={()=>setPickerOpen(false)}/>}
    </span>

    {comment.reaction_count>0&&(
      <button type="button" onClick={()=>setPeopleOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint hover:text-ink" aria-label={`See ${comment.reaction_count} reactions`}>
        <span className="flex -space-x-1">
          {REACTIONS.filter((reaction)=>comment.reaction_counts[reaction.type]>0).slice(0,3).map((reaction)=><span key={reaction.type} className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] shadow-sm">{reaction.emoji}</span>)}
        </span>
        {compact(comment.reaction_count)}
      </button>
    )}

    {peopleOpen&&<div className="fixed inset-0 z-[90] flex items-end bg-ink/45 sm:items-center sm:justify-center sm:p-4" onClick={()=>setPeopleOpen(false)}>
      <div className="max-h-[72vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl" onClick={(event)=>event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-paper-dim px-5 py-4">
          <div><h2 className="text-xl font-semibold">Comment reactions</h2><p className="text-xs text-ink-faint">{comment.reaction_count} {comment.reaction_count===1?"person":"people"}</p></div>
          <button type="button" onClick={()=>setPeopleOpen(false)} className="rounded-full p-2 hover:bg-paper" aria-label="Close"><X size={18}/></button>
        </div>
        <div className="max-h-[58vh] overflow-y-auto p-2">
          {people.isLoading&&<p className="p-4 text-sm text-ink-light">Loading reactions…</p>}
          {people.error&&<p className="p-4 text-sm text-flag">Couldn&apos;t load reactions.</p>}
          {people.data?.map((person)=>{
            const name=person.full_name??person.username??"POSSARA member";
            const path=person.username?`/profile/${person.username}`:`/profile/id/${person.user_id}`;
            const reaction=REACTIONS.find((item)=>item.type===person.type);
            return <div key={person.user_id} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-paper">
              <Link to={path} onClick={()=>setPeopleOpen(false)} className="flex min-w-0 flex-1 items-center gap-3">
                {person.avatar_url?<img src={person.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/>:<span className="flex h-10 w-10 items-center justify-center rounded-full bg-trust-light font-semibold text-trust-dark">{name.charAt(0).toUpperCase()}</span>}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{name}</span>{person.username&&<span className="block truncate text-xs text-ink-faint">@{person.username}</span>}</span>
              </Link>
              <span className="rounded-full bg-paper px-2 py-1 text-xs" title={reaction?.label}>{reaction?.emoji}</span>
              <MemberFollowButton targetUserId={person.user_id} compact signedOutLink={false}/>
            </div>;
          })}
        </div>
      </div>
    </div>}
  </>;
}
