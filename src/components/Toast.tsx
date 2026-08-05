"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastKind = "success" | "info" | "warning" | "error";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

let pushToastGlobal: ((t: Omit<Toast, "id">) => void) | null = null;

export function pushToast(t: Omit<Toast, "id">) {
  pushToastGlobal?.(t);
}

const IconMap = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: XCircle };
const ColorMap = {
  success: "bg-[var(--color-success)] text-white",
  info: "bg-[var(--color-primary)] text-white",
  warning: "bg-[var(--color-warning)] text-white",
  error: "bg-[var(--color-danger)] text-white",
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    pushToastGlobal = (t) => {
      const id = "t_" + Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
    };
    return () => { pushToastGlobal = null; };
  }, []);

  return (
    <div className="fixed top-4 left-0 right-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => {
        const Icon = IconMap[t.kind];
        return (
          <div
            key={t.id}
            className={cn("flex items-start gap-2 max-w-sm w-full px-4 py-3 rounded-2xl shadow-card animate-fade-up", ColorMap[t.kind])}
          >
            <Icon size={20} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t.title}</p>
              {t.message && <p className="text-xs opacity-90 mt-0.5">{t.message}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
