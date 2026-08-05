"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Camera, MessageCircle, Pill, BookOpen, Plus, ChevronRight,
  TrendingUp, Sparkles, Heart, Scale, FileText, Syringe,
  Calendar, Activity, MapPin, Beef, Bell, Trophy, Coins, Palette,
} from "lucide-react";
import { useAppStore, selectMembershipTier } from "@/lib/store";
import { AdBanner, AdBottom, AdSidebar } from "@/components/AdSlot";
// v0.4.0 — 6 个合作位占位
import PartnerSlot from "@/components/PartnerSlot";
import { formatDate, speciesEmoji, speciesLabel } from "@/lib/utils";
import type { DecorationState } from "@/lib/types";

const typeIcon = { photo: Camera, weight: Scale, medical: Syringe, note: FileText };

const DECORATION_STORAGE_KEY = "petcare-decoration-v1";
const DEFAULT_DECORATION: DecorationState = { colorTheme: "default", bgImage: "none" };

export default function HomePage() {
  const pets = useAppStore((s) => s.pets);
  const records = useAppStore((s) => s.records);
  const tips = useAppStore((s) => s.tips);
  const announcements = useAppStore((s) => s.announcements);
  const reminders = useAppStore((s) => s.reminders);
  const healthChecks = useAppStore((s) => s.healthChecks);
  const walkLogs = useAppStore((s) => s.walkLogs);
  const tier = useAppStore(selectMembershipTier);
  const points = useAppStore((s) => s.membership.points);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id || null);
  const currentPet = useMemo(() => pets.find((p) => p.id === selectedPetId) || pets[0], [pets, selectedPetId]);

  // v0.4.0.2 P1-6 — 装扮状态(localStorage 持久化)
  const [decoration, setDecoration] = useState<DecorationState>(DEFAULT_DECORATION);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DECORATION_STORAGE_KEY);
      if (raw) setDecoration({ ...DEFAULT_DECORATION, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  // 装扮 class 映射(简单实现;按 data-attr 注入到 root)
  const colorThemeClass = useMemo(() => {
    switch (decoration.colorTheme) {
      case "warm":
        return { primary: "#f43f5e", primarySoft: "#fda4af" };
      case "cool":
        return { primary: "#10b981", primarySoft: "#6ee7b7" };
      default:
        return null;
    }
  }, [decoration.colorTheme]);

  const petRecords = useMemo(
    () => (currentPet ? records.filter((r) => r.petId === currentPet.id).slice(0, 5) : []),
    [records, currentPet]
  );

  // v0.4.0.2.1 修复 hydration mismatch:用 useState + useEffect 而非 useMemo + new Date()
  // (server render 时 new Date() 跟 client runtime 不同 → text node mismatch → Tauri 黑屏)
  const [todayTip, setTodayTip] = useState(tips[0]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tips.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const found = tips.find((t) => t.publishedAt === today) || tips[0];
    setTodayTip(found);
  }, [tips]);

  const unreadAnnouncements = announcements.filter((n) => n.publishedAt > "2026-08-01").slice(0, 2);

  // v0.2 提醒 + 打卡快览
  const upcomingReminders = useMemo(
    () => reminders.filter((r) => r.active).sort((a, b) => a.nextAt.localeCompare(b.nextAt)).slice(0, 3),
    [reminders]
  );
  // v0.4.0.2.1 hydration 安全:server render 时 today=空字符串,filter 全部 0;client useEffect 跑后 set 才更新
  const [todayCheckins, setTodayCheckins] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date().toISOString().slice(0, 10);
    const hc = healthChecks.filter((c) => c.createdAt.startsWith(today)).length;
    const wl = walkLogs.filter((w) => w.createdAt.startsWith(today)).length;
    setTodayCheckins(hc + wl);
  }, [healthChecks, walkLogs]);

  return (
    <div
      className="space-y-5"
      style={colorThemeClass ? ({
        // v0.4.0.2 P1-6 — 装扮色覆盖(MVP:仅改主色)
        ["--color-primary" as any]: colorThemeClass.primary,
        ["--color-primary-soft" as any]: colorThemeClass.primarySoft,
      } as React.CSSProperties) : undefined}
    >
      {/* 顶部欢迎 + 会员状态 + 积分(v0.4.0.2 P1-6) */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-[var(--color-text-soft)]">下午好 ☀️</p>
          <h1 className="text-2xl font-bold text-[var(--color-text)] mt-0.5">
            毛球日记
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 积分卡 */}
          <Link
            href="/points-shop"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold shadow-soft active:scale-95 transition-transform"
          >
            <Coins size={13} />
            {points}
          </Link>
          {/* 装扮入口 */}
          <Link
            href="/points-shop"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text-soft)] active:scale-95 transition-transform"
            aria-label="装扮"
          >
            <Palette size={15} />
          </Link>
          {/* 会员状态 */}
          {tier === "free" ? (
            <Link
              href="/membership"
              className="px-3 py-1.5 rounded-full bg-gradient-vip text-white text-xs font-bold shadow-soft flex items-center gap-1"
            >
              <Sparkles size={14} />
              开通会员
            </Link>
          ) : (
            <Link
              href="/membership"
              className={`px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-soft flex items-center gap-1 ${
                tier === "senior"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                  : tier === "trial"
                    ? "bg-gradient-to-br from-amber-400 to-orange-500"
                    : "bg-gradient-vip"
              }`}
            >
              <Sparkles size={14} />
              {tier.toUpperCase()}
            </Link>
          )}
        </div>
      </div>

      {/* 广告 banner */}
      {tier === "free" && <AdBanner />}

      {/* v0.4.0 — 合作位:我的保险(home 中部卡片) */}
      <PartnerSlot type="insurance" />

      {/* 宠物选择栏 */}
      {pets.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {pets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPetId(p.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedPetId === p.id
                  ? "bg-[var(--color-primary)] text-white shadow-soft"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              }`}
            >
              <span className="mr-1.5">{p.avatar}</span>
              {p.name}
            </button>
          ))}
          <Link
            href="/pets/new"
            className="flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-[var(--bg-soft)] text-[var(--color-text-soft)] border border-dashed border-[var(--color-border)]"
          >
            <Plus size={14} />
            添加宠物
          </Link>
        </div>
      ) : (
        <Link
          href="/pets/new"
          className="block p-6 rounded-3xl bg-gradient-warm text-white shadow-card text-center"
        >
          <div className="text-5xl mb-2">🐾</div>
          <h3 className="text-lg font-bold">添加你的第一只宠物</h3>
          <p className="text-sm opacity-90 mt-1">开始记录你们的每一天</p>
        </Link>
      )}

      {/* 当前宠物 Hero 卡片 */}
      {currentPet && (
        <Link
          href={`/pets/${currentPet.id}`}
          className="block rounded-3xl bg-white p-5 shadow-card hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-warm flex items-center justify-center text-4xl flex-shrink-0">
              {currentPet.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--color-text)] truncate">
                  {currentPet.name}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)] font-medium">
                  {speciesLabel(currentPet.species)}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-soft)] mt-0.5">
                {currentPet.breed} · {currentPet.age} 岁 · {currentPet.weight}kg
              </p>
              <div className="flex gap-3 mt-2">
                <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-soft)]">
                  <Heart size={11} className="text-[var(--color-secondary)]" />
                  {petRecords.length} 条记录
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-soft)]">
                  <TrendingUp size={11} className="text-[var(--color-success)]" />
                  健康
                </span>
              </div>
            </div>
            <ChevronRight size={20} className="text-[var(--color-text-soft)] flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* 快捷功能入口 — 12 个（v0.1 + v0.2 + v0.3 各 4 个） */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: "/qa", icon: MessageCircle, label: "AI 问答", color: "bg-[var(--color-primary-soft)] text-white" },
          { href: currentPet ? `/pets/${currentPet.id}?action=photo` : "/pets", icon: Camera, label: "拍照", color: "bg-[var(--color-secondary)] text-white" },
          { href: "/medicine", icon: Pill, label: "药品", color: "bg-[var(--color-success)] text-white" },
          { href: "/updates", icon: BookOpen, label: "小贴士", color: "bg-[var(--color-warning)] text-white" },
          { href: "/reminders", icon: Calendar, label: "提醒", color: "bg-[var(--color-primary)] text-white" },
          { href: "/checkin", icon: Activity, label: "打卡", color: "bg-[var(--color-secondary)] text-white" },
          { href: "/places", icon: MapPin, label: "附近", color: "bg-[var(--color-success)] text-white" },
          { href: "/food", icon: Beef, label: "查粮", color: "bg-[var(--color-warning)] text-white" },
          { href: "/tasks", icon: Trophy, label: "任务", color: "bg-[var(--color-primary)] text-white" },
          { href: "/courses", icon: BookOpen, label: "训练", color: "bg-[var(--color-success)] text-white" },
          { href: "/pet-talk", icon: Heart, label: "说话", color: "bg-[var(--color-secondary)] text-white" },
          { href: "/report", icon: FileText, label: "报告", color: "bg-[var(--color-warning)] text-white" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center shadow-soft`}>
                <Icon size={24} />
              </div>
              <span className="text-xs text-[var(--color-text)] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 最新记录时间线 */}
      {petRecords.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[var(--color-text)]">最近记录</h3>
            <Link href={`/pets/${currentPet?.id}`} className="text-xs text-[var(--color-primary)] flex items-center gap-0.5">
              查看全部 <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {petRecords.map((r) => {
              const Icon = typeIcon[r.type] || FileText;
              return (
                <div key={r.id} className="bg-white rounded-2xl p-3.5 flex items-start gap-3 shadow-soft">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-soft)] flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">{r.title}</h4>
                    <p className="text-xs text-[var(--color-text-soft)] mt-0.5 line-clamp-2">{r.content}</p>
                    <p className="text-[10px] text-[var(--color-text-soft)] mt-1" suppressHydrationWarning>{formatDate(r.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 今日小贴士 */}
      {todayTip && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[var(--color-text)]">今日小贴士</h3>
            <Link href="/updates" className="text-xs text-[var(--color-primary)] flex items-center gap-0.5">
              更多 <ChevronRight size={12} />
            </Link>
          </div>
          <div className="rounded-3xl bg-gradient-warm text-white p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{todayTip.icon}</span>
              <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full">{todayTip.category}</span>
            </div>
            <h4 className="font-bold text-base mb-1.5">{todayTip.title}</h4>
            <p className="text-sm opacity-95 leading-relaxed">{todayTip.content}</p>
          </div>
        </section>
      )}

      {/* 今日提醒 + 打卡快览 */}
      {(upcomingReminders.length > 0 || todayCheckins > 0) && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[var(--color-text)]">今日</h3>
            <Link href="/reminders" className="text-xs text-[var(--color-primary)] flex items-center gap-0.5">
              提醒中心 <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* 提醒卡 */}
            <Link href="/reminders" className="bg-white rounded-2xl p-3.5 shadow-soft active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-2 mb-1.5">
                <Bell size={16} className="text-[var(--color-warning)]" />
                <span className="text-xs text-[var(--color-text-soft)]">待办提醒</span>
              </div>
              {upcomingReminders[0] ? (
                <>
                  <p className="text-sm font-bold text-[var(--color-text)] truncate">{upcomingReminders[0].title}</p>
                  <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5" suppressHydrationWarning>{formatDate(upcomingReminders[0].nextAt)}</p>
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-soft)]">暂无待办</p>
              )}
            </Link>
            {/* 打卡卡 */}
            <Link href="/checkin" className="bg-white rounded-2xl p-3.5 shadow-soft active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity size={16} className="text-[var(--color-secondary)]" />
                <span className="text-xs text-[var(--color-text-soft)]">今日打卡</span>
              </div>
              <p className="text-sm font-bold text-[var(--color-text)]">
                {todayCheckins > 0 ? `${todayCheckins} 次` : "还没打卡"}
              </p>
              <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5">
                {todayCheckins >= 3 ? "🔥 连续打卡" : "坚持就是胜利"}
              </p>
            </Link>
          </div>
        </section>
      )}

      {/* 系统公告 */}
      {unreadAnnouncements.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[var(--color-text)]">最新动态</h3>
          </div>
          <div className="space-y-2">
            {unreadAnnouncements.map((n) => (
              <Link
                key={n.id}
                href="/updates"
                className="block bg-white rounded-2xl p-3.5 shadow-soft hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-white font-medium flex-shrink-0 mt-0.5">
                    {n.type === "update" ? "更新" : n.type === "event" ? "活动" : "公告"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--color-text)]">{n.title}</h4>
                    <p className="text-xs text-[var(--color-text-soft)] mt-0.5 line-clamp-1">{n.content}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 底部广告 */}
      <AdBottom />

      {/* v0.4.0 — 合作位:限时特价活动(home 底部 banner 入口;modal 弹窗在 AppShell) */}
      <PartnerSlot type="special-offer" variant="banner" />

      {/* 侧栏广告（移动端显示在底部） */}
      <AdSidebar />
    </div>
  );
}
