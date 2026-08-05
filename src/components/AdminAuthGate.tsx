"use client";

// ===== 毛球日记 v0.4.0 · 管理员入口鉴权闸门(AdminAuthGate)=====
//
// 设计要点:
// - MUST-02 拍板:admin 入口是 `/admin/*` 4 个 sub-route 根路径,**不**做任何隐藏手势入口
// - 未登录 → 弹 challenge 弹窗(不跳转 `/admin/login`,与 plan §2.7 裁决表一致)
// - 输错 3 次 → 锁定 5 分钟,倒计时 UI 实时显示
// - 弹窗里有"应急入口"tab → 输入 12345 也可过(走同一锁定计数器)
// - sessionStorage admin_token 30 分钟有效
// - 关闭弹窗但未通过 = 留一个"重新解锁"入口,不显示 children
//
// 用法:
//   在 /admin/* 的根 layout 包一次即可
//   <AdminAuthGate>{children}</AdminAuthGate>
//
// 已登录:直接渲染 children(包一层 div 占位)
// 未登录:渲染 challenge 弹窗 + 倒计时;点关闭不渲染 children

import { useEffect, useState, useCallback, useRef, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, X, RefreshCw, Lock, AlertTriangle } from "lucide-react";
import {
  AdminAuth,
  computeAnswer,
  formatLockCountdown,
  formatAttemptsHint,
  issueChallenge,
  type AdminChallengeState,
  type VerifyResult,
  getLockState as getLockStateRaw,
} from "@/lib/admin-auth";

interface AdminAuthGateProps {
  children: ReactNode;
}

// ===== 倒计时 hook =====
function useCountdown(targetTs: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (targetTs === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetTs]);
  if (targetTs === null) return 0;
  return Math.max(0, targetTs - now);
}

// ===== 模态：challenge 验证 =====
export default function AdminAuthGate({ children }: AdminAuthGateProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // session 状态(只在客户端 mount 后才有意义)
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [challenge, setChallenge] = useState<AdminChallengeState | null>(null);
  const [userInput, setUserInput] = useState("");
  const [emergencyInput, setEmergencyInput] = useState("");
  const [tab, setTab] = useState<"challenge" | "emergency">("challenge");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{
    kind: "format" | "mismatch" | "expired" | "locked";
    message: string;
  } | null>(null);
  // 锁定倒计时(epoch ms)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const remainingMs = useCountdown(lockedUntil);
  // 当前失败次数提示
  const [attemptHint, setAttemptHint] = useState<string>("");

  // 已登录态检查(只在客户端)
  useEffect(() => {
    setMounted(true);
    setAuthenticated(AdminAuth.isAuthenticated());
  }, []);

  // 生成 challenge(mount 后立刻一次;之后失败也可点"换一题"重新生成)
  const regenerateChallenge = useCallback(() => {
    setChallenge(issueChallenge());
    setUserInput("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // 检查锁定
    const lock = AdminAuth.getLockState();
    if (lock.lockedUntil) {
      const ts = new Date(lock.lockedUntil).getTime();
      if (ts > Date.now()) {
        setLockedUntil(ts);
        setError({
          kind: "locked",
          message: `已锁定,请 ${formatLockCountdown(ts - Date.now())} 后重试`,
        });
      } else {
        setLockedUntil(null);
      }
    } else {
      setLockedUntil(null);
    }
    setAttemptHint(formatAttemptsHint(lock.failedAttempts));
    // 首次进入未登录时立即生成 challenge
    if (!AdminAuth.isAuthenticated() && !lock.lockedUntil) {
      regenerateChallenge();
    }
  }, [mounted, regenerateChallenge]);

  // 锁定到期时自动清除 + 重新生成 challenge
  useEffect(() => {
    if (lockedUntil && remainingMs === 0) {
      setLockedUntil(null);
      setError(null);
      regenerateChallenge();
      const lock = AdminAuth.getLockState();
      setAttemptHint(formatAttemptsHint(lock.failedAttempts));
    }
  }, [lockedUntil, remainingMs, regenerateChallenge]);

  // 提交 challenge 答案
  const onSubmitChallenge = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting || lockedUntil) return;
      if (!challenge) return;
      setSubmitting(true);
      setError(null);
      try {
        const result: VerifyResult = await AdminAuth.verify(challenge, userInput);
        if (result.ok) {
          setAuthenticated(true);
          pushToast({ kind: "success", title: "管理员已登录", message: "欢迎回来" });
        } else {
          handleFailure(result.reason);
        }
      } catch {
        handleFailure("expired");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, lockedUntil, challenge, userInput]
  );

  // 提交 emergency
  const onSubmitEmergency = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting || lockedUntil) return;
      setSubmitting(true);
      setError(null);
      try {
        const result = AdminAuth.emergency(emergencyInput);
        if (result.ok) {
          setAuthenticated(true);
          pushToast({ kind: "success", title: "应急入口已登录", message: "欢迎回来" });
        } else {
          handleFailure(result.reason);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, lockedUntil, emergencyInput]
  );

  // 失败处理
  // 注:FailureReason 直接 inline(不抽 type alias),避免 useCallback 闭包 + forward ref 引起的 `never` 推导
  const handleFailure = useCallback(
    (reason: "locked" | "expired" | "mismatch" | "format" | "no_challenge") => {
      if (reason === "locked") {
        const lock = AdminAuth.getLockState();
        if (lock.lockedUntil) {
          setLockedUntil(new Date(lock.lockedUntil).getTime());
        }
        setError({
          kind: "locked",
          message: `已锁定,请 ${formatLockCountdown(getLockStateRaw().lockedUntil ? new Date(getLockStateRaw().lockedUntil!).getTime() - Date.now() : 0)} 后重试`,
        });
        return;
      }
      const lock = AdminAuth.getLockState();
      if (lock.lockedUntil && new Date(lock.lockedUntil).getTime() > Date.now()) {
        setLockedUntil(new Date(lock.lockedUntil).getTime());
        setError({
          kind: "locked",
          message: `已锁定,请 ${formatLockCountdown(new Date(lock.lockedUntil).getTime() - Date.now())} 后重试`,
        });
        return;
      }
      setAttemptHint(formatAttemptsHint(lock.failedAttempts));
      const messages: Record<string, string> = {
        format: "格式错误:8 位十六进制字符",
        mismatch: "答案错误",
        expired: "challenge 已过期,请重新生成",
        locked: "已锁定",
        no_challenge: "challenge 不存在,请刷新",
      };
      setError({ kind: reason as "format" | "mismatch" | "expired" | "locked", message: messages[reason] ?? "验证失败" });
      // 失败后自动刷新 challenge(防止复用旧题)
      if (reason === "expired" || reason === "mismatch") {
        setTimeout(() => regenerateChallenge(), 800);
      }
    },
    [regenerateChallenge]
  );

  // ===== 渲染 =====

  // SSR / 初次渲染占位:渲染 children 防止 hydration 闪烁
  // (Next.js 静态导出友好)
  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>;
  }

  // 已登录:渲染 children
  if (authenticated) {
    return <>{children}</>;
  }

  // 未登录:渲染全屏 challenge 弹窗
  const showChallengeInput = tab === "challenge" && !lockedUntil;
  const showEmergencyInput = tab === "emergency" && !lockedUntil;
  const inputDisabled = !!lockedUntil;

  return (
    <>
      {/* 隐藏 children:用空 div 替换(避免未登录时泄露内容) */}
      <div suppressHydrationWarning className="hidden" aria-hidden />

      {/* 模态遮罩 */}
      <div
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auth-title"
      >
        <div className="w-full sm:max-w-md sm:mx-0 bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
          {/* 顶部 */}
          <div className="bg-gradient-warm px-5 py-4 text-white relative">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} />
              <h2 id="admin-auth-title" className="text-base font-bold">
                管理员验证
              </h2>
            </div>
            <p className="text-[11px] opacity-90 mt-1">
              /admin/* 受保护区域 · 验证身份后继续
            </p>
            <Link
              href="/"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white active:scale-95"
              aria-label="返回首页"
            >
              <X size={16} />
            </Link>
          </div>

          {/* Tab 切换 */}
          <div className="grid grid-cols-2 gap-0 border-b border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => {
                setTab("challenge");
                setError(null);
              }}
              className={
                "py-3 text-sm font-medium transition-colors " +
                (tab === "challenge"
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                  : "text-[var(--color-text-soft)]")
              }
            >
              <ShieldCheck size={13} className="inline -mt-0.5 mr-1" />
              Challenge
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("emergency");
                setError(null);
              }}
              className={
                "py-3 text-sm font-medium transition-colors " +
                (tab === "emergency"
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                  : "text-[var(--color-text-soft)]")
              }
            >
              <KeyRound size={13} className="inline -mt-0.5 mr-1" />
              应急入口
            </button>
          </div>

          {/* 内容区 */}
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* 锁定遮罩 */}
            {lockedUntil && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center">
                  <Lock size={24} className="text-[var(--color-danger)]" />
                </div>
                <p className="text-base font-bold text-[var(--color-text)]">已锁定</p>
                <p className="text-3xl font-mono font-bold text-[var(--color-danger)] tabular-nums">
                  {formatLockCountdown(remainingMs)}
                </p>
                <p className="text-xs text-[var(--color-text-soft)]">
                  5 分钟后自动解锁,无需手动重置
                </p>
              </div>
            )}

            {/* Challenge 表单 */}
            {showChallengeInput && challenge && (
              <form onSubmit={onSubmitChallenge} className="space-y-4">
                <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-center">
                  <p className="text-[11px] text-[var(--color-text-soft)] mb-1">
                    请计算下方字符串的 SHA-256 后 8 位字符
                  </p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-[var(--color-text)] select-all">
                    {challenge.code}
                  </p>
                </div>

                <details className="text-[11px] text-[var(--color-text-soft)]">
                  <summary className="cursor-pointer hover:text-[var(--color-text)]">
                    不知道怎么算?展开提示
                  </summary>
                  <pre className="mt-1 px-2 py-1.5 rounded bg-[var(--bg-soft)] text-[10px] overflow-x-auto">
{`echo -n "${challenge.code}" | sha256sum
# 终端/PowerShell 计算后取末尾 8 位`}
                  </pre>
                </details>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">
                    答案(8 位字符)
                  </label>
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) =>
                      setUserInput(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 8))
                    }
                    placeholder="8 位十六进制"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    disabled={inputDisabled}
                    className="w-full px-3 py-2.5 text-sm font-mono bg-[var(--bg-soft)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-soft)]">
                  <span>本轮 {attemptHint}</span>
                  <button
                    type="button"
                    onClick={regenerateChallenge}
                    className="flex items-center gap-1 hover:text-[var(--color-primary)] transition"
                  >
                    <RefreshCw size={11} />
                    换一题
                  </button>
                </div>

                {error && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-[var(--color-danger)] text-xs">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{error.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !userInput || userInput.length !== 8}
                  className="w-full py-2.5 rounded-xl bg-gradient-warm text-white text-sm font-bold shadow-soft active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? "校验中…" : "验证"}
                </button>
              </form>
            )}

            {/* Emergency 表单 */}
            {showEmergencyInput && (
              <form onSubmit={onSubmitEmergency} className="space-y-4">
                <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <p className="text-[11px] text-amber-800 font-medium mb-0.5">应急入口(hard-coded backup)</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    输入固定 5 位应急密码进入后台。仅用于忘记 challenge 答案时的兜底。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">
                    应急密码
                  </label>
                  <input
                    type="password"
                    value={emergencyInput}
                    onChange={(e) =>
                      setEmergencyInput(e.target.value.replace(/\D/g, "").slice(0, 5))
                    }
                    placeholder="5 位数字"
                    autoFocus
                    autoComplete="off"
                    disabled={inputDisabled}
                    className="w-full px-3 py-2.5 text-sm font-mono bg-[var(--bg-soft)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50 tracking-widest"
                  />
                </div>

                <div className="text-[11px] text-[var(--color-text-soft)]">
                  本轮 {attemptHint}
                </div>

                {error && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-[var(--color-danger)] text-xs">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{error.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !emergencyInput || emergencyInput.length !== 5}
                  className="w-full py-2.5 rounded-xl bg-gradient-warm text-white text-sm font-bold shadow-soft active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? "校验中…" : "进入后台"}
                </button>
              </form>
            )}

            {/* 锁定状态下的简化提示 */}
            {lockedUntil && (
              <p className="text-[11px] text-center text-[var(--color-text-soft)]">
                锁定期间无法输入,但 challenge 答案不变,5 分钟后自动解锁。
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ===== 轻量 toast(避免直接 import 全局 ToastContainer)=====
function pushToast(t: { kind: "success" | "warning" | "error" | "info"; title: string; message?: string }) {
  // 动态 import 以避免 SSR 错误
  if (typeof window === "undefined") return;
  import("@/components/Toast").then(({ pushToast }) => {
    pushToast(t);
  });
}
