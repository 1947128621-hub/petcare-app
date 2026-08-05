"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Crown, Lock, Pill, MessageCircle, ChevronRight,
  Shield, PawPrint, FileText, Sparkles, Ban, Activity,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import PartnerSlot from "@/components/PartnerSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore, selectMembershipTier } from "@/lib/store";
import { cn, speciesLabel, speciesEmoji } from "@/lib/utils";
import { isPromotedDrug } from "@/lib/drugs/sponsored";
import type { Drug } from "@/lib/types";

// v0.4.0 改造 (实施员 3 负责):
// - 加 6 个新分类色板(心脏/肾脏/眼耳/抗感染/止痛/其他)
// - 加 推广 角标(红橙渐变小徽章)
// - 加 适应症 / 禁忌 块(新字段)
// - 底部挂 <PartnerSlot type="online-consult" /> (plan F-AD-01 #2)

const CATEGORY_COLOR: Record<Drug["category"], string> = {
  驱虫: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  疫苗: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  肠胃: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  皮肤: "bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]",
  关节: "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  营养: "bg-[var(--color-vip)]/15 text-[var(--color-vip)]",
  眼耳口: "bg-[var(--color-primary-soft)]/30 text-[var(--color-primary)]",
  心脏: "bg-rose-100 text-rose-700",
  肾脏: "bg-purple-100 text-purple-700",
  眼耳: "bg-sky-100 text-sky-700",
  抗感染: "bg-emerald-100 text-emerald-700",
  止痛: "bg-amber-100 text-amber-700",
  其他: "bg-gray-100 text-gray-700",
};


// 推广徽章:红橙渐变小标签(任务清单)
const PROMO_BADGE_CLASS = "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm";

function InfoRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-soft)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-[var(--color-primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[var(--color-text-soft)] font-medium">{label}</p>
        <div className="text-sm text-[var(--color-text)] mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function VipLockBlock() {
  return (
    <div className="relative mt-4">
      <div className="absolute -top-12 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-[var(--bg-cream)] pointer-events-none" />
      <div className="rounded-2xl bg-gradient-vip p-4 text-white shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={16} />
          <h3 className="font-bold text-sm">VIP 专属药品</h3>
        </div>
        <p className="text-xs opacity-95 leading-relaxed mb-3">
          完整药品信息(用法用量、副作用、说明、禁忌)仅 VIP / SVIP 用户可查看
        </p>
        <Link
          href="/membership"
          className="block text-center py-2 bg-white text-[var(--color-text)] rounded-full font-semibold text-sm"
        >
          开通 VIP 解锁
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  variant = "default",
  blurred = false,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  variant?: "default" | "danger";
  blurred?: boolean;
}) {
  return (
    <section className="bg-white rounded-2xl p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-2.5">
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center",
          variant === "danger" ? "bg-[var(--color-danger)]/15" : "bg-[var(--bg-soft)]"
        )}>
          <Icon size={14} className={cn(
            variant === "danger" ? "text-[var(--color-danger)]" : "text-[var(--color-primary)]"
          )} />
        </div>
        <h3 className="text-sm font-bold text-[var(--color-text)]">{title}</h3>
      </div>
      <div className={cn("text-sm leading-relaxed text-[var(--color-text)]", blurred && "blur-sm select-none pointer-events-none")}>
        {children}
      </div>
    </section>
  );
}

export default function ClientView({ id: initialId }: { id: string }) {
  const params = { id: initialId } as { id: string };
  const router = useRouter();
  const drugs = useAppStore((s) => s.drugs);
  const tier = useAppStore(selectMembershipTier);

  const drug = useMemo(() => drugs.find((d) => d.id === params?.id), [drugs, params?.id]);

  // 相似药品:同类别、排除自己、VIP 不限
  const similar = useMemo(() => {
    if (!drug) return [];
    return drugs.filter((d) => d.category === drug.category && d.id !== drug.id).slice(0, 3);
  }, [drugs, drug]);

  // VIP 锁判断
  const isFree = tier === "free";
  const isVipLocked = !!drug?.vipOnly && isFree;

  // 跳转到 AI 问答并预填
  const handleConsultAI = () => {
    if (!drug) return;
    if (typeof window !== "undefined") {
      const firstIndication = drug.indications?.[0] ?? drug.symptoms?.[0] ?? "";
      sessionStorage.setItem("qa_prefill", `关于【${drug.name}】,${firstIndication},请问怎么用?`);
    }
    router.push("/qa");
  };

  // v0.4.0 推广药 — 显示在 hero + 列表标签(本详情页只在 hero 显示一次)
  const isPromo = drug ? isPromotedDrug(drug) : false;

  if (!drug) {
    return (
      <div>
        <PageHeader title="药品详情" back />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Pill size={48} className="text-[var(--color-text-soft)] mb-3" />
          <h3 className="text-base font-bold text-[var(--color-text)] mb-1">药品不存在</h3>
          <p className="text-xs text-[var(--color-text-soft)] mb-5">该药品可能已下架</p>
          <Link
            href="/medicine"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft"
          >
            返回药品库
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="药品详情"
        subtitle={drug.category}
        back
      />

      {/* Hero 卡片 */}
      <div className="bg-white rounded-3xl p-5 shadow-card mb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-warm flex items-center justify-center text-3xl flex-shrink-0">
            💊
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--color-text)]">
                {drug.name}
              </h1>
              {/* v0.4.0 推广徽章 — 详情页 hero 顶部(红橙渐变,任务清单) */}
              {isPromo && (
                <span className={PROMO_BADGE_CLASS}>
                  <Sparkles size={9} />
                  推广
                </span>
              )}
              {drug.vipOnly && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-vip text-white font-medium flex items-center gap-0.5">
                  <Crown size={9} /> VIP
                </span>
              )}
            </div>
            <span className={cn("inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mb-2", CATEGORY_COLOR[drug.category])}>
              {drug.category}
            </span>
            {/* v0.4.0.2 P0-2 — 详情页同样不显示价格;只显示处方药提示 */}
            <div className="flex items-center gap-2 mt-1">
              {drug.prescription && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-danger)]/15 text-[var(--color-danger)] font-medium">
                  处方药
                </span>
              )}
              <span className="text-[10px] text-[var(--color-text-soft)]">
                用药请遵医嘱
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 关键信息卡 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-3 space-y-3">
        {/* 适应症 — v0.4.0 新字段(从 indications[] 取;fallback 老 symptoms) */}
        <InfoRow icon={Shield} label="适应症">
          <div className="flex flex-wrap gap-1 mt-0.5">
            {(drug.indications ?? drug.symptoms ?? []).map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-soft)] text-[var(--color-text-soft)]">
                {s}
              </span>
            ))}
          </div>
        </InfoRow>

        <InfoRow icon={PawPrint} label="适用动物">
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {drug.forSpecies.map((s) => (
              <span key={s} className="inline-flex items-center gap-0.5 text-xs">
                <span>{speciesEmoji(s)}</span>
                {speciesLabel(s)}
              </span>
            ))}
          </div>
        </InfoRow>

        <InfoRow icon={FileText} label="是否处方药">
          {drug.prescription ? (
            <span className="text-[var(--color-danger)] font-semibold">是 · 需在兽医指导下使用</span>
          ) : (
            <span className="text-[var(--color-success)] font-semibold">非处方药</span>
          )}
        </InfoRow>
      </div>

      {/* 用法用量(VIP 药品在 free 用户下模糊) */}
      <div className="mb-3">
        <Section title="用法用量" icon={Pill} blurred={isVipLocked}>
          <p className="whitespace-pre-wrap">{drug.dosage}</p>
        </Section>
      </div>

      {/* 副作用 */}
      <div className="mb-3">
        <Section
          title="副作用"
          icon={AlertTriangle}
          variant="danger"
          blurred={isVipLocked}
        >
          <p className={cn(
            "whitespace-pre-wrap",
            !isVipLocked && "p-3 rounded-xl bg-[var(--color-danger)]/8 border border-[var(--color-danger)]/20"
          )}>
            {drug.sideEffects}
          </p>
        </Section>
      </div>

      {/* 禁忌 — v0.4.0 新字段(任务清单:显示适应症 / 剂量 / 禁忌) */}
      <div className="mb-3">
        <Section
          title="禁忌"
          icon={Ban}
          variant="danger"
          blurred={isVipLocked}
        >
          <p className={cn(
            "whitespace-pre-wrap",
            !isVipLocked && "p-3 rounded-xl bg-rose-50 border border-rose-200"
          )}>
            {drug.contraindications}
          </p>
        </Section>
      </div>

      {/* 产品说明 — 50-100 字(任务清单) */}
      <div className="mb-3">
        <Section title="产品说明" icon={Activity} blurred={isVipLocked}>
          <p className="whitespace-pre-wrap">{drug.description}</p>
        </Section>
      </div>

      {/* VIP 锁定提示 */}
      {isVipLocked && <VipLockBlock />}

      {/* 相似药品推荐 */}
      {similar.length > 0 && (
        <section className="mt-5">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-1">
              💊 相似药品推荐
            </h3>
            <Link
              href="/medicine"
              className="text-[11px] text-[var(--color-primary)] flex items-center gap-0.5"
            >
              更多 <ChevronRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {similar.map((d) => (
              <Link
                key={d.id}
                href={`/medicine/${d.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-soft active:scale-[0.98] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-warm flex items-center justify-center text-xl flex-shrink-0">
                  💊
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                    {d.name}
                    {isPromotedDrug(d) && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded-full font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white align-middle">
                        <Sparkles size={8} /> 推广
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
                    {d.category} · 用药请遵医嘱
                  </p>
                </div>
                <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* F-AD-01 #2:在线问诊广告位(占位,不接广告) */}
      <section className="mt-5">
        <h3 className="text-xs font-semibold text-[var(--color-text-soft)] mb-2 px-1">
          相关服务(广告位 · v0.4.0 占位)
        </h3>
        <PartnerSlot type="online-consult" />
      </section>

      {/* 底部广告 */}
      <div className="mt-5">
        <AdBottom />
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] safe-area-bottom">
        <div className="max-w-[480px] mx-auto px-4 py-3">
          <button
            onClick={handleConsultAI}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm shadow-soft active:scale-[0.98] transition-transform"
          >
            <MessageCircle size={16} />
            咨询 AI 关于这个药品
          </button>
        </div>
      </div>
    </div>
  );
}
