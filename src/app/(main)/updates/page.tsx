"use client";

import { useState, useMemo } from "react";
import { X, Bell, Megaphone, Sparkles, Calendar } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDateShort, cn } from "@/lib/utils";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import PageHeader from "@/components/PageHeader";
import type { Announcement } from "@/lib/types";

type TabKey = "tips" | "announcements";

// 公告分类徽章样式
const announcementBadge = {
  update: { label: "更新", cls: "bg-blue-100 text-blue-700" },
  event: { label: "活动", cls: "bg-pink-100 text-pink-700" },
  maintenance: { label: "维护", cls: "bg-amber-100 text-amber-700" },
} as const;

// 贴士分类徽章样式
const tipBadge = {
  饮食: "bg-orange-100 text-orange-700",
  健康: "bg-green-100 text-green-700",
  行为: "bg-purple-100 text-purple-700",
  季节: "bg-amber-100 text-amber-700",
} as const;

export default function UpdatesPage() {
  const tips = useAppStore((s) => s.tips);
  const announcements = useAppStore((s) => s.announcements);
  const readTipIds = useAppStore((s) => s.readTipIds);
  const markTipRead = useAppStore((s) => s.markTipRead);
  const markAnnouncementRead = useAppStore((s) => s.markAnnouncementRead);

  const [tab, setTab] = useState<TabKey>("tips");
  const [openAnnouncement, setOpenAnnouncement] = useState<Announcement | null>(null);

  // 按 publishedAt 倒序
  const sortedTips = useMemo(
    () => [...tips].sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1)),
    [tips]
  );
  const sortedAnnouncements = useMemo(
    () => [...announcements].sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1)),
    [announcements]
  );

  // 今日贴士（取最新一条作为今日）
  const todayTip = sortedTips[0];

  // 未读公告数（仅做 tab 角标用）
  const unreadAnnouncementCount = sortedAnnouncements.filter(
    (a) => !readTipIds.length // intentionally simplified
  ).length;
  // 实际上查 readAnnouncementIds
  const readAnnouncementIds = useAppStore((s) => s.readAnnouncementIds);
  const unreadAnnouncementCount2 = sortedAnnouncements.filter(
    (a) => !readAnnouncementIds.includes(a.id)
  ).length;

  function handleClickTip(id: string) {
    if (!readTipIds.includes(id)) {
      markTipRead(id);
    }
  }

  function handleClickAnnouncement(a: Announcement) {
    markAnnouncementRead(a.id);
    setOpenAnnouncement(a);
  }

  return (
    <div className="space-y-4">
      {/* 顶部 PageHeader */}
      <PageHeader title="小贴士 & 公告" subtitle="每天学一点，宠物更健康" />

      {/* Tab 切换 */}
      <div className="flex gap-2 px-1">
        <button
          onClick={() => setTab("tips")}
          className={cn(
            "flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all",
            tab === "tips"
              ? "bg-gradient-warm text-white shadow-soft"
              : "bg-white text-[var(--color-text-soft)] border border-[var(--color-border)]"
          )}
        >
          <Bell size={14} className="inline-block mr-1 -mt-0.5" />
          每日小贴士
          {sortedTips.filter((t) => !readTipIds.includes(t.id)).length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-[var(--color-danger)] text-white text-[10px] rounded-full">
              {sortedTips.filter((t) => !readTipIds.includes(t.id)).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("announcements")}
          className={cn(
            "flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all",
            tab === "announcements"
              ? "bg-gradient-warm text-white shadow-soft"
              : "bg-white text-[var(--color-text-soft)] border border-[var(--color-border)]"
          )}
        >
          <Megaphone size={14} className="inline-block mr-1 -mt-0.5" />
          系统公告
          {unreadAnnouncementCount2 > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-[var(--color-danger)] text-white text-[10px] rounded-full">
              {unreadAnnouncementCount2}
            </span>
          )}
        </button>
      </div>

      {/* 每日小贴士 Tab */}
      {tab === "tips" && (
        <div className="space-y-3">
          {/* 今日小贴士（特殊金色高亮） */}
          {todayTip && (
            <div className="relative rounded-3xl p-5 shadow-card overflow-hidden bg-gradient-to-br from-[#f4c063] via-[#ff8c5a] to-[#f5a8b8] text-white">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-12 -mt-12" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} />
                  <span className="text-xs font-bold tracking-wider">今日小贴士</span>
                  <span className="text-[10px] px-2 py-0.5 bg-white/25 backdrop-blur-sm rounded-full">
                    {todayTip.category}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-5xl flex-shrink-0">{todayTip.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg leading-tight mb-1.5">{todayTip.title}</h3>
                    <p className="text-sm opacity-95 leading-relaxed">{todayTip.content}</p>
                    <p className="text-[10px] opacity-80 mt-2 flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDateShort(todayTip.publishedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 往期贴士列表 */}
          <div className="space-y-2.5">
            {sortedTips.slice(1).map((t) => {
              const isUnread = !readTipIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => handleClickTip(t.id)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-soft flex items-start gap-3 active:scale-[0.99] transition-transform relative"
                >
                  {isUnread && (
                    <span className="absolute top-3 right-3 w-2 h-2 bg-[var(--color-danger)] rounded-full" />
                  )}
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-soft)] flex items-center justify-center text-2xl flex-shrink-0">
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h4 className="text-sm font-bold text-[var(--color-text)] truncate">{t.title}</h4>
                    </div>
                    <p className="text-xs text-[var(--color-text-soft)] leading-relaxed line-clamp-2">
                      {t.content}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          tipBadge[t.category]
                        )}
                      >
                        {t.category}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-soft)]">
                        {formatDateShort(t.publishedAt)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <AdBottom />
        </div>
      )}

      {/* 系统公告 Tab */}
      {tab === "announcements" && (
        <div className="space-y-2.5">
          {sortedAnnouncements.map((a) => {
            const badge = announcementBadge[a.type];
            const isUnread = !readAnnouncementIds.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => handleClickAnnouncement(a)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-soft active:scale-[0.99] transition-transform relative"
              >
                {isUnread && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-[var(--color-danger)] rounded-full" />
                )}
                <div className="flex items-start gap-2.5 mb-1.5">
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded font-medium flex-shrink-0 mt-0.5"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-[10px] font-medium",
                        badge.cls
                      )}
                    >
                      {badge.label}
                    </span>
                  </span>
                  {a.version && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-text)] text-white font-mono flex-shrink-0 mt-0.5">
                      v{a.version}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-[var(--color-text)] mb-1">{a.title}</h4>
                <p className="text-xs text-[var(--color-text-soft)] line-clamp-2 leading-relaxed">
                  {a.content}
                </p>
                <p className="text-[10px] text-[var(--color-text-soft)] mt-1.5 flex items-center gap-1">
                  <Calendar size={10} />
                  {formatDateShort(a.publishedAt)}
                </p>
              </button>
            );
          })}

          {sortedAnnouncements.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--color-text-soft)]">
              暂无公告
            </div>
          )}

          <AdBottom />
        </div>
      )}

      {/* 公告详情 Modal */}
      {openAnnouncement && (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenAnnouncement(null)} />
          <div className="relative w-full sm:max-w-sm bg-white sm:rounded-3xl rounded-t-3xl shadow-card max-h-[80vh] flex flex-col animate-fade-up">
            <div className="bg-gradient-warm p-5 text-white relative">
              <button
                onClick={() => setOpenAnnouncement(null)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-white/25 backdrop-blur-sm"
                  )}
                >
                  {announcementBadge[openAnnouncement.type].label}
                </span>
                {openAnnouncement.version && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/25 backdrop-blur-sm font-mono">
                    v{openAnnouncement.version}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold pr-8">{openAnnouncement.title}</h2>
              <p className="text-[11px] opacity-90 mt-1.5">
                发布时间：{formatDateShort(openAnnouncement.publishedAt)}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-5 text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-line">
              {openAnnouncement.content}
            </div>
            <div className="p-4 border-t border-[var(--color-border)]">
              <button
                onClick={() => setOpenAnnouncement(null)}
                className="w-full py-2.5 rounded-full bg-gradient-warm text-white text-sm font-bold"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
