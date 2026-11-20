import { createFileRoute } from "@tanstack/react-router";
import { ExerciseList } from "@/components/exercise-list";
import { useTraining } from "@/components/training-context";
export const Route = createFileRoute("/ovningar")({
  head: () => ({
    meta: [
      { title: "Inställningar · SET" },
      {
        name: "description",
        content: "Hantera träningsinställningar, övningstyper och personliga standardvärden.",
      },
      { property: "og:title", content: "Inställningar · SET" },
      { property: "og:description", content: "Hantera övningar och träningsinställningar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Exercises,
});
function Exercises() {
  const { data, setData } = useTraining();
  const restOptions = [
    ...new Set([30, 45, 60, 90, 120, 180, 240, 300, 600, data.restSeconds]),
  ].sort((a, b) => a - b);
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">TRÄNING OCH ÖVNINGAR</span>
        <h1 className="page-heading">Inställningar</h1>
        <p className="page-subtitle">
          {data.exercises.filter((e) => e.type === "strength").length} styrkeövningar ·{" "}
          {data.exercises.filter((e) => e.type === "cardio").length} konditionsövningar
        </p>
      </div>
      <div className="rest-setting">
        <div>
          <h2>Standardvilotid</h2>
          <p>Vilotimern startar när du klarmarkerar ett set.</p>
        </div>
        <div className="rest-setting-controls">
          <label className="timer-setting-toggle">
            <input
              type="checkbox"
              aria-label="Använd vilotimer"
              checked={data.timerEnabled}
              onChange={(event) => {
                const timerEnabled = event.target.checked;
                setData((current) => ({
                  ...current,
                  timerEnabled,
                  restUntil: timerEnabled ? current.restUntil : null,
                }));
              }}
            />
            Använd timer
          </label>
          <select
            className="rest-setting-select"
            aria-label="Standardvilotid"
            value={data.restSeconds}
            disabled={!data.timerEnabled}
            onChange={(event) =>
              setData((current) => ({ ...current, restSeconds: Number(event.target.value) }))
            }
          >
            {restOptions.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds >= 60
                  ? `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ""}`
                  : `${seconds} sek`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ExerciseList manage />
    </>
  );
}
