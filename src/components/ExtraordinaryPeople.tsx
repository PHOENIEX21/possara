import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

type Person = {
  name: string;
  field: string;
  achievement: string;
  lesson: string;
  wikiTitle?: string;
  image?: string;
  source?: string;
  position?: string;
  badge?: string;
};

const PEOPLE: Person[] = [
  { name:"Francis Olusegun", field:"Academic excellence · Mathematics", achievement:"University of Ilorin 2025/2026 overall best graduating student, celebrated for a perfect 5.00/5.00 CGPA in Mathematics.", lesson:"Excellence can be built one course, one decision and one disciplined day at a time.", image:"https://unavatar.io/twitter/francis_themath", source:"https://www.linkedin.com/posts/risingafricaorg_academicexcellence-uniloringrad-mathematics-activity-7503055789784326144-f8Fl", position:"center 22%", badge:"5.00 / 5.00" },
  { name:"Chukwuzubelu Benedict Umeozo", field:"Academic excellence · Business Administration", achievement:"UNILAG's 2025 overall best graduating student, finishing Business Administration with a perfect 5.00 CGPA.", lesson:"Consistency across years can turn ordinary study days into an extraordinary finish.", image:"https://cdn.legit.ng/images/1200x675/efab9dfd918a0c97.jpeg?v=1", source:"https://unilag.edu.ng/unilag-56th-convocation-ceremonies-4-626-bag-first-degrees-at-day-2/", position:"center 30%" },
  { name:"Rev. Sr. Mary Natalia Ene Agbochini", field:"Academic excellence · Computer Science", achievement:"Overall best graduating student at Claretian University's maiden convocation, graduating with a flawless 5.00 CGPA.", lesson:"Purpose, discipline and a strong learning community can reinforce one another.", image:"https://sjgssn.com/home/assets/images/sister.jpg", source:"https://claretianuniversity.edu.ng/news/readnews/28/cun-maiden-convocation-rev-sr-mary-natalia-ene-agbochini-emerges-overall-best-graduating-student", position:"center 25%" },
  { name:"Hilda Baci", field:"Culinary achievement", achievement:"Her 93 hour 11 minute cooking marathon was recognized by Guinness World Records in 2023.", lesson:"Ambition becomes visible when preparation, consistency and endurance meet.", wikiTitle:"Hilda_Baci", position:"center 15%" },
  { name:"Tobi Amusan", field:"Athletics", achievement:"Set the women's 100m hurdles world record of 12.12 seconds at the 2022 World Championships.", lesson:"Breakthroughs are often built quietly, long before the world sees the result.", wikiTitle:"Tobi_Amusan", position:"center 22%" },
  { name:"Wole Soyinka", field:"Literature", achievement:"Awarded the Nobel Prize in Literature in 1986, becoming the first sub-Saharan African laureate in the category.", lesson:"Original thought and deep craft can carry a voice far beyond its origin.", wikiTitle:"Wole_Soyinka" },
  { name:"Chinua Achebe", field:"Literature", achievement:"Things Fall Apart became one of the world's most widely read works of modern African literature.", lesson:"A story rooted in one place can speak powerfully to the entire world.", wikiTitle:"Chinua_Achebe" },
  { name:"Chimamanda Ngozi Adichie", field:"Literature", achievement:"Internationally acclaimed novelist whose work has received major literary honors including the Orange Prize for Fiction.", lesson:"Clear ideas, strong craft and an authentic voice can travel globally.", wikiTitle:"Chimamanda_Ngozi_Adichie" },
  { name:"Tems", field:"Music", achievement:"Grammy-winning Nigerian singer and songwriter whose work has reached a global audience.", lesson:"A distinctive voice becomes powerful when it is developed instead of diluted.", wikiTitle:"Tems_(singer)" },
  { name:"Burna Boy", field:"Music", achievement:"Won the Grammy Award for Best Global Music Album for Twice as Tall.", lesson:"Global reach can grow from confidence in your own sound and identity.", wikiTitle:"Burna_Boy" },
  { name:"Wizkid", field:"Music", achievement:"Grammy-winning Nigerian artist whose collaborations helped expand Afrobeats' global reach.", lesson:"Collaboration can multiply the distance that excellent work travels.", wikiTitle:"Wizkid" },
  { name:"Rema", field:"Music", achievement:"Calm Down became one of the biggest global Afrobeats crossover hits and passed one billion Spotify streams.", lesson:"Young creators can build work that crosses borders without losing its roots.", wikiTitle:"Rema_(musician)" },
  { name:"Victor Osimhen", field:"Football", achievement:"Named 2023 African Footballer of the Year after a title-winning season with Napoli.", lesson:"Relentless improvement can turn difficult beginnings into elite performance.", wikiTitle:"Victor_Osimhen" },
  { name:"Asisat Oshoala", field:"Football", achievement:"Record six-time African Women's Footballer of the Year and a multiple league champion across continents.", lesson:"Sustained excellence matters as much as a single breakthrough season.", wikiTitle:"Asisat_Oshoala" },
  { name:"Ese Brume", field:"Athletics", achievement:"Won Olympic bronze in the long jump at the Tokyo Games and has earned medals on the world stage.", lesson:"Technical mastery and consistency create chances to perform when it matters most.", wikiTitle:"Ese_Brume" },
  { name:"Blessing Oborududu", field:"Wrestling", achievement:"Won Olympic silver at Tokyo 2020, Nigeria's first Olympic medal in wrestling.", lesson:"History is often made after years of work that few people see.", wikiTitle:"Blessing_Oborududu" },
  { name:"Anthony Joshua", field:"Boxing", achievement:"Two-time unified heavyweight boxing world champion.", lesson:"Setbacks do not erase the discipline that built success; they can sharpen it.", wikiTitle:"Anthony_Joshua" },
  { name:"Israel Adesanya", field:"Mixed martial arts", achievement:"Two-time UFC Middleweight Champion who reached the top level of global combat sport.", lesson:"Precision, creativity and disciplined repetition can become a competitive edge.", wikiTitle:"Israel_Adesanya" },
  { name:"Funke Akindele", field:"Film", achievement:"A Tribe Called Judah became the first Nigerian film to cross ₦1 billion at the domestic box office.", lesson:"Creative excellence can also become commercial scale when audiences deeply connect with the work.", wikiTitle:"Funke_Akindele" },
  { name:"Genevieve Nnaji", field:"Film", achievement:"Actor and filmmaker whose Lionheart became the first Nigerian Netflix original film.", lesson:"Mastery can grow into ownership when creators learn to build behind the camera too.", wikiTitle:"Genevieve_Nnaji" },
  { name:"Fela Kuti", field:"Music & cultural influence", achievement:"Pioneered Afrobeat, creating a musical language whose influence continues across generations.", lesson:"Innovation often begins when someone combines familiar ingredients in an unfamiliar way.", wikiTitle:"Fela_Kuti" },
  { name:"Simone Biles", field:"Gymnastics", achievement:"The most decorated gymnast in World Championships history and a multiple Olympic champion.", lesson:"Excellence includes both extraordinary performance and knowing how to protect the person performing.", wikiTitle:"Simone_Biles" },
  { name:"Usain Bolt", field:"Athletics", achievement:"Holds the 100m and 200m world records, including the 9.58-second 100m mark.", lesson:"Natural ability becomes legendary only when it is matched by world-class preparation.", wikiTitle:"Usain_Bolt" },
  { name:"Serena Williams", field:"Tennis", achievement:"Won 23 Grand Slam singles titles, the most in the Open Era when she retired.", lesson:"Longevity at the top is built through adaptation, resilience and competitive belief.", wikiTitle:"Serena_Williams" },
  { name:"Lionel Messi", field:"Football", achievement:"Eight-time Ballon d'Or winner and FIFA World Cup champion with Argentina.", lesson:"Small improvements repeated for years can create an extraordinary body of work.", wikiTitle:"Lionel_Messi" },
  { name:"Cristiano Ronaldo", field:"Football", achievement:"Five-time Ballon d'Or winner and record-setting men's international goalscorer.", lesson:"Professional habits can extend elite performance far beyond what talent alone promises.", wikiTitle:"Cristiano_Ronaldo" },
  { name:"Michael Phelps", field:"Swimming", achievement:"Won 23 Olympic gold medals, more than any other Olympian.", lesson:"Elite performance is often built from thousands of ordinary training sessions done exceptionally well.", wikiTitle:"Michael_Phelps" },
  { name:"Eliud Kipchoge", field:"Distance running", achievement:"Olympic marathon champion who became the first person to run a marathon distance in under two hours in a controlled challenge.", lesson:"Big barriers become approachable when the work is broken into disciplined, measurable preparation.", wikiTitle:"Eliud_Kipchoge" },
  { name:"Katie Ledecky", field:"Swimming", achievement:"Multiple Olympic champion and world-record-setting distance swimmer.", lesson:"Consistency can be spectacular even when it looks repetitive from the outside.", wikiTitle:"Katie_Ledecky" },
  { name:"Magnus Carlsen", field:"Chess", achievement:"Five-time classical World Chess Champion and one of the highest-rated players in chess history.", lesson:"Deep pattern recognition grows from deliberate practice, curiosity and constant review.", wikiTitle:"Magnus_Carlsen" },
  { name:"Terence Tao", field:"Mathematics", achievement:"Fields Medal-winning mathematician known for influential work across several areas of mathematics.", lesson:"Exceptional ability grows further when curiosity remains active across different problems.", wikiTitle:"Terence_Tao" },
  { name:"Maryam Mirzakhani", field:"Mathematics", achievement:"Became the first woman to receive the Fields Medal in 2014.", lesson:"Difficult problems reward patience, imagination and the courage to explore unfamiliar paths.", wikiTitle:"Maryam_Mirzakhani" },
  { name:"Katherine Johnson", field:"Mathematics & spaceflight", achievement:"NASA mathematician whose orbital calculations supported landmark United States space missions.", lesson:"Precise work behind the scenes can be essential to achievements seen by the whole world.", wikiTitle:"Katherine_Johnson" },
  { name:"Mae Jemison", field:"Science & spaceflight", achievement:"Became the first Black woman to travel into space in 1992.", lesson:"A person does not have to choose between curiosity, science, creativity and service.", wikiTitle:"Mae_Jemison" },
  { name:"Tim Berners-Lee", field:"Technology", achievement:"Invented the World Wide Web while working at CERN.", lesson:"Some of the biggest innovations begin as tools built to help people share knowledge more easily.", wikiTitle:"Tim_Berners-Lee" },
  { name:"Jennifer Doudna", field:"Biochemistry", achievement:"Shared the 2020 Nobel Prize in Chemistry for development of CRISPR-Cas9 genome editing.", lesson:"Foundational research can eventually become a tool that changes entire fields.", wikiTitle:"Jennifer_Doudna" },
  { name:"Emmanuelle Charpentier", field:"Microbiology", achievement:"Shared the 2020 Nobel Prize in Chemistry for development of CRISPR-Cas9 genome editing.", lesson:"Major discoveries often emerge from collaboration across disciplines and institutions.", wikiTitle:"Emmanuelle_Charpentier" },
  { name:"Katalin Karikó", field:"Biochemistry", achievement:"Shared the 2023 Nobel Prize in Physiology or Medicine for discoveries enabling effective mRNA vaccines.", lesson:"Years of rejection do not make a valuable idea worthless; evidence and persistence still matter.", wikiTitle:"Katalin_Karikó" },
  { name:"Tu Youyou", field:"Medicine", achievement:"Won the 2015 Nobel Prize in Physiology or Medicine for discoveries leading to artemisinin-based malaria treatment.", lesson:"Breakthroughs can come from connecting modern scientific methods with older bodies of knowledge.", wikiTitle:"Tu_Youyou" },
  { name:"Jane Goodall", field:"Primatology", achievement:"Her long-term field research transformed scientific understanding of chimpanzee behavior.", lesson:"Patient observation can reveal truths that quick assumptions miss.", wikiTitle:"Jane_Goodall" },
  { name:"Hayao Miyazaki", field:"Animation & film", achievement:"Academy Award-winning filmmaker whose animated works have influenced creators around the world.", lesson:"Attention to detail can turn imagined worlds into places audiences genuinely feel.", wikiTitle:"Hayao_Miyazaki" },
  { name:"Beyoncé", field:"Music & performance", achievement:"The most-awarded artist in Grammy history.", lesson:"Reinvention works best when the underlying standard of craft stays extremely high.", wikiTitle:"Beyoncé" },
  { name:"Taylor Swift", field:"Music & songwriting", achievement:"Became the first artist to win the Grammy for Album of the Year four times.", lesson:"Writing, ownership and long-term connection with an audience can become a powerful creative foundation.", wikiTitle:"Taylor_Swift" },
  { name:"Lupita Nyong'o", field:"Film", achievement:"Won the Academy Award for Best Supporting Actress for 12 Years a Slave.", lesson:"Preparation can meet opportunity quickly; depth of craft makes that moment count.", wikiTitle:"Lupita_Nyong'o" },
  { name:"Mo Farah", field:"Distance running", achievement:"Won four Olympic gold medals across the 5,000m and 10,000m events.", lesson:"Endurance is both physical and mental: the ability to stay composed late matters.", wikiTitle:"Mo_Farah" },
  { name:"Sadio Mané", field:"Football", achievement:"African Footballer of the Year winner and a champion in major European club competitions.", lesson:"Elite achievement can coexist with a strong commitment to giving back to where you came from.", wikiTitle:"Sadio_Mané" },
  { name:"Armand Duplantis", field:"Athletics", achievement:"Olympic champion and serial pole-vault world-record breaker.", lesson:"Once a ceiling moves, the next challenge is learning how to move it again.", wikiTitle:"Armand_Duplantis" },
  { name:"Coco Gauff", field:"Tennis", achievement:"Won her first Grand Slam singles title at the 2023 US Open while still a teenager.", lesson:"Youth is not a reason to wait before taking yourself seriously.", wikiTitle:"Coco_Gauff" },
  { name:"Naomi Osaka", field:"Tennis", achievement:"Four-time Grand Slam singles champion who reached world No. 1.", lesson:"High performance and personal wellbeing both deserve serious attention.", wikiTitle:"Naomi_Osaka" },
  { name:"Novak Djokovic", field:"Tennis", achievement:"Won a record 24 men's Grand Slam singles titles and completed the career Golden Slam with Olympic gold in 2024.", lesson:"Longevity comes from continuously refining training, recovery and competitive strategy.", wikiTitle:"Novak_Djokovic" },
];

const IMAGE_CACHE_KEY = "possara-achiever-images-v3";

function readCachedImages(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(IMAGE_CACHE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeCachedImages(images: Record<string, string>) {
  try {
    window.localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(images));
  } catch {
    // Restricted browsers can still use the in-memory image catalogue.
  }
}

async function fetchWikiImageCatalogue(items: Person[]): Promise<Record<string, string>> {
  const wikiPeople = items.filter((item) => item.wikiTitle);
  if (!wikiPeople.length) return {};
  try {
    const titles = wikiPeople.map((item) => item.wikiTitle!.replaceAll("_", " "));
    const query = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      origin: "*",
      redirects: "1",
      prop: "pageimages",
      pithumbsize: "1000",
      titles: titles.join("|"),
    });
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${query.toString()}`);
    if (!response.ok) return {};
    const data = await response.json() as {
      query?: {
        redirects?: Array<{ from: string; to: string }>;
        pages?: Array<{ title: string; thumbnail?: { source?: string } }>;
      };
    };
    const redirects = new Map((data.query?.redirects ?? []).map((item) => [item.from.toLowerCase(), item.to.toLowerCase()]));
    const pages = data.query?.pages ?? [];
    const catalogue: Record<string, string> = {};
    for (const person of wikiPeople) {
      const requested = person.wikiTitle!.replaceAll("_", " ");
      const target = redirects.get(requested.toLowerCase()) ?? requested.toLowerCase();
      const page = pages.find((item) => item.title.toLowerCase() === target);
      const source = page?.thumbnail?.source;
      if (source) catalogue[person.name] = source;
    }
    return catalogue;
  } catch {
    return {};
  }
}

function preloadImage(url: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

export function ExtraordinaryPeople() {
  const [active, setActive] = useState(()=>{if(typeof window==="undefined")return 0;const saved=Number(window.sessionStorage.getItem("possara-extraordinary-active"));return Number.isFinite(saved)&&saved>=0&&saved<PEOPLE.length?saved:0;});
  const [images, setImages] = useState<Record<string, string>>(() => readCachedImages());
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [catalogueReady, setCatalogueReady] = useState(() => Object.keys(readCachedImages()).length > 0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(()=>{try{window.sessionStorage.setItem("possara-extraordinary-active",String(active));}catch{/* session storage can be unavailable */}},[active]);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalogue() {
      // Never make the Home spotlight wait on a third-party image catalogue.
      // Direct-image entries and any cached Wikipedia thumbnails can render immediately.
      setCatalogueReady(true);
      const fetched = await fetchWikiImageCatalogue(PEOPLE);
      if (cancelled) return;
      const merged = { ...readCachedImages(), ...fetched };
      setImages(merged);
      writeCachedImages(merged);
    }
    void loadCatalogue();
    return () => { cancelled = true; };
  }, []);

  const availableIndexes = useMemo(() => PEOPLE.map((person, index) => {
    const source = person.image ?? images[person.name];
    return source && !failedImages[person.name] ? index : -1;
  }).filter((index) => index >= 0), [images, failedImages]);

  useEffect(() => {
    if (!catalogueReady || !availableIndexes.length || availableIndexes.includes(active)) return;
    const forward = availableIndexes.find((index) => index > active);
    setActive(forward ?? availableIndexes[0]);
  }, [catalogueReady, availableIndexes, active]);

  const currentPosition = Math.max(0, availableIndexes.indexOf(active));
  const person = PEOPLE[active];
  const image = failedImages[person.name] ? null : person.image ?? images[person.name] ?? null;
  const fallbackPerson = PEOPLE.find((item) => item.image && !failedImages[item.name]);
  const fallbackImage = fallbackPerson?.image ?? null;

  function next() {
    if (!availableIndexes.length) return;
    const position = availableIndexes.indexOf(active);
    const nextPosition = position < 0 ? 0 : (position + 1) % availableIndexes.length;
    setActive(availableIndexes[nextPosition]);
  }

  function previous() {
    if (!availableIndexes.length) return;
    const position = availableIndexes.indexOf(active);
    const previousPosition = position <= 0 ? availableIndexes.length - 1 : position - 1;
    setActive(availableIndexes[previousPosition]);
  }

  useEffect(() => {
    if (!catalogueReady || availableIndexes.length < 2 || !availableIndexes.includes(active)) return;
    const timer = window.setTimeout(next, 6500);
    return () => window.clearTimeout(timer);
  }, [active, catalogueReady, availableIndexes]);

  useEffect(() => {
    if (!catalogueReady || !availableIndexes.length) return;
    const position = Math.max(0, availableIndexes.indexOf(active));
    [0, 1, 2].forEach((offset) => {
      const index = availableIndexes[(position + offset) % availableIndexes.length];
      const item = PEOPLE[index];
      const source = item.image ?? images[item.name];
      if (source) preloadImage(source);
    });
  }, [active, catalogueReady, availableIndexes, images]);

  function handleImageError() {
    setFailedImages((current) => ({ ...current, [person.name]: true }));
    window.setTimeout(() => {
      const position = availableIndexes.indexOf(active);
      if (availableIndexes.length > 1) setActive(availableIndexes[position < 0 ? 0 : (position + 1) % availableIndexes.length]);
    }, 0);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
    if (dx < 0) next();
    else previous();
  }

  const visibleDotPositions = useMemo(() => {
    const maxStart = Math.max(0, availableIndexes.length - 7);
    const start = Math.min(Math.max(currentPosition - 3, 0), maxStart);
    return Array.from({ length: Math.min(7, availableIndexes.length) }, (_, offset) => start + offset);
  }, [currentPosition, availableIndexes.length]);

  if (!catalogueReady) {
    return <section className="achievement-hero" aria-label="Loading extraordinary achievement spotlights"><div className="absolute inset-0 bg-gradient-to-br from-[#171128] via-[#35245a] to-[#152a45]" /><div className="achievement-hero-shade" /><div className="achievement-hero-content"><p className="achievement-kicker">Extraordinary · POSSARA</p><h1>Loading inspiring stories…</h1><p className="achievement-lesson">Preparing the photo spotlight.</p></div></section>;
  }

  if (!availableIndexes.length || !image) {
    return <section className="achievement-hero" aria-label="Extraordinary achievement spotlight">{fallbackImage&&<img src={fallbackImage} alt="" className="achievement-hero-image achievement-hero-image-active" loading="eager" decoding="async"/>}<div className="absolute inset-0 bg-gradient-to-br from-[#171128] via-[#35245a] to-[#152a45]" /><div className="achievement-hero-shade" /><div className="achievement-hero-content"><p className="achievement-kicker">Extraordinary · POSSARA</p><h1>{fallbackPerson?.name??"Inspiring people"}</h1><p className="achievement-main">{fallbackPerson?.achievement??"Stories of people whose work can inspire what comes next."}</p><p className="achievement-lesson">{fallbackPerson?.lesson??"Keep learning, building and moving forward."}</p></div></section>;
  }

  return (
    <section className="achievement-hero" aria-label="Extraordinary achievement spotlight" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ touchAction: "pan-y" }}>
      <img key={`${person.name}-${image}`} src={image} alt={`${person.name} — ${person.field}`} className="achievement-hero-image achievement-hero-image-active" style={{ objectPosition: person.position ?? "center 24%" }} loading="eager" decoding="async" fetchPriority="high" referrerPolicy="no-referrer" onError={handleImageError} />
      <div className="achievement-hero-shade" />
      <div className="achievement-hero-glow" />

      <div className="achievement-hero-content" key={person.name}>
        <p className="achievement-kicker">Extraordinary · POSSARA</p>
        <p className="achievement-field">{person.field}</p>
        <h1>{person.name}</h1>
        <p className="achievement-main">{person.achievement}</p>
        <p className="achievement-lesson">{person.lesson}</p>
        {person.source && <a href={person.source} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white">Read the story <ExternalLink size={12} /></a>}
      </div>

      <button type="button" onClick={previous} className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55" aria-label="Previous extraordinary person"><ChevronLeft size={22}/></button>
      <button type="button" onClick={next} className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55" aria-label="Next extraordinary person"><ChevronRight size={22}/></button>
      <div className="achievement-controls">
        <div className="flex items-center gap-3">
          <div className="achievement-dots" aria-label="Achievement position">
            {visibleDotPositions.map((position) => {
              const personIndex = availableIndexes[position];
              return <button key={personIndex} type="button" aria-label={`Show ${PEOPLE[personIndex].name}`} onClick={() => setActive(personIndex)} className={personIndex === active ? "active" : ""} />;
            })}
          </div>
          
        </div>
        
      </div>
    </section>
  );
}
