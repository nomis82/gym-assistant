import { describe, it, expect } from "vitest";
import {
  DEFAULT_EXERCISES,
  completedLogs,
  getCardioSets,
  initialData,
  makeLog,
  saveSession,
  REST_SECONDS,
  dataSchema,
} from "./training";
describe("standardövningar", () => {
  const expected = [
    ["Axel rotation", 3, 22.5],
    ["Bicepscurl", 5, 10],
    ["Ryggdrag", 3, 35],
    ["Benspark", 3, 35],
    ["Magmaskin", 3, 27.5],
    ["Benpress", 5, 90],
    ["Bröstpress", 4, 30],
    ["Sittande rodd", 3, 40],
    ["Tåhäv", 3, 40],
    ["Utsida lår", 3, 25],
    ["Insida lår", 3, 27.5],
    ["Axelpress", 3, 27.5],
    ["Sittande lårcurl", 3, 30],
  ] as const;
  it("innehåller exakt 15 övningar", () => expect(DEFAULT_EXERCISES).toHaveLength(15));
  for (const [name, sets, weight] of expected)
    it(`${name}: ${sets} × 10, ${weight} kg`, () =>
      expect(DEFAULT_EXERCISES.find((e) => e.name === name)).toMatchObject({
        type: "strength",
        sets,
        reps: 10,
        weight,
      }));
  it("löpband har 12 minuter och 11 km/h", () =>
    expect(DEFAULT_EXERCISES.find((e) => e.name === "Löpband")).toMatchObject({
      type: "cardio",
      minutes: 12,
      intensity: 11,
      mode: "speed",
    }));
  it("rodd har 10 minuter, 2093 meter, motstånd 10", () =>
    expect(DEFAULT_EXERCISES.find((e) => e.name === "Rodd")).toMatchObject({
      type: "cardio",
      minutes: 10,
      distance: 2093,
      intensity: 10,
      mode: "resistance",
    }));
  it("vilotimern är 90 sekunder", () => expect(REST_SECONDS).toBe(90));
  it("timerinställningarna och övningskategorier stöder äldre backup", () => {
    const data = initialData();
    expect(data.restSeconds).toBe(REST_SECONDS);
    expect(data.timerEnabled).toBe(true);

    const olderBackup = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    delete olderBackup.restSeconds;
    delete olderBackup.timerEnabled;
    for (const exercise of olderBackup.exercises as Array<Record<string, unknown>>)
      delete exercise.category;
    const restored = dataSchema.parse(olderBackup);
    expect(restored.restSeconds).toBe(REST_SECONDS);
    expect(restored.timerEnabled).toBe(true);
    expect(restored.exercises[0].category).toBe("Övrigt");
  });
});
describe("pass och backup", () => {
  it("sparar bara klara set och konditionsövningar och nollställer passet", () => {
    const d = initialData();
    for (const e of d.exercises.slice(0, 6)) d.active[e.id] = makeLog(e, []);
    d.active["axel-rotation"].sets[0].done = true;
    d.active["rodd"].cardioSets![0].done = true;
    d.active["rodd"].done = true;
    const saved = saveSession(d, "test", "2026-11-18T07:35:00.000Z");
    expect(saved.history[0].logs.map((l) => l.exercise.name)).toEqual(["Axel rotation", "Rodd"]);
    expect(saved.history[0].logs[0].sets).toEqual([{ weight: 22.5, reps: 10, done: true }]);
    expect(saved.active).toEqual({});
    expect(saved.restUntil).toBeNull();
  });
  it("stöder flera konditionsset och sparar bara de markerade", () => {
    const data = initialData();
    const row = data.exercises.find((exercise) => exercise.id === "rodd")!;
    const log = makeLog(row, []);
    log.cardioSets!.push({ minutes: 8, distance: 1800, intensity: 9, done: true });
    log.cardioSets![0].done = false;

    expect(getCardioSets(log)).toHaveLength(2);
    expect(completedLogs({ rodd: log })[0].cardioSets).toEqual([
      { minutes: 8, distance: 1800, intensity: 9, done: true },
    ]);
  });
  it("läser äldre konditionsloggar utan uppdelade set", () => {
    const row = initialData().exercises.find((exercise) => exercise.id === "lopband")!;
    const log = makeLog(row, []);
    delete log.cardioSets;
    log.done = true;

    expect(getCardioSets(log)).toEqual([{ minutes: 12, distance: 0, intensity: 11, done: true }]);
    expect(completedLogs({ lopband: log })).toHaveLength(1);
  });
  it("återanvänder senaste prestation utan klarmarkering", () => {
    const d = initialData();
    const e = d.exercises[0];
    const log = makeLog(e, []);
    log.sets = [{ weight: 25, reps: 12, done: true }];
    d.history = [{ id: "old", date: "2026-11-18T07:35:00.000Z", logs: [log] }];
    expect(makeLog(e, d.history).sets).toEqual([{ weight: 25, reps: 12, done: false }]);
  });
  it("ett tomt pass sparas inte", () => {
    const d = initialData();
    expect(saveSession(d, "id", "2026-11-18T07:35:00.000Z").history).toHaveLength(0);
  });
  it("backup bevarar hela pågående passet och historiken", () => {
    const d = initialData();
    d.active[d.exercises[0].id] = makeLog(d.exercises[0], []);
    expect(dataSchema.parse(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
  it("ogiltig backup och negativa värden accepteras inte", () => {
    expect(dataSchema.safeParse({ version: 1, exercises: [] }).success).toBe(false);
    const d = initialData();
    d.exercises[0].weight = -1;
    expect(dataSchema.safeParse(d).success).toBe(false);
  });
});
