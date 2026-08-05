// ===== (auth) route group layout =====
// 独立布局：无 AppShell、无 BottomNav，全屏居中卡片

import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 via-rose-50 to-amber-50 px-4 py-8">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
