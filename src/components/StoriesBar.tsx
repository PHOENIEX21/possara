import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Pause, Play, Plus, Trash2, X } from "lucide-react";
import { useActiveStories, useDeleteStory, usePostStory } from "../hooks/useStories";
import { useAuth } from "../store/auth";
import type { AuthorWithStories } from "../hooks/useStories";

const STORY_DURATION = 6000;

function StoryViewer({ group, onClose }: { group: AuthorWithStories; onClose: () => void }) {
  const { userId } = useAuth();
  const deleteStory = useDeleteStory();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const story = group.stories[index];
  const ownStory = userId === story.author_id;

  function next(){ setConfirmDelete(false); setProgress(0); if(index < group.stories.length-1) setIndex(i=>i+1); else onClose(); }
  function prev(){ setConfirmDelete(false); setProgress(0); if(index>0) setIndex(i=>i-1); }

  useEffect(()=>{ setProgress(0); setPaused(false); },[index,group.authorId]);
  useEffect(()=>{
    if(paused||confirmDelete)return;
    const start=Date.now()-(progress/100)*STORY_DURATION;
    const timer=window.setInterval(()=>{
      const nextProgress=Math.min(100,((Date.now()-start)/STORY_DURATION)*100);
      setProgress(nextProgress);
      if(nextProgress>=100){window.clearInterval(timer);next();}
    },80);
    return()=>window.clearInterval(timer);
  },[paused,confirmDelete,index]);

  async function removeCurrent(){try{await deleteStory.mutateAsync(story);onClose();}catch{}}

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 sm:px-4">
    <div className="relative flex h-full w-full max-w-sm flex-col justify-center sm:h-auto">
      <div className="absolute left-0 right-0 top-0 z-20 p-3 sm:static sm:p-0">
        <div className="mb-2 flex gap-1">{group.stories.map((_,i)=><div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"><div className="h-full bg-white" style={{width:i<index?"100%":i===index?`${progress}%`:"0%"}}/></div>)}</div>
        <div className="flex items-center gap-2 text-white">
          {group.author?.avatar_url?<img src={group.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover"/>:<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs">{(group.author?.full_name??"?").charAt(0).toUpperCase()}</div>}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{group.author?.full_name??"Member"}</span>
          <button onClick={()=>setPaused(v=>!v)} className="rounded-full bg-black/25 p-2" aria-label={paused?"Resume Moment":"Pause Moment"}>{paused?<Play size={17}/>:<Pause size={17}/>}</button>
          {ownStory&&<button onClick={()=>{setPaused(true);setConfirmDelete(true);}} className="rounded-full bg-black/25 p-2" aria-label="Delete Moment"><Trash2 size={16}/></button>}
          <button onClick={onClose} className="rounded-full bg-black/25 p-2" aria-label="Close"><X size={19}/></button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center sm:flex-none">
        {story.media_url?<img src={story.media_url} alt="" className="max-h-screen w-full object-contain sm:max-h-[72vh] sm:rounded-xl"/>:<div className="flex h-[60vh] w-full items-center justify-center bg-white/10 text-sm text-white/70">Moment unavailable</div>}
        <button onClick={prev} disabled={index===0} className="absolute inset-y-0 left-0 w-1/3 disabled:cursor-default" aria-label="Previous Moment"/>
        <button onClick={next} className="absolute inset-y-0 right-0 w-1/3" aria-label="Next Moment"/>
        {paused&&!confirmDelete&&<button onClick={()=>setPaused(false)} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 p-4 text-white"><Play size={28}/></button>}
      </div>
      {story.caption&&<p className="absolute bottom-5 left-4 right-4 z-10 rounded-xl bg-black/35 px-3 py-2 text-center text-sm text-white sm:static sm:mt-2 sm:bg-transparent sm:p-0">{story.caption}</p>}
      {confirmDelete&&<div className="absolute inset-x-4 bottom-5 z-30 rounded-2xl bg-white p-4 text-sm text-ink shadow-xl"><p className="font-medium">Delete this Moment?</p><p className="mt-1 text-xs text-ink-light">This cannot be undone.</p><div className="mt-3 flex gap-3"><button onClick={removeCurrent} disabled={deleteStory.isPending} className="rounded-full bg-flag px-4 py-2 font-medium text-white">{deleteStory.isPending?"Deleting…":"Delete"}</button><button onClick={()=>{setConfirmDelete(false);setPaused(false);}} className="rounded-full bg-paper-dim px-4 py-2">Cancel</button></div></div>}
    </div>
  </div>;
}

export function StoriesBar(){
  const {userId}=useAuth();
  const {data:groups}=useActiveStories();
  const postStory=usePostStory();
  const fileInputRef=useRef<HTMLInputElement>(null);
  const [viewingGroup,setViewingGroup]=useState<AuthorWithStories|null>(null);
  const [uploadMessage,setUploadMessage]=useState<string|null>(null);
  const [uploadError,setUploadError]=useState<string|null>(null);
  const otherGroups=groups?.filter(g=>g.authorId!==userId)??[];
  const myGroup=groups?.find(g=>g.authorId===userId);

  async function handleAddStory(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setUploadError(null);setUploadMessage("Uploading Moment…");try{await postStory.mutateAsync({imageFile:file,caption:""});setUploadMessage("Moment uploaded.");window.setTimeout(()=>setUploadMessage(null),3000);}catch(err){setUploadMessage(null);setUploadError((err as Error).message);}finally{e.target.value="";}}
  if(!userId&&otherGroups.length===0)return null;
  return <div><div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
    {userId&&<div className="flex shrink-0 flex-col items-center gap-1"><div className="relative h-14 w-14"><button type="button" onClick={()=>myGroup?setViewingGroup(myGroup):fileInputRef.current?.click()} className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-brand/40">{myGroup?<div className="h-full w-full rounded-full border-2 border-brand p-0.5"><div className="flex h-full w-full items-center justify-center rounded-full bg-paper text-sm font-medium text-trust-dark">You</div></div>:<Plus size={20} className="text-brand"/>}</button>{myGroup&&<button type="button" onClick={()=>fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand text-white"><Plus size={14}/></button>}</div><span className="text-[11px] text-ink-light">Your Moment</span></div>}
    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAddStory} className="hidden"/>
    {otherGroups.map(group=><button key={group.authorId} onClick={()=>setViewingGroup(group)} className="flex shrink-0 flex-col items-center gap-1"><div className="h-14 w-14 rounded-full border-2 border-brand p-0.5"><div className="h-full w-full rounded-full bg-paper p-0.5">{group.author?.avatar_url?<img src={group.author.avatar_url} alt="" className="h-full w-full rounded-full object-cover"/>:<div className="flex h-full w-full items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">{(group.author?.full_name??"?").charAt(0).toUpperCase()}</div>}</div></div><span className="max-w-[60px] truncate text-[11px] text-ink-light">{group.author?.full_name?.split(" ")[0]??"Member"}</span></button>)}
    {viewingGroup&&<StoryViewer group={viewingGroup} onClose={()=>setViewingGroup(null)}/>}</div>
    {uploadMessage&&<div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-trust-dark">{!postStory.isPending&&<CheckCircle2 size={14}/>}<span>{uploadMessage}</span></div>}
    {uploadError&&<p className="mt-2 text-xs text-flag">{uploadError}</p>}
  </div>;
}
