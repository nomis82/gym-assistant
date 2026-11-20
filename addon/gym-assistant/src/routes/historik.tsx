import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  History,
  ChevronRight,
  Dumbbell,
  CalendarDays,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTraining } from "@/components/training-context";
import {
  dataSchema,
  formatNumber,
  getCardioSets,
  summary,
  type Log,
  type Session,
  type TrainingData,
} from "@/lib/training";

function SessionNumberField({
  label,
  value,
  onChange,
  integer = false,
  min = 0,
  max = 100000,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  integer?: boolean;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      className="number-input history-number"
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      aria-label={label}
      value={text}
      onChange={(event) => {
        const raw = event.target.value;
        setText(raw);
        const number = Number(raw.replace(",", "."));
        if (
          raw.trim() &&
          Number.isFinite(number) &&
          number >= min &&
          number <= max &&
          (!integer || Number.isInteger(number))
        )
          onChange(number);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

function localDateTimeValue(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
export const Route = createFileRoute("/historik")({
  head: () => ({
    meta: [
      { title: "Träningshistorik · SET" },
      {
        name: "description",
        content: "Se sparade träningspass och säkerhetskopiera din lokala träningsdata.",
      },
      { property: "og:title", content: "Träningshistorik · SET" },
      { property: "og:description", content: "Alla dina pass, set och framsteg." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});
function HistoryPage() {
  const { data, setData, setError } = useTraining();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Session | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [backup, setBackup] = useState<TrainingData | null>(null);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const selected = data.history.find((session) => session.id === selectedId) ?? null;
  const displayedSession = draft ?? selected;
  const updateDraftLog = (exerciseId: string, change: (log: Log) => Log) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            logs: current.logs.map((log) => (log.exercise.id === exerciseId ? change(log) : log)),
          }
        : current,
    );
  const date = (d: string) =>
    new Date(d).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
  const exportData = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `set-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">DITT ARBETE, SPARAT</span>
        <h1 className="page-heading">Historik</h1>
        <p className="page-subtitle">{data.history.length} sparade pass · Varje pass räknas</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="touch" onClick={exportData}>
          <Download />
          Exportera backup (JSON)
        </Button>
        <Button variant="outline" size="touch" onClick={() => input.current?.click()}>
          <Upload />
          Importera backup (JSON)
        </Button>
        <input
          ref={input}
          className="hidden"
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              if (file.size > 10000000) throw new Error();
              const result = dataSchema.parse(JSON.parse(await file.text()));
              setBackup(result);
            } catch {
              setMessage("Filen är inte en giltig SET-backup. Din data har inte ändrats.");
            }
          }}
        />
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {!data.history.length ? (
        <div className="empty-state">
          <History size={36} />
          <h2>Ditt första pass väntar</h2>
          <p className="text-sm mb-5">Här samlas dina genomförda träningspass.</p>
          <Button asChild variant="secondary" size="touch">
            <Link to="/">
              <Dumbbell />
              Till träningen
            </Link>
          </Button>
        </div>
      ) : (
        [...data.history]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((s, i) => (
            <article key={s.id} className="history-card">
              <div className="flex items-center justify-between">
                <h2>{date(s.date)}</h2>
                <span className="text-muted-foreground text-xs">
                  Pass {data.history.length - i}
                </span>
              </div>
              <div className="history-exercises">
                {s.logs.map((l) => (
                  <span key={l.exercise.id}>{l.exercise.name}</span>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">
                  {s.logs.length} övningar ·{" "}
                  {s.logs.reduce(
                    (n, log) =>
                      n +
                      (log.exercise.type === "strength"
                        ? log.sets.length
                        : getCardioSets(log).length),
                    0,
                  )}{" "}
                  set
                </span>
                <div className="flex items-center">
                  <Button size="touch" variant="ghost" onClick={() => setSelectedId(s.id)}>
                    Visa pass
                    <ChevronRight />
                  </Button>
                  <Button
                    size="touchIcon"
                    variant="ghost"
                    aria-label={`Ta bort pass ${date(s.date)}`}
                    onClick={() => setDeletingId(s.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </article>
          ))
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setDraft(null);
          }
        }}
      >
        <DialogContent>
          <DialogTitle>{draft ? "Redigera träningspass" : "Träningspass"}</DialogTitle>
          <DialogDescription>
            <CalendarDays className="inline mr-2" size={14} />
            {displayedSession && date(displayedSession.date)}
          </DialogDescription>
          {draft && (
            <label className="field-label">
              Datum och tid
              <input
                className="form-input"
                type="datetime-local"
                aria-label="Datum och tid"
                value={localDateTimeValue(draft.date)}
                onChange={(event) => {
                  const timestamp = Date.parse(event.target.value);
                  if (!Number.isFinite(timestamp)) return;
                  setDraft((current) =>
                    current ? { ...current, date: new Date(timestamp).toISOString() } : current,
                  );
                }}
              />
            </label>
          )}
          <div>
            {displayedSession?.logs.map((l) => (
              <section key={l.exercise.id} className="border-t border-border py-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="exercise-name">{l.exercise.name}</h3>
                  {draft && (
                    <Button
                      variant="ghost"
                      size="touchIcon"
                      aria-label={`Ta bort ${l.exercise.name} från passet`}
                      onClick={() =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                logs: current.logs.filter(
                                  (log) => log.exercise.id !== l.exercise.id,
                                ),
                              }
                            : current,
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <p className="exercise-meta">{summary(l)}</p>
                {l.exercise.type === "strength" &&
                  (draft ? (
                    <div className="history-set-list">
                      {l.sets.map((set, i) => (
                        <div className="history-edit-set" key={i}>
                          <span>Set {i + 1}</span>
                          <SessionNumberField
                            label={`${l.exercise.name} set ${i + 1} vikt`}
                            value={set.weight}
                            onChange={(weight) =>
                              updateDraftLog(l.exercise.id, (log) => ({
                                ...log,
                                sets: log.sets.map((item, index) =>
                                  index === i ? { ...item, weight } : item,
                                ),
                              }))
                            }
                          />
                          <SessionNumberField
                            label={`${l.exercise.name} set ${i + 1} reps`}
                            value={set.reps}
                            integer
                            min={1}
                            max={1000}
                            onChange={(reps) =>
                              updateDraftLog(l.exercise.id, (log) => ({
                                ...log,
                                sets: log.sets.map((item, index) =>
                                  index === i ? { ...item, reps } : item,
                                ),
                              }))
                            }
                          />
                          <Button
                            variant="ghost"
                            size="touchIcon"
                            aria-label={`Ta bort ${l.exercise.name} set ${i + 1}`}
                            disabled={l.sets.length <= 1}
                            onClick={() =>
                              updateDraftLog(l.exercise.id, (log) => ({
                                ...log,
                                sets: log.sets.filter((_, index) => index !== i),
                              }))
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="touch"
                        disabled={l.sets.length >= 30}
                        onClick={() =>
                          updateDraftLog(l.exercise.id, (log) => ({
                            ...log,
                            sets: [
                              ...log.sets,
                              {
                                weight: log.sets.at(-1)?.weight ?? log.exercise.weight,
                                reps: log.sets.at(-1)?.reps ?? log.exercise.reps,
                                done: true,
                              },
                            ],
                          }))
                        }
                      >
                        <Plus />
                        Lägg till set
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {l.sets.map((set, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Set {i + 1}</span>
                          <span>
                            {formatNumber(set.weight)} kg × {set.reps} reps
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                {l.exercise.type === "cardio" && draft && (
                  <div className="history-set-list">
                    {getCardioSets(l).map((set, i) => (
                      <div className="history-cardio-set" key={i}>
                        <div className="cardio-set-heading">
                          <span>Set {i + 1}</span>
                          <Button
                            variant="ghost"
                            size="touchIcon"
                            aria-label={`Ta bort ${l.exercise.name} set ${i + 1}`}
                            disabled={getCardioSets(l).length <= 1}
                            onClick={() =>
                              updateDraftLog(l.exercise.id, (log) => {
                                const sets = getCardioSets(log).filter((_, index) => index !== i);
                                return {
                                  ...log,
                                  cardioSets: sets,
                                  minutes: sets[0]?.minutes ?? 0,
                                  distance: sets[0]?.distance ?? 0,
                                  intensity: sets[0]?.intensity ?? 0,
                                };
                              })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                        <div className="cardio-grid">
                          {(["minutes", "distance", "intensity"] as const).map((key, field) => (
                            <label className="field-label" key={key}>
                              {
                                [
                                  "Tid (min)",
                                  "Sträcka (m)",
                                  l.exercise.mode === "speed" ? "Hastighet (km/h)" : "Motstånd",
                                ][field]
                              }
                              <SessionNumberField
                                label={`${l.exercise.name} set ${i + 1} ${key}`}
                                value={set[key]}
                                onChange={(value) =>
                                  updateDraftLog(l.exercise.id, (log) => {
                                    const sets = getCardioSets(log).map((item, index) =>
                                      index === i ? { ...item, [key]: value } : item,
                                    );
                                    return {
                                      ...log,
                                      cardioSets: sets,
                                      minutes: sets[0]?.minutes ?? log.minutes,
                                      distance: sets[0]?.distance ?? log.distance,
                                      intensity: sets[0]?.intensity ?? log.intensity,
                                    };
                                  })
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="touch"
                      disabled={getCardioSets(l).length >= 30}
                      onClick={() =>
                        updateDraftLog(l.exercise.id, (log) => {
                          const sets = getCardioSets(log);
                          const last = sets.at(-1) ?? {
                            minutes: log.exercise.minutes,
                            distance: log.exercise.distance,
                            intensity: log.exercise.intensity,
                            done: true,
                          };
                          const cardioSets = [...sets, { ...last, done: true }];
                          return {
                            ...log,
                            cardioSets,
                            minutes: cardioSets[0].minutes,
                            distance: cardioSets[0].distance,
                            intensity: cardioSets[0].intensity,
                          };
                        })
                      }
                    >
                      <Plus />
                      Lägg till set
                    </Button>
                  </div>
                )}
              </section>
            ))}
          </div>
          {draft ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="touch" onClick={() => setDraft(null)}>
                <X />
                Avbryt
              </Button>
              <Button
                size="touch"
                onClick={() => {
                  if (!draft) return;
                  setData((current) => ({
                    ...current,
                    history: current.history.map((session) =>
                      session.id === draft.id ? draft : session,
                    ),
                  }));
                  setDraft(null);
                  setSelectedId(null);
                  setMessage("Träningspasset har uppdaterats.");
                }}
              >
                <Save />
                Spara ändringar
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="touch"
              onClick={() => {
                if (!selected) return;
                setDraft({
                  ...selected,
                  logs: selected.logs.map((log) =>
                    log.exercise.type === "cardio"
                      ? { ...log, cardioSets: getCardioSets(log).map((set) => ({ ...set })) }
                      : { ...log, sets: log.sets.map((set) => ({ ...set })) },
                  ),
                });
              }}
            >
              <Pencil />
              Redigera pass
            </Button>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deletingId}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Ta bort träningspass?</DialogTitle>
          <DialogDescription>Passet tas bort permanent från historiken.</DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="touch" onClick={() => setDeletingId(null)}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              size="touch"
              onClick={() => {
                if (!deletingId) return;
                setData((current) => ({
                  ...current,
                  history: current.history.filter((session) => session.id !== deletingId),
                }));
                if (selectedId === deletingId) setSelectedId(null);
                setDeletingId(null);
                setMessage("Träningspasset har tagits bort.");
              }}
            >
              <Trash2 />
              Ta bort pass
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!backup}
        onOpenChange={(open) => {
          if (!open) setBackup(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Importera backup?</DialogTitle>
          <DialogDescription>
            {backup?.exercises.length} övningar och {backup?.history.length} pass. Detta ersätter
            all nuvarande data, inklusive ditt pågående pass.
          </DialogDescription>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="touch" onClick={() => setBackup(null)}>
              Avbryt
            </Button>
            <Button
              size="touch"
              onClick={() => {
                if (!backup) return;
                setData(backup);
                setError("");
                setBackup(null);
                setMessage("Backupen har importerats.");
              }}
            >
              Ersätt och importera
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
