"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, PawPrint, MessageCircle, Bell, Crown, Sparkles,
  ShieldCheck, Settings, Bell as BellIcon, Palette, Trash2, Info,
  LogOut, Calendar, Activity, Footprints, TrendingUp, MapPin, Beef, Share2,
  Trophy, FileText, Heart, BookOpen, RefreshCw, Coins,
} from "lucide-react";
import { useAppStore, selectMembershipTier } from "@/lib/store";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useConfirm } from "@/components/useConfirm";
import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/utils";

type SettingsKey = "notif" | "theme" | "cache" | null;

export default function ProfilePage() {
  const router = useRouter();
  const pets = useAppStore((s) => s.pets);
  const records = useAppStore((s) => s.records);
  const chats = useAppStore((s) => s.chats);
  const reminders = useAppStore((s) => s.reminders);
  const healthChecks = useAppStore((s) => s.healthChecks);
  const walkLogs = useAppStore((s) => s.walkLogs);
  const foodChecks = useAppStore((s) => s.foodChecks);
  const tier = useAppStore(selectMembershipTier);
  const points = useAppStore((s) => s.membership.points);
  const clearChats = useAppStore((s) => s.clearChats);
  const confirm = useConfirm();

  const [openSettings, setOpenSettings] = useState<SettingsKey>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  async function handleClearCache() {
    const ok = await confirm({ title: "清除本地缓存", description: "该操作不可恢复，将删除所有本地数据。", variant: "danger", confirmText: "清除" });
    if (!ok) return;
    try {
      // 仅清业务数据缓存
      localStorage.removeItem("petcare-app-state-v1");
      pushToast({ kind: "success", title: "缓存已清除", message: "请刷新页面查看效果" });
    } catch {
      pushToast({ kind: "error", title: "清除失败", message: "请检查浏览器权限" });
    }
  }

  async function handleLogout() {
    const ok = await confirm({ title: "退出登录", description: "演示版仅清空聊天记录。", confirmText: "退出" });
    if (!ok) return;
    clearChats();
    pushToast({ kind: "info", title: "已退出登录", message: "期待下次相见 👋" });
  }

  return (
    <div className="space-y-4">
      {/* 顶部 PageHeader */}
      <PageHeader title="我的" />

      {/* 用户卡片 */}
      <Link
        href="/membership"
        className={cn(
          "block rounded-3xl p-5 shadow-card text-white relative overflow-hidden active:scale-[0.99] transition-transform",
          tier === "senior"
            ? "bg-gradient-to-br from-emerald-500 to-teal-500"
            : tier === "trial"
              ? "bg-gradient-to-br from-amber-400 to-orange-500"
              : tier === "standard"
                ? "bg-gradient-vip"
                : "bg-gradient-warm"
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl flex-shrink-0 border-2 border-white/40">
            🐾
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold truncate">爱宠家长</h2>
              {tier !== "free" && (
                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-white/25 backdrop-blur-sm text-white text-[10px] rounded-full font-bold">
                  {tier === "senior" ? <Sparkles size={10} /> : <Crown size={10} />}
                  {tier.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs opacity-90 mt-1">
              {tier === "free" ? "点击开通会员，解锁更多权益" : "查看会员权益 →"}
            </p>
          </div>
          <ChevronRight size={20} className="text-white/80 flex-shrink-0" />
        </div>
      </Link>

      {/* 数据统计 — 6 个数据维度 */}
      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "宠物", value: pets.length, icon: PawPrint, color: "text-[var(--color-primary)]" },
          { label: "记录", value: records.length, icon: Bell, color: "text-[var(--color-success)]" },
          { label: "问答", value: chats.length, icon: MessageCircle, color: "text-[var(--color-secondary)]" },
          { label: "提醒", value: reminders.length, icon: Calendar, color: "text-[var(--color-warning)]" },
          { label: "打卡", value: healthChecks.length + walkLogs.length, icon: Activity, color: "text-[var(--color-primary)]" },
          { label: "查询", value: foodChecks.length, icon: Beef, color: "text-[var(--color-danger)]" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl p-3 shadow-soft text-center">
              <Icon size={18} className={cn("mx-auto mb-1", s.color)} />
              <p className="text-xl font-bold text-[var(--color-text)]">{s.value}</p>
              <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </section>

      {/* 功能列表 */}
      <section className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)] overflow-hidden">
        <MenuItem href="/pets" icon={PawPrint} label="我的宠物" />
        <MenuItem href="/qa/history" icon={MessageCircle} label="AI 问答历史" />
        <MenuItem href="/updates" icon={BellIcon} label="每日小贴士" />
        <MenuItem href="/membership" icon={Crown} label="会员中心" />
      </section>

      {/* v0.2 新功能 */}
      <section className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-2 bg-[var(--bg-soft)]/50">
          <p className="text-[10px] font-bold text-[var(--color-primary)] tracking-wider">🆕 v0.2 新增</p>
        </div>
        <MenuItem href="/reminders" icon={Calendar} label="提醒中心" badge={reminders.length > 0 ? `${reminders.length}条` : undefined} />
        <MenuItem href="/checkin" icon={Activity} label="每日打卡" badge={healthChecks.length + walkLogs.length > 0 ? `${healthChecks.length + walkLogs.length}次` : undefined} />
        <MenuItem href="/places" icon={MapPin} label="附近医院/宠物店" />
        <MenuItem href="/food" icon={Beef} label="食物成分查询" />
      </section>

      {/* v0.3 新功能 */}
      <section className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-2 bg-[var(--bg-soft)]/50">
          <p className="text-[10px] font-bold text-[var(--color-primary)] tracking-wider">🆕 v0.3 新增</p>
        </div>
        <MenuItem href="/tasks" icon={Trophy} label="每日任务" />
        <MenuItem href="/courses" icon={BookOpen} label="训练课程" />
        <MenuItem href="/achievements" icon={Sparkles} label="成就墙" />
        <MenuItem href="/pet-talk" icon={Heart} label="和宠物说话" />
        <MenuItem href="/age-converter" icon={Sparkles} label="年龄换算器" />
        <MenuItem href="/report" icon={FileText} label="成长报告" />
      </section>

      {/* v0.4.0.2 P1-6 — 积分 + 装扮 */}
      <section className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-2 bg-[var(--bg-soft)]/50">
          <p className="text-[10px] font-bold text-[var(--color-primary)] tracking-wider">✨ v0.4.0.2 新增</p>
        </div>
        <Link
          href="/points-shop"
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
        >
          <Coins size={18} className="text-amber-500 flex-shrink-0" />
          <span className="flex-1 text-sm text-[var(--color-text)] text-left">装扮商店 · 积分</span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full font-bold flex items-center gap-0.5">
            <Coins size={9} />
            {points}
          </span>
          <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
        </Link>
      </section>

      {/* 系统 */}
      <section className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)] overflow-hidden">
        <MenuItem href="/update" icon={RefreshCw} label="应用更新" />
        <Link
          href="/admin"
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
        >
          <ShieldCheck size={18} className="text-[var(--color-text-soft)] flex-shrink-0" />
          <span className="flex-1 text-sm text-[var(--color-text)] text-left">运营后台</span>
          <span className="px-2 py-0.5 bg-[var(--color-warning)] text-white text-[10px] rounded-full font-medium">
            运营
          </span>
          <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
        </Link>
      </section>

      {/* 设置（可展开） */}
      <section className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <button
          onClick={() => setOpenSettings(openSettings === "notif" || openSettings === "theme" || openSettings === "cache" ? null : "notif")}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
        >
          <Settings size={18} className="text-[var(--color-text-soft)] flex-shrink-0" />
          <span className="flex-1 text-sm text-[var(--color-text)] text-left">设置</span>
          <ChevronRight
            size={16}
            className={cn(
              "text-[var(--color-text-soft)] flex-shrink-0 transition-transform",
              openSettings && "rotate-90"
            )}
          />
        </button>

        {openSettings && (
          <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)] bg-[var(--bg-soft)]/50">
            {/* 通知 */}
            <div className="flex items-center gap-3 px-4 py-3">
              <BellIcon size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)]">消息通知</p>
                <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
                  {notifEnabled ? "已开启" : "已关闭"}
                </p>
              </div>
              <button
                onClick={() => {
                  setNotifEnabled(!notifEnabled);
                  pushToast({ kind: "info", title: notifEnabled ? "已关闭通知" : "已开启通知" });
                }}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative",
                  notifEnabled ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                    notifEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            {/* 主题 —— v0.4.0 跳独立主题切换页(替代 v0.1 的占位 light/dark/system 切换) */}
            <Link
              href="/settings/theme"
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-[var(--bg-soft)]"
            >
              <Palette size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm text-[var(--color-text)]">主题</p>
                <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
                  {tier === "free" ? "会员专享" : "青年版 / 老年版"}
                </p>
              </div>
              <span className="text-[10px] text-[var(--color-text-soft)]">
                {/* 主题显示名 */}
                {/* 拿 store 真值 —— 但这里 useState(theme) 是 v0.1 占位,先显示固定文案 */}
                点击切换
              </span>
              <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
            </Link>

            {/* 清除缓存 */}
            <button
              onClick={handleClearCache}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-[var(--bg-soft)]"
            >
              <Trash2 size={16} className="text-[var(--color-danger)] flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm text-[var(--color-danger)]">清除缓存</p>
                <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
                  清除本地存储（宠物 / 记录 / 会员等）
                </p>
              </div>
              <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
            </button>
          </div>
        )}
      </section>

      {/* 关于我们 + 退出登录 */}
      <section className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)] overflow-hidden">
        <button
          onClick={() => setShowAbout(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
        >
          <Info size={18} className="text-[var(--color-text-soft)] flex-shrink-0" />
          <span className="flex-1 text-sm text-[var(--color-text)] text-left">关于我们</span>
          <span className="text-[10px] text-[var(--color-text-soft)]">v0.1.0</span>
          <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
        </button>

        {/* v0.4.0 F-SEC-04:profile 底部加隐私政策 + 用户协议链接(MUST-05 配套) */}
        <Link
          href="/privacy"
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
        >
          <ShieldCheck size={18} className="text-[var(--color-text-soft)] flex-shrink-0" />
          <span className="flex-1 text-sm text-[var(--color-text)] text-left">隐私政策</span>
          <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
        </Link>
        <Link
          href="/terms"
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
        >
          <FileText size={18} className="text-[var(--color-text-soft)] flex-shrink-0" />
          <span className="flex-1 text-sm text-[var(--color-text)] text-left">用户协议</span>
          <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
        </Link>

        {/* v0.4.0.2 P0-1 — 管理员登录按钮放在「退出登录」之前(用户截图证明 v0.4.0.1 的底部位置太靠后易被忽略)
            保持 12px 灰色 + 不喧宾夺主,但加一个浅灰背景块确保绝对可见(对比度 OK,用户能直接看到) */}
        <button
          onClick={() => router.push("/admin/challenge")}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[var(--bg-soft)] active:bg-[var(--color-border)]/40"
          aria-label="管理员登录"
        >
          <span className="text-xs">🔧</span>
          <span className="text-xs text-[var(--color-text-soft)] font-medium">管理员登录</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
        >
          <LogOut size={18} className="text-[var(--color-danger)] flex-shrink-0" />
          <span className="flex-1 text-sm text-[var(--color-danger)] text-left">退出登录</span>
          <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
        </button>
      </section>

      <AdBottom />

      {/* v0.4.0.1 保留的备用入口(用户没滚到此处也已在主区域看到上面的按钮) */}
      <div className="text-center pt-2 pb-1">
        <button
          onClick={() => router.push("/admin/challenge")}
          className="text-xs text-[var(--color-text-soft)] hover:text-[var(--color-primary)] underline-offset-2 hover:underline transition-colors"
          aria-label="管理员登录(备用)"
        >
          🔧 管理员登录
        </button>
      </div>

      {/* 关于 Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAbout(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-card overflow-hidden animate-fade-up">
            <button
              onClick={() => setShowAbout(false)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
            >
              ✕
            </button>
            <div className="p-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-warm flex items-center justify-center text-4xl mb-3 shadow-card">
                🐾
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text)]">毛球日记</h2>
              <p className="text-xs text-[var(--color-text-soft)] mt-1">v0.1.0 · 演示版</p>
              <div className="mt-5 text-left bg-[var(--bg-soft)] rounded-2xl p-4 space-y-1.5 text-xs text-[var(--color-text-soft)]">
                <p>· 温暖治愈的宠物记录 App</p>
                <p>· AI 智能问答 + 药品库</p>
                <p>· 持续更新机制（每日小贴士 + 公告）</p>
                <p>· 数据本地存储，保护隐私</p>
              </div>
              <p className="text-[10px] text-[var(--color-text-soft)] mt-5 opacity-60">
                © 2026 毛球日记 · 仅供演示
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== 内部小组件 ======
function MenuItem({ href, icon: Icon, label, badge }: { href: string; icon: typeof ChevronRight; label: string; badge?: string }) {
  return (
    <Link
      href={href}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-soft)]"
    >
      <Icon size={18} className="text-[var(--color-text-soft)] flex-shrink-0" />
      <span className="flex-1 text-sm text-[var(--color-text)] text-left">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 bg-[var(--color-primary)] text-white text-[10px] rounded-full font-medium">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
    </Link>
  );
}
