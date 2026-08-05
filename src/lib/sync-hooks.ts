// ===== Sync 入口（供 store 调用的轻量 wrapper）=====
// v0.3.1: 骨架版，env 未配时完全 no-op
// v0.4.0: 入队前过数据最小化（whitelist + blacklist + 内部字段过滤）
//
// 用法（在 store.ts 中）：
//   import { enqueueSync } from "./sync-hooks";
//
//   addPet: (pet) => {
//     const id = "pet_" + Date.now();
//     set((s) => ({ pets: [...s.pets, { ...pet, id, createdAt: new Date().toISOString() }] }));
//     const newPet = get().pets[get().pets.length - 1];
//     enqueueSync("pets", "insert", newPet.id, { ...newPet });  // ← 仅这一行
//     return id;
//   }
//
// 行为：
//   - 客户端未挂载（SSR）：no-op
//   - Supabase 未配置（env 缺失）：no-op（v0.3.1 离线模式）
//   - 离线：入队
//   - 在线：直接推送；失败入队
//   - 不抛错，不 await，不影响原 action 行为
//   - v0.4.0 F-SEC-05：入队前**强制过白名单**（防御层，store 也应已过；这里是双保险）

"use client";

import { tryPush } from "./sync-queue";
import type { SyncTable } from "./supabase";
import type { QueueOp } from "./sync-queue";
import { minimizeData } from "./security";

export function enqueueSync(
  table: SyncTable,
  op: QueueOp,
  rowId: string,
  row: Record<string, unknown> | null
): void {
  if (typeof window === "undefined") return;

  // v0.4.0 F-SEC-05：入队前过白名单（防御层 + 终极保险）
  // delete 操作 row=null 直接透传；insert/update 才需要过滤
  const safeRow = row && op !== "delete"
    ? (minimizeData(row, table) as Record<string, unknown>)
    : row;

  // fire-and-forget；错误在 tryPush 内部处理
  void tryPush(table, op, rowId, safeRow);
}

// ===== 队列状态查询（UI 用）=====
import { getQueueStats, startSyncQueueWorker, stopSyncQueueWorker } from "./sync-queue";

export { getQueueStats, startSyncQueueWorker, stopSyncQueueWorker };
