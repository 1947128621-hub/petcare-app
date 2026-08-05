"use client";

import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";

/**
 * v0.3.2 — 右上角浮动"?"按钮
 * 永远显示在右下角，方便用户随时打开说明书
 * 如果用户没看过说明书，图标显示一个小红点
 */
export function HelpButton() {
  const router = useRouter();
  const hasSeenManual = useAppStore((s) => s.hasSeenManual);
  return (
    <button
      onClick={() => router.push("/help")}
      aria-label="使用说明书"
      className="fixed right-4 z-40 w-12 h-12 rounded-full bg-white shadow-lg border border-amber-200 flex items-center justify-center text-amber-600 hover:bg-amber-50 hover:scale-105 active:scale-95 transition-all"
      style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
    >
      <HelpCircle size={22} />
      {!hasSeenManual && (
        <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full ring-2 ring-white" />
      )}
    </button>
  );
}
