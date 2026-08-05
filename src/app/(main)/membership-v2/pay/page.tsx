"use client";

import { Suspense, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Check, X, QrCode, Gift, Crown, Sparkles, AlertCircle,
} from "lucide-react";
import { useAppStore, selectMembershipTier } from "@/lib/store";
import { PRICE_TABLE, TIER_META, FIRST_MONTH_COUPON_PRICE, TRIAL_COUPON_DISCOUNT } from "@/lib/versions";
import { formatDateShort, cn } from "@/lib/utils";
import { pushToast } from "@/components/Toast";
import PageHeader from "@/components/PageHeader";
import type { MembershipTier } from "@/lib/types";

type Period = "monthly" | "yearly";
type PayMethod = "alipay" | "wechat";
type CouponKind = "none" | "trial7" | "first18";

/** 有效付费档(Standard / Senior) */
const PAID_TIERS: Array<Exclude<MembershipTier, "free" | "trial">> = ["standard", "senior"];

// ===== 默认导出:Suspense 包裹(Next.js 16 要求 useSearchParams 必须在 Suspense 边界内) =====
export default function PayPage() {
  return (
    <Suspense fallback={<PayPageSkeleton />}>
      <PayPageInner />
    </Suspense>
  );
}

function PayPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeader title="开通会员" back />
      <div className="rounded-3xl bg-[var(--bg-soft)] h-40 animate-pulse" />
      <div className="rounded-2xl bg-[var(--bg-soft)] h-20 animate-pulse" />
      <div className="rounded-2xl bg-[var(--bg-soft)] h-32 animate-pulse" />
    </div>
  );
}

function PayPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTier = searchParams.get("tier") as MembershipTier | null;
  const initialCoupon = searchParams.get("coupon") as CouponKind | null;

  // 选定档位(默认 standard)
  const [tier, setTier] = useState<Exclude<MembershipTier, "free" | "trial">>(
    initialTier === "senior" ? "senior" : "standard"
  );
  // 期间(月付 / 年付,默认月付)
  const [period, setPeriod] = useState<Period>("monthly");
  // 优惠券(URL ?coupon=first18 → 预填)
  const [coupon, setCoupon] = useState<CouponKind>(
    initialCoupon === "first18" ? "first18" : "none"
  );
  // 支付方式
  const [payMethod, setPayMethod] = useState<PayMethod>("alipay");
  // 支付进行中
  const [paying, setPaying] = useState(false);

  // 当前会话档位(trial 期间可以升级;若在 trial 内,自动应用 trial7 券)
  const currentTier = useAppStore(selectMembershipTier);
  const membership = useAppStore((s) => s.membership);
  const setMembership = useAppStore((s) => s.setMembership);

  // 若用户在 trial 内,默认套用 trial 7 折券(可手动取消)
  useMemo(() => {
    if (currentTier === "trial" && coupon === "none") {
      setCoupon("trial7");
    }
  }, [currentTier, coupon]);

  const priceRow = PRICE_TABLE.find((p) => p.tier === tier)!;
  const originalPrice = period === "monthly" ? priceRow.monthly : priceRow.yearly;
  const originalMonthly = priceRow.monthly;

  // 折后价
  const discount = useMemo(() => {
    if (coupon === "trial7") return Math.round(originalPrice * (1 - TRIAL_COUPON_DISCOUNT) * 100) / 100;
    if (coupon === "first18" && period === "monthly") return FIRST_MONTH_COUPON_PRICE;
    return originalPrice;
  }, [coupon, period, originalPrice]);

  const saving = originalPrice - discount;
  const hasDiscount = saving > 0;

  // 年付折后月均价
  const monthlyAvg = period === "yearly" ? Math.round((discount / 12) * 100) / 100 : 0;

  // ===== 确认支付(mock) =====
  function handlePay() {
    setPaying(true);
    setTimeout(() => {
      // 写 tier + 1 年/月到期 + history
      const now = new Date();
      const expires = new Date(now);
      if (period === "yearly") {
        expires.setFullYear(expires.getFullYear() + 1);
      } else {
        expires.setMonth(expires.getMonth() + 1);
      }
      setMembership(tier);
      useAppStore.setState((s) => ({
        membership: {
          ...s.membership,
          tier,
          expiresAt: expires.toISOString(),
          // Senior 档强制 senior 主题(setMembership 已处理),Standard 保持原主题
          history: [
            ...s.membership.history,
            {
              tier,
              startedAt: now.toISOString(),
              expiresAt: expires.toISOString(),
              amount: discount,
            },
          ],
        },
      }));

      pushToast({
        kind: "success",
        title: "支付成功 🎉",
        message: `${TIER_META[tier].label} ${period === "yearly" ? "年付" : "月付"}已开通,${formatDateShort(expires.toISOString())} 到期`,
      });
      setPaying(false);
      router.push("/membership");
    }, 1200);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="开通会员" back />
      <div className="-mt-2">
        <Link
          href="/membership"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-soft)] active:opacity-60"
        >
          <ArrowLeft size={16} />
          返回会员中心
        </Link>
      </div>

      {/* ===== 档位切换(Standard / Senior) ===== */}
      <section>
        <h3 className="text-base font-bold text-[var(--color-text)] mb-3">选择档位</h3>
        <div className="grid grid-cols-2 gap-3">
          {PAID_TIERS.map((t) => {
            const meta = TIER_META[t];
            const row = PRICE_TABLE.find((p) => p.tier === t)!;
            const active = t === tier;
            return (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={cn(
                  "relative rounded-2xl p-4 text-left transition-all border-2",
                  active
                    ? "border-[var(--color-primary)] shadow-card bg-white"
                    : "border-transparent bg-white/60 shadow-soft"
                )}
              >
                {active && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center">
                    <Check size={14} />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text)]">{meta.label}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--color-text-soft)] leading-snug min-h-[2.5em]">
                  {meta.tagline}
                </p>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="text-[10px] text-[var(--color-text-soft)]">¥</span>
                  <span className="text-2xl font-bold text-[var(--color-text)]">{row.monthly}</span>
                  <span className="text-[10px] text-[var(--color-text-soft)]">/月</span>
                </div>
                <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5">
                  年付 ¥{row.yearly} 立省 ¥{row.yearlySave}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== 期间 tab(月付 / 年付) ===== */}
      <section>
        <div className="flex bg-[var(--bg-soft)] rounded-full p-1">
          <button
            onClick={() => setPeriod("monthly")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-all",
              period === "monthly"
                ? "bg-white shadow-soft text-[var(--color-text)]"
                : "text-[var(--color-text-soft)]"
            )}
          >
            月付
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              period === "yearly"
                ? "bg-white shadow-soft text-[var(--color-text)]"
                : "text-[var(--color-text-soft)]"
            )}
          >
            年付
            <span className="px-1.5 py-0.5 bg-pink-500 text-white text-[9px] rounded-full font-bold">
              立省 ¥{priceRow.yearlySave}
            </span>
          </button>
        </div>
      </section>

      {/* ===== 价格详情卡 ===== */}
      <section className="rounded-3xl p-5 shadow-card text-white relative overflow-hidden bg-gradient-warm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
        <div className="relative">
          <p className="text-xs opacity-90">开通 {TIER_META[tier].label}</p>
          {hasDiscount ? (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl line-through opacity-60">¥{originalPrice}</span>
                <span className="text-xs">折后</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl">¥</span>
                <span className="text-5xl font-bold">{discount}</span>
                <span className="text-sm opacity-90">
                  / {period === "yearly" ? "年" : "月"}
                </span>
              </div>
              <p className="text-xs opacity-90 mt-2">
                立省 ¥{saving.toFixed(2)}
                {period === "yearly" && ` · 折后月均价 ¥${monthlyAvg}/月`}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl">¥</span>
                <span className="text-5xl font-bold">{originalPrice}</span>
                <span className="text-sm opacity-90">/ {period === "yearly" ? "年" : "月"}</span>
              </div>
              {period === "yearly" && (
                <p className="text-xs opacity-90 mt-2">
                  月均价 ¥{(originalPrice / 12).toFixed(2)} · 立省 ¥{priceRow.yearlySave}
                </p>
              )}
            </>
          )}

          {period === "yearly" && (
            <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-pink-500 text-white text-[10px] rounded-full font-bold shadow-soft">
              🎉 立省 35%
            </div>
          )}
        </div>
      </section>

      {/* ===== 优惠券选择 ===== */}
      <section>
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">优惠券</h3>
        <div className="space-y-2">
          <CouponRow
            active={coupon === "trial7"}
            available={currentTier === "trial" && !!membership.couponCode}
            title="试用 7 折券"
            desc={currentTier === "trial"
              ? `已激活,折后 ¥${Math.round(originalPrice * 0.7 * 100) / 100}`
              : "需在试用期内使用"}
            onClick={() => setCoupon(coupon === "trial7" ? "none" : "trial7")}
          />
          <CouponRow
            active={coupon === "first18"}
            available={tier === "standard" && period === "monthly"}
            title="首月 ¥18 体验券"
            desc={tier === "standard" && period === "monthly"
              ? "免费用户专享,首月仅 ¥18(原价 ¥24)"
              : "限 Standard 月付"}
            onClick={() => setCoupon(coupon === "first18" ? "none" : "first18")}
          />
          <CouponRow
            active={coupon === "none"}
            available
            title="不使用券"
            desc="按原价支付"
            onClick={() => setCoupon("none")}
          />
        </div>
      </section>

      {/* ===== 权益确认(本次开通可享) ===== */}
      <section>
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">开通可享</h3>
        <div className="bg-white rounded-2xl shadow-soft p-4 space-y-1.5">
          <BenefitRow text="48 款药品库全开" />
          <BenefitRow text="多宠物无限" />
          <BenefitRow text="训练课程 + AI 角色对话" />
          <BenefitRow text="主题自由切换(青年 / 老年)" />
          {tier === "senior" && <BenefitRow text="紧急联系常驻按钮" highlight />}
          <BenefitRow text="广告减 80%" />
        </div>
      </section>

      {/* ===== 支付方式 + 立即支付 ===== */}
      <section>
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">支付方式</h3>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setPayMethod("alipay")}
            className={cn(
              "flex-1 py-2.5 rounded-2xl text-sm font-medium border-2 transition-all",
              payMethod === "alipay"
                ? "border-[#1677ff] bg-blue-50 text-[#1677ff]"
                : "border-[var(--color-border)] bg-white text-[var(--color-text-soft)]"
            )}
          >
            💙 支付宝
          </button>
          <button
            onClick={() => setPayMethod("wechat")}
            className={cn(
              "flex-1 py-2.5 rounded-2xl text-sm font-medium border-2 transition-all",
              payMethod === "wechat"
                ? "border-[#07c160] bg-green-50 text-[#07c160]"
                : "border-[var(--color-border)] bg-white text-[var(--color-text-soft)]"
            )}
          >
            💚 微信支付
          </button>
        </div>

        {/* 二维码占位 */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-soft p-5">
          <div
            className={cn(
              "w-44 h-44 rounded-2xl flex items-center justify-center",
              payMethod === "alipay" ? "bg-blue-50" : "bg-green-50"
            )}
          >
            <QrCode size={120} className={payMethod === "alipay" ? "text-[#1677ff]" : "text-[#07c160]"} />
          </div>
          <p className="text-xs text-[var(--color-text-soft)] mt-3">
            请使用{payMethod === "alipay" ? "支付宝" : "微信"}扫描二维码完成支付
          </p>
          <p className="text-[10px] text-[var(--color-text-soft)] mt-1 opacity-60">
            v0.4 演示版 · 二维码为占位图
          </p>
        </div>
      </section>

      {/* 提示条(无优惠时引导到会员中心看券) */}
      {coupon === "none" && hasDiscount === false && currentTier === "free" && tier === "standard" && period === "monthly" && (
        <button
          onClick={() => setCoupon("first18")}
          className="w-full rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 p-3 flex items-center gap-2 active:scale-[0.99] transition-transform"
        >
          <Gift size={20} className="text-pink-500 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-pink-700">首月仅 ¥18!</p>
            <p className="text-[11px] text-pink-600 mt-0.5">
              点此使用「首月 ¥18 体验券」,免费用户专享
            </p>
          </div>
        </button>
      )}

      {/* 当前在试用期的提示 */}
      {currentTier === "trial" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-700">你正在试用期内</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              升级后试用剩余时长将保留(按折算),并自动应用 trial 7 折券
            </p>
          </div>
        </div>
      )}

      {/* 支付按钮(吸底) */}
      <div className="sticky bottom-2 -mx-4 px-4">
        <button
          onClick={handlePay}
          disabled={paying}
          className={cn(
            "w-full py-3.5 rounded-full font-bold text-base shadow-card transition-all",
            paying
              ? "bg-[var(--bg-soft)] text-[var(--color-text-soft)] cursor-wait"
              : "bg-gradient-warm text-white active:scale-[0.99]"
          )}
        >
          {paying ? "支付中..." : `立即支付 ¥${discount}`}
        </button>
        <p className="text-[10px] text-[var(--color-text-soft)] text-center mt-2">
          点击即表示同意《会员服务协议》
        </p>
      </div>
    </div>
  );
}

// ===== 内部小组件:CouponRow =====
function CouponRow({
  active, available, title, desc, onClick,
}: {
  active: boolean;
  available: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={available ? onClick : undefined}
      disabled={!available}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all",
        active && available
          ? "border-[var(--color-primary)] bg-pink-50"
          : available
            ? "border-[var(--color-border)] bg-white active:scale-[0.99]"
            : "border-[var(--color-border)] bg-[var(--bg-soft)] opacity-50 cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
          active && available ? "border-[var(--color-primary)] bg-[var(--color-primary)]" : "border-[var(--color-border)]"
        )}
      >
        {active && available && <Check size={12} className="text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--color-text)]">{title}</p>
        <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

// ===== 内部小组件:BenefitRow =====
function BenefitRow({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Check size={14} className={cn("flex-shrink-0", highlight ? "text-emerald-500" : "text-[var(--color-success)]")} />
      <span className={cn(highlight ? "text-emerald-700 font-bold" : "text-[var(--color-text)]")}>{text}</span>
    </div>
  );
}
