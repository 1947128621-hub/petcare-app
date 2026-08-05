"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Crown, Sparkles, Check, X, ChevronDown, ChevronUp,
  MessageSquare, Pill, FileSearch, Stethoscope, Ban, Headphones,
  HelpCircle, ArrowLeft, Clock, Gift, AlertCircle, ChevronRight,
} from "lucide-react";
import { useAppStore, selectMembershipTier } from "@/lib/store";
import { formatDateShort, cn } from "@/lib/utils";
import { pushToast } from "@/components/Toast";
import { useConfirm } from "@/components/useConfirm";
import { AdBanner } from "@/components/AdSlot";
import PageHeader from "@/components/PageHeader";
import {
  TIER_META, TIER_CAPABILITIES, PRICE_TABLE,
  calcTrialView, generateTrialCoupon, FIRST_MONTH_COUPON_PRICE,
} from "@/lib/versions";
import type { MembershipTier } from "@/lib/types";

// ===== 6 项权益图标卡 =====
const benefitIcons = [
  { icon: MessageSquare, title: "AI 问答", desc: "免费 5 次/日,会员不限", color: "bg-[var(--color-primary-soft)]" },
  { icon: Pill, title: "药品库全开", desc: "Standard 及以上 48 款", color: "bg-[var(--color-success)]" },
  { icon: FileSearch, title: "病历分析", desc: "上传报告,AI 解读", color: "bg-[var(--color-secondary)]" },
  { icon: Stethoscope, title: "AI 角色对话", desc: "和宠物说说话", color: "bg-[var(--color-warning)]" },
  { icon: Ban, title: "减少广告", desc: "付费减 80%,Senior 0 广告", color: "bg-[var(--color-vip)]" },
  { icon: Headphones, title: "紧急联系", desc: "Senior 档常驻按钮", color: "bg-[var(--color-svip)]" },
];

// ===== FAQ =====
const faqs = [
  {
    q: "支持哪些支付方式?",
    a: "v0.4 暂为模拟支付,演示用支付宝 / 微信二维码占位。正式版将支持微信、支付宝、Apple Pay、花呗等多种支付方式。",
  },
  {
    q: "如何取消会员?",
    a: "在会员中心点击「取消会员」即可。本期到期后将自动转为免费用户,已支付的部分不会退款(按整月计费)。",
  },
  {
    q: "试用到期后,我的数据会丢失吗?",
    a: "不会。试用到期仅意味着高级功能被收回,你的宠物、记录、提醒、药品查询历史等所有数据原封不动保留。",
  },
  {
    q: "会员是否支持多设备?",
    a: "支持。同一账号在手机、平板、Web 端登录后,会员权益自动同步,历史记录和药品库也是实时的。",
  },
  {
    q: "Standard 和 Senior 的核心区别?",
    a: "功能相同,Senior 强制使用老年版(18px 大字 + 高对比),适合视力较弱或老人使用,价格也更优惠(月付 ¥12)。",
  },
];

// ===== 功能对比表 4 档 × 7 行 =====
type CompareKey = "aiQuestionsPerDay" | "drugLibrarySize" | "multiPet" | "courses" | "aiPetTalk" | "themeSwitch" | "emergencyContact";
const COMPARE_ROWS: Array<{ key: CompareKey | "adSlots"; label: string; render: (caps: typeof TIER_CAPABILITIES.free) => string }> = [
  { key: "aiQuestionsPerDay", label: "AI 问答", render: (c) => c.aiQuestionsPerDay >= 999 ? "无限" : `${c.aiQuestionsPerDay} 次/日` },
  { key: "drugLibrarySize", label: "药品库", render: (c) => c.drugLibrarySize === -1 ? "48 款全开" : c.drugLibrarySize === 0 ? "0 款" : `${c.drugLibrarySize} 款` },
  { key: "multiPet", label: "多宠物", render: (c) => c.multiPet ? "✓" : "✗" },
  { key: "courses", label: "训练课程", render: (c) => c.courses ? "✓" : "✗" },
  { key: "aiPetTalk", label: "AI 角色对话", render: (c) => c.aiPetTalk ? "✓" : "✗" },
  { key: "themeSwitch", label: "主题切换", render: (c) => c.themeSwitch ? "✓" : "✗" },
  { key: "adSlots", label: "广告位", render: (c) => `${c.adSlots} 个` },
  { key: "emergencyContact", label: "紧急联系", render: (c) => c.emergencyContact ? "✓" : "✗" },
];

export default function MembershipPage() {
  const tier = useAppStore(selectMembershipTier);
  const membership = useAppStore((s) => s.membership);
  const startTrial = useAppStore((s) => s.startTrial);
  const endTrial = useAppStore((s) => s.endTrial);
  const cancel = useAppStore((s) => s.cancelMembership);
  const confirm = useConfirm();

  // 倒计时(每 60s 刷新)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // 当前 trial 视图(若在 trial 期)
  const trialView =
    membership.tier === "trial" && membership.trialStartedAt && membership.trialEndsAt
      ? calcTrialView(membership.trialStartedAt, membership.trialEndsAt, now)
      : null;

  const isFree = tier === "free";
  const isTrial = tier === "trial";
  const isPaid = tier === "standard" || tier === "senior";

  const currentMeta = TIER_META[tier];

  // ===== 激活试用 =====
  function handleStartTrial() {
    if (tier !== "free") {
      pushToast({ kind: "info", title: "当前已是付费用户" });
      return;
    }
    startTrial();
    const range = (() => {
      const start = Date.now();
      const end = start + 3 * 24 * 60 * 60 * 1000;
      return { trialStartedAt: new Date(start).toISOString(), trialEndsAt: new Date(end).toISOString() };
    })();
    const code = generateTrialCoupon(range.trialStartedAt, range.trialEndsAt);
    pushToast({
      kind: "success",
      title: "已激活 3 天试用 🎉",
      message: `专属券:${code} · 折后 ¥16.8/月`,
    });
  }

  // ===== 取消会员 =====
  async function handleCancel() {
    const ok = await confirm({
      title: "取消会员",
      description: "到期后将自动转为免费用户,数据全部保留。",
      variant: "danger",
      confirmText: "确认取消",
    });
    if (!ok) return;
    cancel();
    pushToast({ kind: "info", title: "会员已取消", message: "到期后将自动转为免费用户" });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="会员中心" back />
      <div className="-mt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-soft)] active:opacity-60"
        >
          <ArrowLeft size={16} />
          返回
        </Link>
      </div>

      {/* ===== 当前状态卡片(根据 tier 切换) ===== */}
      {isTrial && trialView ? (
        // ----- 试用中(3 天倒计时) -----
        <section
          className={cn(
            "rounded-3xl p-5 shadow-card text-white relative overflow-hidden",
            trialView.urgency === "danger"
              ? "bg-gradient-to-br from-red-400 to-pink-500"
              : trialView.urgency === "warn"
                ? "bg-gradient-to-br from-amber-400 to-orange-500"
                : "bg-gradient-to-br from-emerald-400 to-teal-500"
          )}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={20} />
              <p className="text-xs opacity-90">当前身份</p>
            </div>
            <h2 className="text-2xl font-bold mt-1">
              试用版 · {trialView.bannerText}
            </h2>
            <p className="text-sm opacity-90 mt-1.5">
              享 Standard 全部权益,到期自动转 Free
            </p>

            {/* 倒计时大数字 */}
            <div className="flex items-baseline gap-3 mt-4">
              <div>
                <p className="text-3xl font-bold leading-none">{trialView.daysLeft}</p>
                <p className="text-[10px] opacity-80 mt-1">天</p>
              </div>
              <div>
                <p className="text-3xl font-bold leading-none">{String(trialView.hoursLeft).padStart(2, "0")}</p>
                <p className="text-[10px] opacity-80 mt-1">小时</p>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: `${Math.max(5, Math.min(100, (trialView.totalHoursLeft / 72) * 100))}%`,
                }}
              />
            </div>

            {/* CTA */}
            <div className="flex gap-2 mt-4">
              <Link
                href="/membership-v2/pay?tier=standard"
                className="flex-1 px-4 py-2.5 bg-white text-[var(--color-primary)] rounded-full font-bold text-sm shadow-soft text-center"
              >
                立即升级
              </Link>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "结束试用?",
                    description: "数据会保留,只是降级为 Free,部分高级功能会被收回。",
                    confirmText: "确认结束",
                  });
                  if (!ok) return;
                  endTrial();
                  pushToast({ kind: "info", title: "已结束试用", message: "欢迎随时重新激活" });
                }}
                className="px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-full font-medium text-xs border border-white/30"
              >
                结束试用
              </button>
            </div>

            {membership.couponCode && (
              <p className="text-[10px] opacity-90 mt-3">
                <Gift size={10} className="inline mr-1" />
                专属转化券:<span className="font-mono">{membership.couponCode}</span>(折后 ¥16.8/月)
              </p>
            )}
          </div>
        </section>
      ) : isFree ? (
        // ----- Free 用户(试用 CTA) -----
        <section className="rounded-3xl p-5 shadow-card text-white relative overflow-hidden bg-gradient-warm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
          <div className="relative">
            <p className="text-xs opacity-90">当前身份</p>
            <h2 className="text-2xl font-bold mt-1">免费版用户</h2>
            <p className="text-sm opacity-90 mt-1.5">3 天免费试用,享 Standard 全部权益</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleStartTrial}
                className="flex-1 px-5 py-2.5 bg-white text-[var(--color-primary)] rounded-full font-bold text-sm shadow-soft"
              >
                🎁 立即试用 3 天
              </button>
              <Link
                href="/membership-v2/pay?tier=standard"
                className="px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-full font-medium text-xs border border-white/30"
              >
                升级会员
              </Link>
            </div>
            <p className="text-[10px] opacity-90 mt-2">
              试用到期不删任何数据,可一键续费
            </p>
          </div>
        </section>
      ) : (
        // ----- Standard / Senior(已付费) -----
        <section
          className={cn(
            "rounded-3xl p-5 shadow-card text-white relative overflow-hidden",
            tier === "senior"
              ? "bg-gradient-to-br from-emerald-500 to-teal-500"
              : "bg-gradient-vip"
          )}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
          <div className="relative">
            <div className="flex items-center gap-2">
              {tier === "senior" ? <Sparkles size={20} /> : <Crown size={20} />}
              <p className="text-xs opacity-90">当前会员</p>
            </div>
            <h2 className="text-2xl font-bold mt-1">{currentMeta.label}</h2>
            <p className="text-sm opacity-90 mt-1.5">
              到期时间:{membership.expiresAt ? formatDateShort(membership.expiresAt) : "—"}
            </p>
            <div className="flex gap-2 mt-4">
              <Link
                href={`/membership-v2/pay?tier=${tier}`}
                className="px-4 py-2 bg-white text-[var(--color-text)] rounded-full font-bold text-xs"
              >
                续费
              </Link>
              <Link
                href="/settings/theme"
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full font-medium text-xs border border-white/30"
              >
                切换主题
              </Link>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full font-medium text-xs border border-white/30"
              >
                取消会员
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 试用临近到期的提示条(< 24h) */}
      {isTrial && trialView?.urgent && (
        <section className="rounded-2xl bg-red-50 border border-red-200 p-3 flex items-center gap-2 animate-fade-up">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">试用即将到期</p>
            <p className="text-[11px] text-red-600 mt-0.5">
              仅剩 {trialView.hoursLeft} 小时,到期后将自动转为 Free,数据保留。
            </p>
          </div>
          <Link
            href="/membership-v2/pay?tier=standard"
            className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-full font-bold flex-shrink-0"
          >
            立即续费
          </Link>
        </section>
      )}

      {/* 顶部广告(仅 free 用户) */}
      {isFree && <AdBanner />}

      {/* ===== 4 档套餐对比卡片 ===== */}
      <section>
        <h3 className="text-base font-bold text-[var(--color-text)] mb-3">选择套餐</h3>
        <div className="space-y-3">
          {(Object.keys(TIER_META) as MembershipTier[]).map((t) => {
            const meta = TIER_META[t];
            const caps = TIER_CAPABILITIES[t];
            const isCurrent = t === tier;
            const isRecommended = t === "standard";
            const isFreeCard = t === "free";
            const isTrialCard = t === "trial";
            const isPaidCard = t === "standard" || t === "senior";

            return (
              <div
                key={t}
                className={cn(
                  "relative rounded-3xl p-5 shadow-card transition-all",
                  meta.gradient
                )}
              >
                {/* 推荐徽章 */}
                {isRecommended && (
                  <div className="absolute -top-2.5 left-5 px-3 py-0.5 bg-gradient-to-r from-pink-500 to-red-500 text-white text-[10px] rounded-full font-bold shadow-soft">
                    🔥 最推荐
                  </div>
                )}

                {/* 当前徽章 */}
                {isCurrent && (
                  <div
                    className={cn(
                      "absolute top-3 right-3 px-2.5 py-0.5 text-[10px] rounded-full font-medium",
                      isFreeCard
                        ? "bg-[var(--color-text-soft)] text-white"
                        : "bg-white/30 backdrop-blur-sm text-white"
                    )}
                  >
                    当前
                  </div>
                )}

                {/* 头部:emoji + 标题 + 副标题 */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl flex-shrink-0">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={cn(
                        "text-lg font-bold",
                        isFreeCard ? "text-[var(--color-text)]" : "text-white"
                      )}
                    >
                      {meta.label}
                    </h4>
                    <p
                      className={cn(
                        "text-[11px] mt-0.5 leading-snug",
                        isFreeCard ? "text-[var(--color-text-soft)]" : "text-white/90"
                      )}
                    >
                      {meta.tagline}
                    </p>
                  </div>
                </div>

                {/* 价格区 */}
                <div className="mb-3">
                  {isFreeCard || isTrialCard ? (
                    <div className="flex items-baseline gap-1">
                      <span
                        className={cn(
                          "text-2xl font-bold",
                          isFreeCard ? "text-[var(--color-text)]" : "text-white"
                        )}
                      >
                        ¥0
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          isFreeCard ? "text-[var(--color-text-soft)]" : "text-white/80"
                        )}
                      >
                        {isTrialCard ? "/ 3 天" : "/ 永久免费"}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className={cn(
                            "text-xs",
                            isFreeCard ? "text-[var(--color-text-soft)]" : "text-white/80"
                          )}
                        >
                          ¥
                        </span>
                        <span className="text-3xl font-bold text-white">{meta.price.monthly}</span>
                        <span className="text-xs text-white/80">/月</span>
                      </div>
                      {meta.price.yearly !== null && (
                        <p className="text-[10px] text-white/80 mt-0.5">
                          年价 ¥{meta.price.yearly} · 立省 ¥
                          {PRICE_TABLE.find((p) => p.tier === t)?.yearlySave ?? 0}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 关键能力列表 */}
                <ul className="space-y-1.5 mb-4">
                  <CapsRow caps={caps} invert={isFreeCard} text="AI 问答" value={caps.aiQuestionsPerDay >= 999 ? "无限" : `${caps.aiQuestionsPerDay} 次/日`} />
                  <CapsRow caps={caps} invert={isFreeCard} text="药品库" value={caps.drugLibrarySize === -1 ? "48 款全开" : `${caps.drugLibrarySize} 款`} />
                  <CapsRow caps={caps} invert={isFreeCard} text="多宠物" yes={caps.multiPet} />
                  <CapsRow caps={caps} invert={isFreeCard} text="课程 + AI 角色" yes={caps.courses && caps.aiPetTalk} />
                  <CapsRow caps={caps} invert={isFreeCard} text="主题切换" yes={caps.themeSwitch} />
                  {caps.emergencyContact && <CapsRow caps={caps} invert={isFreeCard} text="紧急联系" yes />}
                </ul>

                {/* 按钮 */}
                {isFreeCard && (
                  <Link
                    href="/membership-v2/pay?tier=standard"
                    className="w-full py-2.5 rounded-full font-bold text-sm bg-[var(--bg-soft)] text-[var(--color-text-soft)] text-center block"
                  >
                    已是免费版
                  </Link>
                )}
                {isTrialCard && !isCurrent && (
                  <button
                    onClick={handleStartTrial}
                    className="w-full py-2.5 rounded-full font-bold text-sm bg-amber-500 text-white active:scale-[0.98] transition-all"
                  >
                    🎁 立即试用 3 天
                  </button>
                )}
                {isTrialCard && isCurrent && (
                  <div className="w-full py-2.5 rounded-full font-bold text-sm bg-amber-500/30 text-white text-center">
                    当前试用中
                  </div>
                )}
                {isPaidCard && !isCurrent && (
                  <Link
                    href={`/membership-v2/pay?tier=${t}`}
                    className="w-full py-2.5 rounded-full font-bold text-sm bg-white text-[var(--color-text)] text-center block active:scale-[0.98] transition-all"
                  >
                    开通
                  </Link>
                )}
                {isPaidCard && isCurrent && (
                  <div className="w-full py-2.5 rounded-full font-bold text-sm bg-white/30 text-white text-center">
                    当前套餐
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== 转化券条幅(Free 看到「首月 ¥18」 / Trial 看到「Standard 7 折」) ===== */}
      {isFree && (
        <section className="rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 p-4 flex items-center gap-3">
          <Gift size={24} className="text-pink-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-pink-700">首月 ¥{FIRST_MONTH_COUPON_PRICE} 体验</p>
            <p className="text-[11px] text-pink-600 mt-0.5">
              Free 升级 Standard 首月仅 ¥18(原价 ¥24),7 天内有效
            </p>
          </div>
          <Link
            href="/membership-v2/pay?tier=standard&coupon=first18"
            className="px-4 py-2 bg-pink-500 text-white text-xs rounded-full font-bold flex-shrink-0"
          >
            立即使用
          </Link>
        </section>
      )}

      {/* ===== 4 档 × 7 能力对比表 ===== */}
      <section>
        <h3 className="text-base font-bold text-[var(--color-text)] mb-3">4 档对比</h3>
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="grid grid-cols-5 text-[10px] text-[var(--color-text-soft)] font-bold border-b border-[var(--color-border)]">
            <div className="px-2 py-2.5 text-left">能力</div>
            <div className="px-1 py-2.5 text-center">Free</div>
            <div className="px-1 py-2.5 text-center">Trial</div>
            <div className="px-1 py-2.5 text-center">Standard</div>
            <div className="px-1 py-2.5 text-center">Senior</div>
          </div>
          {COMPARE_ROWS.map((row) => {
            const cells: Array<{ text: string; highlight: boolean }> = (["free", "trial", "standard", "senior"] as MembershipTier[]).map((t) => {
              const c = TIER_CAPABILITIES[t];
              const text = row.render(c);
              const highlight = t === "standard" || t === "senior";
              return { text, highlight };
            });
            return (
              <div
                key={row.key}
                className="grid grid-cols-5 text-[11px] border-b border-[var(--color-border)] last:border-0"
              >
                <div className="px-2 py-2 text-[var(--color-text)]">{row.label}</div>
                {cells.map((c, i) => (
                  <div
                    key={i}
                    className={cn(
                      "px-1 py-2 text-center",
                      c.highlight ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-text-soft)]"
                    )}
                  >
                    {c.text}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-[var(--color-text-soft)] mt-1.5 text-center">
          标价 ¥0 表示不可用 · 详细规则见 <Link href="/help" className="text-[var(--color-primary)] underline">帮助</Link>
        </p>
      </section>

      {/* ===== 权益图标卡 ===== */}
      <section>
        <h3 className="text-base font-bold text-[var(--color-text)] mb-3">会员专享权益</h3>
        <div className="grid grid-cols-2 gap-3">
          {benefitIcons.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-soft">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-2", b.color)}>
                  <Icon size={20} />
                </div>
                <h4 className="text-sm font-bold text-[var(--color-text)] mb-1">{b.title}</h4>
                <p className="text-[11px] text-[var(--color-text-soft)] leading-snug">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== 主题切换入口(已付费) ===== */}
      {isPaid && (
        <Link
          href="/settings/theme"
          className="block rounded-2xl bg-white border-2 border-[var(--color-primary)] shadow-soft p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
        >
          <span className="text-2xl">🎨</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--color-text)]">切换主题</p>
            <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
              当前:{membership.theme === "young" ? "青年版" : "老年版"} · 可自由切换
            </p>
          </div>
          <ChevronRight size={16} className="text-[var(--color-text-soft)]" />
        </Link>
      )}

      {/* ===== FAQ ===== */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={18} className="text-[var(--color-primary)]" />
          <h3 className="text-base font-bold text-[var(--color-text)]">常见问题</h3>
        </div>
        <div className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)]">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-[var(--bg-soft)]"
                >
                  <span className="text-sm font-medium text-[var(--color-text)]">{f.q}</span>
                  {open ? (
                    <ChevronUp size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
                  )}
                </button>
                {open && (
                  <div className="px-4 pb-3.5 text-xs text-[var(--color-text-soft)] leading-relaxed animate-fade-up">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ===== 内部小组件:CapsRow(能力勾选行) =====
function CapsRow({
  caps: _caps,
  invert,
  text,
  yes,
  value,
}: {
  caps: typeof TIER_CAPABILITIES.free;
  invert: boolean;       // 是否反色(白底卡片用)
  text: string;
  yes?: boolean;
  value?: string;
}) {
  const ok = yes ?? (value !== undefined && value !== "");
  return (
    <li className="flex items-start gap-2 text-xs">
      {ok ? (
        <Check size={14} className={cn("flex-shrink-0 mt-0.5", invert ? "text-[var(--color-success)]" : "text-white")} />
      ) : (
        <X size={14} className={cn("flex-shrink-0 mt-0.5 opacity-40", invert ? "text-[var(--color-text-soft)]" : "text-white")} />
      )}
      <span className={cn(ok ? "" : "opacity-60 line-through", invert ? "text-[var(--color-text)]" : "text-white")}>
        {text}
        {value && <span className="ml-1 opacity-90">({value})</span>}
      </span>
    </li>
  );
}
