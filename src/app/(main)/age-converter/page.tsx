"use client";

import { useMemo, useState } from "react";
import { Calendar, Heart, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { useAppStore } from "@/lib/store";
import { cn, speciesEmoji } from "@/lib/utils";
import { convertCatAge, convertDogAge } from "@/lib/data";
import type { PetSpecies } from "@/lib/types";

// ===== 6 段人生阶段时间线（统一用人类 6 段，对应 cat/dog 不同年龄区间）=====
type Stage = { key: string; label: string; emoji: string; catMax: number; dogMax: number; tips: string[] };

const STAGES: Stage[] = [
  {
    key: "婴儿",
    label: "婴儿期",
    emoji: "👶",
    catMax: 2,
    dogMax: 3,
    tips: ["按时接种疫苗 + 驱虫", "少食多餐，幼犬/幼猫专用粮", "避免外出和洗澡（未免疫完）"],
  },
  {
    key: "幼儿",
    label: "幼儿期",
    emoji: "🧒",
    catMax: 6,
    dogMax: 8,
    tips: ["社会化训练黄金期（3-12 周）", "开始基础指令训练", "注意磨牙期，提供磨牙玩具"],
  },
  {
    key: "少年",
    label: "少年期",
    emoji: "🧑",
    catMax: 11,
    dogMax: 14,
    tips: ["精力旺盛，每天固定运动量", "绝育最佳时期（6-12 月龄）", "定期体检 + 牙齿清洁"],
  },
  {
    key: "青年",
    label: "青年期",
    emoji: "🧑‍🎓",
    catMax: 15,
    dogMax: 20,
    tips: ["身体素质巅峰，注意维持体重", "口腔健康重点关注（牙结石）", "每年一次全面体检"],
  },
  {
    key: "中年",
    label: "中年期",
    emoji: "🧑‍💼",
    catMax: 25,
    dogMax: 30,
    tips: ["关注关节健康（尤其大型犬）", "转换中年配方粮", "每年加做生化 + 影像检查"],
  },
  {
    key: "老年",
    label: "老年期",
    emoji: "👴",
    catMax: 999,
    dogMax: 999,
    tips: ["半年一次体检 + 慢性病筛查", "切换老年/低脂配方", "关注肾、心、关节三大老年病"],
  },
];

const SPECIES_OPTIONS: { value: PetSpecies; label: string; emoji: string }[] = [
  { value: "cat", label: "猫", emoji: "🐱" },
  { value: "dog", label: "狗", emoji: "🐶" },
  { value: "rabbit", label: "兔", emoji: "🐰" },
  { value: "other", label: "其他", emoji: "🐾" },
];

const DOG_SIZES: { value: "small" | "medium" | "large"; label: string; sub: string }[] = [
  { value: "small", label: "小型犬", sub: "< 10kg" },
  { value: "medium", label: "中型犬", sub: "10-25kg" },
  { value: "large", label: "大型犬", sub: "> 25kg" },
];

type Mode = "pet" | "custom";

export default function AgeConverterPage() {
  const pets = useAppStore((s) => s.pets);

  // ===== 模式：选择现有宠物 vs 自定义 =====
  const [mode, setMode] = useState<Mode>(pets.length > 0 ? "pet" : "custom");
  const [selectedPetId, setSelectedPetId] = useState<string | "custom">(
    pets.length > 0 ? pets[0].id : "custom"
  );

  // ===== 自定义模式 state =====
  const [species, setSpecies] = useState<PetSpecies>("cat");
  const [dogSize, setDogSize] = useState<"small" | "medium" | "large">("medium");
  const [birthday, setBirthday] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().slice(0, 10);
  });

  // 切换现有宠物时同步其字段到自定义 state，方便后续编辑
  const onPickPet = (id: string | "custom") => {
    setSelectedPetId(id);
    if (id === "custom") {
      setMode("custom");
      return;
    }
    setMode("pet");
    const p = pets.find((x) => x.id === id);
    if (p) {
      setSpecies(p.species);
      if (p.birthday) setBirthday(p.birthday);
    }
  };

  const switchToCustom = () => {
    setSelectedPetId("custom");
    setMode("custom");
  };

  // ===== 计算年龄 + 换算结果 =====
  const computed = useMemo(() => {
    const years = ageYearsFromBirthday(birthday);
    const months = ageMonthsFromBirthday(birthday);

    let humanAge: number;
    let stage: { lifeStage: string; emoji: string; description: string };
    if (species === "cat") {
      const r = convertCatAge(years, months);
      humanAge = r.humanAge;
      stage = { lifeStage: r.lifeStage, emoji: r.emoji, description: r.description };
    } else if (species === "dog") {
      const r = convertDogAge(years, months, dogSize);
      humanAge = r.humanAge;
      stage = { lifeStage: r.lifeStage, emoji: r.emoji, description: r.description };
    } else {
      // 其他物种：粗略用 1y = 5y 的线性公式（仅参考）
      humanAge = Math.max(0, Math.round(years * 5 + (months / 12) * 5));
      stage = mapGenericStage(humanAge);
    }
    return { years, months, humanAge, stage };
  }, [birthday, species, dogSize]);

  // 当前阶段的下标（用于时间线高亮 + 健康提示）
  const currentStageIndex = useMemo(() => {
    return STAGES.findIndex((s) => {
      const cap = species === "cat" ? s.catMax : species === "dog" ? s.dogMax : s.catMax; // 其他按猫的近似
      return computed.humanAge < cap;
    });
  }, [computed.humanAge, species]);

  const stageIndex = currentStageIndex === -1 ? STAGES.length - 1 : currentStageIndex;
  const currentStage = STAGES[stageIndex];

  // 圆环进度：基于已活到的人类年龄 / 100 岁上限
  const ringPct = Math.min(100, (computed.humanAge / 100) * 100);

  return (
    <div className="space-y-4">
      <PageHeader title="年龄换算器" subtitle="你家宠物相当于人类几岁？" />

      {/* 顶部宠物选择 chips */}
      <section className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {pets.map((p) => (
          <button
            key={p.id}
            onClick={() => onPickPet(p.id)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              mode === "pet" && selectedPetId === p.id
                ? "bg-[var(--color-primary)] text-white shadow-soft"
                : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
            )}
          >
            <span className="mr-1.5">{p.avatar}</span>
            {p.name}
          </button>
        ))}
        <button
          onClick={switchToCustom}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
            mode === "custom"
              ? "bg-[var(--color-primary)] text-white shadow-soft"
              : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
          )}
        >
          ✏️ 自定义
        </button>
      </section>

      {/* 自定义模式：物种 + 体型 + 生日 */}
      {mode === "custom" && (
        <section className="bg-white rounded-3xl p-4 shadow-card space-y-3.5">
          {/* 物种 */}
          <div>
            <p className="text-xs text-[var(--color-text-soft)] mb-2">物种</p>
            <div className="grid grid-cols-4 gap-2">
              {SPECIES_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSpecies(opt.value)}
                  className={cn(
                    "py-2 rounded-2xl text-sm font-medium transition-all flex flex-col items-center gap-0.5",
                    species === opt.value
                      ? "bg-[var(--color-primary)] text-white shadow-soft"
                      : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                  )}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 犬体型（仅狗） */}
          {species === "dog" && (
            <div>
              <p className="text-xs text-[var(--color-text-soft)] mb-2">犬体型</p>
              <div className="grid grid-cols-3 gap-2">
                {DOG_SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setDogSize(s.value)}
                    className={cn(
                      "py-2 rounded-2xl text-sm font-medium transition-all",
                      dogSize === s.value
                        ? "bg-[var(--color-primary)] text-white shadow-soft"
                        : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                    )}
                  >
                    <div>{s.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{s.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 生日 */}
          <div>
            <label className="text-xs text-[var(--color-text-soft)] mb-2 flex items-center gap-1">
              <Calendar size={12} /> 出生日期
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2.5 rounded-2xl bg-[var(--bg-soft)] text-sm text-[var(--color-text)] border border-transparent focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
        </section>
      )}

      {/* 当前年龄显示 */}
      <section className="bg-white rounded-3xl p-4 shadow-card flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--color-text-soft)]">宠物当前年龄</p>
          <p className="text-xl font-extrabold text-[var(--color-text)] mt-0.5">
            {computed.years} <span className="text-sm font-semibold">岁</span> {computed.months}
            <span className="text-sm font-semibold"> 个月</span>
          </p>
        </div>
        <div className="text-4xl">{speciesEmoji(species)}</div>
      </section>

      {/* 大圆环 */}
      <section className="bg-white rounded-3xl p-6 shadow-card">
        <p className="text-center text-sm text-[var(--color-text-soft)]">
          {speciesEmoji(species)} 相当于人类
        </p>

        <div className="mt-3 flex items-center justify-center">
          <AgeRing pct={ringPct} humanAge={computed.humanAge} emoji={computed.stage.emoji} />
        </div>

        <p className="mt-4 text-center text-sm text-[var(--color-text-soft)]">
          当前阶段
        </p>
        <p className="text-center text-lg font-extrabold text-[var(--color-text)]">
          {computed.stage.emoji} {computed.stage.lifeStage}
        </p>
        <p className="text-center text-xs text-[var(--color-text-soft)] mt-1">
          {computed.stage.description}
        </p>
      </section>

      {/* 人生阶段时间线 */}
      <section className="bg-white rounded-3xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">人生阶段时间线</h3>
          <span className="text-[10px] text-[var(--color-text-soft)]">
            {species === "cat" ? "按猫" : species === "dog" ? `按狗（${dogSize === "small" ? "小型" : dogSize === "large" ? "大型" : "中型"}）` : "按猫（其他物种近似）"}
          </span>
        </div>

        <div className="flex items-stretch justify-between gap-1">
          {STAGES.map((s, i) => {
            const active = i === stageIndex;
            const passed = i < stageIndex;
            return (
              <div
                key={s.key}
                className="flex-1 flex flex-col items-center min-w-0"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-base transition-all",
                    active
                      ? "bg-[var(--color-primary)] text-white shadow-card scale-110"
                      : passed
                      ? "bg-[var(--color-primary)]/20 text-[var(--color-text)]"
                      : "bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
                  )}
                >
                  {s.emoji}
                </div>
                <p
                  className={cn(
                    "text-[10px] mt-1 text-center leading-tight",
                    active
                      ? "font-bold text-[var(--color-text)]"
                      : "text-[var(--color-text-soft)]"
                  )}
                >
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 健康提示 */}
      <section className="bg-gradient-to-br from-[var(--bg-soft)] to-white rounded-3xl p-4 shadow-soft">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Heart size={16} className="text-[var(--color-primary)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            {currentStage.label} 需要关注
          </h3>
        </div>
        <ul className="space-y-1.5">
          {currentStage.tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
              <span className="text-[var(--color-primary)] mt-0.5">•</span>
              <span className="leading-snug">{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 对比卡 */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">人生阶段对比</h3>
          <Sparkles size={14} className="text-[var(--color-primary)]" />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <CompareCard
            emoji="🧑‍💼"
            title="28 岁"
            sub="成年巅峰"
            desc="健康自律、事业起步"
            highlight={Math.abs(computed.humanAge - 28) <= 3}
          />
          <CompareCard
            emoji="👶"
            title="婴儿"
            sub="1 岁"
            desc="纯真、需要呵护"
          />
          <CompareCard
            emoji="👴"
            title="老人"
            sub="70 岁"
            desc="需要陪伴、慢生活"
          />
        </div>
      </section>

      <AdBottom />
    </div>
  );
}

// ===== 圆环组件 =====
function AgeRing({
  pct,
  humanAge,
  emoji,
}: {
  pct: number;
  humanAge: number;
  emoji: string;
}) {
  const R = 80;
  const C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;

  return (
    <div className="relative w-52 h-52">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="14"
        />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-secondary)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl mb-0.5">{emoji}</span>
        <span className="text-5xl font-extrabold text-[var(--color-text)] leading-none tabular-nums">
          {humanAge}
        </span>
        <span className="text-xs text-[var(--color-text-soft)] mt-1">岁</span>
      </div>
    </div>
  );
}

// ===== 对比卡 =====
function CompareCard({
  emoji,
  title,
  sub,
  desc,
  highlight,
}: {
  emoji: string;
  title: string;
  sub: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-3 text-center transition-all",
        highlight
          ? "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-card"
          : "bg-white border border-[var(--color-border)]"
      )}
    >
      <div className="text-2xl">{emoji}</div>
      <p
        className={cn(
          "text-sm font-extrabold mt-1",
          highlight ? "text-white" : "text-[var(--color-text)]"
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "text-[10px] mt-0.5",
          highlight ? "text-white/90" : "text-[var(--color-text-soft)]"
        )}
      >
        {sub}
      </p>
      <p
        className={cn(
          "text-[10px] mt-1.5 leading-tight",
          highlight ? "text-white/80" : "text-[var(--color-text-soft)]"
        )}
      >
        {desc}
      </p>
    </div>
  );
}

// ===== 工具：根据生日计算当前年龄（岁 + 月）=====
function ageYearsFromBirthday(birthday: string): number {
  if (!birthday) return 0;
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return 0;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

function ageMonthsFromBirthday(birthday: string): number {
  if (!birthday) return 0;
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return 0;
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months) % 12;
}

// 其他物种的简单阶段映射
function mapGenericStage(humanAge: number): { lifeStage: string; emoji: string; description: string } {
  if (humanAge < 2) return { lifeStage: "婴儿期", emoji: "👶", description: "需要细心呵护" };
  if (humanAge < 8) return { lifeStage: "幼儿期", emoji: "🧒", description: "好奇心爆棚" };
  if (humanAge < 15) return { lifeStage: "少年期", emoji: "🧑", description: "精力最旺盛" };
  if (humanAge < 25) return { lifeStage: "青年期", emoji: "🧑‍🎓", description: "最佳状态" };
  if (humanAge < 40) return { lifeStage: "中年期", emoji: "🧑‍💼", description: "性格稳定" };
  return { lifeStage: "老年期", emoji: "👴", description: "多陪伴多体检" };
}
