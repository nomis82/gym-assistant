import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, Settings, History, ArrowUpRight, Timer, Check, SkipForward } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { completedLogs, saveSession } from "@/lib/training";
import { useTraining } from "./training-context";
export function TrainingShell({ children }: { children: ReactNode }) {
  const { data, setData, ready, error } = useTraining();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, Math.ceil(((data.restUntil ?? 0) - now) / 1000));
  useEffect(() => {
    if (!data.timerEnabled && data.restUntil) {
      setData((d) => ({ ...d, restUntil: null }));
      return;
    }
    if (data.restUntil && now >= data.restUntil) {
      setData((d) => ({ ...d, restUntil: null }));
      setNotice("Vilan är klar. Dags för nästa set!");
    }
  }, [now, data.restUntil, data.timerEnabled, setData]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  const count = Object.keys(data.active).length;
  const completed = completedLogs(data.active).length;
  return (
    <>
      <div className="app-shell">
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {ready ? children : <div className="empty-state">Läser ditt pass…</div>}
      </div>
      <div className="bottom-dock">
        {data.timerEnabled && remaining > 0 && (
          <div className="timer" role="timer">
            <div className="flex items-center gap-2">
              <Timer size={20} className="text-primary" />
              <div>
                <div className="timer-title">VILOTIMER</div>
                <span className="timer-time">
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="touch"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    restUntil: Math.max(Date.now(), (d.restUntil ?? Date.now()) - 30000),
                  }))
                }
              >
                −30s
              </Button>
              <Button
                variant="secondary"
                size="touch"
                onClick={() =>
                  setData((d) => ({ ...d, restUntil: (d.restUntil ?? Date.now()) + 30000 }))
                }
              >
                +30s
              </Button>
              <Button
                variant="ghost"
                size="touch"
                onClick={() => setData((d) => ({ ...d, restUntil: null }))}
              >
                <SkipForward />
                Hoppa över
              </Button>
            </div>
          </div>
        )}
        {path === "/" && (
          <div className="save-area">
            <Button
              variant="save"
              disabled={!completed || !!error}
              onClick={() => {
                setData((d) => saveSession(d, crypto.randomUUID(), new Date().toISOString()));
                setNotice("Passet är sparat. Snyggt jobbat!");
              }}
            >
              <Check />
              Spara pass ({count} {count === 1 ? "övning" : "övningar"})
              <ArrowUpRight className="ml-auto" />
            </Button>
            <p className="save-note">
              {completed ? `${completed} övningar klara` : "Inget pass sparat ännu"}
              <span className="mx-2">·</span>Allt sparas på din enhet
            </p>
          </div>
        )}
        <nav className="bottom-nav" aria-label="Huvudmeny">
          <Link to="/" className={path === "/" ? "active" : ""}>
            <Dumbbell />
            Träna
          </Link>
          <Link to="/ovningar" className={path === "/ovningar" ? "active" : ""}>
            <Settings />
            Inställningar
          </Link>
          <Link to="/historik" className={path === "/historik" ? "active" : ""}>
            <History />
            Historik
          </Link>
        </nav>
      </div>
    </>
  );
}
