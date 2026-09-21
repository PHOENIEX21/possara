import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, Sparkles } from "lucide-react";

type Place = {
  name: string;
  location: string;
  kind: string;
  note: string;
  wikiTitle: string;
  position?: string;
};

const PLACES: Place[] = [
  { name:"Lekki Conservation Centre", location:"Lagos, Nigeria", kind:"Nature & recreation", note:"Canopy walks, wetlands and green space make this one of Lagos' best-known nature escapes.", wikiTitle:"Lekki_Conservation_Centre", position:"center 45%" },
  { name:"Olumo Rock", location:"Abeokuta, Nigeria", kind:"Heritage & views", note:"A dramatic rock formation woven into the history of Abeokuta, with sweeping views from the top.", wikiTitle:"Olumo_Rock" },
  { name:"Erin-Ijesha Waterfalls", location:"Osun State, Nigeria", kind:"Waterfall escape", note:"Layered cascades and forest scenery create one of southwestern Nigeria's memorable outdoor trips.", wikiTitle:"Erin-Ijesha_Waterfalls" },
  { name:"Idanre Hills", location:"Ondo State, Nigeria", kind:"Hills & heritage", note:"Ancient settlements, dramatic hills and long views reward visitors who enjoy history and climbing.", wikiTitle:"Idanre_Hill" },
  { name:"Yankari Game Reserve", location:"Bauchi State, Nigeria", kind:"Wildlife & warm springs", note:"Wildlife, open landscapes and Wikki Warm Spring combine nature with recreation.", wikiTitle:"Yankari_National_Park" },
  { name:"Obudu Plateau", location:"Cross River State, Nigeria", kind:"Mountain escape", note:"Cool highland scenery, winding roads and mountain views make the plateau a striking Nigerian getaway.", wikiTitle:"Obudu_Plateau" },
  { name:"Gurara Falls", location:"Niger State, Nigeria", kind:"Waterfall & picnic", note:"Broad seasonal waterfalls and rocky scenery create a beautiful stop for nature lovers and day trips.", wikiTitle:"Gurara_Waterfalls" },
  { name:"Millennium Park", location:"Abuja, Nigeria", kind:"City recreation", note:"A landscaped urban park for walking, relaxing and enjoying a calmer side of the capital.", wikiTitle:"Millennium_Park_(Abuja)" },
  { name:"Jabi Lake", location:"Abuja, Nigeria", kind:"Waterfront recreation", note:"A popular lakeside setting for leisure, views and relaxed time outdoors in Abuja.", wikiTitle:"Jabi_Lake" },
  { name:"Tarkwa Bay", location:"Lagos, Nigeria", kind:"Beach escape", note:"A sheltered beach reached by boat, known for its relaxed shoreline atmosphere away from central Lagos.", wikiTitle:"Tarkwa_Bay_Beach" },
  { name:"Agodi Gardens", location:"Ibadan, Nigeria", kind:"Recreation & gardens", note:"Green space and family-friendly recreation make this a popular Ibadan escape.", wikiTitle:"Agodi_Gardens" },
  { name:"Nike Art Gallery", location:"Lagos, Nigeria", kind:"Art & culture", note:"A vibrant multi-level collection celebrating Nigerian art, textiles and creative traditions.", wikiTitle:"Nike_Art_Gallery" },
  { name:"Zuma Rock", location:"Niger State, Nigeria", kind:"Landmark & scenery", note:"One of Nigeria's most recognizable natural landmarks, rising dramatically near Abuja.", wikiTitle:"Zuma_Rock" },
  { name:"Ogbunike Caves", location:"Anambra State, Nigeria", kind:"Caves & heritage", note:"A network of culturally significant caves surrounded by tropical vegetation and walking paths.", wikiTitle:"Ogbunike_Caves" },
  { name:"Table Mountain", location:"Cape Town, South Africa", kind:"Mountain & city views", note:"A flat-topped landmark offering exceptional views over Cape Town and the surrounding coastline.", wikiTitle:"Table_Mountain" },
  { name:"Kirstenbosch National Botanical Garden", location:"Cape Town, South Africa", kind:"Garden & nature", note:"Mountain-backed gardens showcase southern Africa's remarkable plant life in a beautifully designed setting.", wikiTitle:"Kirstenbosch_National_Botanical_Garden" },
  { name:"Victoria Falls", location:"Zambia & Zimbabwe", kind:"Waterfall wonder", note:"One of the world's largest waterfall systems, with immense spray, sound and dramatic viewpoints.", wikiTitle:"Victoria_Falls" },
  { name:"Sossusvlei", location:"Namib Desert, Namibia", kind:"Desert landscape", note:"Towering red dunes and pale salt pans create some of Africa's most striking desert scenery.", wikiTitle:"Sossusvlei" },
  { name:"Gardens by the Bay", location:"Singapore", kind:"Garden & city recreation", note:"Futuristic gardens, indoor conservatories and evening light displays make this a remarkable urban attraction.", wikiTitle:"Gardens_by_the_Bay" },
  { name:"Banff National Park", location:"Alberta, Canada", kind:"Lakes & mountains", note:"Turquoise lakes, mountain trails and alpine scenery create a spectacular outdoor playground.", wikiTitle:"Banff_National_Park" },
  { name:"Niagara Falls", location:"Canada & United States", kind:"Waterfall & recreation", note:"Powerful waterfalls, viewpoints and surrounding attractions make this a classic destination.", wikiTitle:"Niagara_Falls" },
  { name:"Santorini", location:"Greece", kind:"Island views", note:"Whitewashed villages, volcanic cliffs and Aegean sunsets create a distinctive island landscape.", wikiTitle:"Santorini" },
  { name:"Lake Bled", location:"Slovenia", kind:"Lake escape", note:"An alpine lake, island church and mountain backdrop make Bled feel almost storybook-like.", wikiTitle:"Lake_Bled" },
  { name:"Arashiyama", location:"Kyoto, Japan", kind:"Nature & culture", note:"Bamboo groves, temples and riverside scenery offer a calm contrast to central Kyoto.", wikiTitle:"Arashiyama" },
  { name:"Plitvice Lakes National Park", location:"Croatia", kind:"Lakes & waterfalls", note:"Boardwalks wind between clear lakes and cascading waterfalls through a lush forest landscape.", wikiTitle:"Plitvice_Lakes_National_Park" },
  { name:"Central Park", location:"New York City, United States", kind:"Urban recreation", note:"Lakes, lawns, paths and cultural landmarks create a huge green retreat inside Manhattan.", wikiTitle:"Central_Park" },
  { name:"Stanley Park", location:"Vancouver, Canada", kind:"Waterfront park", note:"Forest trails, seawall views and beaches make this one of Vancouver's defining recreational spaces.", wikiTitle:"Stanley_Park" },
  { name:"Blue Mountains", location:"New South Wales, Australia", kind:"Mountain escape", note:"Cliffs, forests, walking trails and vast viewpoints make the region ideal for outdoor exploration.", wikiTitle:"Blue_Mountains_(New_South_Wales)" },
  { name:"Dubai Miracle Garden", location:"Dubai, United Arab Emirates", kind:"Garden attraction", note:"Seasonal floral installations turn a desert city into an unexpectedly colourful recreational landscape.", wikiTitle:"Dubai_Miracle_Garden" },
  { name:"Marina Bay", location:"Singapore", kind:"Waterfront & city lights", note:"Architecture, waterfront walks and night views make the bay one of Singapore's most photogenic areas.", wikiTitle:"Marina_Bay,_Singapore" },
  { name:"Iguazu Falls", location:"Argentina & Brazil", kind:"Waterfall wonder", note:"Hundreds of cascades spread across a vast subtropical landscape on the Argentina-Brazil border.", wikiTitle:"Iguazu_Falls" },
  { name:"Jeju Island", location:"South Korea", kind:"Island & recreation", note:"Volcanic landscapes, waterfalls, coastlines and walking routes make Jeju a varied island escape.", wikiTitle:"Jeju_Island" },
  { name:"Madeira", location:"Portugal", kind:"Island & hiking", note:"Steep green mountains, ocean views and levada walks make Madeira ideal for scenic exploration.", wikiTitle:"Madeira" },
];

const CACHE_KEY = "possara-interesting-place-images-v2";

function readCache(): Record<string,string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string,string>; }
  catch { return {}; }
}

function writeCache(value: Record<string,string>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch { /* ignore storage restrictions */ }
}

async function fetchImages(): Promise<Record<string,string>> {
  try {
    const query = new URLSearchParams({
      action:"query",
      format:"json",
      formatversion:"2",
      origin:"*",
      redirects:"1",
      prop:"pageimages",
      pithumbsize:"1400",
      titles:PLACES.map((place)=>place.wikiTitle.replaceAll("_"," ")).join("|"),
    });
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${query.toString()}`);
    if (!response.ok) return {};
    const data = await response.json() as {query?:{redirects?:Array<{from:string;to:string}>;pages?:Array<{title:string;thumbnail?:{source?:string}}>}};
    const redirects = new Map((data.query?.redirects ?? []).map((item)=>[item.from.toLowerCase(),item.to.toLowerCase()]));
    const pages = data.query?.pages ?? [];
    const output: Record<string,string> = {};
    for (const place of PLACES) {
      const requested = place.wikiTitle.replaceAll("_"," ");
      const target = redirects.get(requested.toLowerCase()) ?? requested.toLowerCase();
      const page = pages.find((item)=>item.title.toLowerCase()===target);
      if (page?.thumbnail?.source) output[place.name]=page.thumbnail.source;
    }
    return output;
  } catch {
    return {};
  }
}

function daySeed() {
  const key = new Date().toISOString().slice(0,10);
  let value = 0;
  for (let i=0;i<key.length;i++) value = (value * 31 + key.charCodeAt(i)) >>> 0;
  return value;
}

export function InterestingPlaces() {
  const [images,setImages]=useState<Record<string,string>>(()=>readCache());
  const [failed,setFailed]=useState<Record<string,boolean>>({});
  const [ready,setReady]=useState(()=>Object.keys(readCache()).length>0);
  const [active,setActive]=useState(0);
  const seeded=useRef(false);
  const touchStart=useRef<{x:number;y:number}|null>(null);

  useEffect(()=>{
    let cancelled=false;
    setReady(true);
    void fetchImages().then((fetched)=>{
      if(cancelled)return;
      const merged={...readCache(),...fetched};
      setImages(merged);
      writeCache(merged);
    });
    return()=>{cancelled=true;};
  },[]);

  const available=useMemo(
    ()=>PLACES.map((place,index)=>images[place.name]&&!failed[place.name]?index:-1).filter((index)=>index>=0),
    [images,failed],
  );

  useEffect(()=>{
    if(!ready||!available.length||seeded.current)return;
    seeded.current=true;
    setActive(available[daySeed()%available.length]);
  },[ready,available]);

  useEffect(()=>{
    if(!ready||!available.length||available.includes(active))return;
    setActive(available[0]);
  },[ready,available,active]);

  function next(){
    if(!available.length)return;
    const position=available.indexOf(active);
    setActive(available[position<0?0:(position+1)%available.length]);
  }

  function previous(){
    if(!available.length)return;
    const position=available.indexOf(active);
    setActive(available[position<=0?available.length-1:position-1]);
  }

  useEffect(()=>{
    if(!ready||available.length<2||!available.includes(active))return;
    const timer=window.setTimeout(next,7600);
    return()=>window.clearTimeout(timer);
  },[ready,available,active]);

  function onTouchStart(event:React.TouchEvent<HTMLElement>){
    const touch=event.touches[0];
    touchStart.current=touch?{x:touch.clientX,y:touch.clientY}:null;
  }

  function onTouchEnd(event:React.TouchEvent<HTMLElement>){
    const start=touchStart.current;
    const touch=event.changedTouches[0];
    touchStart.current=null;
    if(!start||!touch)return;
    const dx=touch.clientX-start.x;
    const dy=touch.clientY-start.y;
    if(Math.abs(dx)<45||Math.abs(dx)<=Math.abs(dy)*1.15)return;
    if(dx<0)next(); else previous();
  }

  const place=PLACES[active];
  const image=images[place.name]&&!failed[place.name]?images[place.name]:null;
  if(!ready)return <section className="min-h-[300px] rounded-[1.75rem] bg-slate-950"/>;
  if(!image)return <section className="relative min-h-[300px] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-6 text-white shadow-xl"><div className="absolute inset-x-0 bottom-0 p-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/60">Places worth experiencing</p><h2 className="mt-2 text-2xl font-bold">Discover somewhere remarkable</h2><p className="mt-2 text-sm text-white/70">Place photos are reconnecting. This page remains available while the image catalogue loads.</p></div></section>;

  const source=`https://en.wikipedia.org/wiki/${encodeURIComponent(place.wikiTitle).replaceAll("%2F","/")}`;

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-xl" aria-label="Places worth experiencing" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{touchAction:"pan-y"}}>
      <div className="relative min-h-[300px] sm:min-h-[360px]">
        <img src={image} alt={`${place.name}, ${place.location}`} className="absolute inset-0 h-full w-full object-cover" style={{objectPosition:place.position??"center"}} loading="eager" decoding="async" referrerPolicy="no-referrer" onError={()=>{setFailed((current)=>({...current,[place.name]:true}));window.setTimeout(next,0)}}}/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10"/>
        <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-white sm:p-7">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-white/75">
            <span className="inline-flex items-center gap-1.5"><Sparkles size={13}/>Places worth experiencing</span>
            <span className="h-1 w-1 rounded-full bg-white/40"/>
            <span>{place.kind}</span>
          </div>
          <h2 className="max-w-2xl text-2xl font-bold leading-tight text-white sm:text-3xl">{place.name}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-white/75"><MapPin size={13}/>{place.location}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">{place.note}</p>
          <a href={source} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/20 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/10">Explore this place <ExternalLink size={12}/></a>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <button type="button" onClick={previous} aria-label="Previous place" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur hover:bg-black/45"><ChevronLeft size={17}/></button>
        <button type="button" onClick={next} aria-label="Next place" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur hover:bg-black/45"><ChevronRight size={17}/></button>
      </div>
    </section>
  );
}
