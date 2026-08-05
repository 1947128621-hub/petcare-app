"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin, Phone, Star, ChevronRight, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { NearbyPlace, PlaceCategory } from "@/lib/types";

type CategoryFilter = PlaceCategory | "all";
type SortMode = "distance" | "rating";

// v0.4.0.2 P1-4 — 定位状态机
type LocState =
  | { status: "idle" }                                  // 初始
  | { status: "loading" }                                // 正在请求
  | { status: "ready"; city: string; lat: number; lon: number; source: "browser" | "fallback" }
  | { status: "denied" }                                 // 用户拒绝 / 失败
  | { status: "error"; message: string };                // 其他错误

const CATEGORY_TABS: Array<{ key: CategoryFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "hospital", label: "医院" },
  { key: "petshop", label: "宠物店" },
  { key: "grooming", label: "美容" },
  { key: "park", label: "公园" },
];

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

// v0.4.0.2 P1-4 — 免费 reverse geocode (无需 key):bigdatacloud.net 的 client API
// 文档:https://bigdatacloud.com/docs/api/reverse-geocode-client
type BigDataCloudResp = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
};

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const data: BigDataCloudResp = await r.json();
    // 优先 city,fallback locality,最后 principalSubdivision
    return data.city || data.locality || data.principalSubdivision || null;
  } catch {
    return null;
  }
}

export default function PlacesPage() {
  const places = useAppStore((s) => s.places);

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("distance");

  // v0.4.0.2 P1-4 — 真定位(浏览器 Geolocation + BigDataCloud reverse-geocode)
  const [loc, setLoc] = useState<LocState>({ status: "idle" });

  const requestLocation = () => {
    // SSR / WebView 不支持时直接 fallback
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLoc({ status: "denied" });
      return;
    }
    setLoc({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // 拿到坐标后异步反查城市;失败就只显示坐标
        const city = await reverseGeocode(lat, lon);
        setLoc({
          status: "ready",
          city: city || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
          lat,
          lon,
          source: "browser",
        });
      },
      (err) => {
        // 1: PERMISSION_DENIED, 2: POSITION_UNAVAILABLE, 3: TIMEOUT
        if (err.code === 1) {
          setLoc({ status: "denied" });
        } else {
          setLoc({ status: "error", message: err.message || "定位失败" });
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    // 进入页面时尝试定位一次
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 综合筛选 + 排序
  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    const list = places.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (lower) {
        const hit =
          p.name.toLowerCase().includes(lower) ||
          p.address.toLowerCase().includes(lower) ||
          p.tags.some((t) => t.toLowerCase().includes(lower));
        if (!hit) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortMode === "distance") return a.distance - b.distance;
      return b.rating - a.rating;
    });
  }, [places, keyword, category, sortMode]);

  return (
    <div className="space-y-4">
      <PageHeader title="附近" subtitle="宠物医院 · 宠物店 · 公园" />

      {/* v0.4.0.2 P1-4 — 真定位(替代 v0.1 的硬编码"北京市朝阳区") */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white shadow-soft">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/15 flex items-center justify-center flex-shrink-0">
          {loc.status === "loading" ? (
            <Loader2 size={15} className="text-[var(--color-primary)] animate-spin" />
          ) : loc.status === "ready" ? (
            <MapPin size={15} className="text-[var(--color-primary)]" />
          ) : (
            <AlertCircle size={15} className="text-[var(--color-warning)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[var(--color-text-soft)]">
            {loc.status === "loading" && "正在获取位置…"}
            {loc.status === "ready" && "当前位置(浏览器定位)"}
            {(loc.status === "idle" || loc.status === "denied" || loc.status === "error") && "未授权定位"}
          </p>
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
            {loc.status === "ready"
              ? loc.city
              : "请在浏览器中允许位置权限,或下拉手动选区域"}
          </p>
          {loc.status === "error" && (
            <p className="text-[10px] text-[var(--color-danger)] mt-0.5 truncate">{loc.message}</p>
          )}
        </div>
        <button
          onClick={requestLocation}
          disabled={loc.status === "loading"}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[11px] font-medium active:scale-95 transition-transform disabled:opacity-50"
          aria-label="重新获取位置"
        >
          <RefreshCw size={11} className={loc.status === "loading" ? "animate-spin" : ""} />
          重试
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-soft)] pointer-events-none" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜地点 / 地址 / 标签"
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none placeholder:text-[var(--color-text-soft)] shadow-soft"
        />
      </div>

      {/* 分类 chip */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {CATEGORY_TABS.map((c) => {
          const active = category === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                active
                  ? "bg-[var(--color-primary)] text-white shadow-soft"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              )}
            >
              {c.key !== "all" && (
                <span className="mr-1">{CATEGORY_EMOJI[c.key as PlaceCategory]}</span>
              )}
              {c.label}
            </button>
          );
        })}
      </div>

      {/* 排序选择 */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-[var(--color-text-soft)]">
          共 {filtered.length} 个地点
        </p>
        <div className="flex gap-1.5">
          {([
            { key: "distance", label: "距离最近" },
            { key: "rating", label: "评分最高" },
          ] as Array<{ key: SortMode; label: string }>).map((s) => {
            const active = sortMode === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSortMode(s.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
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
      </div>

      {/* 地点列表 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl shadow-soft">
          <MapPin size={36} className="text-[var(--color-text-soft)] mb-2" />
          <p className="text-sm text-[var(--color-text)] font-semibold">没有匹配的地点</p>
          <p className="text-xs text-[var(--color-text-soft)] mt-1">试试其他关键词或分类</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      )}

      {/* 底部广告 */}
      <AdBottom />
    </div>
  );
}

// ===== 单个地点卡 =====
function PlaceCard({ place }: { place: NearbyPlace }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden active:scale-[0.99] transition-transform">
      <Link href={`/places/${place.id}`} className="flex items-start gap-3 p-4">
        {/* 左侧大图标 */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-warm flex items-center justify-center text-3xl flex-shrink-0">
          {CATEGORY_EMOJI[place.category]}
        </div>

        {/* 主体内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <h3 className="text-sm font-bold text-[var(--color-text)] truncate">
              {place.name}
            </h3>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0",
                CATEGORY_BADGE[place.category]
              )}
            >
              {CATEGORY_LABEL[place.category]}
            </span>
          </div>

          {/* 地址（1 行） */}
          <p className="text-xs text-[var(--color-text-soft)] truncate mb-1.5">
            📍 {place.address}
          </p>

          {/* 标签（最多 3 个） */}
          {place.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {place.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* 评分 + 距离 */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-0.5 text-[var(--color-warning)] font-semibold">
              <Star size={12} fill="currentColor" />
              {place.rating}
            </span>
            <span className="text-[var(--color-text-soft)]">
              {place.distance} km
            </span>
          </div>
        </div>

        <ChevronRight size={18} className="text-[var(--color-text-soft)] flex-shrink-0 mt-1" />
      </Link>

      {/* 底部拨号按钮 */}
      <div className="border-t border-[var(--color-border)] px-4 py-2 bg-[var(--bg-soft)]/50">
        <a
          href={`tel:${place.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold active:scale-[0.98] transition-transform"
        >
          <Phone size={13} />
          拨打 {place.phone}
        </a>
      </div>
    </div>
  );
}
