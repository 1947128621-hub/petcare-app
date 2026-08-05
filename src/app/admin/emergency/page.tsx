"use client";

// ===== /admin/emergency · 应急入口页(实施员 2 负责)=====
//
// 用途:硬编码 12345 明文密码(用户拍板 B 方案保留)作为 challenge 的 backup。
// - 走同一锁定计数器(3 次错锁 5 分钟,与 challenge 共享)
// - 已登录:跳 /admin
// - 成功后:写 sessionStorage admin_token + 跳 /admin
//
// v0.4.0 简陋版接受此风险(应急密码明文硬编码),靠 Tauri 签名保护源码不被改
// v0.4.1 计划:首次启动让用户自设 6 位 PIN

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, AlertTriangle, Lock, LogOut, ShieldCheck } from "lucide-react";
import {
  AdminAuth,
  formatLockCountdown,
  formatAttemptsHint,
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

export default function AdminEmergencyPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [attemptHint, setAttemptHint] = useState("还有 3 次机会");
  const remainingMs = useCountdown(lockedUntil);

  // mount:检查锁定 + 已登录态
  useEffect(() => {
    if (AdminAuth.isAuthenticated()) {
      router.replace("/admin");
      return;
    }
    const lock = AdminAuth.getLockState();
    if (lock.lockedUntil && new Date(lock.lockedUntil).getTime() > Date.now()) {
      setLockedUntil(new Date(lock.lockedUntil).getTime());
      setError(`已锁定,请 ${formatLockCountdown(new Date(lock.lockedUntil).getTime() - Date.now())} 后重试`);
    }
    setAttemptHint(formatAttemptsHint(lock.failedAttempts));
  }, [router]);

  // 锁定到期
  useEffect(() => {
    if (lockedUntil && remainingMs === 0) {
      setLockedUntil(null);
      setError(null);
      const lock = AdminAuth.getLockState();
      setAttemptHint(formatAttemptsHint(lock.failedAttempts));
    }
  }, [lockedUntil, remainingMs]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting || lockedUntil) return;
      setSubmitting(true);
      setError(null);
      try {
        const result = AdminAuth.emergency(password);
        if (result.ok) {
          pushToast({ kind: "success", title: "应急入口已登录" });
          setTimeout(() => router.replace("/admin"), 300);
        } else {
          const lock = AdminAuth.getLockState();
          if (lock.lockedUntil && new Date(lock.lockedUntil).getTime() > Date.now()) {
            setLockedUntil(new Date(lock.lockedUntil).getTime());
            setError(`已锁定,请 ${formatLockCountdown(new Date(lock.lockedUntil).getTime() - Date.now())} 后重试`);
          } else {
            const messages: Record<string, string> = {
              format: "格式错误:5 位数字",
              mismatch: "应急密码错误",
              expired: "已过期,请重试",
              locked: "已锁定",
            };
            setError(messages[result.reason] ?? "验证失败");
            setAttemptHint(formatAttemptsHint(lock.failedAttempts));
            setPassword("");
          }
        }
      } catch {
        setError("校验失败");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, lockedUntil, password, router]
  );

  const handleLogout = () => {
    AdminAuth.logout();
    pushToast({ kind: "info", title: "已登出" });
    setTimeout(() => router.replace("/"), 300);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-cream)]">
      <header className="sticky top-0 z-30 bg-[var(--bg-cream)]/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-[var(--color-border)]">
        <Link
          href="/admin"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-soft active:scale-95"
          aria-label="返回"
        >
          <ArrowLeft size={18} className="text-[var(--color-text)]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-[var(--color-text)] truncate flex items-center gap-1.5">
            <KeyRound size={14} className="text-[var(--color-warning)]" />
            应急入口
          </h1>
          <p className="text-[10px] text-[var(--color-text-soft)] truncate">
            Hard-coded backup · 5 位明文
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

      <main className="w-full max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {/* 警告卡 */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={14} className="text-amber-700" />
            <h2 className="text-sm font-bold text-amber-900">应急入口</h2>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            仅用于忘记 challenge 答案时的兜底入口。
            v0.4.0 简陋版使用硬编码 5 位明文(用户拍板 B 方案),源码靠 Tauri 签名保护。
          </p>
          <p className="text-[11px] text-amber-800 leading-relaxed mt-1">
            同样受 3 次错锁 5 分钟限制(与 challenge 共享计数器)。
          </p>
        </div>

        {/* 锁定遮罩 */}
        {lockedUntil && (
          <div className="bg-white rounded-2xl p-6 shadow-soft text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto">
              <Lock size={24} className="text-[var(--color-danger)]" />
            </div>
            <p className="text-base font-bold text-[var(--color-text)]">已锁定</p>
            <p className="text-3xl font-mono font-bold text-[var(--color-danger)] tabular-nums">
              {formatLockCountdown(remainingMs)}
            </p>
            <p className="text-xs text-[var(--color-text-soft)]">
              5 分钟后自动解锁
            </p>
          </div>
        )}

        {/* 密码输入卡 */}
        {!lockedUntil && (
          <form onSubmit={onSubmit} className="bg-white rounded-2xl p-5 shadow-soft space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">
                应急密码(5 位数字)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="5 位数字"
                autoFocus
                autoComplete="off"
                disabled={lockedUntil !== null}
                className="w-full px-3 py-2.5 text-base font-mono bg-[var(--bg-soft)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 tracking-[0.5em] text-center disabled:opacity-50"
              />
            </div>

            <div className="text-[11px] text-[var(--color-text-soft)]">
              本轮 {attemptHint}
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-[var(--color-danger)] text-xs">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password || password.length !== 5}
              className="w-full py-2.5 rounded-xl bg-gradient-warm text-white text-sm font-bold shadow-soft active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "校验中…" : "进入后台"}
            </button>
          </form>
        )}

        {/* 主入口链接 */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-[var(--color-text-soft)] mb-2">记得 challenge 答案?</p>
          <Link
            href="/admin/challenge"
            className="text-[var(--color-primary)] text-xs font-medium hover:underline inline-flex items-center gap-1"
          >
            <ShieldCheck size={11} />
            回到 Challenge 入口 →
          </Link>
        </div>

        {/* 文档提示 */}
        <details className="bg-white rounded-2xl p-3.5 shadow-soft text-[11px] text-[var(--color-text-soft)]">
          <summary className="cursor-pointer hover:text-[var(--color-text)] font-medium">
            📌 安全说明
          </summary>
          <ul className="mt-2 space-y-1 pl-4 list-disc">
            <li>应急密码硬编码在源码,任何能读源码的人都知道(已知风险)</li>
            <li>v0.4.0 简陋版靠 Tauri 签名保护源码不被改包重装</li>
            <li>v0.4.1 计划:首次启动让用户自设 6 位 PIN,完全去掉明文</li>
            <li>3 次错锁 5 分钟(同 challenge 共享计数器)</li>
            <li>应急入口可绕过 challenge,但仍受锁定限制</li>
          </ul>
        </details>
      </main>
    </div>
  );
}
