import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { AtSign, Check, CheckCheck, ChevronLeft, Copy, Forward, MessageCircle, MoreHorizontal, Pencil, Reply, Search, Send, Trash2, X } from "lucide-react";
import {
  useConversations,
  useDeleteMessageForMe,
  useEditMessage,
  useForwardMessage,
  useMarkThreadRead,
  useSendMessage,
  useThread,
  useToggleMessageReaction,
} from "../hooks/useMessages";
import type { ConversationPreview, MessageReactionType, ThreadMessage } from "../hooks/useMessages";
import { useAuth } from "../store/auth";
import { ProfilePhotoViewer } from "../components/ProfilePhotoViewer";
import { useProfileById } from "../hooks/useProfile";
import { useUserPresence } from "../hooks/useSocialPrivacy";

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

function ConversationList({ conversations, isLoading, activeUserId }: { conversations: ConversationPreview[] | undefined; isLoading: boolean; activeUserId?: string }) {
  const [photo,setPhoto]=useState<{src:string;name:string}|null>(null);
  const [search,setSearch]=useState("");
  const filtered=(conversations??[]).filter(c=>{
    const haystack=`${c.otherUser?.full_name??""} ${c.otherUser?.username??""} ${c.lastMessage}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return <aside className={`${activeUserId?"hidden sm:block":"block"} w-full shrink-0 sm:w-[290px] sm:border-r sm:border-paper-dim sm:pr-4`}>
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-ink-faint"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"/></div>
    {isLoading&&<p className="text-sm text-ink-light">Loading…</p>}
    {!isLoading&&conversations?.length===0&&<p className="rounded-xl bg-paper p-4 text-sm leading-5 text-ink-light">No conversations yet — visit someone&apos;s profile on Connect and message them.</p>}
    {!isLoading&&!!conversations?.length&&filtered.length===0&&<p className="px-2 py-4 text-sm text-ink-faint">No conversation matches that search.</p>}
    <div className="space-y-1">{filtered.map((c)=>{
      const name=c.otherUser?.full_name??"Member";
      const profilePath=c.otherUser?.username?`/profile/${c.otherUser.username}`:`/profile/id/${c.otherUserId}`;
      return <div key={c.otherUserId} className={`flex items-center gap-2.5 rounded-xl px-2 py-2.5 transition hover:bg-paper-dim ${activeUserId===c.otherUserId?"bg-brand-light":""}`}>
        {c.otherUser?.avatar_url?<button type="button" onClick={()=>setPhoto({src:c.otherUser!.avatar_url!,name})} className="h-10 w-10 shrink-0 rounded-full" aria-label={`View ${name} profile photo`}><img src={c.otherUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/></button>:<Link to={profilePath} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trust-light text-xs font-medium text-trust-dark">{name.charAt(0).toUpperCase()}</Link>}
        <Link to={`/messages/${c.otherUserId}`} className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className={`truncate text-sm ${c.unread?"font-bold":"font-semibold"}`}>{name}</p><span className="shrink-0 text-[10px] text-ink-faint">{new Date(c.lastMessageAt).toLocaleDateString([], {month:"short",day:"numeric"})}</span></div><p className={`truncate text-xs ${c.unread?"font-medium text-ink":"text-ink-faint"}`}>{c.lastMessage}</p></Link>
        {c.unread&&<span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand"/>}
      </div>;
    })}</div>
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
      <div className="flex items-center justify-between"><div><h3 className="font-semibold">Forward message</h3><p className="mt-0.5 text-xs text-ink-faint">Choose a conversation.</p></div><button onClick={onClose} className="rounded-full p-2 hover:bg-paper" aria-label="Close"><X size={18}/></button></div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-paper px-3 py-2"><Search size={14} className="text-ink-faint"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find someone" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
      <div className="mt-2 max-h-64 overflow-y-auto">{filtered.length===0?<p className="p-3 text-sm text-ink-faint">No conversation found.</p>:filtered.map(c=><button key={c.otherUserId} onClick={()=>sendTo(c.otherUserId)} disabled={forwardMessage.isPending} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-paper disabled:opacity-50">{c.otherUser?.avatar_url?<img src={c.otherUser.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover"/>:<div className="flex h-9 w-9 items-center justify-center rounded-full bg-trust-light text-xs font-semibold text-trust-dark">{(c.otherUser?.full_name??"?").charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{c.otherUser?.full_name??"Member"}</p>{c.otherUser?.username&&<p className="truncate text-xs text-ink-faint">@{c.otherUser.username}</p>}</div></button>)}</div>
      {forwardMessage.error&&<p className="mt-2 text-sm text-flag">{(forwardMessage.error as Error).message}</p>}
    </div>
  </div>;
}

function Thread({ otherUserId, conversations }: { otherUserId: string; conversations: ConversationPreview[] }) {
  const { userId }=useAuth();
  const {data:profile}=useProfileById(otherUserId);
  const {data:presence}=useUserPresence(otherUserId);
  const {data:messages,isLoading}=useThread(otherUserId);
  const sendMessage=useSendMessage(otherUserId);
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
  const bottomRef=useRef<HTMLDivElement>(null);

  const messageById=useMemo(()=>new Map((messages??[]).map(message=>[message.id,message])),[messages]);
  const shownMessages=useMemo(()=>{
    if(!messageSearch.trim())return messages??[];
    const needle=messageSearch.trim().toLowerCase();
    return (messages??[]).filter(message=>message.content.toLowerCase().includes(needle));
  },[messages,messageSearch]);

  const unreadIncoming=(messages??[]).some(message=>message.sender_id===otherUserId&&!message.read);
  useEffect(()=>{if(unreadIncoming)markRead.mutate();},[otherUserId,unreadIncoming,messages?.length]);
  useEffect(()=>{if(!messageSearch)bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages?.length,messageSearch]);

  const mentionCandidate=profile?.username&&/@[a-zA-Z0-9_]*$/.test(text)?profile.username:null;
  const profilePath=profile?.username?`/profile/${profile.username}`:`/profile/id/${otherUserId}`;
  const presenceText=presence?.visible?(presence.online?"Online":formatLastSeen(presence.lastSeenAt)):"Activity hidden";

  async function handleSend(e:React.FormEvent){
    e.preventDefault();
    const clean=text.trim();
    if(!clean)return;
    if(editingMessage){await editMessage.mutateAsync({messageId:editingMessage.id,content:clean});setEditingMessage(null);setText("");return;}
    await sendMessage.mutateAsync({content:clean,replyToId:replyingTo?.id??null});
    setText("");setReplyingTo(null);
  }

  function startEdit(message:ThreadMessage){setEditingMessage(message);setReplyingTo(null);setText(message.content);setActionsFor(null);}
  function startReply(message:ThreadMessage){setReplyingTo(message);setEditingMessage(null);setActionsFor(null);}
  function insertMention(){if(!profile?.username)return;setText(value=>value.replace(/@[a-zA-Z0-9_]*$/,`@${profile.username} `));}
  async function copyMessage(content:string){await navigator.clipboard.writeText(content);setActionsFor(null);}
  async function removeForMe(message:ThreadMessage){await deleteMessage.mutateAsync({messageId:message.id,sentByMe:message.sender_id===userId});setActionsFor(null);}

  return <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden sm:pl-1">
    <header className="flex items-center gap-3 border-b border-paper-dim pb-3">
      <Link to="/messages" className="rounded-full p-2 hover:bg-paper sm:hidden" aria-label="Back to conversations"><ChevronLeft size={20}/></Link>
      <Link to={profilePath} className="flex min-w-0 flex-1 items-center gap-3">{profile?.avatar_url?<img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/>:<div className="flex h-10 w-10 items-center justify-center rounded-full bg-trust-light text-sm font-semibold text-trust-dark">{(profile?.full_name??"?").charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-bold">{profile?.full_name??"POSSARA member"}</p><div className="flex items-center gap-1.5 text-xs text-ink-faint">{presence?.online&&presence.visible&&<span className="h-2 w-2 rounded-full bg-green-500"/>}<span>{presenceText}</span></div></div></Link>
      <button onClick={()=>setSearchOpen(value=>!value)} className={`rounded-full p-2 ${searchOpen?"bg-brand-light text-brand-dark":"text-ink-light hover:bg-paper"}`} aria-label="Search this conversation"><Search size={18}/></button>
    </header>

    {searchOpen&&<div className="mt-2 flex items-center gap-2 rounded-xl border border-paper-dim bg-paper px-3 py-2"><Search size={14} className="text-ink-faint"/><input autoFocus value={messageSearch} onChange={e=>setMessageSearch(e.target.value)} placeholder="Search messages in this conversation" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/><button onClick={()=>{setSearchOpen(false);setMessageSearch("");}} className="text-ink-faint"><X size={15}/></button></div>}

    <div className="mt-3 flex-1 space-y-3 overflow-y-auto px-1 pb-3" style={{maxHeight:"calc(100vh - 300px)",minHeight:"280px"}}>
      {isLoading&&<p className="text-sm text-ink-light">Loading…</p>}
      {!isLoading&&shownMessages.length===0&&<div className="flex h-full min-h-56 flex-col items-center justify-center text-center"><MessageCircle size={28} className="text-ink-faint"/><p className="mt-2 text-sm text-ink-light">{messageSearch?"No messages match your search.":"Start the conversation."}</p></div>}
      {shownMessages.map(message=>{
        const mine=message.sender_id===userId;
        const replied=message.reply_to_id?messageById.get(message.reply_to_id):undefined;
        const currentReaction=message.reactions.find(reaction=>reaction.user_id===userId)?.reaction??null;
        const reactionCounts=MESSAGE_REACTIONS.map(option=>({ ...option,count:message.reactions.filter(reaction=>reaction.reaction===option.type).length })).filter(item=>item.count>0);
        return <div key={message.id} className={`group flex ${mine?"justify-end":"justify-start"}`}>
          <div className={`relative max-w-[88%] sm:max-w-[72%] ${mine?"items-end":"items-start"}`}>
            <div className="flex items-end gap-1.5">
              {!mine&&<button onClick={()=>setActionsFor(actionsFor===message.id?null:message.id)} className="mb-1 rounded-full p-1.5 text-ink-faint opacity-70 hover:bg-paper hover:text-ink" aria-label="Message actions"><MoreHorizontal size={15}/></button>}
              <div className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${mine?"rounded-br-md bg-brand text-white":"rounded-bl-md bg-paper-dim text-ink"}`}>
                {message.forwarded_from_id&&<p className={`mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${mine?"text-white/65":"text-ink-faint"}`}><Forward size={10}/>Forwarded</p>}
                {replied&&<div className={`mb-2 rounded-lg border-l-2 px-2 py-1.5 text-xs ${mine?"border-white/50 bg-white/10 text-white/80":"border-brand/40 bg-white/70 text-ink-light"}`}><p className="mb-0.5 font-semibold">{replied.sender_id===userId?"You":profile?.full_name??"Reply"}</p><p className="line-clamp-2">{replied.content}</p></div>}
                <p className="whitespace-pre-wrap break-words"><MessageText content={message.content}/></p>
                <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${mine?"text-white/65":"text-ink-faint"}`}><span>{formatMessageTime(message.created_at)}</span>{message.edited_at&&<span>edited</span>}{mine&&(message.read&&presence?.sendReadReceipts?<><CheckCheck size={12}/><span>Seen</span></>:<Check size={12}/>)}</div>
              </div>
              {mine&&<button onClick={()=>setActionsFor(actionsFor===message.id?null:message.id)} className="mb-1 rounded-full p-1.5 text-ink-faint opacity-70 hover:bg-paper hover:text-ink" aria-label="Message actions"><MoreHorizontal size={15}/></button>}
            </div>

            {reactionCounts.length>0&&<div className={`mt-1 flex flex-wrap gap-1 ${mine?"justify-end pr-7":"justify-start pl-7"}`}>{reactionCounts.map(reaction=><button key={reaction.type} onClick={()=>toggleReaction.mutate({messageId:message.id,reaction:reaction.type,currentReaction})} className={`rounded-full border px-2 py-0.5 text-xs ${currentReaction===reaction.type?"border-brand/30 bg-brand-light":"border-paper-dim bg-white"}`} title={reaction.label}>{reaction.emoji}{reaction.count>1?` ${reaction.count}`:""}</button>)}</div>}

            {actionsFor===message.id&&<div className={`absolute ${mine?"right-7":"left-7"} top-full z-30 mt-1 w-72 rounded-2xl border border-black/[.06] bg-white p-2 text-ink shadow-xl`}>
              <div className="mb-1 flex items-center justify-between gap-1 rounded-xl bg-paper p-1">{MESSAGE_REACTIONS.map(reaction=><button key={reaction.type} onClick={()=>{toggleReaction.mutate({messageId:message.id,reaction:reaction.type,currentReaction});setActionsFor(null);}} className={`flex flex-1 flex-col items-center rounded-lg px-1 py-1.5 text-[10px] ${currentReaction===reaction.type?"bg-white text-brand-dark shadow-sm":"text-ink-light hover:bg-white"}`} title={reaction.label}><span className="text-lg">{reaction.emoji}</span><span>{reaction.label}</span></button>)}</div>
              <div className="grid grid-cols-2 gap-1 text-sm"><button onClick={()=>startReply(message)} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper"><Reply size={14}/>Reply</button><button onClick={()=>{setForwardingMessage(message);setActionsFor(null);}} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper"><Forward size={14}/>Forward</button><button onClick={()=>copyMessage(message.content)} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper"><Copy size={14}/>Copy</button>{mine&&<button onClick={()=>startEdit(message)} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-paper"><Pencil size={14}/>Edit</button>}<button onClick={()=>removeForMe(message)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-flag hover:bg-red-50"><Trash2 size={14}/>Delete for me</button></div>
            </div>}
          </div>
        </div>;
      })}
      <div ref={bottomRef}/>
    </div>

    <div className="sticky bottom-[72px] z-20 bg-white pt-2 md:bottom-0">
      {(replyingTo||editingMessage)&&<div className="mb-2 flex items-start gap-2 rounded-xl border border-paper-dim bg-paper px-3 py-2"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-brand-dark">{editingMessage?"Editing message":"Replying to message"}</p><p className="truncate text-xs text-ink-light">{editingMessage?.content??replyingTo?.content}</p></div><button onClick={()=>{setReplyingTo(null);setEditingMessage(null);if(editingMessage)setText("");}} className="rounded-full p-1 text-ink-faint"><X size={14}/></button></div>}
      {mentionCandidate&&<button type="button" onClick={insertMention} className="mb-2 flex w-full items-center gap-2 rounded-xl border border-brand/15 bg-brand-light px-3 py-2 text-left text-sm text-brand-dark"><AtSign size={14}/><span>Tag @{mentionCandidate}</span></button>}
      <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-paper-dim bg-white pt-3"><textarea rows={1} maxLength={4000} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} placeholder={editingMessage?"Edit your message…":"Write a message…"} className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-ink-faint/30 px-4 py-2.5 text-sm outline-none focus:border-brand"/><button type="submit" disabled={!text.trim()||sendMessage.isPending||editMessage.isPending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40" aria-label={editingMessage?"Save edit":"Send"}>{editingMessage?<Check size={16}/>:<Send size={16}/>}</button></form>
      {(sendMessage.error||editMessage.error||deleteMessage.error)&&<p className="mt-2 text-sm text-flag">{((sendMessage.error||editMessage.error||deleteMessage.error) as Error).message}</p>}
    </div>

    {forwardingMessage&&<ForwardSheet message={forwardingMessage} conversations={conversations} onClose={()=>setForwardingMessage(null)}/>} 
  </section>;
}

export function Messages(){
  const {userId:otherUserId}=useParams<{userId:string}>();
  const {userId}=useAuth();
  const {data:conversations,isLoading}=useConversations();
  if(otherUserId===userId)return <Navigate to="/messages" replace/>;
  return <div className="pb-4"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-dark">POSSARA</p><h1 className="text-2xl">Messages</h1></div><p className="hidden text-xs text-ink-faint sm:block">Private conversations with your community.</p></div><div className="relative flex min-h-[64vh] flex-col gap-4 overflow-hidden rounded-2xl border border-paper-dim bg-white p-3 shadow-sm sm:flex-row sm:p-4"><ConversationList conversations={conversations} isLoading={isLoading} activeUserId={otherUserId}/>{otherUserId?<Thread otherUserId={otherUserId} conversations={conversations??[]}/>:<div className="hidden flex-1 flex-col items-center justify-center py-16 text-center sm:flex"><MessageCircle size={30} className="text-ink-faint"/><p className="mt-3 font-medium text-ink-light">Choose a conversation.</p><p className="mt-1 max-w-xs text-sm text-ink-faint">Or start one from a member&apos;s profile on Connect.</p></div>}</div></div>;
}
