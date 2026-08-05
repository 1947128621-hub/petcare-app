// ===== Supabase 客户端封装 =====
// v0.3.1: 骨架版（mock 实现，env 未配时为 no-op）
// v0.4: 装 @supabase/supabase-js 后，把 createMockClient 替换为 createClient<Database>(url, key)
//
// 设计目标：
// 1. 与 @supabase/supabase-js 兼容的最小类型子集
// 2. 零运行时副作用：env 未配置时 getSupabase() 返回 null，调用方 null-check 后降级到 localStorage
// 3. Database 类型是单一真相源——所有 sync 模块都引用它

"use client";

import type { Pet, PetRecord, QAChat, HealthCheck, WalkLog, Reminder, FoodCheck, PetTalk, AchievementUnlock, CourseProgress, TaskCompletion } from "./types";

// ===== 平台检测 =====
export type Platform = "web" | "pwa" | "tauri" | "android" | "ios" | "unknown";

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  // Tauri 注入 __TAURI__ 到 window
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return "tauri";
  // Capacitor / Cordova 注入
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  if (cap?.getPlatform) {
    const p = cap.getPlatform();
    if (p === "android") return "android";
    if (p === "ios") return "ios";
  }
  // PWA：standalone display mode
  if (window.matchMedia?.("(display-mode: standalone)").matches) return "pwa";
  return "web";
}

// ===== Database schema 类型（与 Postgres 表一一对应）=====
// 字段命名用 snake_case（与 SQL 一致）；通过 supabase.ts 末尾的 toRow/fromRow 桥接到 TS camelCase 类型

// ===== 业务表 Row 类型（snake_case 字段，匹配 Postgres）=====
export interface PetRow {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  gender: string;
  avatar: string;
  birthday: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  device_id: string;
}

export interface RecordRow {
  id: string;
  user_id: string;
  pet_id: string;
  type: string;
  title: string;
  content: string;
  image_data_url: string | null;
  meta: Record<string, string | number> | null;
  created_at: string;
  updated_at: string;
  device_id: string;
}

export interface ChatRow {
  id: string;
  user_id: string;
  pet_id: string | null;
  type: string;
  question: string;
  answer: string;
  is_vip_only: boolean | null;
  related_drug_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderRow {
  id: string;
  user_id: string;
  pet_id: string;
  category: string;
  title: string;
  description: string | null;
  repeat: string;
  next_at: string;
  remind_before: number | null;
  active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
  device_id: string;
}

export interface HealthCheckRow {
  id: string;
  user_id: string;
  pet_id: string;
  type: string;
  rating: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalkLogRow {
  id: string;
  user_id: string;
  pet_id: string;
  duration_min: number;
  distance_km: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodCheckRow {
  id: string;
  user_id: string;
  pet_id: string;
  food_id: string;
  score: number;
  summary: string;
  pros: string[];
  cons: string[];
  created_at: string;
  updated_at: string;
}

export interface PetTalkRow {
  id: string;
  user_id: string;
  pet_id: string;
  user_message: string;
  pet_reply: string;
  mood: string;
  created_at: string;
  updated_at: string;
}

export interface AchievementUnlockRow {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  context: string | null;
  device_id: string | null;
}

export interface CourseProgressRow {
  id: string;
  user_id: string;
  course_id: string;
  pet_id: string;
  completed_step_ids: string[];
  started_at: string;
  updated_at: string;
}

export interface TaskCompletionRow {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  pet_id: string | null;
  completed_at: string;
}

export interface DeviceRow {
  id: string;
  user_id: string;
  device_id: string;
  platform: string;
  device_name: string | null;
  last_seen_at: string;
  created_at: string;
}

// ===== Database 顶层类型 =====
export interface Database {
  public: {
    Tables: {
      pets: { Row: PetRow; Insert: Partial<PetRow> & { id: string; user_id: string }; Update: Partial<PetRow> };
      records: { Row: RecordRow; Insert: Partial<RecordRow> & { id: string; user_id: string; pet_id: string }; Update: Partial<RecordRow> };
      chats: { Row: ChatRow; Insert: Partial<ChatRow> & { id: string; user_id: string }; Update: Partial<ChatRow> };
      reminders: { Row: ReminderRow; Insert: Partial<ReminderRow> & { id: string; user_id: string; pet_id: string }; Update: Partial<ReminderRow> };
      health_checks: { Row: HealthCheckRow; Insert: Partial<HealthCheckRow> & { id: string; user_id: string; pet_id: string }; Update: Partial<HealthCheckRow> };
      walk_logs: { Row: WalkLogRow; Insert: Partial<WalkLogRow> & { id: string; user_id: string; pet_id: string }; Update: Partial<WalkLogRow> };
      food_checks: { Row: FoodCheckRow; Insert: Partial<FoodCheckRow> & { id: string; user_id: string; pet_id: string }; Update: Partial<FoodCheckRow> };
      pet_talks: { Row: PetTalkRow; Insert: Partial<PetTalkRow> & { id: string; user_id: string; pet_id: string }; Update: Partial<PetTalkRow> };
      achievement_unlocks: { Row: AchievementUnlockRow; Insert: Partial<AchievementUnlockRow> & { id: string; user_id: string; achievement_id: string }; Update: Partial<AchievementUnlockRow> };
      course_progress: { Row: CourseProgressRow; Insert: Partial<CourseProgressRow> & { id: string; user_id: string; course_id: string; pet_id: string }; Update: Partial<CourseProgressRow> };
      task_completions: { Row: TaskCompletionRow; Insert: Partial<TaskCompletionRow> & { id: string; user_id: string; task_id: string; date: string }; Update: Partial<TaskCompletionRow> };
      devices: { Row: DeviceRow; Insert: Partial<DeviceRow> & { id: string; user_id: string; device_id: string; platform: string }; Update: Partial<DeviceRow> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ===== 业务表名常量 =====
export const SYNC_TABLES = [
  "pets",
  "records",
  "chats",
  "reminders",
  "health_checks",
  "walk_logs",
  "food_checks",
  "pet_talks",
  "achievement_unlocks",
  "course_progress",
  "task_completions",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

// ===== 最小 Supabase 客户端接口（与 @supabase/supabase-js 兼容）=====
export interface QueryResult<T> {
  data: T[] | null;
  error: { message: string; code?: string } | null;
}

export interface RealtimePayload<T> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T | null;
  schema: string;
  table: string;
}

export interface RealtimeChannel {
  on(
    event: "postgres_changes",
    opts: { event: string; schema: string; table?: string; filter?: string },
    callback: (payload: RealtimePayload<unknown>) => void
  ): RealtimeChannel;
  subscribe(): RealtimeChannel;
  unsubscribe(): Promise<void>;
}

export interface SupabaseClient {
  auth: {
    getUser(): Promise<{ data: { user: { id: string; email?: string | null } | null }; error: { message: string } | null }>;
    getSession(): Promise<{ data: { session: { access_token: string; user: { id: string; email?: string | null } } | null } }>;
    signUp(opts: { email: string; password: string }): Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
    signInWithPassword(opts: { email: string; password: string }): Promise<{ data: { user: { id: string; email?: string | null } | null }; error: { message: string } | null }>;
    signOut(): Promise<{ error: { message: string } | null }>;
    resetPasswordForEmail(email: string): Promise<{ error: { message: string } | null }>;
    onAuthStateChange(callback: (event: string, session: { access_token: string; user: { id: string; email?: string | null } } | null) => void): { data: { subscription: { unsubscribe: () => void } } };
  };
  from(table: string): {
    select(cols?: string): {
      eq(col: string, val: unknown): Promise<QueryResult<unknown>>;
      gt(col: string, val: string): Promise<QueryResult<unknown>>;
      order(col: string, opts?: { ascending?: boolean }): {
        limit(n: number): Promise<QueryResult<unknown>>;
      };
    };
    insert(rows: unknown): Promise<QueryResult<unknown>>;
    update(patch: unknown): {
      eq(col: string, val: unknown): Promise<QueryResult<unknown>>;
    };
    delete(): {
      eq(col: string, val: unknown): Promise<QueryResult<unknown>>;
    };
  };
  channel(name: string): RealtimeChannel;
}

// ===== Mock 客户端（env 未配时使用）=====
// 不做任何网络操作，所有方法返回空成功。
// v0.4 接入真实 Supabase 时把 createMockClient 替换为 createClient<Database>(url, key)

function createMockClient(_url: string, _key: string): SupabaseClient {
  const noopAsync = <T>(data: T): Promise<T> => Promise.resolve(data);

  return {
    auth: {
      getUser: () => noopAsync({ data: { user: null }, error: null }),
      getSession: () => noopAsync({ data: { session: null } }),
      signUp: () => noopAsync({ data: { user: null }, error: { message: "云同步未配置（mock 模式）" } }),
      signInWithPassword: () => noopAsync({ data: { user: null }, error: { message: "云同步未配置（mock 模式）" } }),
      signOut: () => noopAsync({ error: null }),
      resetPasswordForEmail: () => noopAsync({ error: { message: "云同步未配置（mock 模式）" } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => noopAsync({ data: [], error: null }),
        gt: () => noopAsync({ data: [], error: null }),
        order: () => ({ limit: () => noopAsync({ data: [], error: null }) }),
      }),
      insert: () => noopAsync({ data: [], error: null }),
      update: () => ({ eq: () => noopAsync({ data: [], error: null }) }),
      delete: () => ({ eq: () => noopAsync({ data: [], error: null }) }),
    }),
    channel: () => ({
      on: function (_event, _opts, _cb) { return this; },
      subscribe: function () { return this; },
      unsubscribe: () => noopAsync(undefined),
    }),
  };
}

// ===== 单例 =====
let cachedClient: SupabaseClient | null = null;
let cachedEnvChecked = false;

export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  if (typeof window === "undefined") return null; // SSR 阶段不初始化
  if (cachedEnvChecked) return null;
  cachedEnvChecked = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info("[supabase] env 未配置，使用 mock 客户端（v0.3.1 offline-first 模式）");
    }
    return null;
  }

  // v0.4 实施时替换为：
  //   import { createClient } from "@supabase/supabase-js";
  //   cachedClient = createClient<Database>(url, key);
  // v0.3.1 阶段用 mock 兜底，确保代码可编译、运行时无错误
  cachedClient = createMockClient(url, key);
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// ===== 设备 ID（首启动生成，存 localStorage）=====
const DEVICE_ID_KEY = "petcare-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `dev_${Date.now()}`;
  }
}

// ===== TS → Postgres row 转换工具 =====
// 因为 TS 用 camelCase，DB 用 snake_case，所以提供桥接函数
// v0.4 接入时这些函数会用 @supabase/supabase-js 的类型自动推导替代

export function petToRow(p: Pet, userId: string, deviceId: string): PetRow {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    species: p.species,
    breed: p.breed,
    age: p.age,
    weight: p.weight,
    gender: p.gender,
    avatar: p.avatar,
    birthday: p.birthday ?? null,
    notes: p.notes ?? null,
    created_at: p.createdAt,
    updated_at: new Date().toISOString(),
    device_id: deviceId,
  };
}

export function rowToPet(r: PetRow): Pet {
  return {
    id: r.id,
    name: r.name,
    species: r.species as Pet["species"],
    breed: r.breed,
    age: r.age,
    weight: r.weight,
    gender: r.gender as Pet["gender"],
    avatar: r.avatar,
    birthday: r.birthday ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

export function recordToRow(r: PetRecord, userId: string, deviceId: string): RecordRow {
  return {
    id: r.id,
    user_id: userId,
    pet_id: r.petId,
    type: r.type,
    title: r.title,
    content: r.content,
    image_data_url: r.imageDataUrl ?? null,
    meta: r.meta ?? null,
    created_at: r.createdAt,
    updated_at: new Date().toISOString(),
    device_id: deviceId,
  };
}

export function rowToRecord(r: RecordRow): PetRecord {
  return {
    id: r.id,
    petId: r.pet_id,
    type: r.type as PetRecord["type"],
    title: r.title,
    content: r.content,
    imageDataUrl: r.image_data_url ?? undefined,
    meta: r.meta ?? undefined,
    createdAt: r.created_at,
  };
}

export function chatToRow(c: QAChat, userId: string): ChatRow {
  return {
    id: c.id,
    user_id: userId,
    pet_id: c.petId ?? null,
    type: c.type,
    question: c.question,
    answer: c.answer,
    is_vip_only: c.isVipOnly ?? null,
    related_drug_ids: c.relatedDrugIds ?? null,
    created_at: c.createdAt,
    updated_at: c.createdAt,
  };
}

export function rowToChat(r: ChatRow): QAChat {
  return {
    id: r.id,
    petId: r.pet_id ?? undefined,
    type: r.type as QAChat["type"],
    question: r.question,
    answer: r.answer,
    isVipOnly: r.is_vip_only ?? undefined,
    relatedDrugIds: r.related_drug_ids ?? undefined,
    createdAt: r.created_at,
  };
}

export function healthCheckToRow(h: HealthCheck, userId: string): HealthCheckRow {
  return {
    id: h.id,
    user_id: userId,
    pet_id: h.petId,
    type: h.type,
    rating: h.rating ?? null,
    note: h.note ?? null,
    created_at: h.createdAt,
    updated_at: h.createdAt,
  };
}

export function rowToHealthCheck(r: HealthCheckRow): HealthCheck {
  return {
    id: r.id,
    petId: r.pet_id,
    type: r.type as HealthCheck["type"],
    rating: (r.rating as HealthCheck["rating"]) ?? undefined,
    note: r.note ?? undefined,
    createdAt: r.created_at,
  };
}

export function walkLogToRow(w: WalkLog, userId: string): WalkLogRow {
  return {
    id: w.id,
    user_id: userId,
    pet_id: w.petId,
    duration_min: w.durationMin,
    distance_km: w.distanceKm ?? null,
    note: w.note ?? null,
    created_at: w.createdAt,
    updated_at: w.createdAt,
  };
}

export function rowToWalkLog(r: WalkLogRow): WalkLog {
  return {
    id: r.id,
    petId: r.pet_id,
    durationMin: r.duration_min,
    distanceKm: r.distance_km ?? undefined,
    note: r.note ?? undefined,
    createdAt: r.created_at,
  };
}

export function reminderToRow(r: Reminder, userId: string, deviceId: string): ReminderRow {
  return {
    id: r.id,
    user_id: userId,
    pet_id: r.petId,
    category: r.category,
    title: r.title,
    description: r.description ?? null,
    repeat: r.repeat,
    next_at: r.nextAt,
    remind_before: r.remindBefore ?? null,
    active: r.active,
    last_triggered_at: r.lastTriggeredAt ?? null,
    created_at: r.createdAt,
    updated_at: new Date().toISOString(),
    device_id: deviceId,
  };
}

export function rowToReminder(r: ReminderRow): Reminder {
  return {
    id: r.id,
    petId: r.pet_id,
    category: r.category as Reminder["category"],
    title: r.title,
    description: r.description ?? undefined,
    repeat: r.repeat as Reminder["repeat"],
    nextAt: r.next_at,
    remindBefore: r.remind_before ?? undefined,
    active: r.active,
    lastTriggeredAt: r.last_triggered_at ?? undefined,
    createdAt: r.created_at,
  };
}

export function foodCheckToRow(f: FoodCheck, userId: string): FoodCheckRow {
  return {
    id: f.id,
    user_id: userId,
    pet_id: f.petId,
    food_id: f.foodId,
    score: f.score,
    summary: f.summary,
    pros: f.pros,
    cons: f.cons,
    created_at: f.createdAt,
    updated_at: f.createdAt,
  };
}

export function rowToFoodCheck(r: FoodCheckRow): FoodCheck {
  return {
    id: r.id,
    petId: r.pet_id,
    foodId: r.food_id,
    score: r.score,
    summary: r.summary,
    pros: r.pros,
    cons: r.cons,
    createdAt: r.created_at,
  };
}

export function petTalkToRow(p: PetTalk, userId: string): PetTalkRow {
  return {
    id: p.id,
    user_id: userId,
    pet_id: p.petId,
    user_message: p.userMessage,
    pet_reply: p.petReply,
    mood: p.mood,
    created_at: p.createdAt,
    updated_at: p.createdAt,
  };
}

export function rowToPetTalk(r: PetTalkRow): PetTalk {
  return {
    id: r.id,
    petId: r.pet_id,
    userMessage: r.user_message,
    petReply: r.pet_reply,
    mood: r.mood as PetTalk["mood"],
    createdAt: r.created_at,
  };
}

export function achievementUnlockToRow(a: AchievementUnlock, userId: string, deviceId: string, id: string): AchievementUnlockRow {
  return {
    id,
    user_id: userId,
    achievement_id: a.achievementId,
    unlocked_at: a.unlockedAt,
    context: a.context ?? null,
    device_id: deviceId,
  };
}

export function rowToAchievementUnlock(r: AchievementUnlockRow): AchievementUnlock {
  return {
    achievementId: r.achievement_id,
    unlockedAt: r.unlocked_at,
    context: r.context ?? undefined,
  };
}

export function courseProgressToRow(c: CourseProgress, userId: string, id: string): CourseProgressRow {
  return {
    id,
    user_id: userId,
    course_id: c.courseId,
    pet_id: c.petId,
    completed_step_ids: c.completedStepIds,
    started_at: c.startedAt,
    updated_at: c.updatedAt,
  };
}

export function rowToCourseProgress(r: CourseProgressRow): CourseProgress {
  return {
    courseId: r.course_id,
    petId: r.pet_id,
    completedStepIds: r.completed_step_ids,
    startedAt: r.started_at,
    updatedAt: r.updated_at,
  };
}

export function taskCompletionToRow(t: TaskCompletion, userId: string, id: string): TaskCompletionRow {
  return {
    id,
    user_id: userId,
    task_id: t.taskId,
    date: t.date,
    pet_id: t.petId ?? null,
    completed_at: t.completedAt,
  };
}

export function rowToTaskCompletion(r: TaskCompletionRow): TaskCompletion {
  return {
    taskId: r.task_id,
    date: r.date,
    petId: r.pet_id ?? undefined,
    completedAt: r.completed_at,
  };
}
