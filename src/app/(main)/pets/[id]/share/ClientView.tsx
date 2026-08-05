// ===== 宠物分享页 =====
//
// v0.4.0.2 P1-5 — 分享接口(图片+文案 → 微信/QQ/微博)
//   - 用 Web Share API (navigator.share) 调系统原生分享面板(用户在分享面板里选微信/QQ/微博)
//   - Tauri WebView 在 Android 8+ 支持
//   - Fallback:复制链接 + 显示可手动选平台列表
//   - **不接第三方 SDK**(微信开放平台要企业资质)
//
// v0.4.0.1 之前此页不存在 —— share 链接从 /pets/[id] 进会 404

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, Check, MessageCircle, Link2, Heart, Camera } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { pushToast } from "@/components/Toast";
import { speciesEmoji, speciesLabel } from "@/lib/utils";

type SharePlatform = "wechat" | "qq" | "weibo" | "system";

export default function ShareClientView({ id }: { id: string }) {
  const router = useRouter();
  const pet = useAppStore((s) => s.pets.find((p) => p.id === id));
  const allRecords = useAppStore((s) => s.records);
  const records = useMemo(
    () => (pet ? allRecords.filter((r) => r.petId === pet.id) : []),
    [allRecords, pet]
  );
  const [copied, setCopied] = useState(false);

  if (!pet) {
    return (
      <div className="pt-6 px-4 text-center">
        <p className="text-[var(--color-text-soft)] mb-4">找不到这只宠物了</p>
        <button
          onClick={() => router.push("/pets")}
          className="inline-block px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold"
        >
          返回列表
        </button>
      </div>
    );
  }

  // ===== 分享文案 =====
  const shareText = useMemo(() => {
    const days = records.length;
    const firstLine = `🐾 这是${pet.name} · ${speciesLabel(pet.species)} · ${pet.age} 岁`;
    const secondLine = `已经记录了 ${days} 条日常,每一刻都珍贵 📖`;
    return `${firstLine}\n${secondLine}\n—— 来自毛球日记`;
  }, [pet, records.length]);

  // 分享链接(避免 hydration mismatch:服务端用相对路径,客户端 mount 后再补全 origin)
  const [shareUrl, setShareUrl] = useState(`/pets/${id}`);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.origin + `/pets/${id}`);
    }
  }, [id]);

  // ===== v0.4.0.2 P1-5 — Web Share API =====
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const handleNativeShare = async () => {
    if (!canNativeShare) {
      pushToast({ kind: "info", title: "当前环境不支持", message: "已切换到复制链接方式" });
      handleCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: `${pet.name} 的毛球日记`,
        text: shareText,
        url: shareUrl,
      });
    } catch (err) {
      // 用户取消分享不报错
      if (err instanceof Error && err.name === "AbortError") return;
      // eslint-disable-next-line no-console
      console.warn("[share] navigator.share 失败:", err);
      pushToast({ kind: "warning", title: "分享失败", message: "已切换到复制链接方式" });
      handleCopyLink();
    }
  };

  // ===== 复制链接(全部 fallback) =====
  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      } else {
        // 兜底:用 textarea + execCommand
        const ta = document.createElement("textarea");
        ta.value = `${shareText}\n${shareUrl}`;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      pushToast({ kind: "success", title: "已复制", message: "内容和链接已复制到剪贴板" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      pushToast({ kind: "error", title: "复制失败", message: "请手动复制以下内容" });
    }
  };

  // ===== 平台占位按钮(因为不能接第三方 SDK,这里只做 UI 提示,引导用户去分享面板选) =====
  const handlePlatformClick = (p: SharePlatform) => {
    if (p === "system") {
      handleNativeShare();
      return;
    }
    // 其他平台在 fallback 时只提示用户去用分享面板或复制链接
    pushToast({
      kind: "info",
      title: p === "wechat" ? "微信" : p === "qq" ? "QQ" : "微博",
      message: "请用上方「系统分享」面板选平台,或复制链接手动粘贴",
    });
  };

  // 拿最近一张照片
  const latestPhoto = useMemo(
    () => records.find((r) => r.type === "photo" && r.imageDataUrl)?.imageDataUrl,
    [records]
  );

  return (
    <div className="pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-soft)]"
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-[var(--color-text)]">分享 {pet.name}</h1>
            <p className="text-[11px] text-[var(--color-text-soft)]">毛球日记 · v0.4.0.2</p>
          </div>
          <Share2 className="text-[var(--color-primary)]" size={20} />
        </div>
      </div>

      {/* 预览卡 — 用户分享出去对方看到的样子 */}
      <section className="mt-4 px-2">
        <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 rounded-3xl p-5 shadow-card relative overflow-hidden">
          {/* 装饰 */}
          <div className="absolute -right-6 -top-6 text-[100px] opacity-10 select-none">
            {pet.avatar || speciesEmoji(pet.species)}
          </div>

          <div className="relative">
            {/* 头像 + 名字 */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center text-3xl flex-shrink-0 border-2 border-white/50">
                {pet.avatar || speciesEmoji(pet.species)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-amber-900 truncate">{pet.name}</h2>
                <p className="text-xs text-amber-800 mt-0.5">
                  {speciesLabel(pet.species)} · {pet.breed} · {pet.age} 岁
                </p>
              </div>
            </div>

            {/* 数据 */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/40 backdrop-blur-sm rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-amber-900">{records.length}</p>
                <p className="text-[10px] text-amber-700">条记录</p>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-amber-900">{pet.weight}</p>
                <p className="text-[10px] text-amber-700">kg</p>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-amber-900">∞</p>
                <p className="text-[10px] text-amber-700">爱</p>
              </div>
            </div>

            {/* 照片(最近一张) */}
            {latestPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={latestPhoto}
                alt={pet.name}
                className="w-full h-40 object-cover rounded-2xl border-2 border-white/50"
              />
            )}
            {!latestPhoto && (
              <div className="w-full h-40 rounded-2xl border-2 border-white/50 bg-white/30 flex flex-col items-center justify-center text-amber-700">
                <Camera size={32} className="mb-1" />
                <p className="text-[11px]">还没有照片,先去记录一张吧</p>
              </div>
            )}

            {/* 底部水印 */}
            <div className="flex items-center justify-between mt-3 text-[10px] text-amber-800">
              <span className="flex items-center gap-1">
                <Heart size={10} className="fill-current" />
                来自毛球日记
              </span>
              <span>{new Date().toLocaleDateString("zh-CN")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 主操作:系统分享 */}
      <section className="mt-5 px-2">
        <button
          onClick={handleNativeShare}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold text-sm shadow-card active:scale-[0.98] transition-transform"
        >
          <Share2 size={16} />
          {canNativeShare ? "分享到微信/QQ/微博" : "复制链接分享"}
        </button>
        <p className="text-[10px] text-center text-[var(--color-text-soft)] mt-2 px-2 leading-relaxed">
          {canNativeShare
            ? "点击后会弹出系统分享面板,可在微信/QQ/微博等 App 中选择"
            : "当前环境不支持系统分享面板,点击会复制内容到剪贴板"}
        </p>
      </section>

      {/* 备用:4 个平台占位 + 复制 */}
      <section className="mt-5 px-2">
        <h3 className="text-xs font-semibold text-[var(--color-text-soft)] mb-2 px-1">其他方式</h3>
        <div className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)] overflow-hidden">
          <PlatformRow
            icon={MessageCircle}
            color="text-green-600"
            label="微信"
            desc="调起微信好友/朋友圈(需微信内打开)"
            onClick={() => handlePlatformClick("wechat")}
          />
          <PlatformRow
            icon={MessageCircle}
            color="text-blue-500"
            label="QQ"
            desc="调起 QQ 好友/群"
            onClick={() => handlePlatformClick("qq")}
          />
          <PlatformRow
            icon={MessageCircle}
            color="text-red-500"
            label="微博"
            desc="调起微博分享"
            onClick={() => handlePlatformClick("weibo")}
          />
          <PlatformRow
            icon={copied ? Check : Link2}
            color={copied ? "text-emerald-500" : "text-[var(--color-text-soft)]"}
            label={copied ? "已复制" : "复制链接"}
            desc="把内容和链接复制到剪贴板"
            onClick={handleCopyLink}
          />
        </div>
      </section>

      {/* 分享文案预览 */}
      <section className="mt-5 px-2">
        <h3 className="text-xs font-semibold text-[var(--color-text-soft)] mb-2 px-1">分享文案预览</h3>
        <div className="bg-white rounded-2xl shadow-soft p-4 text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
          {shareText}
          {"\n"}
          <span className="text-[var(--color-primary)] underline">{shareUrl}</span>
        </div>
      </section>

      {/* 底部说明 */}
      <p className="text-[10px] text-center text-[var(--color-text-soft)] mt-6 px-6 leading-relaxed">
        v0.4.0.2 走系统原生分享面板,不接第三方 SDK(微信开放平台需企业资质)
      </p>
    </div>
  );
}

// ===== 内部小组件 =====
function PlatformRow({
  icon: Icon,
  color,
  label,
  desc,
  onClick,
}: {
  icon: typeof Share2;
  color: string;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-[var(--bg-soft)]"
    >
      <Icon size={18} className={`${color} flex-shrink-0`} />
      <div className="flex-1 text-left">
        <p className="text-sm text-[var(--color-text)] font-medium">{label}</p>
        <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
