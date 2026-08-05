// ===== 毛球日记 v0.4.0 · 管理员入口鉴权（AdminAuth）=====
//
// 实施员 2 负责；scope = 管理员入口 + 管理员后台。
//
// 设计要点（拍板结论）：
// - MUST-02：admin 用 `/admin/*` 4 个 sub-route 根路径入口，**不**用任何隐藏手势入口
// - F-SEC-01：challenge 是主入口（SHA-256 + 6 位随机 + 后 8 位 hex 比对）
// - F-SEC-01：emergency 入口硬编码 12345 明文（v0.4.0 简陋版接受此风险）
// - 输错 3 次锁定 5 分钟
// - 持久化 key：`petcare-admin-lock-v1`（attempt_count + locked_until + device_id）
// - 设备绑定：hash(input + device_id)，所以同一密码在不同设备 hash 不同（防 hash 搬运）
// - 不做任何网络通信：100% 离线可校验
//
// 不变量（实施时务必保证）：
// 1. challenge 6 位随机用 `crypto.getRandomValues`（不 Math.random）
// 2. SHA-256 走 Web Crypto API（异步）
// 3. 失败计数持久化到 localStorage（防清缓存绕过）
// 4. emergency 入口也走锁定计数（3 次错锁 5 分钟）
// 5. emergency 用一次后下次正常 challenge 通过前不可再用（防滥用）—— v0.4 简化为共享计数器
// 6. v0.4.0 不用任何 OTP / TOTP（v0.4.1 规划）

"use client";

// ===== 类型 =====

/** 管理员 challenge 当前会话状态 */
export interface AdminChallengeState {
  /** 6 位 [0-9A-Z] 随机串 */
  code: string;
  /** 生成时间（ISO） */
  issuedAt: string;
  /** 过期时间（ISO，默认生成后 60s） */
  expiresAt: string;
}

/** 失败锁定状态 */
export interface LockState {
  /** 累计失败次数（跨会话持久化） */
  failedAttempts: number;
  /** 锁定截止时间（ISO），null = 未锁 */
  lockedUntil: string | null;
  /** 最近一次锁定开始时间（ISO） */
  lastLockStartedAt: string | null;
  /** 设备 ID（首次启动写入；hash 校验用） */
  deviceId: string;
}

/** 鉴权结果 */
export type VerifyResult =
  | { ok: true; method: "challenge" | "emergency" }
  | { ok: false; reason: "locked" | "expired" | "mismatch" | "format" | "no_challenge" };

/** localStorage key 常量 */
const LS_KEY = "petcare-admin-lock-v1";
/** challenge 有效期（60s） */
const CHALLENGE_TTL_MS = 60_000;
/** 最大失败次数 */
const MAX_ATTEMPTS = 3;
/** 锁定时长（5 分钟） */
const LOCK_DURATION_MS = 5 * 60_000;
/** emergency 硬编码密码（用户拍板 B 方案保留） */
const EMERGENCY_PASSWORD = "12345";

// ===== 工具函数：deviceId =====

/**
 * 取本机稳定 deviceId（用于 hash 加盐）。
 * - 首次调用写入 localStorage 并返回
 * - 后续调用读 localStorage
 * - localStorage 不可用时降级为内存随机 ID（不持久，仅极端场景）
 */
function getOrCreateDeviceId(): string {
  const stored = readLockState()?.deviceId;
  if (stored) return stored;
  // 用 crypto.getRandomValues 生成 16 字节 → hex
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // SSR / 极端环境降级
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `dev_${hex.slice(0, 16)}`;
}

// ===== 工具函数：localStorage 读/写 =====

function readLockState(): LockState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LockState;
    if (
      typeof parsed.failedAttempts !== "number" ||
      typeof parsed.deviceId !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLockState(s: LockState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    // localStorage 满 / 禁用：静默忽略（不影响运行时）
  }
}

function getInitialLockState(): LockState {
  return {
    failedAttempts: 0,
    lockedUntil: null,
    lastLockStartedAt: null,
    deviceId: getOrCreateDeviceId(),
  };
}

// ===== SHA-256 工具（Web Crypto API，异步）=====

/**
 * 计算 SHA-256 hex 字符串（小写）。
 * 浏览器/Tauri webview 都原生支持 `crypto.subtle.digest`。
 */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API 不可用（需要 HTTPS 或 localhost）");
  }
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ===== 锁定状态查询（同步）=====

/**
 * 取当前锁定状态（自动 cleanup 过期锁定）。
 * 供 UI 实时显示「已锁定剩 X 分 X 秒」倒计时。
 */
export function getLockState(): LockState {
  const s = readLockState() ?? getInitialLockState();
  // 如果已过锁定截止时间，自动清空（不等 5 分钟）
  if (s.lockedUntil && new Date(s.lockedUntil).getTime() <= Date.now()) {
    const cleared: LockState = {
      ...s,
      failedAttempts: 0,
      lockedUntil: null,
      lastLockStartedAt: null,
    };
    writeLockState(cleared);
    return cleared;
  }
  return s;
}

/** 同步：是否处于锁定中 */
export function isLocked(): { locked: boolean; remainingMs: number } {
  const s = getLockState();
  if (!s.lockedUntil) return { locked: false, remainingMs: 0 };
  const remaining = new Date(s.lockedUntil).getTime() - Date.now();
  if (remaining <= 0) return { locked: false, remainingMs: 0 };
  return { locked: true, remainingMs: remaining };
}

// ===== Challenge 生成 / 计算 =====

/**
 * 生成 6 位 [0-9A-Z] 随机串。
 * 严格用 `crypto.getRandomValues`（不 Math.random）。
 */
export function generateChallengeCode(): string {
  const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < 6; i++) {
    // 用模 36 映射到 [0-9A-Z]（无 I/O/0/1 等易混字符，保留 36 字符全集）
    out += ALPHABET[bytes[i]! % 36];
  }
  return out;
}

/**
 * 创建一个 challenge 会话（生成 + 写 localStorage）。
 * - 返回的 challenge **必须**经 `/admin/challenge` 页面展示给用户
 * - challenge 60s 后过期
 */
export function issueChallenge(): AdminChallengeState {
  const code = generateChallengeCode();
  const now = Date.now();
  return {
    code,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CHALLENGE_TTL_MS).toISOString(),
  };
}

/**
 * 计算 challenge 的预期答案（admin 也要用此函数自己算一次以确认）。
 * 规则：SHA256(code) → 取后 8 位 hex（lowercase）
 */
export async function computeAnswer(code: string): Promise<string> {
  const full = await sha256Hex(code);
  return full.slice(-8).toLowerCase();
}

// ===== 设备绑定 hash =====

/**
 * 计算设备绑定 hash：SHA256(input + device_id) → 后 8 位 hex。
 * - 用于把"密码"绑死在当前设备（防 hash 搬运到别处用）
 * - 当前 v0.4 简陋版：input = "12345" + deviceId → 这个 hash 就是 emergency 的"内部预期值"
 *   （**不**用此 hash 替代 emergency 明文比对，emergency 仍走明文 + 计数器）
 */
export async function hashPassword(input: string, deviceId: string): Promise<string> {
  const full = await sha256Hex(input + deviceId);
  return full.slice(-8).toLowerCase();
}

// ===== 验证：challenge =====

/**
 * 验证 challenge 答案。
 * 流程：
 *  1. 检查锁定 → 锁定中直接返回 "locked"
 *  2. 检查 userInput 格式（8 位 hex）→ 不对返回 "format"
 *  3. 计算 expected = SHA256(challenge.code) 后 8 位
 *  4. 比对 userInput（大小写不敏感）
 *  5. 匹配 → 清零失败计数 + 写 admin_token + 返 ok
 *  6. 不匹配 → 失败 +1；达 3 次 → 锁 5 分钟
 *
 * @param challenge 当前 challenge 会话状态
 * @param userInput 用户输入的 8 位字符
 */
export async function verifyChallenge(
  challenge: AdminChallengeState,
  userInput: string
): Promise<VerifyResult> {
  // 1. 锁定检查
  const lock = getLockState();
  if (lock.lockedUntil && new Date(lock.lockedUntil).getTime() > Date.now()) {
    return { ok: false, reason: "locked" };
  }

  // 2. challenge 过期检查
  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  // 3. 格式检查
  const normalized = userInput.trim().toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(normalized)) {
    return { ok: false, reason: "format" };
  }

  // 4. 算预期答案
  let expected: string;
  try {
    expected = await computeAnswer(challenge.code);
  } catch {
    return { ok: false, reason: "expired" };
  }

  // 5. 比对
  if (normalized === expected) {
    // 成功 → 清零
    writeLockState({ ...lock, failedAttempts: 0, lockedUntil: null, lastLockStartedAt: null });
    setAdminToken("challenge");
    return { ok: true, method: "challenge" };
  }

  // 6. 失败
  return recordFailure(lock);
}

// ===== 验证：emergency =====

/**
 * 应急入口校验（明文比对 12345）。
 * - 3 次错同样锁 5 分钟
 * - 成功后写 admin_token，method = "emergency"
 */
export function verifyEmergency(userInput: string): VerifyResult {
  // 1. 锁定检查
  const lock = getLockState();
  if (lock.lockedUntil && new Date(lock.lockedUntil).getTime() > Date.now()) {
    return { ok: false, reason: "locked" };
  }

  // 2. 明文比对
  if (userInput.trim() !== EMERGENCY_PASSWORD) {
    return recordFailure(lock);
  }

  // 3. 成功
  writeLockState({ ...lock, failedAttempts: 0, lockedUntil: null, lastLockStartedAt: null });
  setAdminToken("emergency");
  return { ok: true, method: "emergency" };
}

// ===== 失败计数 + 锁定 =====

function recordFailure(lock: LockState): VerifyResult {
  const nextAttempts = lock.failedAttempts + 1;
  const shouldLock = nextAttempts >= MAX_ATTEMPTS;
  const next: LockState = {
    ...lock,
    failedAttempts: shouldLock ? nextAttempts : nextAttempts, // 锁定后保留 attempts 不重置（可见历史）
    lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS).toISOString() : null,
    lastLockStartedAt: shouldLock ? new Date().toISOString() : lock.lastLockStartedAt,
  };
  writeLockState(next);
  // 错 N 次但没到锁定阈值 → 仍返回 mismatch（让 UI 显示「还剩 N 次」）
  return { ok: false, reason: "mismatch" };
}

// ===== admin_token（sessionStorage，关闭浏览器即失效）=====

const TOKEN_KEY = "petcare-admin-token-v1";
const TOKEN_TTL_MS = 30 * 60_000; // 30 分钟

interface AdminToken {
  method: "challenge" | "emergency";
  issuedAt: string;
  expiresAt: string;
}

function setAdminToken(method: "challenge" | "emergency"): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const token: AdminToken = {
    method,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TOKEN_TTL_MS).toISOString(),
  };
  try {
    window.sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  } catch {
    // sessionStorage 不可用时降级到 localStorage（不太理想，但避免锁死）
    try {
      window.localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    } catch {
      // 最后兜底：什么都不做（用户可能要重新 challenge）
    }
  }
}

/** 取当前 admin token；null = 未登录或已过期 */
export function getAdminToken(): AdminToken | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TOKEN_KEY) ?? window.localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminToken;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      // 过期 → 清掉
      clearAdminToken();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 清空 admin token（登出） */
export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // 忽略
  }
}

// ===== 模块级导出：AdminAuth 命名空间对象（按任务书规范 API）=====

export const AdminAuth = {
  /** SHA-256(input + deviceId) 后 8 位 hex（设备绑定 hash） */
  hashPassword,
  /** 验证 challenge 答案（异步） */
  verify: verifyChallenge,
  /** 应急入口校验（同步，明文 12345） */
  emergency: verifyEmergency,
  /** 输对后写 sessionStorage admin_token + 返 ok（challenge 路径用） */
  unlock: async (
    challenge: AdminChallengeState,
    userInput: string
  ): Promise<VerifyResult> => verifyChallenge(challenge, userInput),
  /** 取当前是否已登录（sessionStorage token 有效期内） */
  isAuthenticated: (): boolean => getAdminToken() !== null,
  /** 主动登出 */
  logout: (): void => clearAdminToken(),
  /** 取当前锁定状态（UI 倒计时用） */
  getLockState,
  isLocked,
  /** 暴露常量（测试用） */
  constants: {
    EMERGENCY_PASSWORD,
    MAX_ATTEMPTS,
    LOCK_DURATION_MS,
    CHALLENGE_TTL_MS,
    LS_KEY,
  },
} as const;

// ===== 工具：格式化倒计时 =====
/** "剩 4 分 23 秒" / "剩 0 分 12 秒" / "已解锁" */
export function formatLockCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "已解锁";
  const totalSec = Math.ceil(remainingMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `剩 ${min} 分 ${String(sec).padStart(2, "0")} 秒`;
}

/** "还有 N 次" — 失败次数提示 */
export function formatAttemptsHint(failedAttempts: number): string {
  const left = Math.max(0, MAX_ATTEMPTS - failedAttempts);
  if (left === 0) return "本轮已用完";
  return `还有 ${left} 次机会`;
}
