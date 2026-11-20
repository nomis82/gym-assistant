import { useState } from "react";
import {
  Activity,
  Check,
  Dumbbell,
  Search,
  Plus,
  ChevronDown,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTraining } from "./training-context";
import { ExerciseEditor } from "./exercise-editor";
import {
  getCardioSets,
  latestLog,
  makeLog,
  summary,
  type CardioSet,
  type Exercise,
  type Log,
} from "@/lib/training";
function NumberField({
  value,
  label,
  onChange,
  integer = false,
}: {
  value: number;
  label: string;
  onChange: (n: number) => void;
  integer?: boolean;
}) {
  const [text, setText] = useState(String(value));
  return (
    <input
      className="number-input"
      aria-label={label}
      inputMode={integer ? "numeric" : "decimal"}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const n = Number(raw.replace(",", "."));
        if (
          raw.trim() &&
          Number.isFinite(n) &&
          n >= (integer ? 1 : 0) &&
          n <= (integer ? 1000 : 100000) &&
          (!integer || Number.isInteger(n))
        )
          onChange(n);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}
export function ExerciseList({ manage = false }: { manage?: boolean }) {
  const { data, setData } = useTraining();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editor, setEditor] = useState<Exercise | null | undefined>();
  const [deleting, setDeleting] = useState<Exercise | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const categories = [...new Set(data.exercises.map((exercise) => exercise.category))].sort(
    (a, b) => a.localeCompare(b, "sv"),
  );
  const exercises = data.exercises.filter(
    (exercise) => categoryFilter === "all" || exercise.category === categoryFilter,
  );
  const moveExercise = (exerciseId: string, targetId: string, after = false) =>
    setData((current) => {
      const from = current.exercises.findIndex((exercise) => exercise.id === exerciseId);
      const to = current.exercises.findIndex((exercise) => exercise.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const reordered = [...current.exercises];
      const [moved] = reordered.splice(from, 1);
      if (!moved) return current;
      const targetIndex = reordered.findIndex((exercise) => exercise.id === targetId);
      reordered.splice(targetIndex + Number(after), 0, moved);
      if (reordered.every((exercise, index) => exercise.id === current.exercises[index]?.id))
        return current;
      return { ...current, exercises: reordered };
    });
  const update = (id: string, fn: (l: Log) => Log, rest = false) =>
    setData((d) => {
      const exercise = d.exercises.find((item) => item.id === id);
      if (!exercise) return d;
      const log = d.active[id] ?? makeLog(exercise, d.history);
      return {
        ...d,
        active: { ...d.active, [id]: fn(log) },
        restUntil: rest ? (d.timerEnabled ? Date.now() + d.restSeconds * 1000 : null) : d.restUntil,
      };
    });
  const updateCardioSets = (id: string, change: (sets: CardioSet[]) => CardioSet[], rest = false) =>
    update(
      id,
      (log) => {
        const cardioSets = change(getCardioSets(log));
        const first = cardioSets[0];
        return {
          ...log,
          cardioSets,
          ...(first
            ? {
                minutes: first.minutes,
                distance: first.distance,
                intensity: first.intensity,
              }
            : {}),
          done: cardioSets.length > 0 && cardioSets.every((set) => set.done),
        };
      },
      rest,
    );
  return (
    <>
      <div className="filter-bar">
        <label className="category-filter">
          <span className="sr-only">Filtrera efter muskelgrupp eller kategori</span>
          <select
            aria-label="Filtrera efter muskelgrupp eller kategori"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">Alla muskelgrupper</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <Button variant="ghost" size="touch" onClick={() => setEditor(null)}>
          <Plus />
          Ny övning
        </Button>
      </div>
      <div className="list-label">
        <span>
          {manage ? "Övningsbank" : "Dina övningar"}{" "}
          <span className="text-foreground ml-1">{exercises.length}</span>
        </span>
        <span className={!manage ? "active-count-label" : undefined}>
          {manage ? "Standardvärden" : `${Object.keys(data.active).length} i passet`}
        </span>
      </div>
      <div className="exercise-list">
        {exercises.map((ex, exerciseIndex) => {
          const log = data.active[ex.id];
          const displayedLog = log ?? makeLog(ex, data.history);
          const last = latestLog(ex.id, data.history);
          const Icon = ex.type === "strength" ? Dumbbell : Activity;
          const cardioSets = ex.type === "cardio" ? getCardioSets(displayedLog) : [];
          const isComplete = log
            ? ex.type === "strength"
              ? log.sets.length > 0 && log.sets.every((set) => set.done)
              : cardioSets.length > 0 && cardioSets.every((set) => set.done)
            : false;
          return (
            <article
              key={ex.id}
              data-exercise-id={ex.id}
              data-dragging={draggingId === ex.id || undefined}
              className={`exercise-card ${log && !manage ? "selected" : ""}`}
            >
              <div className="exercise-summary">
                {!manage && (
                  <label className="check-hit">
                    <input
                      className="exercise-check"
                      type="checkbox"
                      aria-label={`Markera ${ex.name} som klar`}
                      checked={isComplete}
                      onChange={() => {
                        if (log && isComplete) {
                          setData((d) => {
                            const active = { ...d.active };
                            delete active[ex.id];
                            return { ...d, active };
                          });
                          setExpanded((current) => {
                            const next = new Set(current);
                            next.delete(ex.id);
                            return next;
                          });
                          return;
                        }
                        setData((d) => {
                          const current = d.active[ex.id] ?? makeLog(ex, d.history);
                          const markDone = true;
                          const updated =
                            ex.type === "strength"
                              ? {
                                  ...current,
                                  sets: current.sets.map((set) => ({ ...set, done: markDone })),
                                }
                              : (() => {
                                  const cardioSets = getCardioSets(current).map((set) => ({
                                    ...set,
                                    done: markDone,
                                  }));
                                  return {
                                    ...current,
                                    cardioSets,
                                    minutes: cardioSets[0]?.minutes ?? current.minutes,
                                    distance: cardioSets[0]?.distance ?? current.distance,
                                    intensity: cardioSets[0]?.intensity ?? current.intensity,
                                    done: markDone,
                                  };
                                })();
                          return {
                            ...d,
                            active: { ...d.active, [ex.id]: updated },
                            restUntil: markDone
                              ? d.timerEnabled
                                ? Date.now() + d.restSeconds * 1000
                                : null
                              : d.restUntil,
                          };
                        });
                      }}
                    />
                  </label>
                )}
                {manage ? (
                  <>
                    <span className={`type-icon ${ex.type === "cardio" ? "cardio" : ""}`}>
                      <Icon size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h2 className="exercise-name">{ex.name}</h2>
                      <p className="exercise-meta">
                        {ex.category} · {summary(makeLog(ex, []))}
                      </p>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="exercise-summary-toggle"
                    aria-expanded={expanded.has(ex.id)}
                    onClick={() => {
                      setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(ex.id)) next.delete(ex.id);
                        else next.add(ex.id);
                        return next;
                      });
                    }}
                  >
                    <span className={`type-icon ${ex.type === "cardio" ? "cardio" : ""}`}>
                      <Icon size={18} />
                    </span>
                    <span className="flex-1 min-w-0 text-left">
                      <span className="exercise-name block">{ex.name}</span>
                      <span className="exercise-meta block">
                        {last
                          ? `${ex.category} · Senast: ${summary(last)}`
                          : `${ex.category} · Standard: ${summary(makeLog(ex, []))}`}
                      </span>
                    </span>
                    <span className={`category-tag ${ex.type === "cardio" ? "cardio" : ""}`}>
                      {ex.type === "strength" ? "Styrka" : "Kondition"}
                    </span>
                    <span className="category-tag exercise-group-tag">{ex.category}</span>
                    <ChevronDown
                      size={15}
                      className={`text-muted-foreground transition-transform ${
                        expanded.has(ex.id) ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
                {manage && (
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="touchIcon"
                      className="touch-none cursor-grab active:cursor-grabbing"
                      title={`Dra för att flytta ${ex.name}`}
                      aria-label={`Dra för att flytta ${ex.name}`}
                      aria-keyshortcuts="ArrowUp ArrowDown"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setDraggingId(ex.id);
                        if (typeof event.currentTarget.setPointerCapture === "function")
                          event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        if (draggingId !== ex.id) return;
                        const target = document
                          .elementFromPoint(event.clientX, event.clientY)
                          ?.closest<HTMLElement>("[data-exercise-id]");
                        const targetId = target?.dataset["exerciseId"];
                        if (!target || !targetId || targetId === ex.id) return;
                        const targetIndex = exercises.findIndex(
                          (exercise) => exercise.id === targetId,
                        );
                        if (targetIndex < 0) return;
                        const bounds = target.getBoundingClientRect();
                        moveExercise(
                          ex.id,
                          targetId,
                          event.clientY > bounds.top + bounds.height / 2,
                        );
                      }}
                      onPointerUp={() => setDraggingId(null)}
                      onPointerCancel={() => setDraggingId(null)}
                      onKeyDown={(event) => {
                        const direction =
                          event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
                        const target = exercises[exerciseIndex + direction];
                        if (!direction || !target) return;
                        event.preventDefault();
                        moveExercise(ex.id, target.id, direction > 0);
                      }}
                    >
                      <GripVertical />
                    </Button>
                    <Button
                      variant="ghost"
                      size="touchIcon"
                      title={`Redigera ${ex.name}`}
                      aria-label={`Redigera ${ex.name}`}
                      onClick={() => setEditor(ex)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="touchIcon"
                      title={`Ta bort ${ex.name}`}
                      aria-label={`Ta bort ${ex.name}`}
                      onClick={() => setDeleting(ex)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
              {!manage && expanded.has(ex.id) && (
                <div className="log-panel">
                  {ex.type === "strength" ? (
                    <>
                      <div className="mark-all-row">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const markDone = !displayedLog.sets.every((set) => set.done);
                            update(
                              ex.id,
                              (l) => ({
                                ...l,
                                sets: l.sets.map((set) => ({ ...set, done: markDone })),
                              }),
                              markDone,
                            );
                          }}
                        >
                          <Check
                            size={15}
                            className={
                              displayedLog.sets.every((set) => set.done) ? "text-primary" : ""
                            }
                          />
                          {displayedLog.sets.every((set) => set.done)
                            ? "Avmarkera alla set"
                            : "Markera alla set"}
                        </Button>
                      </div>
                      <div className="set-grid set-head">
                        <span>Set</span>
                        <span className="text-center">Vikt (kg)</span>
                        <span className="text-center">Reps</span>
                        <span className="text-center">Klar</span>
                      </div>
                      {displayedLog.sets.map((set, i) => (
                        <div className={`set-grid ${set.done ? "set-done" : ""}`} key={i}>
                          <span className="set-number">{i + 1}</span>
                          <NumberField
                            label={`${ex.name} set ${i + 1} vikt`}
                            value={set.weight}
                            onChange={(n) =>
                              update(ex.id, (l) => ({
                                ...l,
                                sets: l.sets.map((s, j) => (j === i ? { ...s, weight: n } : s)),
                              }))
                            }
                          />
                          <NumberField
                            integer
                            label={`${ex.name} set ${i + 1} reps`}
                            value={set.reps}
                            onChange={(n) =>
                              update(ex.id, (l) => ({
                                ...l,
                                sets: l.sets.map((s, j) => (j === i ? { ...s, reps: n } : s)),
                              }))
                            }
                          />
                          <label className="check-hit">
                            <input
                              className="exercise-check"
                              type="checkbox"
                              aria-label={`${ex.name} set ${i + 1} klart`}
                              checked={set.done}
                              onChange={() =>
                                update(
                                  ex.id,
                                  (l) => ({
                                    ...l,
                                    sets: l.sets.map((s, j) =>
                                      j === i ? { ...s, done: !s.done } : s,
                                    ),
                                  }),
                                  !set.done,
                                )
                              }
                            />
                          </label>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="touch"
                        disabled={displayedLog.sets.length >= 30}
                        onClick={() =>
                          update(ex.id, (l) => ({
                            ...l,
                            sets: [
                              ...l.sets,
                              {
                                weight: l.sets.at(-1)?.weight ?? ex.weight,
                                reps: l.sets.at(-1)?.reps ?? ex.reps,
                                done: false,
                              },
                            ],
                          }))
                        }
                      >
                        <Plus />
                        Lägg till set
                      </Button>
                    </>
                  ) : (
                    <>
                      {cardioSets.map((set, i) => (
                        <div className="cardio-set" key={i}>
                          <div className="cardio-set-heading">
                            <span>Set {i + 1}</span>
                            {cardioSets.length > 1 && (
                              <Button
                                variant="ghost"
                                size="touchIcon"
                                aria-label={`Ta bort ${ex.name} set ${i + 1}`}
                                onClick={() =>
                                  updateCardioSets(ex.id, (sets) =>
                                    sets.filter((_, index) => index !== i),
                                  )
                                }
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                          <div className="cardio-grid">
                            {(["minutes", "distance", "intensity"] as const).map((key, field) => (
                              <label key={key} className="field-label">
                                {
                                  [
                                    "Tid (min)",
                                    "Sträcka (m)",
                                    ex.mode === "speed" ? "Hastighet (km/h)" : "Motstånd",
                                  ][field]
                                }
                                <NumberField
                                  label={`${ex.name} set ${i + 1} ${key}`}
                                  value={set[key]}
                                  onChange={(n) =>
                                    updateCardioSets(ex.id, (sets) =>
                                      sets.map((item, index) =>
                                        index === i ? { ...item, [key]: n } : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                            ))}
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <span className="check-hit">
                              <input
                                className="exercise-check"
                                type="checkbox"
                                aria-label={`${ex.name} set ${i + 1} klart`}
                                checked={set.done}
                                onChange={() =>
                                  updateCardioSets(
                                    ex.id,
                                    (sets) =>
                                      sets.map((item, index) =>
                                        index === i ? { ...item, done: !item.done } : item,
                                      ),
                                    !set.done,
                                  )
                                }
                              />
                            </span>
                            Klart
                          </label>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="touch"
                        disabled={cardioSets.length >= 30}
                        onClick={() =>
                          updateCardioSets(ex.id, (sets) => [
                            ...sets,
                            {
                              minutes: sets.at(-1)?.minutes ?? ex.minutes,
                              distance: sets.at(-1)?.distance ?? ex.distance,
                              intensity: sets.at(-1)?.intensity ?? ex.intensity,
                              done: false,
                            },
                          ])
                        }
                      >
                        <Plus />
                        Lägg till set
                      </Button>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!exercises.length && (
        <div className="empty-state">
          <Search size={30} />
          <h2>Inga övningar hittades</h2>
        </div>
      )}
      {editor !== undefined && (
        <ExerciseEditor exercise={editor} onClose={() => setEditor(undefined)} />
      )}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Ta bort {deleting?.name}?</DialogTitle>
          <DialogDescription>Övningen tas bort ur banken. Tidigare pass behålls.</DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="touch" onClick={() => setDeleting(null)}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              size="touch"
              onClick={() => {
                if (!deleting) return;
                setData((d) => ({
                  ...d,
                  exercises: d.exercises.filter((e) => e.id !== deleting.id),
                  active: Object.fromEntries(
                    Object.entries(d.active).filter(([id]) => id !== deleting.id),
                  ),
                }));
                setDeleting(null);
              }}
            >
              Ta bort
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
