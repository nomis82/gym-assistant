import { z } from "zod";

const number = z.number().finite().nonnegative().max(100000);
export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  type: z.enum(["strength", "cardio"]),
  category: z.string().trim().min(1).max(40).default("Övrigt"),
  sets: z.number().int().min(1).max(30),
  weight: number,
  reps: z.number().int().min(1).max(1000),
  minutes: number,
  distance: number,
  intensity: number,
  mode: z.enum(["speed", "resistance"]),
});
export type Exercise = z.infer<typeof exerciseSchema>;
const setSchema = z.object({
  weight: number,
  reps: z.number().int().min(1).max(1000),
  done: z.boolean(),
});
const cardioSetSchema = z.object({
  minutes: number,
  distance: number,
  intensity: number,
  done: z.boolean(),
});
export const logSchema = z.object({
  exercise: exerciseSchema,
  sets: z.array(setSchema).max(30),
  cardioSets: z.array(cardioSetSchema).max(30).optional(),
  minutes: number,
  distance: number,
  intensity: number,
  done: z.boolean(),
});
export type Log = z.infer<typeof logSchema>;
export type CardioSet = z.infer<typeof cardioSetSchema>;
const sessionSchema = z.object({
  id: z.string().min(1),
  date: z.string().datetime(),
  logs: z.array(logSchema),
});
export type Session = z.infer<typeof sessionSchema>;
export const REST_SECONDS = 90;
export const dataSchema = z
  .object({
    version: z.literal(1),
    exercises: z.array(exerciseSchema).max(1000),
    active: z.record(logSchema),
    history: z.array(sessionSchema).max(10000),
    restUntil: z.number().finite().nonnegative().nullable(),
    restSeconds: z.number().int().min(5).max(600).default(REST_SECONDS),
    timerEnabled: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (new Set(data.exercises.map((e) => e.id)).size !== data.exercises.length)
      ctx.addIssue({ code: "custom", message: "Duplicerade övningar" });
    for (const [id, log] of Object.entries(data.active))
      if (id !== log.exercise.id || !data.exercises.some((e) => e.id === id))
        ctx.addIssue({ code: "custom", message: "Ogiltigt pågående pass" });
  });
export type TrainingData = z.infer<typeof dataSchema>;
export const STORAGE_KEY = "set-training-v1";
const base = { minutes: 0, distance: 0, intensity: 0, mode: "speed" as const };
const strength = (
  id: string,
  name: string,
  sets: number,
  weight: number,
  category: string,
): Exercise => ({
  id,
  name,
  type: "strength",
  category,
  sets,
  weight,
  reps: 10,
  ...base,
});
export const DEFAULT_EXERCISES: Exercise[] = [
  strength("axel-rotation", "Axel rotation", 3, 22.5, "Axlar"),
  strength("bicepscurl", "Bicepscurl", 5, 10, "Armar"),
  strength("ryggdrag", "Ryggdrag", 3, 35, "Rygg"),
  {
    ...strength("lopband", "Löpband", 1, 0, "Kondition"),
    type: "cardio",
    minutes: 12,
    intensity: 11,
  },
  strength("benspark", "Benspark", 3, 35, "Ben"),
  {
    ...strength("rodd", "Rodd", 1, 0, "Kondition"),
    type: "cardio",
    minutes: 10,
    distance: 2093,
    intensity: 10,
    mode: "resistance",
  },
  strength("magmaskin", "Magmaskin", 3, 27.5, "Mage"),
  strength("benpress", "Benpress", 5, 90, "Ben"),
  strength("brostpress", "Bröstpress", 4, 30, "Bröst"),
  strength("sittande-rodd", "Sittande rodd", 3, 40, "Rygg"),
  strength("tahav", "Tåhäv", 3, 40, "Ben"),
  strength("utsida-lar", "Utsida lår", 3, 25, "Ben"),
  strength("insida-lar", "Insida lår", 3, 27.5, "Ben"),
  strength("axelpress", "Axelpress", 3, 27.5, "Axlar"),
  strength("sittande-larcurl", "Sittande lårcurl", 3, 30, "Ben"),
];
export function initialData(): TrainingData {
  return {
    version: 1,
    exercises: DEFAULT_EXERCISES.map((e) => ({ ...e })),
    active: {},
    history: [],
    restUntil: null,
    restSeconds: REST_SECONDS,
    timerEnabled: true,
  };
}
export function latestLog(id: string, history: Session[]) {
  return [...history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((s) => s.logs)
    .find((l) => l.exercise.id === id);
}
export function getCardioSets(log: Log): CardioSet[] {
  if (log.exercise.type !== "cardio") return [];
  return (
    log.cardioSets ?? [
      { minutes: log.minutes, distance: log.distance, intensity: log.intensity, done: log.done },
    ]
  );
}
export function makeLog(exercise: Exercise, history: Session[]): Log {
  const last = latestLog(exercise.id, history);
  if (last && last.exercise.type === exercise.type) {
    return {
      ...last,
      exercise: { ...exercise },
      sets: last.sets.map((s) => ({ ...s, done: false })),
      ...(exercise.type === "cardio"
        ? { cardioSets: getCardioSets(last).map((s) => ({ ...s, done: false })) }
        : {}),
      done: false,
    };
  }
  return {
    exercise: { ...exercise },
    sets: Array.from({ length: exercise.sets }, () => ({
      weight: exercise.weight,
      reps: exercise.reps,
      done: false,
    })),
    minutes: exercise.minutes,
    distance: exercise.distance,
    intensity: exercise.intensity,
    ...(exercise.type === "cardio"
      ? {
          cardioSets: Array.from({ length: exercise.sets }, () => ({
            minutes: exercise.minutes,
            distance: exercise.distance,
            intensity: exercise.intensity,
            done: false,
          })),
        }
      : {}),
    done: false,
  };
}
export function completedLogs(active: Record<string, Log>): Log[] {
  return Object.values(active).flatMap((log) => {
    if (log.exercise.type === "strength") {
      const sets = log.sets.filter((set) => set.done);
      return sets.length ? [{ ...log, sets }] : [];
    }
    const cardioSets = getCardioSets(log).filter((set) => set.done);
    if (!cardioSets.length) return [];
    return [
      {
        ...log,
        cardioSets,
        minutes: cardioSets[0].minutes,
        distance: cardioSets[0].distance,
        intensity: cardioSets[0].intensity,
        done: true,
      },
    ];
  });
}
export function saveSession(data: TrainingData, id: string, date: string): TrainingData {
  const logs = completedLogs(data.active);
  if (!logs.length) return data;
  return { ...data, active: {}, restUntil: null, history: [{ id, date, logs }, ...data.history] };
}
export function summary(log: Log) {
  if (log.exercise.type === "strength") {
    const first = log.sets[0];
    if (!first) return "Inga set";
    const uniform = log.sets.every((s) => s.weight === first.weight && s.reps === first.reps);
    return uniform
      ? `${log.sets.length} × ${first.reps} · ${formatNumber(first.weight)} kg`
      : `${log.sets.length} set · ${formatNumber(log.sets.reduce((n, s) => n + s.weight * s.reps, 0))} kg totalt`;
  }
  const cardioSets = getCardioSets(log);
  if (log.cardioSets) {
    const intervals = cardioSets
      .map(
        (set) =>
          `${formatNumber(set.minutes)} min · ${set.distance ? `${formatNumber(set.distance)} m · ` : ""}${formatNumber(set.intensity)} ${log.exercise.mode === "speed" ? "km/h" : "motstånd"}`,
      )
      .join(" / ");
    return `${cardioSets.length} set · ${intervals}`;
  }
  return `${formatNumber(log.minutes)} min · ${log.distance ? `${formatNumber(log.distance)} m · ` : ""}${formatNumber(log.intensity)} ${log.exercise.mode === "speed" ? "km/h" : "motstånd"}`;
}
export function formatNumber(n: number) {
  return n.toLocaleString("sv-SE");
}
