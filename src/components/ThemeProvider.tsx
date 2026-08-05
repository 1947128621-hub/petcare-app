"use client";

import { ReactNode, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { applyThemeToHtml, writeStoredTheme } from "@/lib/theme";
import type { ThemeMode } from "@/lib/types";

/**
 * ThemeProvider —— 主题切换的"DOM 同步层"
 *
 * **关键设计(避免 hydration mismatch)**:
 * 1. SSR / 客户端首次 render 时,**不读 localStorage 也不读 store.theme**
 *    → 服务器和客户端第一帧都是"young"(默认值),HTML 完全一致
 * 2. useEffect 在客户端 mount 后跑,才读 store.membership.theme
 *    → 此时 store 已从 localStorage rehydrate,值是真实值
 * 3. 之后订阅 store.theme 变化,改 <html data-theme>
 * 4. 写 localStorage("petcare-theme") 仅作为冗余备份,主数据源是 store
 *
 * 位置:必须包在 main layout 顶层(<body> 内第一个子元素)
 * 作用:全站主题切换的"单一注入点"
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  // ⚠️ 不要在 render 阶段读 store.theme —— 会引发 hydration mismatch
  //    (服务器是"young" 初始,客户端 rehydrate 后是 store 里的真值,第一帧不匹配)
  //    全部逻辑放在 useEffect 内
  useEffect(() => {
    // 1) 初次 mount:同步 store.theme → DOM
    const initial = useAppStore.getState().membership.theme;
    applyThemeToHtml(initial);
    writeStoredTheme(initial);

    // 2) 订阅后续变化
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.membership.theme !== prev.membership.theme) {
        const next: ThemeMode = state.membership.theme;
        applyThemeToHtml(next);
        writeStoredTheme(next);
      }
    });
    return unsubscribe;
  }, []);

  return <>{children}</>;
}
