import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { TrainingData } from "@/lib/training";

export const TrainingContext = createContext<{
  data: TrainingData;
  setData: Dispatch<SetStateAction<TrainingData>>;
  ready: boolean;
  error: string;
  setError: (error: string) => void;
} | null>(null);

export function useTraining() {
  const value = useContext(TrainingContext);
  if (!value) throw new Error("TrainingProvider missing");
  return value;
}
