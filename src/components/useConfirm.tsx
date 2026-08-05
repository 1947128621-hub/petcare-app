"use client";

import { create } from "zustand";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * v0.3.2 — 自定义确认对话框（替代 window.confirm）
 * 解决 Tauri Android WebView 中 window.confirm 静默失效的问题
 */
type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "default";
};

type ConfirmState = {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  variant: "danger" | "default";
  resolve: ((v: boolean) => void) | null;
  show: (opts: ConfirmOptions) => Promise<boolean>;
  close: () => void;
};

const useConfirmStore = create<ConfirmState>((set) => ({
  open: false,
  title: "",
  description: "",
  confirmText: "确定",
  cancelText: "取消",
  variant: "default",
  resolve: null,
  show: (opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        open: true,
        title: opts.title,
        description: opts.description ?? "",
        confirmText: opts.confirmText ?? "确定",
        cancelText: opts.cancelText ?? "取消",
        variant: opts.variant ?? "default",
        resolve,
      });
    });
  },
  close: () => set({ open: false, resolve: null }),
}));

export function useConfirm() {
  const show = useConfirmStore((s) => s.show);
  return show;
}

export function ConfirmDialog() {
  const open = useConfirmStore((s) => s.open);
  const title = useConfirmStore((s) => s.title);
  const description = useConfirmStore((s) => s.description);
  const confirmText = useConfirmStore((s) => s.confirmText);
  const cancelText = useConfirmStore((s) => s.cancelText);
  const variant = useConfirmStore((s) => s.variant);
  const resolve = useConfirmStore((s) => s.resolve);
  const close = useConfirmStore((s) => s.close);

  const handleConfirm = () => { resolve?.(true); close(); };
  const handleCancel = () => { resolve?.(false); close(); };

  if (!open) return null;

  const isDanger = variant === "danger";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 animate-fade-up">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-card">
        <div className="p-6">
          {isDanger && (
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="text-rose-600" size={24} />
            </div>
          )}
          <h3 className="text-lg font-bold text-center text-[var(--color-text)]">{title}</h3>
          {description && (
            <p className="mt-2 text-sm text-center text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
              {description}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 rounded-full bg-gray-100 text-[var(--color-text)] font-medium text-sm active:scale-[0.98] transition-transform"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={cn(
                "flex-1 py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform",
                isDanger
                  ? "bg-rose-500 text-white"
                  : "bg-[var(--color-primary)] text-white"
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}
