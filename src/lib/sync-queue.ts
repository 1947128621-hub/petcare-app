// ===== 离线同步队列 =====
// v0.3.1 骨架版
//
// 用途：当 pushToCloud 失败（断网 / Supabase 宕机）时，把 op 入队
// 后续在网络恢复、App 启动、定时器触发时重试
//
// 持久化：localStorage（key = "petcare-sync-queue"）
// 单条大小限制：< 200KB（base64 图片走单独的 storage，见 v0.4+）
//
// 设计权衡：
//   - v0.3.1 不引入 IndexedDB，保持依赖最简
//   - 队列容量上限 1000 条，超出丢弃最早的（FIFO 强制截断）
//   - 重试 3 次后丢弃 + console.warn，不污染 UI

"use client";

import { getSupabase, getDeviceId, type SyncTable } from "./supabase";
import { pushToCloud, pushDeleteToCloud, isOnline } from "./sync-engine";

const QUEUE_KEY = "petcare-sync-queue-v1";
const MAX_QUEUE_SIZE = 1000;
const MAX_ATTEMPTS = 3;
const RETRY_INTERVAL_MS = 30_000;

export type QueueOp = "insert" | "update" | "delete";

export interface QueueEntry {
  /** 内部 UUID，与业务行 id 不同；用于去重 */
  id: string;
  table: SyncTable;
  op: QueueOp;
  /** 业务行主键；delete 时也用 */
  rowId: string;
  /** 要写入的数据；delete 时可为空 */
  row: Record<string, unknown> | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  lastAttemptAt: string | null;
}

interface QueueState {
  entries: QueueEntry[];
}

// ===== 内部：读 / 写队列到 localStorage =====

function readQueue(): QueueState {
  if (typeof window === "undefined") return { entries: [] };
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as QueueState;
    if (!parsed || !Array.isArray(parsed.entries)) return { entries: [] };
    return parsed;
  } catch {
    return { entries: [] };
  }
}

function writeQueue(state: QueueState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(state));
  } catch (e) {
    // 容量超限 → 截断保留最新的
    if (state.entries.length > 100) {
      const trimmed: QueueState = { entries: state.entries.slice(-100) };
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
        // eslint-disable-next-line no-console
        console.warn("[sync-queue] localStorage 容量超限，已截断至最新 100 条", e);
      } catch {
        // 仍然失败就放弃持久化（仅本次会话内有效）
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn("[sync-queue] 持久化失败", e);
    }
  }
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ===== 入队 =====

export function enqueue(
  table: SyncTable,
  op: QueueOp,
  rowId: string,
  row: Record<string, unknown> | null
): QueueEntry {
  const entry: QueueEntry = {
    id: genId(),
    table,
    op,
    rowId,
    row,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    lastAttemptAt: null,
  };
  const state = readQueue();
  state.entries.push(entry);
  // 容量保护
  if (state.entries.length > MAX_QUEUE_SIZE) {
    state.entries = state.entries.slice(-MAX_QUEUE_SIZE);
  }
  writeQueue(state);
  return entry;
}

// ===== 立刻尝试推送（不入队）=====
// 成功 → 丢弃 / 跳过
// 失败 → 入队
//
// 这是 store 钩子应该调的入口函数

export async function tryPush(
  table: SyncTable,
  op: QueueOp,
  rowId: string,
  row: Record<string, unknown> | null
): Promise<{ pushed: boolean; queued: boolean }> {
  if (!getSupabase()) return { pushed: false, queued: false }; // mock 模式
  if (!isOnline()) {
    enqueue(table, op, rowId, row);
    return { pushed: false, queued: true };
  }

  const result = op === "delete"
    ? await pushDeleteToCloud(table, rowId)
    : await pushToCloud(table, row ?? {});

  if (result.ok) return { pushed: true, queued: false };

  // 失败 → 入队
  enqueue(table, op, rowId, row);
  return { pushed: false, queued: true };
}

// ===== 批量 flush 队列 =====

export async function flushQueue(): Promise<{ succeeded: number; failed: number; abandoned: number }> {
  const state = readQueue();
  if (state.entries.length === 0) {
    return { succeeded: 0, failed: 0, abandoned: 0 };
  }
  if (!getSupabase() || !isOnline()) {
    return { succeeded: 0, failed: state.entries.length, abandoned: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  let abandoned = 0;
  const remaining: QueueEntry[] = [];

  for (const entry of state.entries) {
    const result = entry.op === "delete"
      ? await pushDeleteToCloud(entry.table, entry.rowId)
      : await pushToCloud(entry.table, entry.row ?? {});

    if (result.ok) {
      succeeded++;
      continue;
    }

    // 失败
    const next: QueueEntry = {
      ...entry,
      attempts: entry.attempts + 1,
      lastError: result.error ?? "unknown",
      lastAttemptAt: new Date().toISOString(),
    };

    if (next.attempts >= MAX_ATTEMPTS) {
      abandoned++;
      // eslint-disable-next-line no-console
      console.warn(`[sync-queue] 放弃 op：${entry.table}/${entry.op}/${entry.rowId}`, next.lastError);
    } else {
      remaining.push(next);
      failed++;
    }
  }

  writeQueue({ entries: remaining });
  return { succeeded, failed, abandoned };
}

// ===== 队列状态查询 =====

export function getQueueStats(): { size: number; oldestAt: string | null; failed: number } {
  const state = readQueue();
  return {
    size: state.entries.length,
    oldestAt: state.entries[0]?.createdAt ?? null,
    failed: state.entries.filter((e) => e.attempts > 0).length,
  };
}

export function getQueueEntries(): QueueEntry[] {
  return readQueue().entries;
}

export function clearQueue(): void {
  writeQueue({ entries: [] });
}

// ===== 启动后台 flush（call once in App 入口）=====

let flushTimer: ReturnType<typeof setInterval> | null = null;
let onlineHandler: (() => void) | null = null;
let started = false;

export function startSyncQueueWorker(): void {
  if (typeof window === "undefined") return;
  if (started) return;
  started = true;

  // 定时 flush
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => {
    void flushQueue();
  }, RETRY_INTERVAL_MS);

  // 网络恢复时立即 flush
  if (onlineHandler) window.removeEventListener("online", onlineHandler);
  onlineHandler = () => {
    void flushQueue();
  };
  window.addEventListener("online", onlineHandler);

  // 立即 flush 一次（处理上次会话遗留）
  void flushQueue();
}

export function stopSyncQueueWorker(): void {
  if (typeof window === "undefined") return;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (onlineHandler) {
    window.removeEventListener("online", onlineHandler);
    onlineHandler = null;
  }
  started = false;
}

// ===== 工具：合并同 row 的多次 op =====
// 同 (table, rowId) 的连续 op 可合并（后写的覆盖前写的）
// 用于离线时把 5 次 update 压成 1 次

export function dedupAndMerge(): number {
  const state = readQueue();
  const map = new Map<string, QueueEntry>();

  for (const e of state.entries) {
    const key = `${e.table}:${e.rowId}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, e);
      continue;
    }
    // 同 row 的 op 合并：保留最新 op 与最新 row
    map.set(key, {
      ...e,
      attempts: prev.attempts, // 累计重试次数
      createdAt: prev.createdAt, // 保留最早入队时间
    });
  }

  const merged = Array.from(map.values());
  const before = state.entries.length;
  writeQueue({ entries: merged });
  return before - merged.length;
}

// ===== 把 queue 暴露给 UI 显示 =====

export function _getDeviceId(): string {
  return getDeviceId();
}
