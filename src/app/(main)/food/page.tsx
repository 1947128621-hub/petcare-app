"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, Beef, Drumstick, Star, Sparkles, History as HistoryIcon, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { useAppStore } from "@/lib/store";
import { cn, formatDate, speciesEmoji, speciesLabel } from "@/lib/utils";
import type { FoodItem, PetSpecies } from "@/lib/types";

type SpeciesFilter = "all" | "cat" | "dog";
type LifeStage = FoodItem["lifeStage"];
type LifeStageFilter = "all" | LifeStage;

const SPECIES_TABS: Array<{ key: SpeciesFilter; label: string; emoji: string }> = [
  { key: "all", label: "全部", emoji: "🍽️" },
  { key: "cat", label: "猫粮", emoji: "🐱" },
  { key: "dog", label: "狗粮", emoji: "🐶" },
];

const LIFE_STAGES: Array<{ key: LifeStageFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "幼", label: "幼" },
  { key: "成", label: "成" },
  { key: "老", label: "老" },
  { key: "全期", label: "全期" },
];

const LIFE_STAGE_BADGE: Record<LifeStage, string> = {
  幼: "bg-[var(--color-secondary)]/30 text-[var(--color-secondary)]",
  成: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  老: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  全期: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
};

function FoodIcon({ species }: { species: PetSpecies[] }) {
  const allCats = species.every((s) => s === "cat");
  const allDogs = species.every((s) => s === "dog");
  if (allCats) return <Drumstick size={22} className="text-white" />;
  if (allDogs) return <Beef size={22} className="text-white" />;
  return <Beef size={22} className="text-white" />;
}

function FoodCard({ food }: { food: FoodItem }) {
  return (
    <Link
      href={`/food/${food.id}`}
      className="block bg-white rounded-2xl p-4 shadow-soft active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start gap-3">
        {/* 缩略图 */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-warm flex items-center justify-center flex-shrink-0">
          <FoodIcon species={food.forSpecies} />
        </div>

        <div className="flex-1 min-w-0">
          {/* 品牌 + 名字 + 阶段徽章 */}
          <p className="text-[11px] text-[var(--color-text-soft)] font-medium">
            {food.brand}
          </p>
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <h3 className="text-sm font-bold text-[var(--color-text)] truncate">
              {food.name}
            </h3>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0",
                LIFE_STAGE_BADGE[food.lifeStage]
              )}
            >
              {food.lifeStage}
            </span>
          </div>

          {/* 适用物种 */}
          <div className="flex flex-wrap gap-1 mb-2">
            {food.forSpecies.slice(0, 2).map((s) => (
              <span
                key={s}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
              >
                {speciesEmoji(s)} {speciesLabel(s)}
              </span>
            ))}
          </div>

          {/* 关键指标 */}
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-soft)] mb-2">
            <span>
              蛋白 <span className="font-semibold text-[var(--color-text)]">{food.crudeProtein}%</span>
            </span>
            <span className="w-px h-3 bg-[var(--color-border)]" />
            <span>
              脂肪 <span className="font-semibold text-[var(--color-text)]">{food.crudeFat}%</span>
            </span>
          </div>

          {/* 配料前 3 chip */}
          {food.topIngredients.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {food.topIngredients.slice(0, 3).map((ing) => (
                <span
                  key={ing}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-primary-soft)]/30 text-[var(--color-primary)] font-medium"
                >
                  {ing}
                </span>
              ))}
            </div>
          )}

          {/* 价格 + 评分 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[var(--color-primary)]">
                ¥{food.pricePerKg}
                <span className="text-[10px] font-normal text-[var(--color-text-soft)]">/kg</span>
              </span>
              <span className="flex items-center gap-0.5 text-[11px] text-[var(--color-warning)] font-semibold">
                <Star size={11} fill="currentColor" />
                {food.rating}
              </span>
            </div>
            <span className="flex items-center gap-0.5 text-[10px] text-[var(--color-primary)] font-semibold">
              <Sparkles size={10} />
              适配评分
            </span>
          </div>
        </div>

        <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default function FoodPage() {
  const foods = useAppStore((s) => s.foods);
  const pets = useAppStore((s) => s.pets);
  const foodChecks = useAppStore((s) => s.foodChecks);
  const deleteFoodCheck = useAppStore((s) => s.deleteFoodCheck);

  const [keyword, setKeyword] = useState("");
  const [species, setSpecies] = useState<SpeciesFilter>("all");
  const [lifeStage, setLifeStage] = useState<LifeStageFilter>("all");

  // 综合筛选
  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    return foods.filter((f) => {
      // 物种筛选
      if (species === "cat" && !f.forSpecies.includes("cat")) return false;
      if (species === "dog" && !f.forSpecies.includes("dog")) return false;

      // 生命阶段筛选
      if (lifeStage !== "all" && f.lifeStage !== lifeStage) return false;

      // 关键词搜索（品牌 / 名字 / 配料）
      if (lower) {
        const hit =
          f.brand.toLowerCase().includes(lower) ||
          f.name.toLowerCase().includes(lower) ||
          f.topIngredients.some((t) => t.toLowerCase().includes(lower));
        if (!hit) return false;
      }

      return true;
    });
  }, [foods, keyword, species, lifeStage]);

  // 查询历史：最近 5 条
  const recentChecks = useMemo(() => {
    return [...foodChecks]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 5);
  }, [foodChecks]);

  return (
    <div className="space-y-4">
      <PageHeader title="食物助手" subtitle="AI 帮你的宠物选对粮" />

      {/* 宠物选择提示（仅展示，有宠物时） */}
      {pets.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white shadow-soft">
          <span className="text-[11px] text-[var(--color-text-soft)]">已选宠物</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            {pets.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium flex-shrink-0"
              >
                {p.avatar} {p.name}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-[var(--color-text-soft)]">影响判读</span>
        </div>
      )}

      {/* 搜索框 */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-soft)] pointer-events-none" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜品牌 / 产品 / 配料"
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none placeholder:text-[var(--color-text-soft)] shadow-soft"
        />
      </div>

      {/* 物种分类 chip */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {SPECIES_TABS.map((s) => {
          const active = species === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSpecies(s.key)}
              className={cn(
                "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                active
                  ? "bg-[var(--color-primary)] text-white shadow-soft"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              )}
            >
              <span className="mr-1">{s.emoji}</span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* 生命阶段 chip */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {LIFE_STAGES.map((s) => {
          const active = lifeStage === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setLifeStage(s.key)}
              className={cn(
                "flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                active
                  ? "bg-[var(--color-primary-soft)] text-white"
                  : "bg-white text-[var(--color-text-soft)] border border-[var(--color-border)]"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* 食物列表 */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            推荐食物
            <span className="ml-1.5 text-xs font-normal text-[var(--color-text-soft)]">
              ({filtered.length})
            </span>
          </h3>
          {(keyword || species !== "all" || lifeStage !== "all") && (
            <button
              onClick={() => {
                setKeyword("");
                setSpecies("all");
                setLifeStage("all");
              }}
              className="text-[11px] text-[var(--color-primary)]"
            >
              清除筛选
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl shadow-soft">
            <Drumstick size={36} className="text-[var(--color-text-soft)] mb-2" />
            <p className="text-sm text-[var(--color-text)] font-semibold">没有匹配的食物</p>
            <p className="text-xs text-[var(--color-text-soft)] mt-1">试试其他关键词或筛选</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((f) => (
              <FoodCard key={f.id} food={f} />
            ))}
          </div>
        )}
      </section>

      {/* 查询历史 */}
      {recentChecks.length > 0 && (
        <section className="mt-5">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-1">
              <HistoryIcon size={14} className="text-[var(--color-primary)]" />
              查询历史
              <span className="ml-1 text-xs font-normal text-[var(--color-text-soft)]">
                最近 {recentChecks.length} 条
              </span>
            </h3>
          </div>
          <div className="space-y-2">
            {recentChecks.map((c) => {
              const f = foods.find((x) => x.id === c.foodId);
              const p = pets.find((x) => x.id === c.petId);
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-3 shadow-soft flex items-center gap-3"
                >
                  {/* 分数环（简化版） */}
                  <div
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0",
                      c.score >= 90 ? "bg-[var(--color-success)]" :
                      c.score >= 70 ? "bg-[var(--color-primary)]" :
                      c.score >= 55 ? "bg-[var(--color-warning)]" :
                      "bg-[var(--color-danger)]"
                    )}
                  >
                    {c.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                      {f?.name || "未知食物"}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5 truncate">
                      {p ? `${p.avatar} ${p.name}` : "未指定宠物"} · {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteFoodCheck(c.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-soft)] hover:bg-[var(--bg-soft)] flex-shrink-0"
                    aria-label="删除记录"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 底部广告 */}
      <AdBottom />
    </div>
  );
}
