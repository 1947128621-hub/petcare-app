"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, ChevronRight, Trash2, PawPrint,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useConfirm } from "@/components/useConfirm";
import { speciesLabel, speciesEmoji, cn } from "@/lib/utils";
import type { Pet } from "@/lib/types";

// 长按计时（ms）
const LONG_PRESS_MS = 600;

function PetCard({
  pet,
  onDelete,
  onOpen,
}: {
  pet: Pet;
  onDelete: () => void;
  onOpen: () => void;
}) {
  // 长按检测：桌面用 contextmenu，移动端用 touchstart/touchend 计时器
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  const startLongPress = () => {
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      onDelete();
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        onDelete();
      }}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onClick={() => {
        if (!longPressedRef.current) onOpen();
      }}
      className="bg-white rounded-3xl p-4 shadow-soft flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="w-16 h-16 rounded-full bg-gradient-warm flex items-center justify-center text-3xl flex-shrink-0 shadow-soft">
        {pet.avatar || speciesEmoji(pet.species)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[var(--color-text)] truncate">{pet.name}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)] font-medium flex-shrink-0">
            {speciesLabel(pet.species)}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-soft)] mt-1 truncate">
          {pet.breed || "未填品种"} · {pet.age} 岁 · {pet.weight}kg
        </p>
        {pet.notes && (
          <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5 line-clamp-1 opacity-80">
            {pet.notes}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-soft)] hover:bg-[var(--bg-soft)] hover:text-[var(--color-danger)] transition-colors flex-shrink-0"
        aria-label="删除宠物"
      >
        <Trash2 size={16} />
      </button>
      <ChevronRight size={18} className="text-[var(--color-text-soft)] flex-shrink-0" />
    </div>
  );
}

export default function PetsListPage() {
  const router = useRouter();
  const pets = useAppStore((s) => s.pets);
  const records = useAppStore((s) => s.records);
  const deletePet = useAppStore((s) => s.deletePet);
  const confirm = useConfirm();

  const handleDelete = async (pet: Pet) => {
    const recCount = records.filter((r) => r.petId === pet.id).length;
    const desc = recCount > 0
      ? `将同时删除该宠物的 ${recCount} 条记录，此操作不可恢复。`
      : "此操作不可恢复。";
    const ok = await confirm({ title: `删除「${pet.name}」`, description: desc, variant: "danger", confirmText: "删除" });
    if (!ok) return;
    deletePet(pet.id);
    pushToast({ kind: "success", title: "已删除", message: `${pet.name} 的档案已移除` });
  };

  return (
    <div className="relative min-h-[60vh]">
      <PageHeader title="我的宠物" subtitle="管理你的毛孩子档案" />

      {pets.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center px-6">
          <div className="w-28 h-28 rounded-full bg-gradient-warm flex items-center justify-center text-6xl shadow-card mb-5">
            🐾
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">还没有毛孩子档案</h2>
          <p className="text-sm text-[var(--color-text-soft)] mt-2 leading-relaxed">
            添加你的第一只宠物<br />开始记录你们的故事
          </p>
          <button
            type="button"
            onClick={() => router.push("/pets/new")}
            className="mt-6 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold shadow-card active:scale-95 transition-transform flex items-center gap-2"
          >
            <Plus size={18} />
            添加第一只宠物
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          {pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onOpen={() => router.push(`/pets/${pet.id}`)}
              onDelete={() => handleDelete(pet)}
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        <AdBottom />
      </div>

      {/* FAB — 仅在已有宠物时显示（空状态有大按钮） */}
      {pets.length > 0 && (
        <button
          type="button"
          onClick={() => router.push("/pets/new")}
          aria-label="添加宠物"
          className={cn(
            "fixed z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white",
            "shadow-card flex items-center justify-center active:scale-95 transition-transform",
            "bottom-24 right-4"
          )}
          style={{ boxShadow: "0 6px 20px rgba(255,140,90,0.45)" }}
        >
          <PawPrint size={22} />
        </button>
      )}
    </div>
  );
}
