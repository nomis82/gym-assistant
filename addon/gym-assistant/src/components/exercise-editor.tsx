import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { exerciseSchema, type Exercise } from "@/lib/training";
import { useTraining } from "./training-context";
export function ExerciseEditor({
  exercise,
  onClose,
}: {
  exercise: Exercise | null;
  onClose: () => void;
}) {
  const { setData } = useTraining();
  const [form, setForm] = useState<Exercise>(
    exercise ?? {
      id: "",
      name: "",
      type: "strength",
      category: "Övrigt",
      sets: 3,
      weight: 0,
      reps: 10,
      minutes: 10,
      distance: 0,
      intensity: 10,
      mode: "speed",
    },
  );
  const [error, setError] = useState("");
  const field = (
    key: "sets" | "weight" | "reps" | "minutes" | "distance" | "intensity",
    label: string,
  ) => (
    <label className="field-label">
      {label}
      <input
        className="form-input"
        type="number"
        min={key === "sets" || key === "reps" ? 1 : 0}
        max={key === "sets" ? 30 : undefined}
        step={key === "sets" || key === "reps" ? 1 : "any"}
        required
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
      />
    </label>
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>{exercise ? "Redigera övning" : "Ny övning"}</DialogTitle>
        <DialogDescription>Namn och standardvärden</DialogDescription>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = exerciseSchema.safeParse({
              ...form,
              id: exercise?.id ?? crypto.randomUUID(),
            });
            if (!parsed.success) {
              setError("Kontrollera värdena. Max 30 set och 1–1 000 reps.");
              return;
            }
            setData((d) => ({
              ...d,
              exercises: exercise
                ? d.exercises.map((item) => (item.id === exercise.id ? parsed.data : item))
                : [...d.exercises, parsed.data],
              active: Object.fromEntries(
                Object.entries(d.active)
                  .filter(([id]) => id !== exercise?.id || exercise.type === parsed.data.type)
                  .map(([id, log]) => [
                    id,
                    id === exercise?.id ? { ...log, exercise: parsed.data } : log,
                  ]),
              ),
            }));
            onClose();
          }}
        >
          <label className="field-label">
            Namn
            <input
              className="form-input"
              required
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Övningens namn"
              autoFocus
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="filter"
              size="touch"
              data-active={form.type === "strength"}
              onClick={() => setForm({ ...form, type: "strength" })}
            >
              Styrka
            </Button>
            <Button
              type="button"
              variant="filter"
              size="touch"
              data-active={form.type === "cardio"}
              onClick={() => setForm({ ...form, type: "cardio" })}
            >
              Kondition
            </Button>
          </div>
          <label className="field-label">
            Muskelgrupp eller kategori
            <input
              className="form-input"
              required
              maxLength={40}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Till exempel ben, mage eller armar"
            />
          </label>
          {form.type === "strength" ? (
            <div className="form-grid">
              {field("sets", "Antal set")}
              {field("weight", "Vikt (kg)")}
              {field("reps", "Reps")}
            </div>
          ) : (
            <>
              <label className="field-label">
                Mätning
                <select
                  className="form-input"
                  value={form.mode}
                  onChange={(e) =>
                    setForm({ ...form, mode: e.target.value === "speed" ? "speed" : "resistance" })
                  }
                >
                  <option value="speed">Hastighet (km/h)</option>
                  <option value="resistance">Motstånd</option>
                </select>
              </label>
              <div className="form-grid">
                {field("minutes", "Tid (min)")}
                {field("distance", "Sträcka (m)")}
                {field("intensity", form.mode === "speed" ? "Km/h" : "Motstånd")}
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button variant="save" type="submit">
            Spara övning
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
