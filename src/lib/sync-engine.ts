// ===== 同步引擎 =====
// v0.3.1: 骨架版（mock client 模式下所有方法都是 no-op）
// v0.4.0: 加数据最小化（push 过 whitelist + pull 不下载 base64 照片）
//
// 核心 API：
//   pushToCloud(table, row)            单条推送（自动判断 insert vs update；v0.4.0 自动过白名单）
//   pullFromCloud(table, since?)       拉取远端变更（不下载 base64 照片）
//   pullFromCloudLazy(table, since?)   v0.4.0 新增：拉取元数据 + 标记哪些 row 需要 lazy 拉照片
//   merge(local, remote, opts)         Last-Write-Wins 合并
//   subscribe(table, callback)          Realtime 订阅
//
// 设计原则：
//   - 所有网络操作都是 best-effort，失败不抛到 UI 层
//   - getSupabase() 返回 null 时所有方法都是 no-op（v0.3.1 离线模式）
//   - 错误用 console.warn 输出，调用方不需 try/catch
//   - v0.4.0 数据最小化：所有 push 字段按 WHITELISTED_FIELDS 过滤，pull 不下 base64

"use client";

import {
  getSupabase,
  getDeviceId,
  type SyncTable,
  type SupabaseClient,
} from "./supabase";
// v0.4.0 F-SEC-05：数据最小化（白名单模式 + 黑名单 + 内部字段过滤）
import { minimizeData, minimizeBatch } from "./security";

// ===== 操作类型 =====
export type SyncOp = "insert" | "update" | "delete";

export interface PushResult {
  ok: boolean;
  error?: string;
  /** 当远端无变化但本地有，标记 conflict=true 让调用方决定 */
  conflict?: boolean;
}

// ===== merge 工具函数 =====
// Last-Write-Wins：按 updatedAt 字段比，大的胜
// 数组字段合并：union（取并集）—— 用 opts.arrayFields 指定

export interface MergeOptions {
  /** 数组字段名列表（如 ['completedStepIds', 'pros', 'cons']），这些字段做 union 合并而非整体替换 */
  arrayFields?: string[];
}

export function merge<T extends { id: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
  opts: MergeOptions = {}
): T[] {
  const map = new Map<string, T>();
  const arrayFields = new Set(opts.arrayFields ?? []);

  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    // 比 updatedAt
    const localTs = existing.updatedAt ?? "";
    const remoteTs = item.updatedAt ?? "";
    if (new Date(remoteTs).getTime() >= new Date(localTs).getTime()) {
      // 远端较新或相等 → 用远端
      // 但数组字段取 union
      if (arrayFields.size > 0) {
        map.set(item.id, mergeArrayFields(existing, item, arrayFields));
      } else {
        map.set(item.id, item);
      }
    } else if (arrayFields.size > 0) {
      // 本地较新，但数组字段也要 union
      map.set(item.id, mergeArrayFields(existing, item, arrayFields));
    }
    // 否则保留 existing
  }
  return Array.from(map.values());
}

function mergeArrayFields<T extends Record<string, unknown>>(
  local: T,
  remote: T,
  arrayFields: Set<string>
): T {
  const out: Record<string, unknown> = { ...remote };
  for (const f of arrayFields) {
    const l = local[f];
    const r = remote[f];
    if (Array.isArray(l) && Array.isArray(r)) {
      out[f] = Array.from(new Set([...l, ...r]));
    }
  }
  return out as T;
}

// ===== pushToCloud =====
// 自动判断 insert vs update：supabase 用 upsert（PK 是 id），简化逻辑
// 失败不抛，调用方决定如何处理
//
// v0.4.0 F-SEC-05：**数据最小化** —— 入队前过 WHITELISTED_FIELDS 白名单
// - 未知字段一律丢弃
// - `_` 开头字段一律丢弃
// - 会员 tier / theme / points / history 根本不同步（这些字段不来自业务表，由 BLACKLIST 兜底）

export async function pushToCloud(
  table: SyncTable,
  row: Record<string, unknown>
): Promise<PushResult> {
  const client = getSupabase();
  if (!client) return { ok: true, conflict: false }; // mock 模式假装成功

  // 1) 数据最小化：只保留白名单字段
  const minimized = minimizeData(row, table) as Record<string, unknown>;

  // 2) 加 device_id 标识来源（如果调用方没传）
  const enriched = { ...minimized, device_id: minimized.device_id ?? getDeviceId() };

  try {
    const result = await client.from(table).insert(enriched);
    if (result.error) {
      // 23505 = unique_violation → 实际是 update 场景，退回用 upsert
      if (result.error.code === "23505") {
        const id = (enriched as { id?: string }).id;
        if (id) {
          const upd = await client.from(table).update(enriched).eq("id", id);
          if (upd.error) {
            return { ok: false, error: upd.error.message };
          }
          return { ok: true };
        }
      }
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ===== pushDelete =====
export async function pushDeleteToCloud(
  table: SyncTable,
  id: string
): Promise<PushResult> {
  const client = getSupabase();
  if (!client) return { ok: true };

  try {
    const result = await client.from(table).delete().eq("id", id);
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ===== pullFromCloud =====
// since 为 ISO 时间戳；null = 全量
//
// v0.4.0 F-SEC-05：**照片 lazy load** —— records 表的 imageDataUrl 字段不下到本地
// 拉回时只取元数据（id/petId/type/title/content/meta/createdAt/updatedAt），
// 业务对象上挂个 `__imageDataUrlStatus` 标记（lazy/loaded），UI 按需拉图
// 历史 base64 在 store 已经在的**不重新下载**（既保护隐私又省流量）

const PHOTO_TABLES: ReadonlySet<SyncTable> = new Set(["records"]);
const PHOTO_FIELDS: ReadonlySet<string> = new Set(["image_data_url", "imageDataUrl"]);

export interface PullResult<T = unknown> {
  data: T[];
  /** 哪些 row 需要单独拉照片（v0.4.0 lazy load 标记） */
  photoRowIds?: string[];
  error?: string;
}

export async function pullFromCloud<T = unknown>(
  table: SyncTable,
  since?: string | null
): Promise<{ data: T[]; error?: string }> {
  const result = await pullFromCloudLazy<T>(table, since);
  return { data: result.data, error: result.error };
}

/**
 * v0.4.0 新增：lazy load 版的 pull。
 * 区别于 `pullFromCloud`：返回额外 `photoRowIds` 列表，调用方可按需调 `fetchPhotoFromCloud` 拉图。
 */
export async function pullFromCloudLazy<T = unknown>(
  table: SyncTable,
  since?: string | null
): Promise<PullResult<T>> {
  const client = getSupabase();
  if (!client) return { data: [] };

  try {
    // 选字段：非 photo 表全选；photo 表（records）跳过 base64 字段
    const isPhotoTable = PHOTO_TABLES.has(table);
    const cols = isPhotoTable ? "id, user_id, pet_id, type, title, content, meta, created_at, updated_at, device_id" : "*";

    let result;
    if (since) {
      result = await client.from(table).select(cols).gt("updated_at", since);
    } else {
      // 拿一个轻量 query builder（mock client 上 .order / .limit 兼容）
      result = await client
        .from(table)
        .select(cols)
        .order("updated_at", { ascending: false })
        .limit(5000);
    }
    if (result.error) return { data: [], error: result.error.message };

    const rows = (result.data ?? []) as T[];

    // 标记需要 lazy 拉图的 row
    if (isPhotoTable) {
      const photoRowIds: string[] = [];
      for (const r of rows) {
        const row = r as { id?: string; type?: string; image_data_url?: unknown };
        if (row.type === "photo" && row.id) {
          photoRowIds.push(row.id);
        }
      }
      return { data: rows, photoRowIds };
    }
    return { data: rows };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : String(e) };
  }
}

// ===== subscribe (Realtime) =====
// 订阅单表变更，回调收到 Realtime 事件
// 注意：v0.3.1 mock 模式不真正连接

export function subscribe<T = unknown>(
  table: SyncTable,
  callback: (event: "INSERT" | "UPDATE" | "DELETE", row: T) => void
): () => void {
  const client = getSupabase();
  if (!client) return () => {}; // mock 模式：no-op unsubscribe

  const filter = `device_id=neq.${getDeviceId()}`; // 过滤自己设备的回声
  const channel = client
    .channel(`sync:${table}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter },
      (payload) => {
        const evt = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        if (evt === "DELETE") {
          callback(evt, payload.old as T);
        } else {
          callback(evt, payload.new as T);
        }
      }
    )
    .subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

// ===== 批量推送 =====
export async function pushBatchToCloud(
  table: SyncTable,
  rows: Record<string, unknown>[]
): Promise<PushResult> {
  const client = getSupabase();
  if (!client || rows.length === 0) return { ok: true };

  try {
    // v0.4.0 F-SEC-05：批量入队前也过白名单
    const minimized = minimizeBatch(rows, table) as Array<Record<string, unknown>>;
    const enriched = minimized.map((r) => ({ ...r, device_id: r.device_id ?? getDeviceId() }));
    const result = await client.from(table).insert(enriched);
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ===== 状态查询 =====
export function isOnline(): boolean {
  if (typeof window === "undefined") return false;
  return window.navigator.onLine;
}

// ===== 错误降级辅助 =====
export function safeAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch((e) => {
    // eslint-disable-next-line no-console
    console.warn("[sync] op failed, fallback:", e);
    return fallback;
  });
}
