// ===== Auth 客户端封装 =====
// 提供 React hook 让组件订阅登录状态
// v0.3.1: mock 模式始终返回 "anonymous"
// v0.4: 接入真 Supabase 后即可用

"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; userId: string; email: string | null }
  | { status: "error"; message: string };

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setState({ status: "anonymous" });
      return;
    }

    let cancelled = false;

    // 初始拉一次
    void client.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setState({ status: "error", message: error.message });
        return;
      }
      if (data.user) {
        setState({
          status: "authenticated",
          userId: data.user.id,
          email: data.user.email ?? null,
        });
      } else {
        setState({ status: "anonymous" });
      }
    });

    // 监听变化
    const sub = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        setState({
          status: "authenticated",
          userId: session.user.id,
          email: session.user.email ?? null,
        });
      } else {
        setState({ status: "anonymous" });
      }
    });

    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

// ===== Auth 操作封装 =====

export async function signUp(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: "云同步未配置，无法注册" };
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "注册失败：未返回用户" };
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: "云同步未配置，无法登录" };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "登录失败：账号或密码错误" };
  return { ok: true };
}

export async function signOut(): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: true };
  const { error } = await client.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resetPassword(email: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: "云同步未配置，无法重置密码" };
  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export { isSupabaseConfigured };
