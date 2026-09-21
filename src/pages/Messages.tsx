import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { AtSign, Check, CheckCheck, ChevronLeft, Copy, Forward, Image as ImageIcon, MessageCircle, Mic, MoreHorizontal, Pencil, Reply, Search, Send, Share2, Square, Trash2, X } from "lucide-react";
import {
  useConversations,
  useMessageRequests,
  useDeclineMessageRequest,
  useDeleteMessageForMe,
  useEditMessage,
  useForwardMessage,
  useMarkThreadRead,
  useSendMessage,
  useSendPhotoMessage,
  useSendVoiceMessage,
  useThread,
  useToggleMessageReaction,
} from "../hooks/useMessages";
import type { ConversationPreview, MessageReactionType, ThreadMessage } from "../hooks/useMessages";
import { useMessageDirectory, useOnlineMemberCount } from "../hooks/useMessageDirectory";
import type { MessageDirectoryMember } from "../hooks/useMessageDirectory";
import { useAuth } from "../store/auth";
import { ProfilePhotoViewer } from "../components/ProfilePhotoViewer";
import { useProfileById } from "../hooks/useProfile";
import { useUserPresence } from "../hooks/useSocialPrivacy";
import { useTypingIndicator } from "../hooks/useTypingIndicator";

const MESSAGE_REACTIONS: { type: MessageReactionType; emoji: string; label: string }[] = [
  { type: "spark", emoji: "✨", label: "Spark" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "laugh", emoji: "😂", label: "Laugh" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "support", emoji: "🤝", label: "Support" },
];

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLastSeen(value: string | null) {
  if (!value) return "Offline";
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return `Active ${sameDay ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function MessageText({ content }: { content: string }) {
  const pieces = content.split(/(@[a-zA-Z0-9_]{3,24})/g);
  return <>{pieces.map((piece,index)=>piece.startsWith("@")?<span key={`${piece}-${index}`} className="font-semibold underline decoration-current/30">{piece}</span>:piece)}</>;
}

function DirectoryMemberRow({ member, activeUserId, onPhoto }: { member: MessageDirectoryMember; activeUserId?: string; onPhoto: (src: string, name: string) => void }) {
  const name=member.full_name??member.username??"POSSARA member";
  const profilePath=member.username?`/profile/${member.username}`:`/profile/id/${member.id}`;
  return <div className={`flex items-center gap-2.5 rounded-xl px-2 py-2.5 transition hover:bg-paper-dim ${activeUserId===member.id?"bg-brand-light":""}`}>
    <div className="relative shrink-0">
      {member.avatar_url?<button type="button" onClick={()=>onPhoto(member.avatar_url!,name)} className="h-10 w-10 rounded-full" aria-label={`View ${name} profile photo`}><img src={member.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/></button>:<Link to={profilePath} className="flex h-10 w-10 items-center justify-center rounded-full bg-trust-light text-xs font-medium text-trust-dark">{name.charAt(0).toUpperCase()}</Link>}
      {member.online&&<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" aria-label="Online"/>}
    </div>
    <Link to={`/messages/${member.id}`} className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{name}</p>{member.username&&<p className="truncate text-xs text-ink-faint">@{member.username}</p>}{member.headline&&<p className="truncate text-xs text-ink-light">{member.headline}</p>}</Link>
    <Link to={`/messages/${member.id}`} className="rounded-full border border-paper-dim bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-dark">Message</Link>
  </div>;
}

function ConversationList({ conversations, isLoading, activeUserId }: { conversations: ConversationPreview[] | undefined; isLoading: boolean; activeUserId?: string }) {
  const [photo,setPhoto]=useState<{src:string;name:string}|null>(null);
  const [search,setSearch]=useState("");
  const searching=!!search.trim();
  const {data:directory,isLoading:directoryLoading,error:directoryError}=useMessageDirectory(search);
  const {data:onlineCount}=useOnlineMemberCount();
  const {data:requests}=useMessageRequests();
  const declineRequest=useDeclineMessageRequest();
  const onlineMembers=(directory??[]).filter(member=>member.online).slice(0,8);

  return <aside className={`${activeUserId?"hidden sm:block":"block"} w-full shrink-0 sm:w-[310px] sm:border-r sm:border-paper-dim sm:pr-4`}>
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-ink-faint"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people by name" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"/>{search&&<button type="button" onClick={()=>setSearch("")} className="rounded-full p-1 hover:bg-white" aria-label="Clear search"><X size={13}/></button>}</div>

    {searching?<>
      <div className="mb-2 flex items-center justify-between px-1"><p className="text-xs font-semibold uppercase tracking-[.12em] text-ink-faint">People</p><span className="text-[11px] text-ink-faint">Search all POSSARA</span></div>
      {directoryLoading&&<p className="px-2 py-4 text-sm text-ink-light">Searching…</p>}
      {directoryError&&<p className="px-2 py-4 text-sm text-flag">Couldn&apos;t search members right now.</p>}
      {!directoryLoading&&!directoryError&&directory?.length===0&&<p className="rounded-xl bg-paper p-4 text-sm leading-5 text-ink-light">No member matches that name or username.</p>}
      <div className="max-h-[58vh] space-y-1 overflow-y-auto">{directory?.map(member=><DirectoryMemberRow key={member.id} member={member} activeUserId={activeUserId} onPhoto={(src,name)=>setPhoto({src,name})}/>)}</div>
    </>:<>
      <section className="mb-4 rounded-2xl border border-paper-dim bg-paper/60 p-3">
        <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-trust-dark">Online now</p><p className="mt-0.5 text-xs text-ink-faint">Members who choose to show activity.</p></div><div className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-sm">{onlineCount??0}</div></div>
        {directoryLoading?<p className="mt-3 text-xs text-ink-light">Checking who&apos;s online…</p>:onlineMembers.length>0?<div className="mt-3 space-y-1">{onlineMembers.map(member=><DirectoryMemberRow key={member.id} member={member} activeUserId={activeUserId} onPhoto={(src,name)=>setPhoto({src,name})}/>)}</div>:<p className="mt-3 text-xs text-ink-faint">No one is showing as online right now.</p>}
      </section>

      {requests&&requests.length>0&&<section className="mb-4"><div className="mb-2 flex items-center justify-between px-1"><p className="text-xs font-semibold uppercase tracking-[.12em] text-ink-faint">Message requests</p><span className="text-[11px] text-ink-faint">{requests.length}</span></div><div className="space-y-1">{requests.map((r:any)=><div key={r.senderId} className="flex items-center gap-2 rounded-xl bg-paper p-2.5"><Link to={`/messages/${r.senderId}`} className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.profile?.full_name??r.profile?.username??"Member"}</p><p className="truncate text-xs text-ink-faint">{r.message.content||"New message"}</p></Link><button type="button" onClick={()=>declineRequest.mutate(r.senderId)} className="rounded-lg px-2 py-1 text-xs font-semibold text-flag">Decline</button></div>)}</div></section>}
      <div className="mb-2 flex items-center justify-between px-1"><p className="text-xs font-semibold uppercase tracking-[.12em] text-ink-faint">Recent chats</p><span className="text-[11px] text-ink-faint">{conversations?.length??0}</span></div>
      {isLoading&&<p className="text-sm text-ink-light">Loading…</p>}
      {!isLoading&&conversations?.length===0&&<p className="rounded-xl bg-paper p-4 text-sm leading-5 text-ink-light">No conversations yet. Search for any POSSARA member above and start one.</p>}
      <div className="space-y-1">{(conversations??[]).map((c)=>{
        const name=c.otherUser?.full_name??"Member";
        const profilePath=c.otherUser?.username?`/profile/${c.otherUser.username}`:`/profile/id/${c.otherUserId}`;
        return <div key={c.otherUserId} className={`flex items-center gap-2.5 rounded-xl px-2 py-2.5 transition hover:bg-paper-dim ${activeUserId===c.otherUserId?"bg-brand-light":""}`}>
          {c.otherUser?.avatar_url?<button type="button" onClick={()=>setPhoto({src:c.otherUser!.avatar_url!,name})} className="h-10 w-10 shrink-0 rounded-full" aria-label={`View ${name} profile photo`}><img src={c.otherUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/></button>:<Link to={profilePath} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trust-light text-xs font-medium text-trust-dark">{name.charAt(0).toUpperCase()}</Link>}
          <Link to={`/messages/${c.otherUserId}`} className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className={`truncate text-sm ${c.unread?"font-bold":"font-semibold"}`}>{name}</p><span className="shrink-0 text-[10px] text-ink-faint">{new Date(c.lastMessageAt).toLocaleDateString([], {month:"short",day:"numeric"})}</span></div><p className={`truncate text-xs ${c.unread?"font-medium text-ink":"text-ink-faint"}`}>{c.lastMessage}</p></Link>
          {c.unread&&<span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand"/>}
        </div>;
      })}</div>
    </>}
    {photo&&<ProfilePhotoViewer src={photo.src} name={photo.name} onClose={()=>setPhoto(null)}/>} 
  </aside>;
}

function ForwardSheet({ message, conversations, onClose }: { message: ThreadMessage; conversations: ConversationPreview[]; onClose: () => void }) {
  const forwardMessage=useForwardMessage();
  const [search,setSearch]=useState("");
  const filtered=conversations.filter(c=>`${c.otherUser?.full_name??""} ${c.otherUser?.username??""}`.toLowerCase().includes(search.toLowerCase()));
  async function sendTo(targetUserId:string){await forwardMessage.mutateAsync({message,targetUserId});onClose();}

  return <div className="absolute inset-0 z-40 flex items-end bg-ink/25 sm:items-center sm:justify-center">
    <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-sm sm:rounded-3xl">
      <div className="flex items-center justify-between"><div><h3 className="font-semibold">Forward message</h3><p className="mt-0.5 text-xs text-ink-faint">Choose a POSSARA conversation.</p></div><button onClick={onClose} className="rounded-full p-2 hover:bg-paper" aria-label="Close"><X size={18}/></button></div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-paper px-3 py-2"><Search size={14} className="text-ink-faint"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find someone" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
      <div className="mt-2 max-h-64 overflow-y-auto">{filtered.length===0?<p className="p-3 text-sm text-ink-faint">No conversation found.</p>:filtered.map(c=><button key={c.otherUserId} onClick={()=>sendTo(c.otherUserId)} disabled={forwardMessage.isPending} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-paper disabled:opacity-50">{c.otherUser?.avatar_url?<img src={c.otherUser.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover"/>:<div className="flex h-9 w-9 items-center justify-center rounded-full bg-trust-light text-xs font-semibold text-trust-dark">{(c.otherUser?.full_name??"?").charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{c.otherUser?.full_name??"Member"}</p>{c.otherUser?.username&&<p className="truncate text-xs text-ink-faint">@{c.otherUser.username}</p>}</div></button>)}</div>
      {forwardMessage.error&&<p className="mt-2 text-sm text-flag">{(forwardMessage.error as Error).message}</p>}
    </div>
  </div>;
}

type VoiceDraft={blob:Blob;url:string;duration:number;mimeType:string};

function Thread({ otherUserId, conversations }: { otherUserId: string; conversations: ConversationPreview[] }) {
  const { userId }=useAuth();
  const {data:profile}=useProfileById(otherUserId);
  const {data:presence}=useUserPresence(otherUserId);
  const {otherTyping,broadcast}=useTypingIndicator(otherUserId);
  const {data:messages,isLoading}=useThread(otherUserId);
  const sendMessage=useSendMessage(otherUserId);
  const sendPhoto=useSendPhotoMessage(otherUserId);
  const sendVoice=useSendVoiceMessage(otherUserId);
  const markRead=useMarkThreadRead(otherUserId);
  const toggleReaction=useToggleMessageReaction(otherUserId);
  const editMessage=useEditMessage(otherUserId);
  const deleteMessage=useDeleteMessageForMe(otherUserId);
  const [text,setText]=useState("");
  const [replyingTo,setReplyingTo]=useState<ThreadMessage|null>(null);
  const [editingMessage,setEditingMessage]=useState<ThreadMessage|null>(null);
  const [forwardingMessage,setForwardingMessage]=useState<ThreadMessage|null>(null);
  const [actionsFor,setActionsFor]=useState<string|null>(null);
  const [searchOpen,setSearchOpen]=useState(false);
  const [messageSearch,setMessageSearch]=useState("");
  const [photoFiles,setPhotoFiles]=useState<File[]>([]);
  const [photoPreviews,setPhotoPreviews]=useState<string[]>([]);
  const [viewPhoto,setViewPhoto]=useState<{src:string;name:string}|null>(null);
  const [recording,setRecording]=useState(false);
  const [recordingSeconds,setRecordingSeconds]=useState(0);
  const [voiceDraft,setVoiceDraft]=useState<VoiceDraft|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const messageListRef=useRef<HTMLDivElement>(null);
  const photoInputRef=useRef<HTMLInputElement>(null);
  const recorderRef=useRef<MediaRecorder|null>(null);
  const recorderStreamRef=useRef<MediaStream|null>(null);
  const recorderChunksRef=useRef<BlobPart[]>([]);
  const recorderStartedAtRef=useRef(0);
  const photoPreviewsRef=useRef<string[]>([]);
  const voiceDraftRef=useRef<VoiceDraft|null>(null);

  const messageById=useMemo(()=>new Map((messages??[]).map(message=>[message.id,message])),[messages]);
  const shownMessages=useMemo(()=>{
    if(!messageSearch.trim())return messages??[];
    const needle=messageSearch.trim().toLowerCase();
    return (messages??[]).filter(message=>message.content.toLowerCase().includes(needle));
  },[messages,messageSearch]);

  const unreadIncoming=(messages??[]).some(message=>message.sender_id===otherUserId&&!message.read);
  useEffect(()=>{if(unreadIncoming)markRead.mutate();},[otherUserId,unreadIncoming,messages?.length]);
  useEffect(()=>{if(messageSearch)return;const el=messageListRef.current;if(!el)return;window.requestAnimationFrame(()=>el.scrollTo({top:el.scrollHeight,behavior:"smooth"}));},[messages?.length,messageSearch]);
  useEffect(()=>{photoPreviewsRef.current=photoPreviews;},[photoPreviews]);
  useEffect(()=>{voiceDraftRef.current=voiceDraft;},[voiceDraft]);
  useEffect(()=>()=>{photoPreviewsRef.current.forEach((preview)=>URL.revokeObjectURL(preview));if(voiceDraftRef.current)URL.revokeObjectURL(voiceDraftRef.current.url);recorderStreamRef.current?.getTracks().forEach(track=>track.stop());},[]);
  useEffect(()=>{if(!recording)return;const timer=window.setInterval(()=>{const seconds=Math.min(90,Math.max(0,Math.round((Date.now()-recorderStartedAtRef.current)/1000)));setRecordingSeconds(seconds);if(seconds>=90&&recorderRef.current?.state==="recording")recorderRef.current.stop();},500);return()=>window.clearInterval(timer);},[recording]);

  const mentionCandidate=profile?.username&&/@[a-zA-Z0-9_]*$/.test(text)?profile.username:null;
  const profilePath=profile?.username?`/profile/${profile.username}`:`/profile/id/${otherUserId}`;
  const presenceText=presence?.visible?(presence.online?"Online":formatLastSeen(presence.lastSeenAt)):"Activity hidden";

  function clearPhoto(){photoPreviews.forEach((preview)=>URL.revokeObjectURL(preview));setPhotoPreviews([]);setPhotoFiles([]);}
  function removePhoto(index:number){setPhotoPreviews((current)=>{const preview=current[index];if(preview)URL.revokeObjectURL(preview);return current.filter((_,itemIndex)=>itemIndex!==index);});setPhotoFiles((current)=>current.filter((_,itemIndex)=>itemIndex!==index));}
  function choosePhoto(event:React.ChangeEvent<HTMLInputElement>){const picked=Array.from(event.target.files??[]);event.target.value="";if(!picked.length)return;const valid=picked.filter((file)=>["image/jpeg","image/png","image/webp"].includes(file.type)&&file.size<=8*1024*1024);const remaining=Math.max(0,10-photoFiles.length);const accepted=valid.slice(0,remaining);if(accepted.length){setPhotoFiles((current)=>[...current,...accepted]);setPhotoPreviews((current)=>[...current,...accepted.map((file)=>URL.createObjectURL(file))]);}if(valid.length!==picked.length)setNotice("Some photos were skipped. Use JPG, PNG or WebP files up to 8 MB each.");else if(valid.length>remaining)setNotice("You can send up to 10 photos at once.");else setNotice(null);setEditingMessage(null);}
  function clearVoice(){if(voiceDraft)URL.revokeObjectURL(voiceDraft.url);setVoiceDraft(null);}

  async function handleSend(e:React.FormEvent){
    e.preventDefault();
    const clean=text.trim();
    if(editingMessage){if(!clean)return;await editMessage.mutateAsync({messageId:editingMessage.id,content:clean});setEditingMessage(null);setText("");return;}
    if(photoFiles.length){await sendPhoto.mutateAsync({files:photoFiles,caption:clean,replyToId:replyingTo?.id??null});clearPhoto();setText("");setReplyingTo(null);return;}
    if(!clean)return;
    await sendMessage.mutateAsync({content:clean,replyToId:replyingTo?.id??null});
    setText("");setReplyingTo(null);
  }

  async function startRecording(){
    if(recording)return;
    clearVoice();setNotice(null);
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw new Error("Voice recording is not supported by this browser.");
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      recorderStreamRef.current=stream;
      const preferred=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg"];
      const mimeType=preferred.find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
      recorderRef.current=recorder;recorderChunksRef.current=[];recorderStartedAtRef.current=Date.now();setRecordingSeconds(0);
      recorder.ondataavailable=event=>{if(event.data.size)recorderChunksRef.current.push(event.data)};
      recorder.onstop=()=>{
        const duration=Math.max(1,Math.min(90,Math.round((Date.now()-recorderStartedAtRef.current)/1000)));
        const type=(recorder.mimeType||mimeType||"audio/webm").split(";")[0];
        const blob=new Blob(recorderChunksRef.current,{type});
        recorderStreamRef.current?.getTracks().forEach(track=>track.stop());recorderStreamRef.current=null;setRecording(false);
        if(!blob.size){setNotice("No voice audio was captured.");return;}
        setVoiceDraft({blob,url:URL.createObjectURL(blob),duration,mimeType:type});
      };
      recorder.onerror=()=>{stream.getTracks().forEach(track=>track.stop());setRecording(false);setNotice("Voice recording failed. Please try again.");};
      recorder.start(250);setRecording(true);
    }catch(error){setNotice((error as Error).message);setRecording(false);}
  }
  function stopRecording(){if(recorderRef.current?.state==="recording")recorderRef.current.stop();}
  async function sendVoiceDraft(){if(!voiceDraft)return;await sendVoice.mutateAsync({blob:voiceDraft.blob,durationSeconds:voiceDraft.duration,mimeType:voiceDraft.mimeType});clearVoice();}

  function startEdit(message:ThreadMessage){setEditingMessage(message);setReplyingTo(null);clearPhoto();clearVoice();setText(message.content);setActionsFor(null);}
  function startReply(message:ThreadMessage){setReplyingTo(message);setEditingMessage(null);setActionsFor(null);}
  function insertMention(){if(!profile?.username)return;setText(value=>value.replace(/@[a-zA-Z0-9_]*$/,`@${profile.username} `));}
  async function copyMessage(content:string){if(!content.trim())return;await navigator.clipboard.writeText(content);setActionsFor(null);setNotice("Message copied.");window.setTimeout(()=>setNotice(null),1800);}
  async function removeForMe(message:ThreadMessage){await deleteMessage.mutateAsync({messageId:message.id,sentByMe:message.sender_id===userId});setActionsFor(null);}
  async function shareOutside(message:ThreadMessage){
    setActionsFor(null);setNotice(null);
    try{
      const files:File[]=[];
      if(message.image_url){const response=await fetch(message.image_url);const blob=await response.blob();files.push(new File([blob],message.image_name||"possara-photo.jpg",{type:message.image_mime_type||blob.type||"image/jpeg"}));}
      if(message.audio_url){const response=await fetch(message.audio_url);const blob=await response.blob();const ext=(message.audio_mime_type||blob.type).includes("mp4")?"m4a":(message.audio_mime_type||blob.type).includes("ogg")?"ogg":"webm";files.push(new File([blob],`possara-voice-note.${ext}`,{type:message.audio_mime_type||blob.type||"audio/webm"}));}
      const nav=navigator as Navigator&{canShare?:(data:{files?:File[]})=>boolean};
      if(navigator.share&&(!files.length||!nav.canShare||nav.canShare({files}))){await navigator.share({title:"POSSARA message",text:message.content||undefined,files:files.length?files:undefined});return;}
      if(message.content){await navigator.clipboard.writeText(message.content);setNotice("Sharing is unavailable here, so the message text was copied.");}
      else setNotice("Your browser cannot share this media outside POSSARA. Open the photo to save it instead.");
    }catch(error){if((error as Error).name!=="AbortError")setNotice("Could not share this message outside POSSARA.");}
  }

  return <section className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:pl-1">
    <header className="flex shrink-0 items-center gap-3 border-b border-paper-dim pb-3">
      <Link to="/messages" className="rounded-full p-2 hover:bg-paper sm:hidden" aria-label="Back to conversations"><ChevronLeft size={20}/></Link>
      <Link to={profilePath} className="flex min-w-0 flex-1 items-center gap-3">{profile?.avatar_url?<img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/>:<div className="flex h-10 w-10 items-center justify-center rounded-full bg-trust-light text-sm font-semibold text-trust-dark">{(profile?.full_name??"?").charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-bold">{profile?.full_name??"POSSARA member"}</p><div className="flex items-center gap-1.5 text-xs text-ink-faint">{presence?.online&&presence.visible&&<span className="h-2 w-2 rounded-full bg-green-500"/>}<span>{presenceText}</span></div></div></Link>
      <button onClick={()=>setSearchOpen(value=>!value)} className={`rounded-full p-2 ${searchOpen?"bg-brand-light text-brand-dark":"text-ink-light hover:bg-paper"}`} aria-label="Search this conversation"><Search size={18}/></button>
    </header>

    {searchOpen&&<div className="mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-paper-dim bg-paper px-3 py-2"><Search size={14} className="text-ink-faint"/><input autoFocus value={messageSearch} onChange={e=>setMessageSearch(e.target.value)} placeholder="Search messages in this conversation" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/><button onClick={()=>{setSearchOpen(false);setMessageSearch("");}} className="text-ink-faint"><X size={15}/></button></div>}

    <div ref={messageListRef} className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 pb-4 pt-1">
      {isLoading&&<p className="text-sm text-ink-light">Loading…</p>}
      {!isLoading&&shownMessages.length===0&&<div className="flex h-full min-h-56 flex-col items-center justify-center text-center"><MessageCircle size={28} className="text-ink-faint"/><p className="mt-2 text-sm text-ink-light">{messageSearch?"No messages match your search.":"Start the conversation."}</p></div>}
      {shownMessages.map(message=>{
        const mine=message.sender_id===userId;
        const replied=message.reply_to_id?messageById.get(message.reply_to_id):undefined;
        const currentReaction=message.reactions.find(reaction=>reaction.user_id===userId)?.reaction??null;
        const reactionCounts=MESSAGE_REACTIONS.map(option=>({ ...option,count:message.reactions.filter(reaction=>reaction.reaction===option.type).length })).filter(item=>item.count>0);
        const hasText=!!message.content.trim();
        return <div key={message.id} className={`group flex ${mine?"justify-end":"justify-start"}`}>
          <div className={`relative max-w-[88%] sm:max-w-[72%] ${mine?"items-end":"items-start"}`}>
            <div className="flex items-end gap-1.5">
              {!mine&&<button onClick={()=>setActionsFor(actionsFor===message.id?null:message.id)} className="mb-1 rounded-full p-1.5 text-ink-faint opacity-70 hover:bg-paper hover:text-ink" aria-label="Message actions"><MoreHorizontal size={15}/></button>}
              <div className={`overflow-hidden rounded-2xl text-sm shadow-sm ${mine?"rounded-br-md bg-brand text-white":"rounded-bl-md bg-paper-dim text-ink"}`}>
                <div className={(message.image_url||message.audio_url)?"p-2.5":"px-3.5 py-2.5"}>
                  {message.forwarded_from_id&&<p className={`mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${mine?"text-white/65":"text-ink-faint"}`}><Forward size={10}/>Forwarded</p>}
                  {replied&&<div className={`mb-2 rounded-lg border-l-2 px-2 py-1.5 text-xs ${mine?"border-white/50 bg-white/10 text-white/80":"border-brand/40 bg-white/70 text-ink-light"}`}><p className="mb-0.5 font-semibold">{replied.sender_id===userId?"You":profile?.full_name??"Reply"}</p><p className="line-clamp-2">{replied.image_path?"📷 Photo":replied.audio_path?"🎤 Voice note":replied.content}</p></div>}
                  {message.image_url&&<button type="button" onClick={()=>setViewPhoto({src:message.image_url!,name:message.image_name||"POSSARA message photo"})} className="block w-full overflow-hidden rounded-xl bg-black/10"><img src={message.image_url} alt="Message attachment" className="max-h-72 w-full object-cover"/></button>}
                  {message.audio_url&&<div className={`rounded-xl p-2 ${mine?"bg-white/10":"bg-white/70"}`}><p className={`mb-1 text-[10px] font-semibold ${mine?"text-white/65":"text-ink-faint"}`}>Voice note{message.audio_duration_seconds?` · ${message.audio_duration_seconds}s`:""}</p><audio src={message.audio_url} controls preload="metadata" className="h-9 w-full max-w-[260px]"/></div>}
                  {hasText&&<p className={`whitespace-pre-wrap break-words ${(message.image_url||message.audio_url)?"mt-2 px-1":""}`}><MessageText content={message.content}/></p>}
                  <div className={`mt-1.5 flex items-center justify-end gap-1.5 px-1 text-[10px] ${mine?"text-white/65":"text-ink-faint"}`}><span>{formatMessageTime(message.created_at)}</span>{message.edited_at&&<span>edited</span>}{mine&&(message.read&&presence?.sendReadReceipts?<><CheckCheck size={12}/><span>Seen</span></>:<Check size={12}/>)}</div>
                </div>
              </div>
              {mine&&<button onClick={()=>setActionsFor(actionsFor===message.id?null:message.id)} className="mb-1 rounded-full p-1.5 text-ink-faint opacity-70 hover:bg-paper hover:text-ink" aria-label="Message actions"><MoreHorizontal size={15}/></button>}
            </div>

            {reactionCounts.length>0&&<div className={`mt-1 flex flex-wrap gap-1 ${mine?"justify-end pr-7":"justify-start pl-7"}`}>{reactionCounts.map(reaction=><button key={reaction.type} onClick={()=>toggleReaction.mutate({messageId:message.id,reaction:reaction.type,currentReaction})} className={`rounded-full border px-2 py-0.5 text-xs ${currentReaction===reaction.type?"border-brand/30 bg-brand-light":"border-paper-dim bg-white"}`} title={reaction.label}>{reaction.emoji}{reaction.count>1?` ${reaction.count}`:""}</button>)}</div>}

            {actionsFor===message.id&&<div className={`absolute ${mine?"right-7":"left-7"} top-full z-30 mt-1 w-72 rounded-2xl border border-black/[.06] bg-white p-2 text-ink shadow-xl`}>
              <div className="mb-1 flex items-center justify-between gap-1 rounded-xl bg-paper p-1">{MESSAGE_REACTIONS.map(reaction=><button key={reaction.type} onClick={()=>{toggleReaction.mutate({messageId:message.id,reaction:reaction.type,currentReaction});setActionsFor(null);}} className={`flex flex-1 flex-col items-center rounded-lg px-1 py-1.5 text-[10px] ${currentReaction===reaction.type?"bg-white text-brand-dark shadow-sm":"text-ink-light hover:bg-white"}`} title={reaction.label}><span className="text-lg">{reaction.emoji}</span><span>{reaction.label}</span></button>)}</div>
              <div className="grid grid-cols-2 gap-1 text-sm"><button onClick={()=>startReply(message)} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper"><Reply size={14}/>Reply</button><button onClick={()=>{setForwardingMessage(message);setActionsFor(null);}} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper"><Forward size={14}/>Forward</button><button onClick={()=>shareOutside(message)} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper"><Share2 size={14}/>Share outside</button>{hasText&&<button onClick={()=>copyMessage(message.content)} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper"><Copy size={14}/>Copy</button>}{mine&&hasText&&<button onClick={()=>startEdit(message)} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper"><Pencil size={14}/>Edit</button>}<button onClick={()=>removeForMe(message)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-flag hover:bg-red-50"><Trash2 size={14}/>Delete for me</button></div>
            </div>}
          </div>
        </div>;
      })}
    </div>

    <div className="shrink-0 border-t border-paper-dim bg-white pt-2">
      {(replyingTo||editingMessage)&&<div className="mb-2 flex items-start gap-2 rounded-xl border border-paper-dim bg-paper px-3 py-2"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-brand-dark">{editingMessage?"Editing message":"Replying to message"}</p><p className="truncate text-xs text-ink-light">{editingMessage?.content??(replyingTo?.image_path?"Photo":replyingTo?.audio_path?"Voice note":replyingTo?.content)}</p></div><button onClick={()=>{setReplyingTo(null);setEditingMessage(null);if(editingMessage)setText("");}} className="rounded-full p-1 text-ink-faint"><X size={14}/></button></div>}
      {mentionCandidate&&<button type="button" onClick={insertMention} className="mb-2 flex w-full items-center gap-2 rounded-xl border border-brand/15 bg-brand-light px-3 py-2 text-left text-sm text-brand-dark"><AtSign size={14}/><span>Tag @{mentionCandidate}</span></button>}
      {photoPreviews.length>0&&<div className="mb-2 rounded-xl bg-paper p-2"><div className="mb-2 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">{photoPreviews.length} {photoPreviews.length===1?"photo":"photos"} ready to send</p><p className="text-[11px] text-ink-faint">You can send up to 10 at once.</p></div><button type="button" onClick={clearPhoto} className="rounded-full p-2 text-ink-faint" aria-label="Remove all selected photos"><X size={16}/></button></div><div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">{photoPreviews.map((preview,index)=><div key={preview} className="relative shrink-0"><img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover"/><button type="button" onClick={()=>removePhoto(index)} className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-1 text-white" aria-label={`Remove photo ${index+1}`}><X size={11}/></button></div>)}</div></div>}
      {recording&&<div className="mb-2 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2"><div className="flex items-center gap-2 text-sm font-medium text-flag"><span className="h-2 w-2 animate-pulse rounded-full bg-flag"/>Recording · {recordingSeconds}s / 90s</div><button type="button" onClick={stopRecording} className="inline-flex items-center gap-1.5 rounded-full bg-flag px-3 py-1.5 text-xs font-semibold text-white"><Square size={12} fill="currentColor"/>Stop</button></div>}
      {voiceDraft&&!recording&&<div className="mb-2 rounded-xl bg-paper p-2"><div className="flex items-center gap-2"><audio src={voiceDraft.url} controls className="h-9 min-w-0 flex-1"/><button type="button" onClick={clearVoice} className="rounded-full p-2 text-ink-faint"><X size={16}/></button></div><div className="mt-2 flex justify-end"><button type="button" onClick={sendVoiceDraft} disabled={sendVoice.isPending} className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{sendVoice.isPending?"Sending…":`Send voice · ${voiceDraft.duration}s`}</button></div></div>}
      {otherTyping&&<p className="px-3 pb-1 text-xs font-medium text-ink-faint">Typing…</p>}
      <form onSubmit={handleSend} className="flex items-end gap-1.5 bg-white pb-1 pt-1">
        <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={choosePhoto} className="hidden"/>
        {!editingMessage&&<button type="button" onClick={()=>photoInputRef.current?.click()} disabled={recording||sendPhoto.isPending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-light hover:bg-paper-dim disabled:opacity-40" aria-label="Send photos"><ImageIcon size={19}/></button>}
        {!editingMessage&&<button type="button" onClick={recording?stopRecording:startRecording} disabled={sendVoice.isPending||!!voiceDraft} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40 ${recording?"bg-red-50 text-flag":"text-ink-light hover:bg-paper-dim"}`} aria-label={recording?"Stop voice recording":"Record voice note"}><Mic size={19}/></button>}
        <textarea rows={1} maxLength={4000} value={text} onChange={e=>{setText(e.target.value);broadcast(!!e.target.value.trim());}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} placeholder={editingMessage?"Edit your message…":photoFiles.length?"Add a caption…":"Write a message…"} className="max-h-28 min-h-10 min-w-0 flex-1 resize-none rounded-2xl border border-ink-faint/30 px-3 py-2.5 text-sm outline-none focus:border-brand"/>
        <button type="submit" disabled={recording||!!voiceDraft||(!text.trim()&&!photoFiles.length)||sendMessage.isPending||sendPhoto.isPending||editMessage.isPending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40" aria-label={editingMessage?"Save edit":"Send"}>{editingMessage?<Check size={16}/>:<Send size={16}/>}</button>
      </form>
      {(notice||sendMessage.error||sendPhoto.error||sendVoice.error||editMessage.error||deleteMessage.error)&&<p className={`pb-1 text-xs ${notice?"text-ink-faint":"text-flag"}`}>{notice??((sendMessage.error||sendPhoto.error||sendVoice.error||editMessage.error||deleteMessage.error) as Error).message}</p>}
    </div>

    {forwardingMessage&&<ForwardSheet message={forwardingMessage} conversations={conversations} onClose={()=>setForwardingMessage(null)}/>} 
    {viewPhoto&&<ProfilePhotoViewer src={viewPhoto.src} name={viewPhoto.name} onClose={()=>setViewPhoto(null)} downloadable/>}
  </section>;
}

export function Messages(){
  const {userId:otherUserId}=useParams<{userId:string}>();
  const {userId}=useAuth();
  const {data:conversations,isLoading}=useConversations();
  if(otherUserId===userId)return <Navigate to="/messages" replace/>;
  return <div className={otherUserId?"overflow-hidden sm:pb-4":"pb-4"}>
    <div className={`mb-4 items-end justify-between ${otherUserId?"hidden sm:flex":"flex"}`}><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-dark">POSSARA</p><h1 className="text-2xl">Messages</h1></div><p className="hidden text-xs text-ink-faint sm:block">Find anyone by name, see who is online and continue recent chats.</p></div>
    <div className={`relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-paper-dim bg-white p-3 shadow-sm sm:flex-row sm:p-4 ${otherUserId?"h-[calc(100dvh-164px)] min-h-[430px] sm:h-[70vh] sm:min-h-[600px]":"min-h-[64vh]"}`}><ConversationList conversations={conversations} isLoading={isLoading} activeUserId={otherUserId}/>{otherUserId?<Thread otherUserId={otherUserId} conversations={conversations??[]}/>:<div className="hidden flex-1 flex-col items-center justify-center py-16 text-center sm:flex"><MessageCircle size={30} className="text-ink-faint"/><p className="mt-3 font-medium text-ink-light">Choose a recent chat or find someone new.</p><p className="mt-1 max-w-xs text-sm text-ink-faint">Search any POSSARA member by name or username and start a private conversation.</p></div>}</div>
  </div>;
}
