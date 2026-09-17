import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PEOPLE = [
  {
    name: "Hilda Baci",
    field: "Culinary achievement",
    achievement: "93 hr 11 min cooking marathon recognized by Guinness World Records in 2023.",
    lesson: "Ambition becomes visible when preparation, consistency and endurance meet.",
    image: "https://cdn.vanguardngr.com/wp-content/uploads/2023/05/IMG-20230515-WA0002.jpg",
    position: "center 36%",
  },
  {
    name: "Tobi Amusan",
    field: "Athletics",
    achievement: "Women's 100m hurdles world record: 12.12 seconds at the 2022 World Championships.",
    lesson: "Breakthroughs are often built quietly, long before the world sees the result.",
    image: "https://media.gettyimages.com/id/1410685182/photo/world-athletics-championships-oregon22-day-ten.jpg?s=2048x2048&w=gi&k=20&c=Y0WJjQbqpdl5hEYUh_iMgeuKAKq_12oMN1UaGTvHfJ4=",
    position: "center 30%",
  },
  {
    name: "Wole Soyinka",
    field: "Literature",
    achievement: "Awarded the Nobel Prize in Literature in 1986 for work with global influence.",
    lesson: "Deep craft, original thought and persistence can make a voice travel far beyond its origin.",
    image: "https://global.ariseplay.com/amg/www.thisdaystyle.ng/uploads/2024/07/IMG-20230704-WA0001.jpg",
    position: "center 24%",
  },
] as const;

export function ExtraordinaryPeople() {
  const [active, setActive] = useState(0);
  const person = PEOPLE[active];

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % PEOPLE.length), 6200);
    return () => window.clearInterval(timer);
  }, []);

  function move(direction: 1 | -1) {
    setActive((value) => (value + direction + PEOPLE.length) % PEOPLE.length);
  }

  return (
    <section className="achievement-hero" aria-label="Extraordinary achievement spotlight">
      {PEOPLE.map((item, index) => (
        <img
          key={item.name}
          src={item.image}
          alt=""
          aria-hidden={index !== active}
          className={`achievement-hero-image ${index === active ? "achievement-hero-image-active" : ""}`}
          style={{ objectPosition: item.position }}
        />
      ))}
      <div className="achievement-hero-shade" />
      <div className="achievement-hero-glow" />

      <div className="achievement-hero-content" key={person.name}>
        <p className="achievement-kicker">Extraordinary · POSSARA</p>
        <p className="achievement-field">{person.field}</p>
        <h1>{person.name}</h1>
        <p className="achievement-main">{person.achievement}</p>
        <p className="achievement-lesson">{person.lesson}</p>
      </div>

      <div className="achievement-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous achiever"><ChevronLeft size={18} /></button>
        <div className="achievement-dots" aria-label="Choose achiever">
          {PEOPLE.map((item, index) => <button key={item.name} type="button" aria-label={`Show ${item.name}`} onClick={() => setActive(index)} className={index === active ? "active" : ""} />)}
        </div>
        <button type="button" onClick={() => move(1)} aria-label="Next achiever"><ChevronRight size={18} /></button>
      </div>
    </section>
  );
}
