// ===== 装扮商店 =====
//
// v0.4.0.2 P1-6 — 积分系统 + 装扮系统(MVP 1.0)
//   - 3 个主题色(default / warm / cool)+ 2 个背景图(none / paw)
//   - 积分扣减走 store.spendPoints
//   - 装扮状态存 localStorage(petcare-decoration-v1)
//   - 当前装扮预览 + 已购/未购区分
//
// 历史:此页 v0.4.0.2 之前不存在 —— 从「我的」进 /points-shop 会 404

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Coins, Check, Lock, Sparkles, Palette, Image as ImageIcon } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { pushToast } from "@/components/Toast";
import { DECORATION_ITEMS } from "@/lib/versions";
import type { DecorationState, ColorTheme, BgImage, DecorationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "petcare-decoration-v1";
const OWNED_KEY = "petcare-decoration-owned-v1";
const DEFAULT_STATE: DecorationState = { colorTheme: "default", bgImage: "none" };

export default function PointsShopPage() {
  const points = useAppStore((s) => s.membership.points);
  const spendPoints = useAppStore((s) => s.spendPoints);

  const [mounted, setMounted] = useState(false);
  const [decoration, setDecoration] = useState<DecorationState>(DEFAULT_STATE);
  const [owned, setOwned] = useState<Set<string>>(new Set(["color-default", "bg-none"]));

  // 加载本地状态
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    try {
      const rawD = localStorage.getItem(STORAGE_KEY);
      if (rawD) setDecoration({ ...DEFAULT_STATE, ...JSON.parse(rawD) });
      const rawO = localStorage.getItem(OWNED_KEY);
      if (rawO) {
        const arr = JSON.parse(rawO) as string[];
        setOwned(new Set(["color-default", "bg-none", ...arr]));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 持久化
  const persistDecoration = (next: DecorationState) => {
    setDecoration(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };
  const persistOwned = (next: Set<string>) => {
    setOwned(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(OWNED_KEY, JSON.stringify(Array.from(next).filter((k) => k !== "color-default" && k !== "bg-none")));
    }
  };

  const handleBuy = (item: DecorationItem) => {
    if (owned.has(item.id)) {
      // 已拥有 → 直接装备
      handleEquip(item);
      return;
    }
    if (points < item.price) {
      pushToast({ kind: "warning", title: "积分不足", message: `需要 ${item.price} 积分,当前 ${points}` });
      return;
    }
    const ok = spendPoints(item.price);
    if (!ok) {
      pushToast({ kind: "error", title: "扣分失败" });
      return;
    }
    const next = new Set(owned);
    next.add(item.id);
    persistOwned(next);
    pushToast({ kind: "success", title: "已购买", message: `${item.emoji} ${item.name}` });
    handleEquip(item);
  };

  const handleEquip = (item: DecorationItem) => {
    if (item.kind === "color") {
      persistDecoration({ ...decoration, colorTheme: item.value as ColorTheme });
    } else {
      persistDecoration({ ...decoration, bgImage: item.value as BgImage });
    }
    pushToast({ kind: "success", title: "已装备", message: `${item.emoji} ${item.name}` });
  };

  const colorItems = useMemo(() => DECORATION_ITEMS.filter((i) => i.kind === "color"), []);
  const bgItems = useMemo(() => DECORATION_ITEMS.filter((i) => i.kind === "bg"), []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="装扮商店"
        subtitle="用积分换主题"
        right={
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
            <Coins size={13} />
            {mounted ? points : "—"}
          </div>
        }
      />

      {/* 当前装扮预览 */}
      <section className="bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 rounded-3xl p-5 shadow-card relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-[80px] opacity-10 select-none">🎨</div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-amber-700" />
            <h3 className="text-sm font-bold text-amber-900">当前装扮</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-amber-900">
            <div className="bg-white/40 backdrop-blur-sm rounded-xl p-2">
              <p className="text-[10px] text-amber-700 mb-0.5">主题色</p>
              <p className="font-bold">
                {colorItems.find((i) => i.value === decoration.colorTheme)?.name ?? "默认橘色"}
              </p>
            </div>
            <div className="bg-white/40 backdrop-blur-sm rounded-xl p-2">
              <p className="text-[10px] text-amber-700 mb-0.5">背景图</p>
              <p className="font-bold">
                {bgItems.find((i) => i.value === decoration.bgImage)?.name ?? "无背景"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 主题色 */}
      <section>
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-2.5 px-1 flex items-center gap-1.5">
          <Palette size={14} className="text-[var(--color-primary)]" />
          主题色
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {colorItems.map((item) => {
            const isOwned = owned.has(item.id);
            const isActive = decoration.colorTheme === item.value;
            const canAfford = points >= item.price;
            return (
              <ColorCard
                key={item.id}
                item={item}
                isOwned={isOwned}
                isActive={isActive}
                canAfford={canAfford}
                onBuy={() => handleBuy(item)}
              />
            );
          })}
        </div>
      </section>

      {/* 背景图 */}
      <section>
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-2.5 px-1 flex items-center gap-1.5">
          <ImageIcon size={14} className="text-[var(--color-primary)]" />
          背景图
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {bgItems.map((item) => {
            const isOwned = owned.has(item.id);
            const isActive = decoration.bgImage === item.value;
            const canAfford = points >= item.price;
            return (
              <BgCard
                key={item.id}
                item={item}
                isOwned={isOwned}
                isActive={isActive}
                canAfford={canAfford}
                onBuy={() => handleBuy(item)}
              />
            );
          })}
        </div>
      </section>

      {/* 积分怎么得 */}
      <section className="bg-white rounded-2xl shadow-soft p-4">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-2.5 flex items-center gap-1.5">
          <Coins size={14} className="text-amber-500" />
          积分怎么得
        </h3>
        <ul className="text-xs text-[var(--color-text-soft)] space-y-1.5">
          <li className="flex justify-between"><span>📅 每日打卡</span><span className="font-bold text-amber-600">+10</span></li>
          <li className="flex justify-between"><span>📷 上传照片</span><span className="font-bold text-amber-600">+10</span></li>
          <li className="flex justify-between"><span>⏰ 完成提醒</span><span className="font-bold text-amber-600">+5</span></li>
          <li className="flex justify-between"><span>🔥 连续 7 天打卡</span><span className="font-bold text-amber-600">+200</span></li>
          <li className="flex justify-between border-t border-[var(--color-border)] pt-1.5 mt-1.5"><span>每日上限</span><span className="font-bold text-[var(--color-text-soft)]">200</span></li>
        </ul>
      </section>

      {/* 底部链接回"我的" */}
      <div className="text-center">
        <Link
          href="/profile"
          className="text-xs text-[var(--color-text-soft)] underline-offset-2 hover:underline"
        >
          返回「我的」
        </Link>
      </div>
    </div>
  );
}

function ColorCard({
  item,
  isOwned,
  isActive,
  canAfford,
  onBuy,
}: {
  item: DecorationItem;
  isOwned: boolean;
  isActive: boolean;
  canAfford: boolean;
  onBuy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onBuy}
      className={cn(
        "relative bg-white rounded-2xl p-3 shadow-soft active:scale-[0.98] transition-transform text-left",
        isActive && "ring-2 ring-[var(--color-primary)]"
      )}
    >
      <div className={cn("w-full h-12 rounded-xl mb-2 bg-gradient-to-br", item.preview)} />
      <div className="flex items-center gap-1 mb-1">
        <span className="text-base">{item.emoji}</span>
        <p className="text-xs font-bold text-[var(--color-text)] flex-1 truncate">{item.name}</p>
        {isActive && <Check size={12} className="text-[var(--color-primary)] flex-shrink-0" />}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        {item.price === 0 ? (
          <span className="text-emerald-600 font-bold">免费</span>
        ) : isOwned ? (
          <span className="text-emerald-600 font-bold">已拥有</span>
        ) : canAfford ? (
          <span className="text-amber-600 font-bold flex items-center gap-0.5">
            <Coins size={9} />
            {item.price}
          </span>
        ) : (
          <span className="text-[var(--color-text-soft)] flex items-center gap-0.5">
            <Lock size={9} />
            {item.price}
          </span>
        )}
      </div>
    </button>
  );
}

function BgCard({
  item,
  isOwned,
  isActive,
  canAfford,
  onBuy,
}: {
  item: DecorationItem;
  isOwned: boolean;
  isActive: boolean;
  canAfford: boolean;
  onBuy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onBuy}
      className={cn(
        "relative bg-white rounded-2xl p-3 shadow-soft active:scale-[0.98] transition-transform text-left",
        isActive && "ring-2 ring-[var(--color-primary)]"
      )}
    >
      <div className={cn("w-full h-12 rounded-xl mb-2", item.preview)} />
      <div className="flex items-center gap-1 mb-1">
        <span className="text-base">{item.emoji}</span>
        <p className="text-xs font-bold text-[var(--color-text)] flex-1 truncate">{item.name}</p>
        {isActive && <Check size={12} className="text-[var(--color-primary)] flex-shrink-0" />}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        {item.price === 0 ? (
          <span className="text-emerald-600 font-bold">免费</span>
        ) : isOwned ? (
          <span className="text-emerald-600 font-bold">已拥有</span>
        ) : canAfford ? (
          <span className="text-amber-600 font-bold flex items-center gap-0.5">
            <Coins size={9} />
            {item.price}
          </span>
        ) : (
          <span className="text-[var(--color-text-soft)] flex items-center gap-0.5">
            <Lock size={9} />
            {item.price}
          </span>
        )}
      </div>
    </button>
  );
}
