"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Share2, TrendingUp, TrendingDown, Award, Sparkles, Calendar,
  Heart, MessageCircle, Camera, Footprints, FileText, ChevronRight,
  BookOpen,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { cn, formatDate, formatDateShort, speciesEmoji, speciesLabel } from "@/lib/utils";
import type { Pet, PetRecord, HealthCheck, WalkLog, Achievement, AchievementUnlock } from "@/lib/types";

// ===== 时间段 =====
type PeriodKey = "30d" | "90d" | "1y";

const PERIOD_OPTIONS: { key: PeriodKey; label: string; days: number; color: string }[] = [
  { key: "30d", label: "近 30 天", days: 30, color: "from-[#ff8c5a] to-[#f5a8b8]" },
  { key: "90d", label: "近 90 天", days: 90, color: "from-[#f5a8b8] to-[#c084fc]" },
  { key: "1y", label: "近 1 年", days: 365, color: "from-[#f4c063] to-[#ff8c5a]" },
];

// ===== 工具：YYYY-MM-DD =====
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ===== 工具：统计中文字符 n-gram 频率（简单分词）=====
const STOP_WORDS = new Set([
  "的", "了", "是", "我", "你", "他", "她", "它", "们", "在", "有", "和", "就", "都",
  "不", "也", "很", "还", "把", "让", "要", "会", "能", "可以", "什么", "怎么", "为", "为什么",
  "吗", "呢", "啊", "吧", "呀", "嘛", "哦", "哈", "吗", "上", "下", "里", "给", "到", "从",
  "对", "这", "那", "些", "这", "那", "与", "及", "或", "但", "而", "又", "才", "已",
  "好", "没", "真", "很", "太", "最", "比", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "只", "个", "条", "次", "下", "点", "会", "吗", "呢", "吃", "什么", "不", "怎么办",
]);

function extractTopKeywords(questions: string[], topN = 5): string[] {
  const counter = new Map<string, number>();
  for (const q of questions) {
    // 清理：去掉标点和空白，只保留中英文字符
    const cleaned = q.replace(/[，。！？、；：""''《》【】()()!?.,;:""''()\[\]\\/·\s]+/g, "");
    if (!cleaned) continue;
    // 2-char 和 3-char n-gram
    const seen = new Set<string>();
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i <= cleaned.length - n; i++) {
        const gram = cleaned.slice(i, i + n);
        // 过滤：必须含中文字符
        if (!/[\u4e00-\u9fa5]/.test(gram)) continue;
        // 过滤：整词都是停用词
        if (STOP_WORDS.has(gram)) continue;
        seen.add(gram);
      }
    }
    for (const g of seen) {
      counter.set(g, (counter.get(g) || 0) + 1);
    }
  }
  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}

// ===== 报告数据结构 =====
interface ReportData {
  periodStart: string;
  periodEnd: string;
  totalRecords: number;
  totalHealthChecks: number;
  totalWalks: number;
  totalQA: number;
  photoCount: number;
  weightChange: number | null;
  weightStart: number | null;
  weightEnd: number | null;
  topKeywords: string[];
  highlights: string[];
  checkinHeat: number[];   // 30 个数（每个数 = 0..N 当日打卡次数）
  weightSeries: Array<{ date: string; weight: number }>;
}

function buildReport(
  pet: Pet,
  days: number,
  records: PetRecord[],
  healthChecks: HealthCheck[],
  walkLogs: WalkLog[],
  chats: { question: string; createdAt: string; petId?: string }[],
  now: Date
): ReportData {
  const periodStart = new Date(now.getTime() - days * 86400000);
  const periodEnd = now;

  const inPeriod = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= periodStart.getTime() && t <= periodEnd.getTime();
  };

  // 过滤当前宠物 + 时间段
  const petRecords = records.filter((r) => r.petId === pet.id && inPeriod(r.createdAt));
  const petHealth = healthChecks.filter((h) => h.petId === pet.id && inPeriod(h.createdAt));
  const petWalks = walkLogs.filter((w) => w.petId === pet.id && inPeriod(w.createdAt));
  const petChats = chats.filter((c) => (c.petId === pet.id || !c.petId) && inPeriod(c.createdAt));

  // 体重：按 createdAt 升序
  const weightRecords = petRecords
    .filter((r) => r.type === "weight" && typeof r.meta?.weight === "number")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const weightSeries = weightRecords.map((r) => ({
    date: r.createdAt,
    weight: Number(r.meta!.weight),
  }));
  const weightStart = weightSeries.length > 0 ? weightSeries[0].weight : null;
  const weightEnd = weightSeries.length > 0 ? weightSeries[weightSeries.length - 1].weight : null;
  const weightChange = weightStart !== null && weightEnd !== null ? +(weightEnd - weightStart).toFixed(2) : null;

  const photoCount = petRecords.filter((r) => r.type === "photo").length;

  // 30 天热力图
  const heatDays = Math.min(days, 30);
  const heat: number[] = new Array(heatDays).fill(0);
  const dayMs = 86400000;
  for (const h of petHealth) {
    const day = Math.floor((now.getTime() - new Date(h.createdAt).getTime()) / dayMs);
    if (day >= 0 && day < heatDays) heat[day] += 1;
  }
  for (const w of petWalks) {
    const day = Math.floor((now.getTime() - new Date(w.createdAt).getTime()) / dayMs);
    if (day >= 0 && day < heatDays) heat[day] += 1;
  }

  // 关键词
  const topKeywords = extractTopKeywords(petChats.map((c) => c.question), 5);

  // highlights：动态生成 3 条
  const highlights: string[] = [];
  if (photoCount > 0) {
    highlights.push(`本期记录了 ${photoCount} 张照片，留下 ${photoCount} 个精彩瞬间 📸`);
  } else {
    highlights.push("本期还没拍照片呢，下一次拍一张吧～");
  }
  const avgDrink = petHealth.filter((h) => h.type === "饮水").length;
  if (avgDrink > 0) {
    const days30 = Math.max(1, days);
    const perDay = (avgDrink / Math.min(days30, heatDays)).toFixed(1);
    highlights.push(`${pet.name} 平均每天饮水 ${perDay} 次，${pet.species === "cat" ? "主子" : "宝贝"}喝水很积极 💧`);
  } else if (petHealth.length > 0) {
    highlights.push(`健康打卡 ${petHealth.length} 次，记录了 ${pet.name} 的健康细节 🩺`);
  } else {
    highlights.push(`还没有健康打卡，从「打卡」开始记录吧 🩺`);
  }
  if (petWalks.length > 0) {
    const totalMin = petWalks.reduce((s, w) => s + w.durationMin, 0);
    highlights.push(`遛弯 ${petWalks.length} 次、累计 ${totalMin} 分钟，${pet.name} 运动量达标 🐕`);
  } else if (petRecords.length > 0) {
    highlights.push(`本期共记录 ${petRecords.length} 条日常，每一件都是爱 ❤️`);
  } else {
    highlights.push(`这一段时间还没有记录哦，从一个小记录开始吧～`);
  }

  return {
    periodStart: dateKey(periodStart),
    periodEnd: dateKey(periodEnd),
    totalRecords: petRecords.length,
    totalHealthChecks: petHealth.length,
    totalWalks: petWalks.length,
    totalQA: petChats.length,
    photoCount,
    weightChange,
    weightStart,
    weightEnd,
    topKeywords,
    highlights,
    checkinHeat: heat,
    weightSeries,
  };
}

// ===== 衍生：新年寄语 =====
function blessing(pet: Pet, days: number): string {
  const tenureDays = Math.max(1, Math.floor((Date.now() - new Date(pet.createdAt).getTime()) / 86400000));
  const tenureYears = (tenureDays / 365).toFixed(1);
  if (tenureDays < 30) {
    return `欢迎 ${pet.name} 加入这个家 🏠 接下来的一年，希望 TA 吃得香、睡得好、被你宠成小公主。`;
  } else if (tenureDays < 365) {
    return `这是你和 ${pet.name} 相伴的第 ${tenureYears} 年 ✨ TA 的世界很小，你就是 TA 的全世界。`;
  } else if (tenureDays < 365 * 3) {
    return `${pet.name} 已经陪伴你 ${tenureYears} 年了 🎉 那些一起走过的四季，都是最珍贵的回忆。`;
  } else {
    return `陪伴是最长情的告白。${pet.name} 已陪你 ${tenureYears} 年 💗 新的一年，愿你继续被温柔以待。`;
  }
}

// ===== 稀有度颜色 =====
const RARITY_STYLE: Record<Achievement["rarity"], { bg: string; text: string; border: string; label: string }> = {
  common:    { bg: "bg-[var(--bg-soft)]",   text: "text-[var(--color-text-soft)]", border: "border-[var(--color-border)]", label: "普通" },
  rare:      { bg: "bg-[#5b9bd5]/15",       text: "text-[#3d7bb0]",                border: "border-[#5b9bd5]/40",         label: "稀有" },
  epic:      { bg: "bg-[#c084fc]/15",       text: "text-[#9b59b6]",                border: "border-[#c084fc]/40",         label: "史诗" },
  legendary: { bg: "bg-gradient-vip",       text: "text-white",                    border: "border-transparent",          label: "传说" },
};

// ===== 30 天热力图 =====
function Heatmap({ data }: { data: number[] }) {
  // 5 行 × 6 列
  const cols = 6;
  const rows = Math.ceil(data.length / cols);
  const cellSize = 26;
  const gap = 4;
  const w = cols * (cellSize + gap) - gap;
  const h = rows * (cellSize + gap) - gap;
  const max = Math.max(1, ...data);

  return (
    <div className="flex justify-center">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
        {data.map((count, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const intensity = count === 0 ? 0 : Math.min(1, 0.25 + (count / max) * 0.75);
          const fill = count === 0
            ? "#f0e3d6"
            : `rgba(255, 140, 90, ${intensity})`;
          return (
            <g key={i}>
              <rect
                x={c * (cellSize + gap)}
                y={r * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={6}
                fill={fill}
              />
              {count > 0 && (
                <text
                  x={c * (cellSize + gap) + cellSize / 2}
                  y={r * (cellSize + gap) + cellSize / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={intensity > 0.5 ? "white" : "var(--color-text)"}
                  opacity={0.85}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ===== 体重趋势线 =====
function WeightLine({ data }: { data: Array<{ date: string; weight: number }> }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-[var(--color-text-soft)]">
        还没有体重记录，从「记录体重」开始追踪吧～
      </div>
    );
  }
  if (data.length === 1) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-[var(--color-text-soft)] mb-1">当前体重</p>
        <p className="text-2xl font-extrabold text-[var(--color-primary)]">
          {data[0].weight.toFixed(1)}<span className="text-sm ml-0.5">kg</span>
        </p>
        <p className="text-[10px] text-[var(--color-text-soft)] mt-1">再记录一次就能看到趋势线啦</p>
      </div>
    );
  }
  const w = 300;
  const h = 120;
  const padding = 24;
  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const rangeW = Math.max(0.1, maxW - minW);
  const stepX = (w - padding * 2) / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = h - padding - ((d.weight - minW) / rangeW) * (h - padding * 2);
    return { x, y, w: d.weight, date: d.date };
  });
  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  // 渐变填充区
  const areaD = `${pathD} L ${points[points.length - 1].x} ${h - padding} L ${points[0].x} ${h - padding} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff8c5a" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ff8c5a" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* 横线网格 */}
        {[0, 0.5, 1].map((t, i) => (
          <line
            key={i}
            x1={padding}
            x2={w - padding}
            y1={padding + t * (h - padding * 2)}
            y2={padding + t * (h - padding * 2)}
            stroke="#f0e3d6"
            strokeWidth={1}
            strokeDasharray="2,3"
          />
        ))}
        {/* 面积 */}
        <path d={areaD} fill="url(#weight-area)" />
        {/* 折线 */}
        <path d={pathD} fill="none" stroke="#ff8c5a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* 数据点 */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="white" stroke="#ff8c5a" strokeWidth={2} />
          </g>
        ))}
        {/* 端点标注 */}
        <text x={points[0].x} y={points[0].y - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill="#3a2e2a">
          {points[0].w.toFixed(1)}
        </text>
        <text x={points[points.length - 1].x} y={points[points.length - 1].y - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill="#3a2e2a">
          {points[points.length - 1].w.toFixed(1)}
        </text>
        {/* 纵轴单位 */}
        <text x={4} y={padding + 4} fontSize={9} fill="var(--color-text-soft)">{maxW.toFixed(1)}kg</text>
        <text x={4} y={h - padding} fontSize={9} fill="var(--color-text-soft)">{minW.toFixed(1)}kg</text>
      </svg>
    </div>
  );
}

// ===== 报告卡（Hero） =====
function HeroCard({
  pet, data, periodLabel, gradient,
}: { pet: Pet; data: ReportData; periodLabel: string; gradient: string }) {
  const wcUp = data.weightChange !== null && data.weightChange > 0;
  const wcDown = data.weightChange !== null && data.weightChange < 0;
  const wcZero = data.weightChange === null || data.weightChange === 0;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-card">
      <div className={cn("bg-gradient-to-br p-5 text-white", gradient)}>
        {/* 顶部装饰条 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} />
            <span className="text-[10px] font-semibold tracking-wider opacity-90">毛球成长报告</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-sm font-medium">
            {periodLabel}
          </span>
        </div>

        {/* 宠物大头像 */}
        <div className="flex items-center gap-4 mt-2">
          <div className="w-20 h-20 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-5xl flex-shrink-0 ring-4 ring-white/30">
            {pet.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-extrabold leading-tight">{pet.name}</h2>
            <p className="text-xs opacity-90 mt-1">
              {speciesLabel(pet.species)} · {pet.breed}
            </p>
            <p className="text-[10px] opacity-80 mt-0.5">
              {data.periodStart} ~ {data.periodEnd}
            </p>
          </div>
        </div>

        {/* 大数字三件套 */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <BigStat icon={FileText} label="记录" value={data.totalRecords} />
          <BigStat icon={Footprints} label="打卡" value={data.totalHealthChecks + data.totalWalks} />
          <BigStat icon={MessageCircle} label="问答" value={data.totalQA} />
        </div>

        {/* 体重变化 */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/15 backdrop-blur-sm">
          <span className="text-xs opacity-90">体重变化</span>
          {wcZero ? (
            <span className="text-sm font-bold">暂无数据 / 无变化</span>
          ) : (
            <>
              <span className={cn("text-base font-extrabold flex items-center gap-0.5")}>
                {wcUp ? <TrendingUp size={16} /> : wcDown ? <TrendingDown size={16} /> : null}
                {wcUp ? "+" : ""}{data.weightChange!.toFixed(1)}kg
              </span>
              {data.weightStart !== null && data.weightEnd !== null && (
                <span className="text-[10px] opacity-80 ml-auto">
                  {data.weightStart.toFixed(1)} → {data.weightEnd.toFixed(1)}kg
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BigStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number }) {
  return (
    <div className="text-center bg-white/15 backdrop-blur-sm rounded-2xl py-2.5 px-1">
      <Icon size={16} className="mx-auto mb-1 opacity-90" />
      <p className="text-xl font-extrabold leading-none">{value}</p>
      <p className="text-[10px] opacity-90 mt-1">{label}</p>
    </div>
  );
}

export default function ReportPage() {
  const pets = useAppStore((s) => s.pets);
  const records = useAppStore((s) => s.records);
  const healthChecks = useAppStore((s) => s.healthChecks);
  const walkLogs = useAppStore((s) => s.walkLogs);
  const chats = useAppStore((s) => s.chats);
  const achievements = useAppStore((s) => s.achievements);
  const achievementUnlocks = useAppStore((s) => s.achievementUnlocks);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id || null);
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30d");

  const currentPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) || pets[0] || null,
    [pets, selectedPetId]
  );

  const periodConfig = PERIOD_OPTIONS.find((p) => p.key === periodKey)!;

  // 报告数据
  const report = useMemo(() => {
    if (!currentPet) return null;
    return buildReport(
      currentPet,
      periodConfig.days,
      records,
      healthChecks,
      walkLogs,
      chats,
      new Date()
    );
  }, [currentPet, periodConfig.days, records, healthChecks, walkLogs, chats]);

  // 时间段内解锁的成就
  const periodUnlocks = useMemo(() => {
    if (!currentPet) return [];
    const periodStart = Date.now() - periodConfig.days * 86400000;
    return achievementUnlocks
      .filter((u: AchievementUnlock) => new Date(u.unlockedAt).getTime() >= periodStart)
      .map((u) => ({
        unlock: u,
        achievement: achievements.find((a) => a.id === u.achievementId),
      }))
      .filter((x): x is { unlock: AchievementUnlock; achievement: Achievement } => !!x.achievement);
  }, [achievementUnlocks, achievements, currentPet, periodConfig.days]);

  // 累计所有成就
  const totalUnlocks = achievementUnlocks.length;

  const handleShare = () => {
    if (!currentPet) return;
    pushToast({
      kind: "success",
      title: "📸 报告已保存到剪贴板",
      message: "v0.1 mock：v0.3 将支持生成图片分享",
    });
  };

  // ===== 空状态 =====
  if (!currentPet) {
    return (
      <div className="space-y-4">
        <PageHeader title="成长报告" subtitle="回顾你和毛孩子的温馨时光" />
        <div className="mt-12 flex flex-col items-center text-center px-6">
          <div className="w-28 h-28 rounded-full bg-gradient-warm flex items-center justify-center text-6xl shadow-card mb-5">
            📊
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">还没有毛孩子</h2>
          <p className="text-sm text-[var(--color-text-soft)] mt-2 leading-relaxed">
            添加你的第一只宠物<br />开始记录 TA 的成长
          </p>
        </div>
        <AdBottom />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="成长报告"
        subtitle="回顾你和毛孩子的温馨时光"
        right={
          <span className="text-[10px] px-2 py-1 rounded-full bg-gradient-warm text-white font-medium flex items-center gap-0.5 shadow-soft">
            <Award size={11} />
            {totalUnlocks} 成就
          </span>
        }
      />

      {/* 宠物选择 chips */}
      {pets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {pets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPetId(p.id)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedPetId === p.id
                  ? "bg-[var(--color-primary)] text-white shadow-soft"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              )}
            >
              <span className="mr-1.5">{p.avatar}</span>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* 时间段切换 */}
      <div className="bg-white rounded-2xl p-1.5 shadow-soft flex gap-1">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodKey(p.key)}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1",
              periodKey === p.key
                ? cn("bg-gradient-to-br text-white shadow-soft", p.color)
                : "text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
            )}
          >
            <Calendar size={13} />
            {p.label}
          </button>
        ))}
      </div>

      {/* 大 Hero 报告卡 */}
      {report && (
        <HeroCard
          pet={currentPet}
          data={report}
          periodLabel={periodConfig.label}
          gradient={periodConfig.color}
        />
      )}

      {/* 分享按钮 */}
      <button
        onClick={handleShare}
        className="w-full py-3.5 rounded-2xl bg-gradient-warm text-white font-bold shadow-card flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Share2 size={18} />
        分享这份报告
      </button>

      {/* Highlights */}
      {report && (
        <section className="bg-white rounded-3xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-[var(--color-warning)]" />
            <h3 className="text-base font-bold text-[var(--color-text)]">本期亮点</h3>
          </div>
          <ul className="space-y-2.5">
            {report.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-text)] leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 打卡热力图 */}
      {report && (
        <section className="bg-white rounded-3xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Footprints size={16} className="text-[var(--color-success)]" />
              <h3 className="text-base font-bold text-[var(--color-text)]">打卡热力图</h3>
            </div>
            <span className="text-[10px] text-[var(--color-text-soft)]">
              近 {report.checkinHeat.length} 天
            </span>
          </div>
          <Heatmap data={report.checkinHeat} />
          <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-[var(--color-text-soft)]">
            <span>少</span>
            {[0, 0.25, 0.5, 0.75, 1].map((o, i) => (
              <span
                key={i}
                className="inline-block w-3.5 h-3.5 rounded"
                style={{ backgroundColor: o === 0 ? "#f0e3d6" : `rgba(255, 140, 90, ${o})` }}
              />
            ))}
            <span>多</span>
          </div>
        </section>
      )}

      {/* 体重趋势 */}
      {report && (
        <section className="bg-white rounded-3xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--color-primary)]" />
              <h3 className="text-base font-bold text-[var(--color-text)]">体重趋势</h3>
            </div>
            {report.weightSeries.length > 1 && (
              <span className="text-[10px] text-[var(--color-text-soft)]">
                {report.weightSeries.length} 个数据点
              </span>
            )}
          </div>
          <WeightLine data={report.weightSeries} />
        </section>
      )}

      {/* 关键词云 */}
      {report && (
        <section className="bg-white rounded-3xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-[var(--color-secondary)]" />
            <h3 className="text-base font-bold text-[var(--color-text)]">本期关键词</h3>
          </div>
          {report.topKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {report.topKeywords.map((w, i) => {
                // 按排名给不同大小
                const sizeMap = ["text-xl", "text-lg", "text-base", "text-sm", "text-sm"];
                const colorMap = [
                  "text-[var(--color-primary)] font-extrabold",
                  "text-[var(--color-secondary)] font-bold",
                  "text-[var(--color-warning)] font-bold",
                  "text-[var(--color-text)] font-semibold",
                  "text-[var(--color-text-soft)] font-medium",
                ];
                return (
                  <span
                    key={w}
                    className={cn("px-3 py-1.5 rounded-full bg-[var(--bg-soft)]", sizeMap[i], colorMap[i])}
                  >
                    {w}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--color-text-soft)] py-4">
              本期还没有问答记录，多问问 AI 兽医吧～
            </p>
          )}
        </section>
      )}

      {/* 成就里程碑 */}
      <section className="bg-white rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-[var(--color-vip)]" />
            <h3 className="text-base font-bold text-[var(--color-text)]">成就里程碑</h3>
          </div>
          <span className="text-[10px] text-[var(--color-text-soft)]">
            本期解锁 {periodUnlocks.length} 个
          </span>
        </div>
        {periodUnlocks.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {periodUnlocks.slice(0, 6).map(({ achievement }) => {
              const rs = RARITY_STYLE[achievement.rarity];
              return (
                <div
                  key={achievement.id}
                  className={cn(
                    "rounded-2xl p-3 flex flex-col items-center text-center border",
                    rs.bg,
                    rs.border
                  )}
                >
                  <div className="text-2xl mb-1">{achievement.emoji}</div>
                  <p className={cn("text-xs font-bold leading-tight line-clamp-1", rs.text)}>
                    {achievement.title}
                  </p>
                  <span className={cn("text-[9px] mt-0.5 opacity-80", rs.text)}>{rs.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-xs text-[var(--color-text-soft)] py-4">
            本期还没解锁新成就，继续坚持打卡吧～
          </p>
        )}
        <Link
          href="/profile"
          className="mt-3 flex items-center justify-center gap-1 text-xs text-[var(--color-primary)] font-semibold"
        >
          查看全部成就墙 <ChevronRight size={12} />
        </Link>
      </section>

      {/* 新年寄语 */}
      <section className="rounded-3xl bg-gradient-warm text-white p-5 shadow-card relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={16} className="text-white" fill="white" />
            <h3 className="text-base font-bold">温馨寄语</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-95">
            {blessing(currentPet, periodConfig.days)}
          </p>
        </div>
      </section>

      {/* v0.1 提示 */}
      <p className="text-[10px] text-center text-[var(--color-text-soft)] px-4">
        v0.1 报告基于本地数据计算，v0.3 将支持导出图片 + 社交分享
      </p>

      <AdBottom />
    </div>
  );
}
