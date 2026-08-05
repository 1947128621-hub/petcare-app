"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Phone, Navigation, MapPin, Clock, Star, ChevronRight, Map as MapIcon,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { NearbyPlace, PlaceCategory } from "@/lib/types";

const CATEGORY_EMOJI: Record<PlaceCategory, string> = {
  hospital: "🏥",
  petshop: "🛍️",
  grooming: "✂️",
  park: "🌳",
};

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  hospital: "宠物医院",
  petshop: "宠物店",
  grooming: "宠物美容",
  park: "宠物公园",
};

const CATEGORY_BADGE: Record<PlaceCategory, string> = {
  hospital: "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  petshop: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  grooming: "bg-[var(--color-secondary)]/30 text-[var(--color-secondary)]",
  park: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
};

// 构造外部地图 URL（高德地图，优先按坐标）
function buildMapUrl(p: NearbyPlace): string {
  return `https://uri.amap.com/marker?position=${p.lng},${p.lat}&name=${encodeURIComponent(p.name)}&src=petcare`;
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-soft)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-[var(--color-primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[var(--color-text-soft)] font-medium">{label}</p>
        <div className="text-sm text-[var(--color-text)] mt-0.5 break-all">{children}</div>
      </div>
    </div>
  );
}

// 地图占位
function MapPlaceholder({ place }: { place: NearbyPlace }) {
  return (
    <div className="relative w-full h-[200px] rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--bg-soft)] to-[var(--color-primary-soft)]/40 border border-[var(--color-border)]">
      {/* 装饰性网格线（模拟地图） */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/3 left-0 right-0 h-px bg-[var(--color-text-soft)]/30" />
        <div className="absolute top-2/3 left-0 right-0 h-px bg-[var(--color-text-soft)]/30" />
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-[var(--color-text-soft)]/30" />
        <div className="absolute left-3/4 top-0 bottom-0 w-px bg-[var(--color-text-soft)]/30" />
      </div>

      {/* 中心标记点 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-xl shadow-card ring-4 ring-white">
            {CATEGORY_EMOJI[place.category]}
          </div>
          <div className="-mt-1 w-3 h-3 rotate-45 bg-[var(--color-primary)]" />
          <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]/30 animate-ping" />
        </div>
      </div>

      {/* v0.1 提示 */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-[var(--color-text-soft)] font-medium backdrop-blur-sm">
          📍 {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-[var(--color-text-soft)] font-medium backdrop-blur-sm">
          v0.1 mock · v0.3 接入
        </span>
      </div>
    </div>
  );
}

export default function ClientView({ id: initialId }: { id: string }) {
  const params = { id: initialId } as { id: string };
  const places = useAppStore((s) => s.places);

  const place = useMemo(
    () => places.find((p) => p.id === params?.id),
    [places, params?.id]
  );

  // 相似地点：同 category 排除自己
  const similar = useMemo(() => {
    if (!place) return [];
    return places
      .filter((p) => p.category === place.category && p.id !== place.id)
      .slice(0, 3);
  }, [places, place]);

  if (!place) {
    return (
      <div>
        <PageHeader title="地点详情" back />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MapPin size={48} className="text-[var(--color-text-soft)] mb-3" />
          <h3 className="text-base font-bold text-[var(--color-text)] mb-1">地点不存在</h3>
          <p className="text-xs text-[var(--color-text-soft)] mb-5">该地点可能已下架</p>
          <Link
            href="/places"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft"
          >
            返回附近
          </Link>
        </div>
      </div>
    );
  }

  // 打开地图导航
  const handleOpenMap = () => {
    if (typeof window === "undefined") return;
    // 复制地址到剪贴板
    if (navigator.clipboard) {
      navigator.clipboard.writeText(place.address).catch(() => {
        // 静默失败
      });
    }
    pushToast({
      kind: "success",
      title: "已复制地址",
      message: "正在打开地图导航…",
    });
    window.open(buildMapUrl(place), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="pb-24">
      <PageHeader
        title="地点详情"
        subtitle={CATEGORY_LABEL[place.category]}
        back
      />

      {/* Hero 卡片 */}
      <div className="bg-white rounded-3xl p-5 shadow-card mb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-warm flex items-center justify-center text-4xl flex-shrink-0">
            {CATEGORY_EMOJI[place.category]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--color-text)]">
                {place.name}
              </h1>
            </div>
            <span
              className={cn(
                "inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mb-2",
                CATEGORY_BADGE[place.category]
              )}
            >
              {CATEGORY_LABEL[place.category]}
            </span>
            <div className="flex items-center gap-1 text-base">
              <Star size={16} className="text-[var(--color-warning)]" fill="currentColor" />
              <span className="font-bold text-[var(--color-text)]">{place.rating}</span>
              <span className="text-xs text-[var(--color-text-soft)]">/ 5.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* 信息卡 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-3 space-y-3">
        <InfoRow icon={MapPin} label="地址">
          {place.address}
        </InfoRow>
        <InfoRow icon={Phone} label="电话">
          <a
            href={`tel:${place.phone}`}
            className="text-[var(--color-primary)] font-semibold"
          >
            {place.phone}
          </a>
        </InfoRow>
        <InfoRow icon={Clock} label="营业时间">{place.openHours}</InfoRow>
        <InfoRow icon={Navigation} label="距离">
          {place.distance} km
        </InfoRow>
      </div>

      {/* 地图占位 */}
      <div className="bg-white rounded-2xl p-3 shadow-soft mb-3">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <MapIcon size={14} className="text-[var(--color-primary)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)]">位置预览</h3>
        </div>
        <MapPlaceholder place={place} />
      </div>

      {/* 标签 chip */}
      {place.tags.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-soft mb-3">
          <h3 className="text-xs font-semibold text-[var(--color-text-soft)] mb-2">
            特色标签
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {place.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 相似地点推荐 */}
      {similar.length > 0 && (
        <section className="mt-5">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-1">
              {CATEGORY_EMOJI[place.category]} 其他{CATEGORY_LABEL[place.category]}
            </h3>
            <Link
              href="/places"
              className="text-[11px] text-[var(--color-primary)] flex items-center gap-0.5"
            >
              更多 <ChevronRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {similar.map((p) => (
              <Link
                key={p.id}
                href={`/places/${p.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-soft active:scale-[0.98] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-warm flex items-center justify-center text-2xl flex-shrink-0">
                  {CATEGORY_EMOJI[p.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5 flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5 text-[var(--color-warning)]">
                      <Star size={10} fill="currentColor" />
                      {p.rating}
                    </span>
                    <span>· {p.distance} km</span>
                  </p>
                </div>
                <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 底部广告 */}
      <div className="mt-5">
        <AdBottom />
      </div>

      {/* 底部固定按钮：拨打 + 地图导航 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] safe-area-bottom">
        <div className="max-w-[480px] mx-auto px-4 py-3 grid grid-cols-2 gap-2">
          <a
            href={`tel:${place.phone}`}
            className="flex items-center justify-center gap-2 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm shadow-soft active:scale-[0.98] transition-transform"
          >
            <Phone size={16} />
            拨打 {place.phone.slice(0, 4)}…
          </a>
          <button
            onClick={handleOpenMap}
            className="flex items-center justify-center gap-2 py-3 rounded-full bg-white text-[var(--color-text)] font-semibold text-sm border border-[var(--color-border)] shadow-soft active:scale-[0.98] transition-transform"
          >
            <Navigation size={16} />
            打开地图导航
          </button>
        </div>
      </div>
    </div>
  );
}
