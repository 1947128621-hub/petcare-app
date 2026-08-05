// ===== 隐私政策首次启动 modal =====
// v0.4.0 F-SEC-04：首次启动要求勾选"我已阅读并同意隐私政策"才能进 app
//   - 勾选前「开始使用」按钮禁用
//   - 接受态存 localStorage (`petcare-privacy-accepted-v1`)
//   - 隐私政策升级时需 BUMP PRIVACY_VERSION 才能再次弹
//
// 设计：用户可点开 /privacy /terms 查看完整内容(在 modal 内打开新 tab?不行 —
// 静态导出无 tab;改为 Link target="_blank";v0.4.0 用 router.push 跳页 + 跳回后状态保留)

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Shield, ExternalLink, X } from "lucide-react";
import { SecurityGuard, getPrivacyState } from "@/lib/security";
import { cn } from "@/lib/utils";

const STORAGE_KEY_CHECK = "petcare-privacy-modal-checked-v1";

export function PrivacyConsentModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 跳过隐私政策页和用户协议页本身(避免在隐私页弹"接受隐私"modal)
    if (pathname === "/privacy" || pathname === "/terms") {
      setOpen(false);
      return;
    }
    // 已经检查过 + 已接受 → 不再弹
    const checked = sessionStorage.getItem(STORAGE_KEY_CHECK);
    if (checked === "true") {
      setOpen(false);
      return;
    }
    // 隐私接受态
    const state = getPrivacyState();
    if (state.accepted) {
      setOpen(false);
      return;
    }
    // 否则打开 modal
    setOpen(true);
  }, [pathname]);

  const handleAccept = () => {
    if (!agreed || !agreedTerms) return;
    // 用 SecurityGuard 写接受态
    SecurityGuard.acceptPrivacy?.();
    sessionStorage.setItem(STORAGE_KEY_CHECK, "true");
    setOpen(false);
  };

  const handleReject = () => {
    // 不接受:弹窗保持;用户只能关掉 app 或接受
    // 留个"残忍"提示 + 关闭按钮(v0.4.0 简陋版;v0.4.1 可考虑"不存数据仍可看"模式)
  };

  if (!mounted || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-consent-title"
    >
      {/* 背景遮罩(不允许点遮罩关闭) */}
      <div className="absolute inset-0 bg-black/60 animate-fade-up" />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-card animate-fade-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white shadow-soft flex-shrink-0">
            <Shield size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="privacy-consent-title" className="text-base font-bold text-[var(--color-text)]">
              欢迎使用毛球日记 🐾
            </h2>
            <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
              你的数据属于你 — 我们只是宠物日记的小帮手
            </p>
          </div>
        </div>

        {/* 三大核心承诺 */}
        <div className="space-y-1.5 mb-4 px-3 py-2.5 rounded-2xl bg-[var(--bg-soft)] text-xs">
          <PromiseRow emoji="🔒">所有数据存在你的设备上,不上传服务器</PromiseRow>
          <PromiseRow emoji="📷">照片自动剥离 GPS / 拍摄时间 / 设备型号</PromiseRow>
          <PromiseRow emoji="🛡️">不接入广告 / 统计 / 第三方追踪 SDK</PromiseRow>
        </div>

        <p className="text-xs text-[var(--color-text-soft)] leading-relaxed mb-4">
          继续使用前请仔细阅读我们的
          <button
            type="button"
            onClick={() => router.push("/privacy")}
            className="text-[var(--color-primary)] font-semibold underline mx-1 inline-flex items-center gap-0.5"
          >
            《隐私政策》
            <ExternalLink size={10} />
          </button>
          和
          <button
            type="button"
            onClick={() => router.push("/terms")}
            className="text-[var(--color-primary)] font-semibold underline mx-1 inline-flex items-center gap-0.5"
          >
            《用户协议》
            <ExternalLink size={10} />
          </button>
          。
        </p>

        {/* 勾选项 */}
        <div className="space-y-2 mb-4">
          <CheckRow
            checked={agreed}
            onChange={setAgreed}
            label={
              <>
                我已阅读并同意
                <button type="button" onClick={() => router.push("/privacy")} className="text-[var(--color-primary)] underline mx-0.5">《隐私政策》</button>
              </>
            }
          />
          <CheckRow
            checked={agreedTerms}
            onChange={setAgreedTerms}
            label={
              <>
                我已阅读并同意
                <button type="button" onClick={() => router.push("/terms")} className="text-[var(--color-primary)] underline mx-0.5">《用户协议》</button>
              </>
            }
          />
        </div>

        {/* 接受按钮 */}
        <button
          type="button"
          onClick={handleAccept}
          disabled={!agreed || !agreedTerms}
          className={cn(
            "w-full py-3 rounded-full font-semibold text-sm transition-all",
            agreed && agreedTerms
              ? "bg-[var(--color-primary)] text-white active:scale-[0.98] shadow-soft"
              : "bg-[var(--color-border)] text-[var(--color-text-soft)] cursor-not-allowed"
          )}
        >
          {agreed && agreedTerms ? "开始使用毛球日记" : "请先勾选同意上方条款"}
        </button>

        {/* 不接受:残忍提示 */}
        <button
          type="button"
          onClick={handleReject}
          className="block w-full mt-2 text-[10px] text-[var(--color-text-soft)] underline"
        >
          不同意 / 暂不接受
        </button>
        <p className="text-[10px] text-center text-[var(--color-text-soft)] mt-1 px-2 leading-relaxed">
          v0.4.0 简陋版:不接受将无法使用任何功能(数据不存储)。<br />
          如希望"不存数据仍可浏览",请等待 v0.4.1(届时支持)。
        </p>
      </div>
    </div>
  );
}

function PromiseRow({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex-shrink-0 text-sm leading-tight">{emoji}</span>
      <span className="text-[var(--color-text)] flex-1 leading-snug">{children}</span>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer active:opacity-70">
      <span
        className={cn(
          "w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors mt-0.5",
          checked
            ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
            : "bg-white border-[var(--color-border)]"
        )}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-xs text-[var(--color-text)] leading-snug">{label}</span>
    </label>
  );
}
