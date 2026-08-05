"use client";

import { useAppStore, selectMembershipTier } from "@/lib/store";
import { Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const tier = useAppStore(selectMembershipTier);

  return (
    <header className="px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-30 bg-[var(--bg-cream)]/90 backdrop-blur-md">
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-[var(--color-text)] truncate">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--color-text-soft)] mt-0.5 truncate">{subtitle}</p>}
      </div>
      {tier !== "free" && (
        <Link
          href="/membership"
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-bold",
            tier === "senior"
              ? "bg-gradient-to-br from-emerald-500 to-teal-500"
              : tier === "trial"
                ? "bg-gradient-to-br from-amber-400 to-orange-500"
                : "bg-gradient-vip"
          )}
        >
          {tier === "senior" ? <Sparkles size={12} /> : <Crown size={12} />}
          {tier === "senior" ? "SENIOR" : tier === "trial" ? "TRIAL" : "VIP"}
        </Link>
      )}
      {right}
    </header>
  );
}
