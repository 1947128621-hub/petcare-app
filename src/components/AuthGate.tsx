// ===== 登录/注册遮罩 =====
// v0.3.1: 骨架版，存在但默认不挂载到 (main) layout
// v0.4 接入时，可在 profile 页加"开启云同步"按钮触发此组件
//
// 两种使用方式：
//   1. 受控模式：<AuthGate open={isOpen} onClose={() => setOpen(false)} />
//   2. 自管状态：<AuthGate />（会自检登录状态，未登录自动弹出）
//
// 设计：暖色治愈风，遵循 v0.3.1 视觉语言

"use client";

import { useEffect, useState } from "react";
import { useAuthState, signIn, signUp, resetPassword } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

type Mode = "login" | "register" | "forgot";

interface AuthGateProps {
  /** 受控：是否显示 */
  open?: boolean;
  /** 受控：关闭回调 */
  onClose?: () => void;
  /** 默认模式 */
  defaultMode?: Mode;
}

export default function AuthGate({ open, onClose, defaultMode = "login" }: AuthGateProps) {
  const auth = useAuthState();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  // 未配置时直接提示，避免无意义交互
  if (!configured) {
    return (
      <ModalShell open={open ?? true} onClose={onClose}>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">☁️</div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">云同步未配置</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            当前为 v0.3.1 本地优先模式。
            <br />
            数据保存在本设备 localStorage，安全但不跨设备同步。
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2 text-sm bg-stone-100 text-stone-700 rounded-full"
            >
              知道了
            </button>
          )}
        </div>
      </ModalShell>
    );
  }

  // 已登录 → 不显示
  if (auth.status === "authenticated" && open === undefined) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setHint(null);
    setBusy(true);
    try {
      if (mode === "forgot") {
        const r = await resetPassword(email);
        if (r.ok) setHint("重置链接已发送到你的邮箱");
        else setErr(r.error ?? "发送失败");
      } else if (mode === "register") {
        const r = await signUp(email, password);
        if (r.ok) {
          setHint("注册成功！请到邮箱查收验证邮件（或直接登录）");
          setMode("login");
        } else {
          setErr(r.error ?? "注册失败");
        }
      } else {
        const r = await signIn(email, password);
        if (r.ok) {
          onClose?.();
        } else {
          setErr(r.error ?? "登录失败");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell open={open ?? auth.status === "anonymous"} onClose={onClose}>
      <div className="py-2">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🐾</div>
          <h2 className="text-lg font-semibold text-stone-800">
            {mode === "login" && "欢迎回来"}
            {mode === "register" && "开启云同步"}
            {mode === "forgot" && "找回密码"}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {mode === "login" && "登录后所有数据自动跨设备同步"}
            {mode === "register" && "注册账号，让毛孩子的记录永不丢失"}
            {mode === "forgot" && "输入注册邮箱，我们会发送重置链接"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-stone-600 mb-1 block">邮箱</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="you@example.com"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="text-xs text-stone-600 mb-1 block">密码</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="至少 6 位"
              />
            </div>
          )}

          {err && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
          {hint && (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {hint}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-400 to-rose-400 rounded-xl disabled:opacity-50 active:scale-[0.98] transition"
          >
            {busy
              ? "处理中..."
              : mode === "login"
              ? "登录"
              : mode === "register"
              ? "注册并开启云同步"
              : "发送重置链接"}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-1.5 text-center text-xs text-stone-500">
          {mode === "login" && (
            <>
              <button
                onClick={() => { setMode("register"); setErr(null); setHint(null); }}
                className="hover:text-orange-500 transition"
              >
                还没账号？立即注册 →
              </button>
              <button
                onClick={() => { setMode("forgot"); setErr(null); setHint(null); }}
                className="hover:text-stone-700 transition"
              >
                忘记密码
              </button>
            </>
          )}
          {mode === "register" && (
            <button
              onClick={() => { setMode("login"); setErr(null); setHint(null); }}
              className="hover:text-orange-500 transition"
            >
              已有账号？登录 →
            </button>
          )}
          {mode === "forgot" && (
            <button
              onClick={() => { setMode("login"); setErr(null); setHint(null); }}
              className="hover:text-orange-500 transition"
            >
              ← 返回登录
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

// ===== Modal 容器 =====

function ModalShell({
  open,
  onClose,
  children,
}: {
  open?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (open === false) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full sm:max-w-sm sm:mx-4 bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 text-lg w-8 h-8 flex items-center justify-center"
            aria-label="关闭"
          >
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
