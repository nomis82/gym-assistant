import { useEffect, useState, type ReactNode } from "react";
import { dataSchema, initialData, STORAGE_KEY, type TrainingData } from "@/lib/training";
import { registerOffline } from "@/lib/pwa";
import { TrainingContext } from "./training-context";
export function TrainingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(initialData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setData(dataSchema.parse(JSON.parse(saved)));
    } catch {
      setError("Din sparade data kunde inte läsas. Exportera en backup innan du fortsätter.");
    }
    setReady(true);
    registerOffline().catch(() => {});
  }, []);
  useEffect(() => {
    if (!ready || error) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setError("Data kunde inte sparas på enheten. Exportera en backup för att behålla ditt pass.");
    }
  }, [data, ready, error]);
  return (
    <TrainingContext.Provider value={{ data, setData, ready, error, setError }}>
      {children}
    </TrainingContext.Provider>
  );
}
