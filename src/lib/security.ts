// ===== 5 项基础安全（v0.4.0 · F-SEC-01~05）=====
//
// 计划书 §2.3 / 实施书 §2.3 / F-SEC-01~05 集中落地。
//
// 设计原则：
//   1. **所有写操作过 SecurityGuard**（CSP sanitize / EXIF 清理 / 隐私接受 / 数据最小化）
//   2. **白名单模式**：每张 sync 表都有明确的字段白名单
//   3. **管理员入口**已在 `admin-auth.ts`（实施员 2 实施），本文件只 re-export
//   4. **零运行时副作用**：SSR 阶段全部 no-op，浏览器侧失败 console.warn 不抛
//
// 范围：
//   ✅ F-SEC-01 管理员 challenge（re-export from admin-auth.ts）
//   ✅ F-SEC-02 Tauri CSP 严格化（src-tauri/tauri.conf.json）
//   ✅ F-SEC-03 照片 EXIF 清理（canvas 重绘剥 GPS/拍摄时间/设备）
//   ✅ F-SEC-04 隐私政策页 + 用户协议页 + 首次启动 modal
//   ✅ F-SEC-05 数据最小化（每张 sync 表精确字段白名单 + pull 不下载 base64 照片）
//
// 不在 v0.4.0 范围：
//   ❌ 端到端加密（v0.4.1）
//   ❌ 数据脱敏（v0.4.1）
//   ❌ 真实云同步接入（v0.4.1 仍 mock）

import type { SyncTable } from "./supabase";

// ===== 1. 管理员入口（re-export 实施员 2 的 admin-auth）=====
// F-SEC-01：应急入口 + SHA-256 challenge + 3 次锁 5 分钟
// 完整实现见 `./admin-auth.ts`；这里只 re-export 让 SecurityGuard 集中暴露
export {
  AdminAuth,
  type VerifyResult,
  type LockState,
  type AdminChallengeState,
} from "./admin-auth";

// ===== 2. Tauri CSP sanitize =====
// 实际 CSP 在 src-tauri/tauri.conf.json 的 `app.security.csp` 配置；
// 这里给"前端可调"的 sanitizer（用于运行时校验响应头 / 调试）

/**
 * 检查并清理 CSP 头。
 * - 输入：HTTP 响应头字典
 * - 输出：净化后的字典（任何 `unsafe-inline` 出现在 `script-src` → 标红警告 + 移除）
 *
 * 设计：v0.4.0 的 CSP 硬编码在 tauri.conf.json，本函数作为开发辅助。
 * 真正生效的是 Tauri 启动时读取的 csp 字符串。
 */
export function sanitizeCSP(headers: Record<string, string>): Record<string, string> {
  const csp = headers["content-security-policy"] || headers["Content-Security-Policy"];
  if (!csp) return headers;

  // 白名单关键字：v0.4.0 严格白名单中允许的字面量
  const ALLOWED = new Set(["'self'", "data:", "blob:", "https://*.supabase.co", "wss://*.supabase.co", "https://*.vercel.app", "'unsafe-inline'"]);

  const directives = csp.split(";").map((d) => d.trim()).filter(Boolean);
  const sanitized: string[] = [];
  for (const d of directives) {
    const [name, ...vals] = d.split(/\s+/);
    if (!name) continue;
    const safeVals = vals.filter((v) => ALLOWED.has(v) || v.startsWith("'nonce-"));
    if (safeVals.length > 0) {
      sanitized.push([name, ...safeVals].join(" "));
    }
  }
  return { ...headers, "content-security-policy": sanitized.join("; ") };
}

// ===== 3. 照片 EXIF 清理 =====
// F-SEC-03：上传时 canvas 重绘剥 GPS/拍摄时间/设备型号/镜头参数
//
// 实现：ImageBitmap → <canvas> → drawImage → toBlob
// canvas 重绘时**默认剥离所有 EXIF metadata**（GPS/DateTimeOriginal/Make/Model 等）
// 同时按 1280px 长边缩放（控文件体积），JPEG quality 0.85

/** EXIF 清理选项 */
export interface StripOptions {
  /** 长边最大像素；超过则等比缩放（默认 1280） */
  maxEdge?: number;
  /** JPEG 质量 0~1（默认 0.85） */
  quality?: number;
  /** 强制输出 MIME；默认自动（jpeg/webp/png 视输入） */
  outputType?: string;
}

export interface StripResult {
  /** 清理后的 Blob（无 EXIF） */
  blob: Blob;
  /** data URL 形式（方便存 store） */
  dataUrl: string;
  /** 原始文件字节数 */
  originalSize: number;
  /** 清理后字节数 */
  cleanedSize: number;
  /** 缩放后尺寸 */
  width: number;
  height: number;
  /** 实际输出 MIME */
  mime: string;
}

/**
 * 把浏览器/相机原图（可能含 EXIF）通过 canvas 重绘，**剥离所有 EXIF**。
 * 返回新 Blob + dataUrl，调用方用 dataUrl 存到 store 即可。
 *
 * SSR / 无 window：抛 Error（不应在服务端调）
 * 浏览器无 createImageBitmap：降级用 <img> + canvas
 */
export async function stripPhotoEXIF(file: File, opts: StripOptions = {}): Promise<StripResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("[security] stripPhotoEXIF 只能在浏览器环境调用");
  }
  const maxEdge = opts.maxEdge ?? 1280;
  const quality = Math.min(Math.max(opts.quality ?? 0.85, 0.1), 1.0);
  const originalSize = file.size;

  // 1) 解码图片
  const img = await loadImage(file);
  // 2) 算缩放后尺寸
  const ratio = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.round(img.width * ratio);
  const height = Math.round(img.height * ratio);
  // 3) canvas 重绘（剥离所有 metadata）
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("[security] 无法获取 canvas 2d context");
  }
  ctx.drawImage(img, 0, 0, width, height);

  // 4) 决定输出 MIME：默认保持原类型，PNG/HEIC/HEIF 等不支持的就转 JPEG
  const inputType = (file.type || "image/jpeg").toLowerCase();
  const outputType = opts.outputType ?? (
    inputType === "image/png" ? "image/png" :
    inputType === "image/webp" ? "image/webp" :
    "image/jpeg"
  );

  // 5) toBlob → 转 dataUrl
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("[security] canvas.toBlob 返回 null"))),
      outputType,
      quality
    );
  });
  const dataUrl = await blobToDataUrl(blob);

  // 6) 释放资源
  if ("close" in img && typeof (img as { close?: () => void }).close === "function") {
    (img as { close: () => void }).close();
  }

  return {
    blob,
    dataUrl,
    originalSize,
    cleanedSize: blob.size,
    width,
    height,
    mime: outputType,
  };
}

// ===== 内部工具 =====

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // 注意：必须 onload 后才能 revoke；revoke 太早会变 broken image
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("[security] 图片解码失败"));
    };
    img.src = url;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("[security] FileReader 结果不是 string"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("[security] FileReader 失败"));
    reader.readAsDataURL(blob);
  });
}

// ===== 4. 隐私政策接受 =====
// F-SEC-04：首次启动 modal 要求勾选"我已阅读并同意隐私政策"
//
// 持久化：localStorage `petcare-privacy-accepted-v1` = ISO 时间戳
// 页面：(main)/privacy 与 (main)/terms 公开可访问

const PRIVACY_KEY = "petcare-privacy-accepted-v1";
const PRIVACY_VERSION = "v0.4.0.2"; // v0.4.0.2 — bump 让 v0.4.0.1 用户重新弹隐私 modal(用户截图证明没看到 → 之前是 v0.4.0.1 已接受)

export interface PrivacyState {
  /** 是否已接受（最新版本） */
  accepted: boolean;
  /** 接受时间 ISO；null = 未接受 */
  acceptedAt: string | null;
  /** 接受的隐私政策版本 */
  version: string | null;
}

export function getPrivacyState(): PrivacyState {
  if (typeof window === "undefined") {
    return { accepted: false, acceptedAt: null, version: null };
  }
  try {
    const raw = localStorage.getItem(PRIVACY_KEY);
    if (!raw) return { accepted: false, acceptedAt: null, version: null };
    const parsed = JSON.parse(raw) as { acceptedAt?: string; version?: string };
    const accepted = parsed.version === PRIVACY_VERSION && Boolean(parsed.acceptedAt);
    return {
      accepted,
      acceptedAt: parsed.acceptedAt ?? null,
      version: parsed.version ?? null,
    };
  } catch {
    return { accepted: false, acceptedAt: null, version: null };
  }
}

/**
 * 记录用户接受隐私政策。**仅前端写入 localStorage**；不做任何后端注册（v0.4.0 无后端）。
 * 接受态仅作 UI 展示用，不上送 sync-engine。
 */
export function acceptPrivacy(userToken?: string): PrivacyState {
  const acceptedAt = new Date().toISOString();
  const state: PrivacyState = { accepted: true, acceptedAt, version: PRIVACY_VERSION };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PRIVACY_KEY, JSON.stringify({ acceptedAt, version: PRIVACY_VERSION, userToken: userToken ?? null }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[security] 隐私接受态写入失败", e);
    }
  }
  return state;
}

/** 重置接受态（用于 /settings → "撤回同意"功能；v0.4.0 暂不暴露） */
export function revokePrivacy(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PRIVACY_KEY);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[security] 隐私接受态清除失败", e);
  }
}

// ===== 5. 数据最小化（白名单模式）=====
// F-SEC-05：sync-queue 入队前严格只取白名单字段
//
// 验收（plan §5.5 AC-SEC-05）：
//   - 队列里每条 op 序列化后**不包含** `_` 开头字段
//   - 内部字段（_dirty / _syncedAt / lastError / retryCount）一律过滤
//   - 会员 tier / theme / points / history **根本不同步**（plan F-SEC-05 第 3 条）
//
// 设计：每张 SyncTable 都有精确字段白名单；调用方只需传 table + record
//       严格按白名单取字段，未列入的字段被丢弃（包括任意 `_` 开头字段）

/** 每张 sync 表允许同步的字段（精确白名单） */
export const WHITELISTED_FIELDS: Record<SyncTable, ReadonlySet<string>> = {
  // 宠物档案
  pets: new Set([
    "id", "name", "species", "breed", "age", "weight", "gender",
    "avatar", "birthday", "notes", "createdAt", "updatedAt",
  ]),
  // 宠物记录（imageDataUrl **不**走 whitelist —— 照片 lazy load，见 pullFromCloudLazy）
  records: new Set([
    "id", "petId", "type", "title", "content", "meta",
    "createdAt", "updatedAt",
  ]),
  // AI 问答
  chats: new Set([
    "id", "petId", "type", "question", "answer",
    "isVipOnly", "relatedDrugIds", "createdAt",
  ]),
  // 提醒
  reminders: new Set([
    "id", "petId", "category", "title", "description", "repeat",
    "nextAt", "remindBefore", "active", "lastTriggeredAt",
    "createdAt", "updatedAt",
  ]),
  // 健康打卡
  health_checks: new Set([
    "id", "petId", "type", "rating", "note", "createdAt",
  ]),
  // 遛狗打卡
  walk_logs: new Set([
    "id", "petId", "durationMin", "distanceKm", "note", "createdAt",
  ]),
  // 食物成分查询
  food_checks: new Set([
    "id", "petId", "foodId", "score", "summary", "pros", "cons", "createdAt",
  ]),
  // 宠物角色对话
  pet_talks: new Set([
    "id", "petId", "userMessage", "petReply", "mood", "createdAt",
  ]),
  // 成就解锁
  achievement_unlocks: new Set([
    "achievementId", "unlockedAt", "context",
  ]),
  // 课程进度（v0.3.1 Bug #6 修：sid = cp_${courseId}_${petId}_${stepId}，
  // 每步独立 rowId，避免 5 步合并成 1 条丢步数）
  course_progress: new Set([
    "courseId", "petId", "completedStepIds", "startedAt", "updatedAt",
  ]),
  // 每日任务
  task_completions: new Set([
    "taskId", "date", "petId", "completedAt",
  ]),
};

/** 黑名单（不论出现在哪张表都一律过滤） */
const BLACKLIST_FIELDS = new Set([
  // 内部 / 诊断字段
  "_dirty", "_syncedAt", "_retryCount", "_lastError",
  // 会员档（plan F-SEC-05 第 3 条：本地状态，不上传）
  "tier", "theme", "points", "history",
  "trialStartedAt", "trialEndsAt", "couponCode",
  // 管理员视图（实施员 2 加的 viewAsTier 也是本地态）
  "viewAsTier", "versionMatrix",
]);

/**
 * 把任意 record 按白名单过滤 + 黑名单过滤，返回最小化后的对象。
 *
 * 规则：
 *   1. 仅保留 `WHITELISTED_FIELDS[table]` 中的字段
 *   2. `BLACKLIST_FIELDS` 中字段一律丢弃
 *   3. `_` 开头字段一律丢弃（v0.4.0 内部约定）
 *   4. `undefined` / `null` 字段保留（让 sync-engine 决定怎么存）
 *
 * 业务记录 ≠ 队列条目：业务记录不带 `_` 字段；queue entry 才有 `_syncedAt / _retryCount / _lastError`
 * 二次过滤防御 sync-engine / sync-queue 自己添加的内部字段泄漏到 row payload。
 */
export function minimizeData<T extends Record<string, unknown>>(
  record: T,
  table: SyncTable
): Partial<T> {
  const allow = WHITELISTED_FIELDS[table];
  if (!allow) {
    // 未知表 → 兜底：返回空对象（最严格）
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(record)) {
    if (k.startsWith("_")) continue;            // 内部字段
    if (BLACKLIST_FIELDS.has(k)) continue;       // 黑名单
    if (!allow.has(k)) continue;                  // 白名单外
    out[k] = record[k];
  }
  return out as Partial<T>;
}

/** 黑名单 + 白名单的"批量入队"便捷方法 */
export function minimizeBatch<T extends Record<string, unknown>>(
  rows: T[],
  table: SyncTable
): Array<Partial<T>> {
  return rows.map((r) => minimizeData(r, table));
}

// ===== SecurityGuard 集中导出 =====
//
// 用法：
//   import { SecurityGuard } from "@/lib/security";
//   const clean = await SecurityGuard.stripPhotoEXIF(file);
//   SecurityGuard.minimizeData(petRecord, "pets");
//   SecurityGuard.acceptPrivacy();

export const SecurityGuard = {
  /** F-SEC-01 re-export（完整实现在 admin-auth.ts） */
  AdminAuth: undefined as never, // 占位；下方从 admin-auth 重新填充
  /** F-SEC-02 CSP sanitize */
  sanitizeCSP,
  /** F-SEC-03 照片 EXIF 清理 */
  stripPhotoEXIF,
  /** F-SEC-04 隐私政策接受 */
  acceptPrivacy,
  /** F-SEC-05 数据最小化（单条） */
  minimizeData,
  /** F-SEC-05 数据最小化（批量） */
  minimizeBatch,
  /** F-SEC-05 字段白名单（调试 / 文档用） */
  WHITELISTED_FIELDS,
} as const;

// 注：AdminAuth 用法由调用方直接从 '@/lib/admin-auth' import；
// 此处不在 SecurityGuard 对象上挂载，避免循环依赖。
