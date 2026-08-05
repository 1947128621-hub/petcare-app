"use client";

// ===== v0.4.0.1 — 设置聚合页 =====
//
// 历史：v0.4.0 之前 (main)/settings/ 下只有 theme/ 和 emergency/ 两个子页，
// 没有聚合 page.tsx；从底部 nav 进 /settings 会 404。
// 本次创建此页为最小可用聚合（仅做"主题""紧急联系"两个子项入口 + 底部 admin 应急登录）。
//
// 不在范围：
// - ❌ 推送通知 / 字号 / 语言 / 关于 / 反馈 等完整设置项（v0.4.1+ 补全）

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Palette, Hospital, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <PageHeader title="设置" />

      <section className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)] overflow-hidden">
        <Link
          href="/settings/theme"
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
        >
          <Palette size={18} className="text-[var(--color-text-soft)] flex-shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm text-[var(--color-text)]">主题</p>
            <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">青年版 / 老年版</p>
          </div>
          <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
        </Link>

        <Link
          href="/settings/emergency"
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
        >
          <Hospital size={18} className="text-[var(--color-text-soft)] flex-shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm text-[var(--color-text)]">紧急联系</p>
            <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">医院 / 兽医 / 家庭电话</p>
          </div>
          <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
        </Link>
      </section>

      {/* v0.4.0.1 P0-1 位置 2 — 设置页底部 admin 应急登录入口
          比位置 1（profile 底部灰色小字）更醒目（红橙色），因为设置页更"技术"，
          点这里的用户更可能知道这是什么。依然不算"喧宾夺主"：独立一栏 + 文字。 */}
      <section className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <button
          onClick={() => router.push("/admin/emergency")}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
          aria-label="应急登录（管理员专用）"
        >
          <ShieldAlert size={18} className="text-orange-500 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm text-orange-600 font-medium">应急登录（管理员专用）</p>
            <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
              忘记 challenge 答案时使用（明文 12345，共享锁定计数器）
            </p>
          </div>
          <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
        </button>
      </section>
    </div>
  );
}
