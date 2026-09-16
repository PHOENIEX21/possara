import { Award, ChefHat, Trophy } from "lucide-react";

const PEOPLE = [
  {
    name: "Hilda Baci",
    field: "Culinary achievement",
    achievement: "Completed a 93 hr 11 min cooking marathon recognized by Guinness World Records in 2023.",
    lesson: "Preparation, consistency and endurance can turn an ambitious goal into a visible achievement.",
    icon: ChefHat,
  },
  {
    name: "Tobi Amusan",
    field: "Athletics",
    achievement: "Set the women's 100m hurdles world record at 12.12 seconds at the 2022 World Championships.",
    lesson: "Years of disciplined improvement can produce a breakthrough on the biggest stage.",
    icon: Trophy,
  },
  {
    name: "Wole Soyinka",
    field: "Literature",
    achievement: "Won the Nobel Prize in Literature in 1986 for a body of work with global influence.",
    lesson: "Deep craft, original thinking and persistence can make local stories matter around the world.",
    icon: Award,
  },
] as const;

export function ExtraordinaryPeople() {
  return (
    <section className="rounded-3xl border border-paper-dim bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Real people · real achievement</p>
          <h2 className="text-xl">Extraordinary people. Practical lessons.</h2>
          <p className="mt-1 text-sm text-ink-light">A reminder that remarkable outcomes are usually built through discipline, learning and persistence.</p>
        </div>
      </div>
      <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
        {PEOPLE.map((person) => {
          const Icon = person.icon;
          return (
            <article key={person.name} className="min-w-[260px] flex-1 rounded-2xl border border-paper-dim bg-paper/50 p-4 sm:min-w-[280px]">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light text-brand-dark"><Icon size={19}/></span>
                <div><h3 className="font-semibold">{person.name}</h3><p className="text-xs text-ink-faint">{person.field}</p></div>
              </div>
              <p className="text-sm leading-6 text-ink-light">{person.achievement}</p>
              <div className="mt-3 border-t border-paper-dim pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">What to take from it</p><p className="mt-1 text-sm leading-5 text-ink">{person.lesson}</p></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
