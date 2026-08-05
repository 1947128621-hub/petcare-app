"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Minus, Check, Footprints, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import type { WalkLog } from "@/lib/types";

const WALK_GREEN = "#8bc891";
const QUICK_DURATIONS = [15, 30, 45, 60, 90];

export default function WalkCheckinPage() {
  const router = useRouter();
  const pets = useAppStore((s) => s.pets);
  const walkLogs = useAppStore((s) => s.walkLogs);
  const addWalkLog = useAppStore((s) => s.addWalkLog);

  // 默认选第一只宠物；如果是狗类则更推荐（遛狗场景）
  const defaultPet = useMemo(() => {
    const dog = pets.find((p) => p.species === "dog");
    return dog || pets[0];
  }, [pets]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(defaultPet?.id || null);
  // 宠物列表更新（添加新狗）时同步
  useEffect(() => {
    if (!selectedPetId && defaultPet) setSelectedPetId(defaultPet.id);
  }, [defaultPet, selectedPetId]);

  const [duration, setDuration] = useState<number>(30);
  const [distance, setDistance] = useState<string>("");
  const [note, setNote] = useState("");

  const currentPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId),
    [pets, selectedPetId]
  );

  // ===== 今日已遛狗 =====
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayWalks = useMemo(() => {
    if (!currentPet) return [];
    return walkLogs
      .filter((w) => w.petId === currentPet.id && new Date(w.createdAt) >= todayStart)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [walkLogs, currentPet, todayStart]);

  const todayCount = todayWalks.length;
  const todayTotalMin = todayWalks.reduce((s, w) => s + w.durationMin, 0);
  const todayTotalKm = todayWalks.reduce((s, w) => s + (w.distanceKm || 0), 0);

  // ===== 提交 =====
  const handleSubmit = () => {
    if (!currentPet) {
      pushToast({ kind: "warning", title: "请先选择宠物" });
      return;
    }
    if (!duration || duration <= 0) {
      pushToast({ kind: "warning", title: "时长需大于 0" });
      return;
    }
    const dist = distance.trim() === "" ? undefined : Number(distance);
    if (distance.trim() !== "" && (Number.isNaN(dist!) || dist! < 0)) {
      pushToast({ kind: "warning", title: "距离格式不对", message: "请填非负数字" });
      return;
    }
    const payload: Omit<WalkLog, "id" | "createdAt"> = {
      petId: currentPet.id,
      durationMin: Math.round(duration),
      distanceKm: dist !== undefined ? Math.round(dist! * 10) / 10 : undefined,
      note: note.trim() || undefined,
    };
    addWalkLog(payload);
    pushToast({ kind: "success", title: "已记录今天的遛狗", message: `${payload.durationMin} 分钟` });
    setTimeout(() => router.push("/checkin"), 350);
  };

  if (pets.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="遛狗打卡" subtitle="每天遛一遛，毛孩子乐无忧" back />
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl shadow-soft">
          <span className="text-5xl mb-2">🐾</span>
          <p className="text-sm text-[var(--color-text)] font-semibold">还没有宠物</p>
          <p className="text-xs text-[var(--color-text-soft)] mt-1">先添加一只宠物再遛狗吧</p>
          <Link
            href="/pets/new"
            className="mt-4 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft"
          >
            添加宠物
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-28">
      {/* 自定义返回按钮 */}
      <Link
        href="/checkin"
        aria-label="返回"
        className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
      >
        <ChevronLeft size={20} />
      </Link>

      <PageHeader title="遛狗打卡" subtitle="每天遛一遛，毛孩子乐无忧" back />

      <div className="mt-2 space-y-4">
        {/* 宠物选择 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {pets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPetId(p.id)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedPetId === p.id
                  ? "text-white shadow-soft"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              )}
              style={selectedPetId === p.id ? { backgroundColor: WALK_GREEN } : undefined}
            >
              <span className="mr-1.5">{p.avatar}</span>
              {p.name}
            </button>
          ))}
        </div>

        {/* 时长卡片（核心） */}
        <section className="bg-white rounded-3xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Footprints size={18} style={{ color: WALK_GREEN }} />
            <h3 className="text-sm font-bold text-[var(--color-text)]">遛狗时长</h3>
          </div>

          {/* 大数字 + +/- */}
          <div className="flex items-center justify-center gap-5 py-3">
            <button
              onClick={() => setDuration((d) => Math.max(5, d - 5))}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-soft)] text-[var(--color-text)] active:scale-95 transition-transform shadow-soft"
              aria-label="减 5 分钟"
            >
              <Minus size={20} />
            </button>
            <div className="flex flex-col items-center min-w-[120px]">
              <span
                className="text-5xl font-extrabold leading-none"
                style={{ color: WALK_GREEN }}
              >
                {duration}
              </span>
              <span className="text-xs text-[var(--color-text-soft)] mt-1.5">分钟</span>
            </div>
            <button
              onClick={() => setDuration((d) => Math.min(300, d + 5))}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform shadow-soft"
              style={{ backgroundColor: WALK_GREEN }}
              aria-label="加 5 分钟"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* 快捷时长 chip */}
          <div className="flex flex-wrap gap-2 justify-center pt-3 border-t border-[var(--color-border)] mt-3">
            {QUICK_DURATIONS.map((m) => (
              <button
                key={m}
                onClick={() => setDuration(m)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95",
                  duration === m
                    ? "text-white shadow-soft"
                    : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                )}
                style={duration === m ? { backgroundColor: WALK_GREEN } : undefined}
              >
                {m} min
              </button>
            ))}
          </div>
        </section>

        {/* 距离（可选） */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-[var(--color-text-soft)]" />
            <label className="text-sm font-semibold text-[var(--color-text)]">距离（可选）</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="0.0"
              min="0"
              max="100"
              step="0.1"
              className="flex-1 px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <span className="text-sm text-[var(--color-text-soft)] flex-shrink-0">km</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-soft)] mt-1.5">
            不知道距离可以不填
          </p>
        </section>

        {/* 备注 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
            备注
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：沿河边走，遇见柯基"
            rows={3}
            maxLength={100}
            className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
          />
        </section>

        {/* 今日已遛狗 */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-sm font-bold text-[var(--color-text)]">今日已遛狗</h3>
            <span className="text-[11px] text-[var(--color-text-soft)]">
              {todayCount > 0 ? `${todayCount} 次 · ${todayTotalMin} 分钟` : "今日还未遛狗"}
            </span>
          </div>

          {todayWalks.length === 0 ? (
            <div className="flex items-center justify-center py-6 bg-white rounded-2xl shadow-soft">
              <p className="text-xs text-[var(--color-text-soft)]">填好信息后点击下方按钮完成 ✓</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)]">
              {todayWalks.map((w) => (
                <div key={w.id} className="px-3.5 py-3 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${WALK_GREEN}29` }}
                  >
                    <Footprints size={16} style={{ color: WALK_GREEN }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {w.durationMin} 分钟
                      {w.distanceKm ? ` · ${w.distanceKm} km` : ""}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5 truncate">
                      {w.note || "—"}
                      <span className="ml-2">{formatDate(w.createdAt)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 底部固定提交按钮 */}
      <div className="fixed left-0 right-0 bottom-20 z-30 px-4">
        <div className="max-w-[480px] mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-full text-white font-semibold shadow-card active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${WALK_GREEN} 0%, #6db874 100%)`,
            }}
          >
            <Check size={18} /> 完成遛狗
          </button>
        </div>
      </div>

      <AdBottom />
    </div>
  );
}
