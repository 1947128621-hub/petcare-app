"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Pill, User, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "首页", icon: Home },
  { href: "/qa", label: "AI 问答", icon: MessageCircle },
  { href: "/medicine", label: "药品", icon: Pill },
  { href: "/updates", label: "小贴士", icon: BookOpen },
  { href: "/profile", label: "我的", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  // 管理后台不显示底部导航
  if (pathname?.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] safe-area-bottom">
      <div className="max-w-[480px] mx-auto flex items-center justify-around px-2 py-2">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== "/" && pathname?.startsWith(t.href));
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition-all min-w-[60px]",
                active
                  ? "text-[var(--color-primary)] bg-[var(--bg-soft)]"
                  : "text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className={cn("text-[10px] mt-0.5", active && "font-semibold")}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
