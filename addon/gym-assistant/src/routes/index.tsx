import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import gym from "@/assets/gym.jpg";
import { ExerciseList } from "@/components/exercise-list";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Träna · SET" },
      {
        name: "description",
        content: "Logga gymträning, set och kondition med SET. Din träning sparas på din enhet.",
      },
      { property: "og:title", content: "Träna · SET" },
      { property: "og:description", content: "Din personliga träningslogg för gymmet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
function Index() {
  return (
    <div className="workout-page">
      <img className="workout-page-image" src={gym} alt="" width={1536} height={512} />
      <section className="workout-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <CalendarDays size={13} />
            {new Date().toLocaleDateString("sv-SE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
          <h1>Dagens träningspass</h1>
          <p>Ett set i taget. Lite starkare varje gång.</p>
        </div>
      </section>
      <ExerciseList />
    </div>
  );
}
