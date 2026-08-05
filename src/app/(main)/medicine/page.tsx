"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Lock, ChevronRight, Pill, AlertCircle, Crown, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom, AdSidebar } from "@/components/AdSlot";
import { useAppStore, selectMembershipTier } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Drug } from "@/lib/types";
import { sortDrugsForDisplay, isPromotedDrug } from "@/lib/drugs/sponsored";

// ===== v0.4.0 改造 (实施员 3) =====
// - 11 个分类全覆盖(原 7 + 心脏/肾脏/眼耳/抗感染/止痛/其他)
// - 搜索:药名 / 适应症 / 分类(扩展)
// - 列表:推广药排前(推广红橙徽章)
// - 沿用 VIP 锁区机制(Free 用户对 vipOnly 药品的详情模糊)
//
// 设计要点:
// - `category` union 扩到 13 个(老 7 + 新 6);这里用全部 13
// - 推广药不在 UI 隐藏:Free 用户也能看,但排前 + 红橙徽章
// - 推广 ≠ VIP:不与 vipOnly 互斥

type Category = Drug["category"] | "全部";

// 11 个分类(任务清单) + 老的 "营养" / "眼耳口" 兼容(v0.4.0 仍可能有老数据)
const CATEGORIES: Category[] = [
  "全部",
  "驱虫",
  "疫苗",
  "肠胃",
  "皮肤",
  "关节",
  "心脏",
  "肾脏",
  "眼耳",
  "抗感染",
  "止痛",
  "其他",
  "营养",
  "眼耳口",
];

// 11 个分类的快捷入口(任务清单对应)
const SYMPTOM_SHORTCUTS: Array<{ key: string; label: string; emoji: string; match: string[] }> = [
  { key: "驱虫", label: "驱虫", emoji: "💊", match: ["驱虫", "体内", "体外", "蛔虫", "绦虫", "跳蚤", "蜱虫"] },
  { key: "疫苗", label: "疫苗", emoji: "💉", match: ["疫苗", "猫瘟", "猫疱疹", "猫杯状", "免疫"] },
  { key: "腹泻", label: "腹泻", emoji: "💩", match: ["腹泻", "软便", "拉稀", "便秘"] },
  { key: "皮肤", label: "皮肤", emoji: "🧴", match: ["真菌", "螨虫", "皮炎", "掉毛", "皮肤"] },
  { key: "眼睛", label: "眼耳", emoji: "👁️", match: ["泪痕", "眼部", "红眼", "眼", "耳", "耳螨"] },
  { key: "关节", label: "关节", emoji: "🦴", match: ["关节", "髋关节", "老年犬"] },
];

// 13 个分类的色板(覆盖 11 新 + 2 老)
const CATEGORY_COLOR: Record<Drug["category"], string> = {
  驱虫: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  疫苗: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  肠胃: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  皮肤: "bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]",
  关节: "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  营养: "bg-[var(--color-vip)]/15 text-[var(--color-vip)]",
  眼耳口: "bg-[var(--color-primary-soft)]/30 text-[var(--color-primary)]",
  // v0.4.0 新增 6 类
  心脏: "bg-rose-100 text-rose-700",
  肾脏: "bg-amber-100 text-amber-700",
  眼耳: "bg-sky-100 text-sky-700",
  抗感染: "bg-emerald-100 text-emerald-700",
  止痛: "bg-indigo-100 text-indigo-700",
  其他: "bg-slate-100 text-slate-700",
};

// v0.4.0 推广角标样式(任务清单:红橙色小徽章)
const PROMO_BADGE_CLASS = "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white flex-shrink-0 shadow-sm";

function DrugCard({
  drug,
  isLocked,
}: {
  drug: Drug;
  isLocked: boolean;
}) {
  return (
    <Link
      href={`/medicine/${drug.id}`}
      className="block relative bg-white rounded-2xl shadow-soft active:scale-[0.98] transition-transform overflow-hidden"
    >
      {/* 卡片主体 */}
      <div className={cn("p-4", isLocked && "pb-3")}>
        <div className="flex items-start gap-3">
          {/* 缩略图 */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-warm flex items-center justify-center text-2xl flex-shrink-0">
            💊
          </div>

          <div className="flex-1 min-w-0">
            {/* 名字 + 类别徽章 + 推广徽章 */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <h3 className="text-base font-bold text-[var(--color-text)] truncate">
                {drug.name}
              </h3>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", CATEGORY_COLOR[drug.category])}>
                {drug.category}
              </span>
              {/* v0.4.0 推广徽章 — 红橙渐变小标签,任务清单明确要求 */}
              {isPromotedDrug(drug) && (
                <span className={PROMO_BADGE_CLASS}>
                  <Sparkles size={9} />
                  推广
                </span>
              )}
              {drug.vipOnly && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-vip text-white font-medium flex items-center gap-0.5 flex-shrink-0">
                  <Crown size={9} /> VIP
                </span>
              )}
            </div>

            {/* 适应症(优先 v0.4.0 新字段,fallback 老 symptoms) */}
            <div className="flex flex-wrap gap-1 mb-2">
              {(drug.indications ?? drug.symptoms ?? []).slice(0, 3).map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
                >
                  {s}
                </span>
              ))}
              {((drug.indications ?? drug.symptoms ?? []).length) > 3 && (
                <span className="text-[10px] text-[var(--color-text-soft)]">
                  +{((drug.indications ?? drug.symptoms ?? []).length) - 3}
                </span>
              )}
            </div>

            {/* v0.4.0.2 P0-2 — 药品是医疗建议,不应有价格
                只显示「推广」「VIP」「处方药」标签;价格字段保留在 data 但不在 UI 渲染 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {drug.prescription && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-danger)]/15 text-[var(--color-danger)] font-medium flex items-center gap-0.5">
                  <AlertCircle size={9} /> 处方药
                </span>
              )}
              <span className="text-[10px] text-[var(--color-text-soft)]">
                需在兽医指导下使用
              </span>
            </div>
          </div>

          <ChevronRight size={18} className="text-[var(--color-text-soft)] flex-shrink-0 mt-1" />
        </div>
      </div>

      {/* VIP 锁区:模糊 + 升级按钮(Free 用户对 vipOnly 药品的详情模糊;推广药不受影响) */}
      {isLocked && (
        <div className="relative border-t border-[var(--color-border)]">
          <div className="absolute inset-x-0 -top-10 h-10 bg-gradient-to-b from-transparent to-white pointer-events-none" />
          <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-[var(--color-vip)]/10 to-[var(--color-primary)]/10">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-soft)]">
              <Lock size={12} className="text-[var(--color-vip)]" />
              <span>此药品仅 VIP/SVIP 可查看完整信息</span>
            </div>
            <span className="inline-flex items-center gap-0.5 px-3 py-1.5 rounded-full bg-gradient-vip text-white text-[11px] font-semibold flex-shrink-0">
              <Crown size={10} /> VIP 解锁
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

export default function MedicinePage() {
  const drugs = useAppStore((s) => s.drugs);
  const tier = useAppStore(selectMembershipTier);

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<Category>("全部");
  const [activeSymptom, setActiveSymptom] = useState<string | null>(null);

  const isFree = tier === "free";

  // 综合过滤
  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    return drugs.filter((d) => {
      // 分类过滤
      if (category !== "全部" && d.category !== category) return false;

      // 症状快捷过滤
      if (activeSymptom) {
        const sc = SYMPTOM_SHORTCUTS.find((s) => s.key === activeSymptom);
        if (sc) {
          const hit = sc.match.some((m) =>
            d.symptoms.some((s) => s.includes(m)) || d.name.includes(m) || d.description.includes(m)
          );
          if (!hit) return false;
        }
      }

      // 关键词搜索(药名 / 适应症 / 描述 / 分类)
      // v0.4.0 任务清单:搜药名 / 适应症 / 分类
      if (lower) {
        const indications = d.indications ?? [];
        const hit =
          d.name.toLowerCase().includes(lower) ||
          d.symptoms.some((s) => s.toLowerCase().includes(lower)) ||
          indications.some((s) => s.toLowerCase().includes(lower)) ||
          d.description.toLowerCase().includes(lower) ||
          d.category.toLowerCase().includes(lower) ||
          (d.contraindications ?? "").toLowerCase().includes(lower);
        if (!hit) return false;
      }

      return true;
    });
  }, [drugs, keyword, category, activeSymptom]);

  // v0.4.0 任务清单:推广药排前(不伪装,明确标"推广"红橙徽章)
  const sorted = useMemo(() => sortDrugsForDisplay(filtered), [filtered]);

  // VIP 锁判断
  const isVipLocked = (d: Drug) => isFree && !!d.vipOnly;

  // 切换症状快捷:可取消
  const handleSymptomClick = (key: string) => {
    setActiveSymptom((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="药品助手"
        subtitle="症状搜药 · 安全用药"
      />

      {/* 搜索框 */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-soft)] pointer-events-none" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜药名 / 适应症 / 分类"
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none placeholder:text-[var(--color-text-soft)] shadow-soft"
        />
      </div>

      {/* 分类筛选 chip — 11 个(任务清单) */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                active
                  ? "bg-[var(--color-primary)] text-white shadow-soft"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              )}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* 症状快捷入口 */}
      <section>
        <h3 className="text-xs font-semibold text-[var(--color-text-soft)] mb-2 px-1">
          常见症状快捷入口
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {SYMPTOM_SHORTCUTS.map((s) => {
            const active = activeSymptom === s.key;
            return (
              <button
                key={s.key}
                onClick={() => handleSymptomClick(s.key)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-medium transition-all active:scale-95",
                  active
                    ? "bg-[var(--color-primary)] text-white shadow-card"
                    : "bg-white text-[var(--color-text)] border border-[var(--color-border)] shadow-soft"
                )}
              >
                <span className="text-2xl">{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 药品列表 */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            药品列表
            <span className="ml-1.5 text-xs font-normal text-[var(--color-text-soft)]">
              ({sorted.length})
            </span>
          </h3>
          {(keyword || category !== "全部" || activeSymptom) && (
            <button
              onClick={() => {
                setKeyword("");
                setCategory("全部");
                setActiveSymptom(null);
              }}
              className="text-[11px] text-[var(--color-primary)]"
            >
              清除筛选
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl shadow-soft">
            <Pill size={36} className="text-[var(--color-text-soft)] mb-2" />
            <p className="text-sm text-[var(--color-text)] font-semibold">没有匹配的药品</p>
            <p className="text-xs text-[var(--color-text-soft)] mt-1">试试其他关键词或分类</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((d) => (
              <DrugCard key={d.id} drug={d} isLocked={isVipLocked(d)} />
            ))}
          </div>
        )}
      </section>

      {/* 侧栏广告 + 底部广告 */}
      <AdSidebar />
      <AdBottom />
    </div>
  );
}
