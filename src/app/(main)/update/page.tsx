"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Download, RefreshCw, CheckCircle2, AlertTriangle, Package,
  Info, Cpu, Sparkles, Clock, RotateCcw,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { pushToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import {
  isTauriEnvironment,
  getCurrentAppVersion,
  checkForAppUpdate,
  downloadAndInstallUpdate,
  type UpdateCheckResult,
  type UpdateProgressEvent,
} from "@/lib/updater";

/**
 * 应用更新页 v0.4.0
 *
 * 流程：
 * 1. 进入页面 → 检测 Tauri 环境 + 拉取当前版本
 * 2. 自动调 checkForAppUpdate() 一次（Tauri 环境才触发）
 * 3. 状态机：idle → checking → (ready|done|idle|error)
 * 4. 用户可手动重试（错误或想再检查）
 * 5. 有更新 → 点「立即更新」→ downloading → done（提示重启）
 *
 * 私钥安全（MUST-07 拍板）：本地**无**任何私钥；签名校验由 tauri-plugin-updater
 * 用 tauri.conf.json 的 pubkey 透明完成，UI 不参与私钥处理。
 */

type Status = "idle" | "checking" | "downloading" | "ready" | "done" | "error";

export default function UpdatePage() {
  const [isTauri, setIsTauri] = useState(false);
  const [currentVer, setCurrentVer] = useState("加载中…");
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);
  // 防 stale closure：用 ref 跟踪是否处于 downloading
  const isDownloadingRef = useRef(false);

  // 初始化：检测环境 + 拉取当前版本
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tauri = isTauriEnvironment();
      if (cancelled) return;
      setIsTauri(tauri);
      const v = await getCurrentAppVersion();
      if (!cancelled) setCurrentVer(v);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCheck = useCallback(async () => {
    if (status === "checking" || status === "downloading") return;
    setStatus("checking");
    setErrorMsg(null);
    setProgress(0);
    try {
      const r = await checkForAppUpdate();
      setResult(r);
      setLastCheckAt(new Date().toISOString());
      if (r.available) {
        setStatus("ready");
        pushToast({
          kind: "success",
          title: "发现新版本",
          message: `v${r.newVersion ?? "?"} 可更新`,
        });
      } else {
        setStatus("idle");
        pushToast({
          kind: "info",
          title: "已是最新版本",
          message: `当前 v${r.currentVersion}`,
        });
      }
    } catch (err) {
      setErrorMsg(String((err as Error)?.message ?? err));
      setStatus("error");
      pushToast({
        kind: "error",
        title: "检查更新失败",
        message: "请检查网络后重试",
      });
    }
  }, [status]);

  // 启动后自动检查一次（非 Tauri 环境跳过）
  useEffect(() => {
    if (isTauri) {
      handleCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTauri]);

  const handleUpdate = useCallback(async () => {
    if (!result?._update) return;
    setStatus("downloading");
    setProgress(0);
    setErrorMsg(null);
    isDownloadingRef.current = true;
    try {
      await downloadAndInstallUpdate(result._update, (e: UpdateProgressEvent) => {
        if (e.contentLength > 0) {
          setProgress(Math.min(100, Math.round((e.downloadedLength / e.contentLength) * 100)));
        }
      });
      isDownloadingRef.current = false;
      setStatus("done");
      setProgress(100);
      pushToast({
        kind: "success",
        title: "更新已就绪",
        message: "请重启 App 生效",
      });
    } catch (err) {
      isDownloadingRef.current = false;
      const msg = String((err as Error)?.message ?? err);
      setErrorMsg(msg);
      setStatus("error");
      pushToast({
        kind: "error",
        title: "下载失败",
        message: "签名校验失败或网络中断，可重试",
      });
    }
  }, [result]);

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    setStatus("idle");
    handleCheck();
  }, [handleCheck]);

  const percent = progress;
  const releaseDate = result?.pubDate
    ? new Date(result.pubDate).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
    : null;
  const lastCheckDisplay = lastCheckAt
    ? new Date(lastCheckAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-4">
      <PageHeader title="应用更新" subtitle="检查并下载最新版本" />

      {/* 状态卡 */}
      <section className="bg-white rounded-2xl shadow-soft p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
            isTauri ? "bg-gradient-warm text-white" : "bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
          )}>
            {isTauri ? <Package size={22} /> : <Info size={22} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[var(--color-text)]">毛球日记</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-mono font-semibold">
                v0.4.0
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-soft)] mt-0.5 flex items-center gap-1.5">
              <Cpu size={11} />
              当前版本
              <span className="font-mono font-semibold text-[var(--color-text)]">v{currentVer}</span>
            </p>
            {!isTauri && (
              <p className="text-[10px] text-[var(--color-warning)] mt-1">
                ⚠️ 非 Tauri 环境（浏览器预览），无法检查更新
              </p>
            )}
            {lastCheckDisplay && isTauri && (
              <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5 flex items-center gap-1">
                <Clock size={9} />
                上次检查：{lastCheckDisplay}
              </p>
            )}
          </div>
        </div>

        {/* 进度条 */}
        {status === "downloading" && (
          <div className="space-y-1.5">
            <div className="h-2 bg-[var(--bg-soft)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-warm transition-all duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-soft)] text-right">{percent}%</p>
          </div>
        )}

        {/* 错误提示 + 重试 */}
        {status === "error" && errorMsg && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-[var(--color-danger)]">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold">更新失败</p>
                <p className="text-[11px] leading-relaxed break-all mt-0.5 opacity-90">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-white border border-[var(--color-border)] text-[var(--color-text)] active:scale-[0.98]"
            >
              <RotateCcw size={12} />
              重试
            </button>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCheck}
            disabled={!isTauri || status === "checking" || status === "downloading"}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold transition-all",
              "bg-white border border-[var(--color-border)] text-[var(--color-text)]",
              "active:scale-[0.98] disabled:opacity-50"
            )}
          >
            <RefreshCw size={14} className={status === "checking" ? "animate-spin" : ""} />
            {status === "checking" ? "检查中…" : (lastCheckAt ? "再次检查" : "检查更新")}
          </button>

          {result?.available && status === "ready" && (
            <button
              onClick={handleUpdate}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold bg-gradient-warm text-white shadow-soft active:scale-[0.98]"
            >
              <Download size={14} />
              立即更新
            </button>
          )}

          {status === "done" && (
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold bg-[var(--color-success)]/10 text-[var(--color-success)]">
              <CheckCircle2 size={14} />
              已就绪，请重启
            </div>
          )}

          {status === "idle" && result && !result.available && (
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold bg-[var(--color-success)]/10 text-[var(--color-success)]">
              <CheckCircle2 size={14} />
              已是最新
            </div>
          )}
        </div>
      </section>

      {/* 新版本详情卡 */}
      {result?.available && (
        <section className="bg-gradient-to-br from-[#f4c063] via-[#ff8c5a] to-[#f5a8b8] rounded-2xl shadow-card p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} />
            <span className="text-xs font-bold tracking-wider">发现新版本</span>
            <span className="text-[10px] px-2 py-0.5 bg-white/25 backdrop-blur-sm rounded-full font-mono">
              v{result.newVersion}
            </span>
          </div>
          <h3 className="text-lg font-bold mb-1">v{result.newVersion}</h3>
          {releaseDate && (
            <p className="text-[11px] opacity-90 mb-2">发布时间：{releaseDate}</p>
          )}
          {result.notes && (
            <div className="mt-3 p-3 rounded-xl bg-white/15 backdrop-blur-sm">
              <p className="text-xs font-bold mb-1 opacity-90">更新内容</p>
              <p className="text-xs leading-relaxed whitespace-pre-line opacity-95">
                {result.notes}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 说明 */}
      <section className="bg-white rounded-2xl shadow-soft p-4 space-y-2">
        <p className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
          <Info size={13} className="text-[var(--color-primary)]" />
          关于自动更新
        </p>
        <ul className="text-[11px] text-[var(--color-text-soft)] leading-relaxed space-y-1 pl-1">
          <li>· App 启动时会自动检查最新版本</li>
          <li>· 下载完成后，下次启动 App 即可应用新版本（Windows passive 模式）</li>
          <li>· 更新会校验数字签名，确保来源可信（私钥存 1Password/Vault）</li>
          <li>· 如有问题，可点击「重试」或「再次检查」手动重试</li>
          <li>· OTA 端点：<code className="text-[10px] bg-[var(--bg-soft)] px-1 rounded">petcare-ota.vercel.app/update.json</code></li>
        </ul>
      </section>
    </div>
  );
}
