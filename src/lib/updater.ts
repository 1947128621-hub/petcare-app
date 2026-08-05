// ====== OTA 更新封装 ======
// 把 @tauri-apps/api 与 @tauri-apps/plugin-updater 包成 SSR / 浏览器安全的函数。
// 纯 web 环境下（next dev / next start）调用统一返回 null / 静默失败，不会抛错。

import type { Update } from "@tauri-apps/plugin-updater";

export interface UpdateProgressEvent {
  event: "Started" | "Progress" | "Finished";
  contentLength: number;
  downloadedLength: number;
}

export interface UpdateCheckResult {
  available: boolean;
  currentVersion: string;
  newVersion: string | null;
  notes: string | null;
  pubDate: string | null;
  /** 内部用：拿到原生 Update 对象用于下载 */
  _update: Update | null;
}

/** 是否运行在 Tauri 桌面/移动端容器中（SSR 始终为 false） */
export function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  // Tauri 2.x 注入 window.__TAURI_INTERNALS__
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

/** 获取当前 App 版本（来自 tauri.conf.json 的 version 字段）。
 *  非 Tauri 环境返回 "0.0.0-web"。 */
export async function getCurrentAppVersion(): Promise<string> {
  if (!isTauriEnvironment()) return "0.0.0-web";
  const { getVersion } = await import("@tauri-apps/api/app");
  return getVersion();
}

/** 检查 OTA 更新。非 Tauri 环境 / 检查失败一律返回 available=false。 */
export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const fallback: UpdateCheckResult = {
    available: false,
    currentVersion: await getCurrentAppVersion(),
    newVersion: null,
    notes: null,
    pubDate: null,
    _update: null,
  };

  if (!isTauriEnvironment()) return fallback;

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return { ...fallback, currentVersion: await getCurrentAppVersion() };

    return {
      available: true,
      currentVersion: update.currentVersion ?? (await getCurrentAppVersion()),
      newVersion: update.version ?? null,
      notes: update.body ?? null,
      pubDate: update.date ?? null,
      _update: update,
    };
  } catch (err) {
    // 网络/解析失败都视作无可用更新，错误信息回传页面展示
    console.warn("[updater] check failed:", err);
    return {
      ...fallback,
      currentVersion: await getCurrentAppVersion(),
      notes: String((err as Error)?.message ?? err),
    };
  }
}

/** 下载并安装更新。完成后必须重启 App 才能生效（installMode=passive）。
 *  传入 progress 回调以更新 UI 进度条。 */
export async function downloadAndInstallUpdate(
  update: Update,
  onProgress?: (e: UpdateProgressEvent) => void
): Promise<void> {
  let downloaded = 0;
  let total = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? 0;
        downloaded = 0;
        onProgress?.({
          event: "Started",
          contentLength: total,
          downloadedLength: 0,
        });
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onProgress?.({
          event: "Progress",
          contentLength: total,
          downloadedLength: downloaded,
        });
        break;
      case "Finished":
        onProgress?.({
          event: "Finished",
          contentLength: total,
          downloadedLength: total,
        });
        break;
    }
  });
}
