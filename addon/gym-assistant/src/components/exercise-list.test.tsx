import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExerciseList } from "./exercise-list";
import { TrainingProvider } from "./training-provider";
import { useTraining } from "./training-context";
import { initialData, makeLog, STORAGE_KEY } from "@/lib/training";

vi.mock("@/lib/pwa", () => ({ registerOffline: vi.fn().mockResolvedValue(undefined) }));

function renderExerciseList(manage = false) {
  localStorage.clear();
  return render(
    <TrainingProvider>
      <ExerciseList manage={manage} />
    </TrainingProvider>,
  );
}

function LoadedExerciseList() {
  const { ready } = useTraining();
  return ready ? <ExerciseList /> : null;
}

describe("övningslistan", () => {
  it("öppnar och minimerar en övning när man trycker på dess namn", async () => {
    renderExerciseList();
    const exercise = await screen.findByRole("button", { name: /Axel rotation/ });

    expect(exercise).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(exercise);
    expect(exercise).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("0 i passet")).toBeInTheDocument();
    fireEvent.click(exercise);
    expect(exercise).toHaveAttribute("aria-expanded", "false");
  });

  it("markerar alla set som klara med övningens kryssruta", async () => {
    renderExerciseList();
    const exercise = await screen.findByRole("button", { name: /Axel rotation/ });
    fireEvent.click(exercise);

    const completeExercise = screen.getByRole("checkbox", {
      name: "Markera Axel rotation som klar",
    });
    fireEvent.click(completeExercise);

    await waitFor(() => expect(completeExercise).toBeChecked());
    expect(screen.getAllByRole("checkbox", { name: /Axel rotation set \d klart/ })).toHaveLength(3);
    expect(
      screen
        .getAllByRole("checkbox", { name: /Axel rotation set \d klart/ })
        .every((set) => set.checked),
    ).toBe(true);

    fireEvent.click(completeExercise);
    await waitFor(() => expect(screen.getByText("0 i passet")).toBeInTheDocument());
    expect(completeExercise).not.toBeChecked();
    expect(
      screen.queryByRole("checkbox", { name: /Axel rotation set \d klart/ }),
    ).not.toBeInTheDocument();
  });

  it("klarmarkerar en minimerad övning utan att öppna den", async () => {
    renderExerciseList();
    const exercise = await screen.findByRole("button", { name: /Axel rotation/ });
    const completeExercise = screen.getByRole("checkbox", {
      name: "Markera Axel rotation som klar",
    });

    fireEvent.click(completeExercise);

    await waitFor(() => expect(completeExercise).toBeChecked());
    expect(exercise).toHaveAttribute("aria-expanded", "false");
  });

  it("lägger till och tar bort intervallset för löpband", async () => {
    renderExerciseList();
    fireEvent.click(await screen.findByRole("button", { name: /Löpband/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lägg till set" }));

    expect(screen.getByRole("checkbox", { name: "Löpband set 1 klart" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Löpband set 2 klart" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ta bort Löpband set 2" }));

    expect(screen.getByRole("checkbox", { name: "Löpband set 1 klart" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Löpband set 2 klart" })).not.toBeInTheDocument();
  });

  it("expandering av en övning lägger inte till den i passet", async () => {
    renderExerciseList();
    fireEvent.click(await screen.findByRole("button", { name: /Bicepscurl/ }));

    expect(screen.getByText("0 i passet")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Bicepscurl set 1 klart" })).toBeInTheDocument();
  });

  it("lägger till en styrkeövning när det första setet klarmarkeras", async () => {
    renderExerciseList();
    fireEvent.click(await screen.findByRole("button", { name: /Bicepscurl/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Bicepscurl set 1 klart" }));

    await waitFor(() => expect(screen.getByText("1 i passet")).toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "Bicepscurl set 1 klart" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Bicepscurl set 2 klart" })).not.toBeChecked();
  });

  it("filtrerar övningslistan på muskelgrupp eller kategori", async () => {
    renderExerciseList();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Filtrera efter muskelgrupp eller kategori" }),
      {
        target: { value: "Ben" },
      },
    );

    expect(await screen.findByRole("button", { name: /Benspark/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bicepscurl/ })).not.toBeInTheDocument();
  });

  it("ändrar och sparar ordningen när en övning dras", async () => {
    renderExerciseList(true);

    const headings = await screen.findAllByRole("heading", { level: 2 });
    expect(headings[0]).toHaveTextContent("Axel rotation");
    const target = screen.getByText("Axel rotation").closest("article");
    const dragHandle = screen.getByRole("button", { name: "Dra för att flytta Bicepscurl" });
    expect(target).not.toBeNull();
    const previousElementFromPoint = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    const elementFromPoint = vi.fn().mockReturnValue(target);
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: elementFromPoint,
    });

    fireEvent.pointerDown(dragHandle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(dragHandle, { pointerId: 1, clientX: 0, clientY: 0 });

    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent("Bicepscurl");
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    expect(saved.exercises[0].id).toBe("bicepscurl");
    fireEvent.pointerUp(dragHandle, { pointerId: 1 });
    if (previousElementFromPoint)
      Object.defineProperty(document, "elementFromPoint", previousElementFromPoint);
    else Reflect.deleteProperty(document, "elementFromPoint");
  });

  it("visar sparade övningar minimerade när listan monteras om", async () => {
    const data = initialData();
    const exercise = data.exercises[0];
    data.active[exercise.id] = makeLog(exercise, []);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    render(
      <TrainingProvider>
        <LoadedExerciseList />
      </TrainingProvider>,
    );
    expect(await screen.findByRole("button", { name: /Axel rotation/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
