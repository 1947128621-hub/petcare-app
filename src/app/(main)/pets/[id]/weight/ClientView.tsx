"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Scale,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { formatDate, formatDateShort, cn } from "@/lib/utils";
import type { PetRecord } from "@/lib/types";

// ===== 单条体重数据 =====
type WeightPoint = {
  record: PetRecord;
  weight: number;
  ts: number;
};

// ===== Modal 基础（沿用 pets/[id] 中的样式）=====
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50 animate-fade-up" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-card animate-fade-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--color-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-soft)] hover:bg-[var(--bg-soft)]"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ===== 体重曲线图（纯 SVG）=====
function WeightChart({ data }: { data: WeightPoint[] }) {
  const W = 360;
  const H = 200;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 30;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const layout = useMemo(() => {
    if (data.length === 0) {
      return {
        points: [] as Array<{ x: number; y: number }>,
        yLo: 0,
        yHi: 1,
        avg: 0,
        anomalies: new Set<number>(),
        pathD: "",
      };
    }
    const weights = data.map((d) => d.weight);
    const wMin = Math.min(...weights);
    const wMax = Math.max(...weights);
    const range = wMax - wMin;
    // Y 轴上下留 20% 余量，最小跨度 0.6
    let yLo = wMin - Math.max(range * 0.2, 0.3);
    let yHi = wMax + Math.max(range * 0.2, 0.3);
    if (yHi - yLo < 0.6) {
      const mid = (yLo + yHi) / 2;
      yLo = mid - 0.3;
      yHi = mid + 0.3;
    }
    // 平均
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    // 异常点：与上一次相比变化 > 10%
    const anomalies = new Set<number>();
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1].weight;
      if (prev <= 0) continue;
      if (Math.abs(data[i].weight - prev) / prev > 0.1) {
        anomalies.add(i);
      }
    }
    // 时间范围
    const tMin = data[0].ts;
    const tMax = data[data.length - 1].ts;
    const tRange = tMax - tMin || 1;
    // 折点坐标
    const points = data.map((d) => {
      const x =
        data.length === 1
          ? PAD_L + innerW / 2
          : PAD_L + ((d.ts - tMin) / tRange) * innerW;
      const y = PAD_T + (1 - (d.weight - yLo) / (yHi - yLo)) * innerH;
      return { x, y };
    });
    // 折线 path
    let pathD = "";
    if (points.length > 1) {
      pathD =
        "M " +
        points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");
    }
    return { points, yLo, yHi, avg, anomalies, pathD };
  }, [data, innerH, innerW]);

  if (data.length === 0) return null;

  const { points, yLo, yHi, avg, anomalies, pathD } = layout;

  // 平均线 y
  const avgY = PAD_T + (1 - (avg - yLo) / (yHi - yLo)) * innerH;

  // y 轴 3 个刻度（min / mid / max）
  const yTicks = [yLo, (yLo + yHi) / 2, yHi];

  // x 轴标签（最多 3 个：首 / 中 / 尾）
  const xLabels: Array<{ x: number; label: string }> = [];
  if (data.length === 1) {
    xLabels.push({
      x: points[0].x,
      label: formatDateShort(new Date(data[0].ts).toISOString()),
    });
  } else if (data.length === 2) {
    xLabels.push({
      x: points[0].x,
      label: formatDateShort(new Date(data[0].ts).toISOString()),
    });
    xLabels.push({
      x: points[1].x,
      label: formatDateShort(new Date(data[1].ts).toISOString()),
    });
  } else {
    const idxs = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);
    Array.from(idxs).forEach((i) => {
      xLabels.push({
        x: points[i].x,
        label: formatDateShort(new Date(data[i].ts).toISOString()),
      });
    });
  }

  const hoveredPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h4 className="text-sm font-semibold text-[var(--color-text)]">体重曲线</h4>
        <div className="flex items-center gap-2.5 text-[10px] text-[var(--color-text-soft)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            体重
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 border-t border-dashed border-[var(--color-text-soft)]" />
            均值
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />
            异常
          </span>
        </div>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="体重趋势曲线"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Y 轴网格 + 标签 */}
          {yTicks.map((t, i) => {
            const y = PAD_T + (1 - (t - yLo) / (yHi - yLo)) * innerH;
            return (
              <g key={`y-${i}`}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={W - PAD_R}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <text
                  x={PAD_L - 6}
                  y={y + 3}
                  fontSize="9"
                  textAnchor="end"
                  fill="var(--color-text-soft)"
                >
                  {t.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* 平均参考线 */}
          <line
            x1={PAD_L}
            y1={avgY}
            x2={W - PAD_R}
            y2={avgY}
            stroke="var(--color-text-soft)"
            strokeWidth={1.2}
            strokeDasharray="4 3"
            opacity={0.65}
          />
          <text
            x={W - PAD_R}
            y={avgY - 4}
            fontSize="9"
            textAnchor="end"
            fill="var(--color-text-soft)"
          >
            均 {avg.toFixed(1)}
          </text>

          {/* 折线 */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 数据点 */}
          {points.map((p, i) => {
            const isAnomaly = anomalies.has(i);
            const isHover = hoverIdx === i;
            return (
              <g key={`p-${i}`}>
                {isHover && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={10}
                    fill="none"
                    stroke={isAnomaly ? "var(--color-danger)" : "var(--color-primary)"}
                    strokeOpacity={0.25}
                    strokeWidth={2}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHover ? 6 : 4}
                  fill={isAnomaly ? "var(--color-danger)" : "white"}
                  stroke={isAnomaly ? "var(--color-danger)" : "var(--color-primary)"}
                  strokeWidth={2.5}
                  onMouseEnter={() => setHoverIdx(i)}
                  onFocus={() => setHoverIdx(i)}
                  onBlur={() => setHoverIdx(null)}
                  onTouchStart={() => setHoverIdx(i)}
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                />
              </g>
            );
          })}

          {/* hover 引导线 */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={PAD_T}
              x2={hoveredPoint.x}
              y2={H - PAD_B}
              stroke="var(--color-primary)"
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.5}
            />
          )}

          {/* X 轴标签 */}
          {xLabels.map((l, i) => (
            <text
              key={`x-${i}`}
              x={l.x}
              y={H - 10}
              fontSize="9"
              textAnchor="middle"
              fill="var(--color-text-soft)"
            >
              {l.label.slice(5)}
            </text>
          ))}
        </svg>
        {/* hover tooltip */}
        {hovered && hoveredPoint && (
          <div
            className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-[var(--color-text)] text-white text-[11px] shadow-soft pointer-events-none whitespace-nowrap"
            style={{
              left: `${(hoveredPoint.x / W) * 100}%`,
              top: `${(hoveredPoint.y / H) * 100}%`,
              transform: "translate(-50%, -130%)",
            }}
          >
            <div className="font-semibold">{hovered.weight.toFixed(1)} kg</div>
            <div className="opacity-75">
              {formatDateShort(new Date(hovered.ts).toISOString())}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeightPage({ id }: { id: string }) {
  const pet = useAppStore((s) => s.pets.find((p) => p.id === id));
  const allRecords = useAppStore((s) => s.records);
  const addRecord = useAppStore((s) => s.addRecord);

  const [weightOpen, setWeightOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightNote, setWeightNote] = useState("");

  // 过滤该宠物的体重记录，按时间正序
  const weightRecords = useMemo<WeightPoint[]>(() => {
    if (!pet) return [];
    return allRecords
      .filter(
        (r) =>
          r.petId === pet.id &&
          r.type === "weight" &&
          r.meta &&
          typeof r.meta.weight === "number"
      )
      .map<WeightPoint>((r) => ({
        record: r,
        weight: r.meta!.weight as number,
        ts: new Date(r.createdAt).getTime(),
      }))
      .sort((a, b) => a.ts - b.ts);
  }, [allRecords, pet]);

  if (!pet) {
    return (
      <div className="pt-10 px-4 text-center">
        <p className="text-[var(--color-text-soft)] mb-4">找不到这只宠物了</p>
        <Link
          href="/pets"
          className="inline-block px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold"
        >
          返回列表
        </Link>
      </div>
    );
  }

  const latest =
    weightRecords.length > 0 ? weightRecords[weightRecords.length - 1] : null;
  const prev =
    weightRecords.length >= 2 ? weightRecords[weightRecords.length - 2] : null;
  const diff =
    latest && prev
      ? Math.round((latest.weight - prev.weight) * 100) / 100
      : null;

  const maxW = weightRecords.length
    ? Math.max(...weightRecords.map((p) => p.weight))
    : 0;
  const minW = weightRecords.length
    ? Math.min(...weightRecords.map((p) => p.weight))
    : 0;
  const avgW = weightRecords.length
    ? weightRecords.reduce((a, p) => a + p.weight, 0) / weightRecords.length
    : 0;

  const submitWeight = () => {
    const w = Number(weightInput);
    if (!weightInput.trim() || Number.isNaN(w) || w <= 0) {
      pushToast({ kind: "warning", title: "请填有效体重", message: "必须大于 0" });
      return;
    }
    const rounded = Math.round(w * 10) / 10;
    addRecord({
      petId: pet.id,
      type: "weight",
      title: `体重 ${rounded} kg`,
      content: weightNote.trim() || `当前体重 ${rounded} kg`,
      meta: { weight: rounded },
    });
    pushToast({ kind: "success", title: "已记录", message: `体重 ${rounded} kg` });
    setWeightInput("");
    setWeightNote("");
    setWeightOpen(false);
  };

  // 历史列表：倒序（最新在前）
  const history = useMemo(() => [...weightRecords].reverse(), [weightRecords]);

  return (
    <div className="relative pb-10">
      <Link
        href={`/pets/${pet.id}`}
        aria-label="返回"
        className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
      >
        <ChevronLeft size={20} />
      </Link>

      <PageHeader
        title="体重趋势"
        subtitle={`${pet.name} 的体重记录`}
        back
      />

      {weightRecords.length === 0 ? (
        <div className="mt-8 bg-white rounded-2xl p-10 text-center shadow-soft">
          <div className="text-5xl mb-3">⚖️</div>
          <h3 className="text-base font-bold text-[var(--color-text)] mb-1">
            还没有体重记录
          </h3>
          <p className="text-xs text-[var(--color-text-soft)]">
            先记一次吧，持续记录才能看到曲线趋势
          </p>
          <button
            type="button"
            onClick={() => setWeightOpen(true)}
            className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold active:scale-95 transition-transform"
          >
            <Plus size={16} /> 记第一次体重
          </button>
        </div>
      ) : (
        <>
          {/* Hero 卡：当前体重 + 对比 */}
          <div className="mt-2 rounded-3xl bg-gradient-warm text-white p-5 shadow-card relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-[120px] opacity-10 select-none pointer-events-none">
              {pet.avatar || "🐾"}
            </div>
            <p className="text-[11px] opacity-85 relative">当前体重</p>
            <div className="flex items-baseline gap-2 mt-1 relative">
              <span className="text-4xl font-extrabold tracking-tight">
                {latest!.weight.toFixed(1)}
              </span>
              <span className="text-sm opacity-90">kg</span>
            </div>
            {diff !== null && prev ? (
              <div className="mt-3 flex items-center gap-2 text-xs relative">
                {diff > 0 ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[var(--color-warning)]/30 backdrop-blur-sm font-semibold">
                    <TrendingUp size={12} /> +{diff.toFixed(1)} kg
                  </span>
                ) : diff < 0 ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[var(--color-success)]/30 backdrop-blur-sm font-semibold">
                    <TrendingDown size={12} /> {diff.toFixed(1)} kg
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-sm font-semibold">
                    <Minus size={12} /> 0 kg
                  </span>
                )}
                <span className="opacity-85">较上次</span>
              </div>
            ) : (
              <p className="mt-2 text-xs opacity-85 relative">
                首次记录 · 持续追踪看趋势
              </p>
            )}
          </div>

          {/* 统计 3 列 */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl p-3 shadow-soft text-center">
              <p className="text-[10px] text-[var(--color-text-soft)]">最高</p>
              <p className="text-base font-bold text-[var(--color-text)] mt-0.5">
                {maxW.toFixed(1)}
              </p>
              <p className="text-[9px] text-[var(--color-text-soft)]">kg</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-soft text-center">
              <p className="text-[10px] text-[var(--color-text-soft)]">最低</p>
              <p className="text-base font-bold text-[var(--color-text)] mt-0.5">
                {minW.toFixed(1)}
              </p>
              <p className="text-[9px] text-[var(--color-text-soft)]">kg</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-soft text-center">
              <p className="text-[10px] text-[var(--color-text-soft)]">平均</p>
              <p className="text-base font-bold text-[var(--color-text)] mt-0.5">
                {avgW.toFixed(1)}
              </p>
              <p className="text-[9px] text-[var(--color-text-soft)]">kg</p>
            </div>
          </div>

          {/* 曲线图 */}
          <div className="mt-3">
            <WeightChart data={weightRecords} />
          </div>

          {/* 历史列表 */}
          <section className="mt-6">
            <h3 className="text-base font-bold text-[var(--color-text)] mb-3">
              历史记录
              <span className="ml-2 text-xs font-normal text-[var(--color-text-soft)]">
                {weightRecords.length} 条
              </span>
            </h3>
            <div className="space-y-2">
              {history.map((p, idx) => {
                // history 是倒序，下一个就是更早的那条
                const prevP = history[idx + 1];
                const change =
                  prevP
                    ? Math.round((p.weight - prevP.weight) * 100) / 100
                    : null;
                return (
                  <div
                    key={p.record.id}
                    className="bg-white rounded-2xl p-3 shadow-soft flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-soft)] flex items-center justify-center text-[var(--color-primary)] flex-shrink-0">
                      <Scale size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {p.weight.toFixed(1)} kg
                      </p>
                      <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
                        {formatDate(p.record.createdAt)}
                      </p>
                    </div>
                    {change !== null && (
                      <div
                        className={cn(
                          "text-[11px] font-semibold flex items-center gap-0.5 flex-shrink-0",
                          change > 0
                            ? "text-[var(--color-warning)]"
                            : change < 0
                              ? "text-[var(--color-success)]"
                              : "text-[var(--color-text-soft)]"
                        )}
                      >
                        {change > 0 ? (
                          <TrendingUp size={11} />
                        ) : change < 0 ? (
                          <TrendingDown size={11} />
                        ) : (
                          <Minus size={11} />
                        )}
                        {change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <div className="mt-5">
        <AdBottom />
      </div>

      {/* FAB：仅在有记录时显示，空状态已经有显式按钮了 */}
      {weightRecords.length > 0 && (
        <button
          type="button"
          onClick={() => setWeightOpen(true)}
          aria-label="添加体重"
          className="fixed right-5 bottom-24 z-30 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-card flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      )}

      {/* 添加体重 Modal */}
      <Modal
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        title="⚖️ 记录体重"
      >
        <p className="text-[11px] text-[var(--color-text-soft)] bg-[var(--bg-soft)] rounded-xl px-3 py-2 mb-3">
          {latest
            ? `上次 ${latest.weight.toFixed(1)} kg · ${formatDate(latest.record.createdAt)}`
            : `${pet.name} 的第一次体重记录`}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">
              体重 (kg) <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={latest ? `${latest.weight.toFixed(1)}` : `${pet.weight}`}
              min="0"
              max="200"
              step="0.1"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">
              备注（可选）
            </label>
            <input
              type="text"
              value={weightNote}
              onChange={(e) => setWeightNote(e.target.value)}
              placeholder="例如：饭前 / 刚运动完"
              maxLength={50}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={submitWeight}
          className="w-full mt-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          保存体重
        </button>
      </Modal>
    </div>
  );
}
