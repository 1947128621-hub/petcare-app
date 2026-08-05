"use client";

// ===== /admin/challenge · challenge 入口页(实施员 2 负责)=====
//
// 用途:用户直接通过 URL `/admin/challenge` 访问时的独立页面。
// - 与 AdminAuthGate 的弹窗 UI 复用同一套核心函数(从 admin-auth.ts)
// - 区别:本页是 full-page,带左侧返回链接 + 顶部 status bar
// - 弹窗版的 challenge(AdminAuthGate)适合 /admin 直接访问;独立页适合书签/分享
//
// 流程:
// 1. mount → 立即生成 6 位 challenge
// 2. 用户手算 SHA-256 后 8 位
// 3. 输入 → 校验 → 成功跳 /admin 主页(已是 admin 认证态)
// 4. 失败 → 计数 +1;3 次 → 锁 5 分钟

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, RefreshCw, AlertTriangle, Lock, LogOut } from "lucide-react";
import {
  AdminAuth,
  formatLockCountdown,
  formatAttemptsHint,
  issueChallenge,
  type AdminChallengeState,
} from "@/lib/admin-auth";
import { pushToast } from "@/components/Toast";

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

export default function AdminChallengePage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<AdminChallengeState | null>(null);
  const [userInput, setUserInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [attemptHint, setAttemptHint] = useState("还有 3 次机会");
  const remainingMs = useCountdown(lockedUntil);
  const initialized = useRef(false);

  // 生成新 challenge
  const regenerate = useCallback(() => {
    setChallenge(issueChallenge());
    setUserInput("");
    setError(null);
  }, []);

  // mount 时:检查锁定 / 已登录 / 生成 challenge
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 已登录:跳 /admin
    if (AdminAuth.isAuthenticated()) {
      router.replace("/admin");
      return;
    }

    const lock = AdminAuth.getLockState();
    if (lock.lockedUntil && new Date(lock.lockedUntil).getTime() > Date.now()) {
      setLockedUntil(new Date(lock.lockedUntil).getTime());
      setError(`已锁定,请 ${formatLockCountdown(new Date(lock.lockedUntil).getTime() - Date.now())} 后重试`);
    } else {
      regenerate();
    }
    setAttemptHint(formatAttemptsHint(lock.failedAttempts));
  }, [router, regenerate]);

  // 锁定到期:自动清除 + 重新生成
  useEffect(() => {
    if (lockedUntil && remainingMs === 0) {
      setLockedUntil(null);
      setError(null);
      regenerate();
      const lock = AdminAuth.getLockState();
      setAttemptHint(formatAttemptsHint(lock.failedAttempts));
    }
  }, [lockedUntil, remainingMs, regenerate]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting || lockedUntil || !challenge) return;
      setSubmitting(true);
      setError(null);
      try {
        const result = await AdminAuth.verify(challenge, userInput);
        if (result.ok) {
          pushToast({ kind: "success", title: "管理员已登录" });
          // 跳转 admin 主页
          setTimeout(() => router.replace("/admin"), 300);
        } else {
          // 读最新锁定状态
          const lock = AdminAuth.getLockState();
          if (lock.lockedUntil && new Date(lock.lockedUntil).getTime() > Date.now()) {
            setLockedUntil(new Date(lock.lockedUntil).getTime());
            setError(`已锁定,请 ${formatLockCountdown(new Date(lock.lockedUntil).getTime() - Date.now())} 后重试`);
          } else {
            const messages: Record<string, string> = {
              format: "格式错误:8 位十六进制字符",
              mismatch: "答案错误",
              expired: "challenge 已过期,请重新生成",
              locked: "已锁定",
            };
            setError(messages[result.reason] ?? "验证失败");
            setAttemptHint(formatAttemptsHint(lock.failedAttempts));
            if (result.reason === "expired" || result.reason === "mismatch") {
              setTimeout(() => regenerate(), 800);
            }
          }
        }
      } catch {
        setError("校验失败,请重试");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, lockedUntil, challenge, userInput, router, regenerate]
  );

  const handleLogout = () => {
    AdminAuth.logout();
    pushToast({ kind: "info", title: "已登出" });
    setTimeout(() => router.replace("/"), 300);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-cream)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-cream)]/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-[var(--color-border)]">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-soft active:scale-95"
          aria-label="返回首页"
        >
          <ArrowLeft size={18} className="text-[var(--color-text)]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-[var(--color-text)] truncate flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--color-primary)]" />
            Challenge 入口
          </h1>
          <p className="text-[10px] text-[var(--color-text-soft)] truncate">
            SHA-256 验证 · 主入口
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-soft text-[var(--color-text-soft)] active:scale-95"
          aria-label="登出"
        >
          <LogOut size={16} />
        </button>
      </header>

      <main className="w-full max-w-[480px] mx-auto px-4 py-6">
        {/* 说明卡 */}
        <div className="rounded-2xl bg-gradient-warm text-white p-4 shadow-soft mb-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} />
            <h2 className="text-sm font-bold">管理员验证</h2>
          </div>
          <p className="text-[11px] opacity-90 leading-relaxed">
            请计算下方字符串的 SHA-256,取末尾 8 位字符输入。
            5 分钟后如未验证将自动刷新题目。
          </p>
        </div>

        {/* 锁定遮罩 */}
        {lockedUntil && (
          <div className="bg-white rounded-2xl p-6 shadow-soft text-center space-y-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto">
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

        {/* Challenge 卡 */}
        {challenge && !lockedUntil && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-soft text-center">
              <p className="text-[11px] text-[var(--color-text-soft)] mb-2">
                计算下方字符串的 SHA-256 后 8 位
              </p>
              <p
                className="font-mono text-3xl font-bold tracking-[0.3em] text-[var(--color-text)] select-all"
                aria-label={`challenge 字符串 ${challenge.code}`}
              >
                {challenge.code}
              </p>
              <p className="text-[10px] text-[var(--color-text-soft)] mt-2">
                60 秒后自动失效
              </p>
            </div>

            <details className="text-[11px] text-[var(--color-text-soft)] bg-white rounded-2xl px-3 py-2 shadow-soft">
              <summary className="cursor-pointer hover:text-[var(--color-text)] py-1">
                不知道怎么算?展开提示
              </summary>
              <pre className="mt-1 px-2 py-1.5 rounded bg-[var(--bg-soft)] text-[10px] overflow-x-auto">
{`echo -n "${challenge.code}" | sha256sum
# PowerShell:
# $bytes = [Text.Encoding]::UTF8.GetBytes("${challenge.code}")
# [BitConverter]::ToString((New-Object Security.Cryptography.SHA256Managed).ComputeHash($bytes)).Replace("-","").ToLower().Substring(-8)`}
              </pre>
            </details>

            <div className="bg-white rounded-2xl p-4 shadow-soft space-y-3">
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
                  className="w-full px-3 py-2.5 text-sm font-mono bg-[var(--bg-soft)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--color-text-soft)]">
                <span>本轮 {attemptHint}</span>
                <button
                  type="button"
                  onClick={regenerate}
                  className="flex items-center gap-1 hover:text-[var(--color-primary)] transition"
                >
                  <RefreshCw size={11} />
                  换一题
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-[var(--color-danger)] text-xs">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !userInput || userInput.length !== 8}
                className="w-full py-2.5 rounded-xl bg-gradient-warm text-white text-sm font-bold shadow-soft active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "校验中…" : "验证"}
              </button>
            </div>
          </form>
        )}

        {/* 备用入口 */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-[var(--color-text-soft)] mb-2">忘记答案?</p>
          <Link
            href="/admin/emergency"
            className="text-[var(--color-primary)] text-xs font-medium hover:underline"
          >
            使用应急入口 →
          </Link>
        </div>
      </main>
    </div>
  );
}
