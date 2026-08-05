// ===== 照片上传器(EXIF 清理版)=====
// v0.4.0 F-SEC-03：照片 EXIF 清理(canvas 重绘剥 GPS/拍摄时间/设备型号/镜头参数)
//
// 用法(替换所有 <input type="file" accept="image/*">):
//   <PhotoUploader onChange={(dataUrl, meta) => ...} maxEdge={1280} />
//
// 设计原则：
//   1. **canvas 重绘 = 自动剥 EXIF** —— 不依赖任何 EXIF 库
//   2. **长边缩放到 1280px**(可控) —— 节省 localStorage 空间
//   3. **保留视觉** —— 重绘保真度足够肉眼无感
//   4. **失败兜底** —— FileReader 直读(保留 EXIF) + 警告用户
//
// 历史(v0.3.x)的照片不强制清理(plan F-SEC-03 AC-04)
//   本组件只处理**新上传**的；老 base64 保留原样(用户主动行为兜底)

"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Camera, ImagePlus, X, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SecurityGuard, type StripResult } from "@/lib/security";

export interface PhotoUploaderProps {
  /** 上传后回调(返回清理后的 dataUrl + 元信息) */
  onChange: (dataUrl: string | null, meta: { width: number; height: number; size: number } | null) => void;
  /** 长边最大像素(默认 1280) */
  maxEdge?: number;
  /** JPEG quality(默认 0.85) */
  quality?: number;
  /** 是否启用相机(默认 true,移动端调起后置摄像头) */
  capture?: boolean | "environment" | "user";
  /** 触发 UI 渲染(默认用 ImagePlus + Camera 双按钮) */
  children?: ReactNode;
  /** 自定义 className */
  className?: string;
  /** 当前已选图片(用于显示预览;若 onChange 已在外层保存，传过来即可) */
  currentDataUrl?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 失败时回调(默认 console.warn) */
  onError?: (err: Error) => void;
}

export function PhotoUploader({
  onChange,
  maxEdge = 1280,
  quality = 0.85,
  capture = "environment",
  children,
  className,
  currentDataUrl,
  disabled,
  onError,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // 1) EXIF 清理(canvas 重绘)—— 主路径
      const result: StripResult = await SecurityGuard.stripPhotoEXIF(file, { maxEdge, quality });
      onChange(result.dataUrl, { width: result.width, height: result.height, size: result.cleanedSize });
    } catch (err) {
      // 2) 失败兜底 —— FileReader 直读(保留 EXIF) + 明确警告
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn("[PhotoUploader] EXIF 清理失败，兜底直读:", msg);
      onError?.(err instanceof Error ? err : new Error(msg));
      try {
        const dataUrl = await readAsDataUrl(file);
        // eslint-disable-next-line no-console
        console.warn(
          "[PhotoUploader] ⚠️ 兜底已就绪 — 图片仍含 EXIF(GPS/拍摄时间/设备型号)。" +
            "建议:在系统设置中关闭相机地理位置权限后再上传。"
        );
        setError("EXIF 清理失败，图片仍含原始元数据。已兜底保存。");
        onChange(dataUrl, { width: 0, height: 0, size: file.size });
      } catch (e2) {
        setError("图片读取失败,请换一张图重试。");
      }
    } finally {
      setBusy(false);
      // 清空 value,允许重选同一文件
      e.target.value = "";
    }
  };

  const clear = () => {
    onChange(null, null);
    setError(null);
  };

  return (
    <div className={cn("w-full", className)}>
      {currentDataUrl ? (
        // 预览态
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentDataUrl}
            alt="预览"
            className="w-full max-h-80 object-cover rounded-2xl border-2 border-[var(--color-border)]"
          />
          {!disabled && (
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white shadow-soft active:scale-95"
              aria-label="移除图片"
            >
              <X size={16} />
            </button>
          )}
          {/* EXIF 清理成功角标(视觉确认) */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold">
            <span>✓</span>
            <span>EXIF 已清理</span>
          </div>
        </div>
      ) : children ? (
        // 自定义触发 UI
        <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
          {children}
        </div>
      ) : (
        // 默认双按钮 UI — v0.4.0.2 P1-3:2 个独立按钮,各自带 emoji + 明确文案
        // 拍照(input capture=environment)与 从相册选(input 无 capture)走完全独立的 ref/input
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => cameraInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--bg-soft)] text-[var(--color-text)] active:scale-[0.98] transition-transform",
              (disabled || busy) && "opacity-50"
            )}
            aria-label="拍照"
          >
            {busy ? <Loader2 size={22} className="animate-spin text-[var(--color-primary)]" /> : <Camera size={22} className="text-[var(--color-primary)]" />}
            <span className="text-xs font-medium">📷 拍照</span>
          </button>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--bg-soft)] text-[var(--color-text)] active:scale-[0.98] transition-transform",
              (disabled || busy) && "opacity-50"
            )}
            aria-label="从相册选"
          >
            {busy ? <Loader2 size={22} className="animate-spin text-[var(--color-primary)]" /> : <ImagePlus size={22} className="text-[var(--color-primary)]" />}
            <span className="text-xs font-medium">🖼️ 从相册选</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 主 input：相册选择(不调起相机) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        disabled={disabled}
      />
      {/* 副 input：拍照(移动端调起后置摄像头) */}
      {capture !== false && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture={typeof capture === "string" ? capture : "environment"}
          onChange={handleFile}
          className="hidden"
          disabled={disabled}
        />
      )}
    </div>
  );
}

// ===== 内部工具 =====

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("FileReader 结果不是 string"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader 失败"));
    reader.readAsDataURL(file);
  });
}
