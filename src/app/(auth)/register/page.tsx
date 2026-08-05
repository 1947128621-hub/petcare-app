// ===== 注册页 =====
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, isSupabaseConfigured } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setHint(null);

    if (password !== confirm) {
      setErr("两次输入的密码不一致");
      return;
    }
    if (password.length < 6) {
      setErr("密码至少 6 位");
      return;
    }

    setBusy(true);
    try {
      const r = await signUp(email, password);
      if (r.ok) {
        setHint("注册成功！请到邮箱查收验证邮件（也可能直接登录成功）");
        // 3 秒后跳登录
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setErr(r.error ?? "注册失败");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-8 text-center">
        <div className="text-5xl mb-4">☁️</div>
        <h1 className="text-xl font-semibold text-stone-800 mb-2">云同步未配置</h1>
        <p className="text-sm text-stone-600 leading-relaxed mb-6">
          当前为 v0.3.1 本地优先模式。
          <br />
          所有数据保存在本设备 localStorage。
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-400 to-rose-400 rounded-full"
        >
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-8">
      <div className="text-center mb-6">
        <div className="inline-flex w-16 h-16 rounded-full bg-gradient-to-br from-orange-200 to-rose-200 items-center justify-center text-3xl mb-3">
          🐾
        </div>
        <h1 className="text-xl font-semibold text-stone-800">开启云同步</h1>
        <p className="text-xs text-stone-500 mt-1">注册账号，让毛孩子的记录永不丢失</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-stone-600 mb-1.5 block">邮箱</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="text-xs text-stone-600 mb-1.5 block">密码</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
            placeholder="至少 6 位"
          />
        </div>

        <div>
          <label className="text-xs text-stone-600 mb-1.5 block">确认密码</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
            placeholder="再输入一次"
          />
        </div>

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
          {busy ? "注册中..." : "注册并开启云同步"}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-stone-500 space-y-1.5">
        <Link href="/login" className="block hover:text-orange-500 transition">
          已有账号？登录 →
        </Link>
        <Link href="/" className="block text-stone-400 hover:text-stone-600 transition">
          暂不注册，返回首页
        </Link>
      </div>
    </div>
  );
}
