// ===== 2 套视觉主题(plan F-THEME-01 / F-THEME-02)=====
//
// 数据流:用户在 /settings/theme 切 → 写 store.membership.theme → ThemeProvider
// 监听变化 → 改 document.documentElement[data-theme] → CSS 变量切换全站
//
// 设计:
// - young:基础字号 14px,线条 icon,圆角 12px
// - senior:基础字号 18px,实心 icon,大按钮(>=48px),圆角 8px,高对比
//
// 关键:**主题切换免费**(plan F-THEME-01),不锁会员档;但 **Senior 档锁定为 senior**
// (锁定的判定在 store.ts useTheme action 中处理,不在本文件)

import type { ThemeMode } from "./types";

/** 主题元信息(主题切换 UI 用) */
export interface ThemeMeta {
  mode: ThemeMode;
  label: string;           // 青年版 / 老年版
  tagline: string;         // 一句话描述
  emoji: string;
  baseFontSize: number;    // px
  iconStroke: number;      // lucide stroke-width
  buttonMinHeight: number; // px
  borderRadius: number;    // px
  features: string[];      // 卖点
}

export const THEME_META: Record<ThemeMode, ThemeMeta> = {
  young: {
    mode: "young",
    label: "青年版",
    tagline: "精致圆角,暖色治愈风",
    emoji: "🌱",
    baseFontSize: 14,
    iconStroke: 1.5,
    buttonMinHeight: 40,
    borderRadius: 12,
    features: [
      "精致 14px 字号",
      "圆润卡片(12px 圆角)",
      "线条 icon",
      "暖橘 + 柔粉配色",
    ],
  },
  senior: {
    mode: "senior",
    label: "老年版",
    tagline: "18px 大字 + 高对比 + 大按钮",
    emoji: "👴",
    baseFontSize: 18,
    iconStroke: 2.5,
    buttonMinHeight: 56,
    borderRadius: 8,
    features: [
      "大字 18px 正文",
      "高对比度配色(WCAG AA ≥ 4.5:1)",
      "大按钮(56px,老人手指友好)",
      "实心 icon,清晰可见",
    ],
  },
};

/** CSS 变量字典(注入到 :root[data-theme=...] 的 --css-var 上) */
export interface ThemeCssVars {
  "--base-font-size": string;
  "--icon-stroke": string;
  "--button-min-height": string;
  "--border-radius": string;
  /** senior 主题额外加深文字色 + 提高对比度 */
  "--color-text-override": string;
  "--bg-card-override": string;
  "--color-text-soft-override": string;
  "--color-border-override": string;
}

function toCssVars(meta: ThemeMeta, mode: ThemeMode): ThemeCssVars {
  const isYoung = mode === "young";
  return {
    "--base-font-size": `${meta.baseFontSize}px`,
    "--icon-stroke": String(meta.iconStroke),
    "--button-min-height": `${meta.buttonMinHeight}px`,
    "--border-radius": `${meta.borderRadius}px`,
    // senior:深棕文字 #1a0f0a(对比度 > 7:1)+ 纯白卡片 + 加深次文字 + 加深边框
    "--color-text-override": isYoung ? "" : "#1a0f0a",
    "--bg-card-override": isYoung ? "" : "#ffffff",
    "--color-text-soft-override": isYoung ? "" : "#4a3a32",
    "--color-border-override": isYoung ? "" : "#c8b8a8",
  };
}

export const THEME_CSS_VARS: Record<ThemeMode, ThemeCssVars> = {
  young: toCssVars(THEME_META.young, "young"),
  senior: toCssVars(THEME_META.senior, "senior"),
};

/** 把主题对象转成 inline style 字符串(用于服务端 SSR 防 FOUC) */
export function themeStyleString(mode: ThemeMode): string {
  const vars = THEME_CSS_VARS[mode];
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v}`)
    .filter(([, v]) => v)  // 空值不输出
    .join("; ");
}

/** 应用主题到 <html> 元素(客户端 only) */
export function applyThemeToHtml(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-theme", mode);
  // 同步 lucide icon 描边(全局)
  html.style.setProperty("--icon-stroke", String(THEME_META[mode].iconStroke));
}

/** 读取 localStorage 中的主题(防 FOUC,同步调用) */
export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "young";
  try {
    const stored = window.localStorage.getItem("petcare-theme");
    if (stored === "young" || stored === "senior") return stored;
  } catch {
    // 隐私模式 / localStorage 禁用 → 默认 young
  }
  return "young";
}

/** 写 localStorage(供 ThemeProvider 监听变化时用) */
export function writeStoredTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("petcare-theme", mode);
  } catch {
    // 隐私模式 / 配额满 → 静默
  }
}
