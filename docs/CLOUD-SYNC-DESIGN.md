# 毛球日记 · 多设备云同步设计方案

> 版本：v0.3.1 → v0.4 过渡设计
> 作者：全栈架构师
> 目标：在不破坏 v0.3.1 离线优先体验的前提下，让桌面 / Web / Android 端共享同一份宠物数据。

---

## 1. 背景与目标

### 1.1 现状

毛球日记目前是纯前端 SPA，数据持久化在浏览器 `localStorage`，key 为 `petcare-app-state-v1`，由 Zustand `persist` 中间件托管。

| 维度 | 现状 | 痛点 |
|------|------|------|
| 数据存储 | `localStorage`（v0.3.1） | 浏览器 / 设备本地；换电脑/换手机 = 数据全丢 |
| 设备覆盖 | Tauri 桌面 + Web + 即将 Android | 同一用户多设备数据割裂 |
| 备份 | 无 | 浏览器清缓存 = 整年宠物记录全没 |
| 多端编辑 | 不支持 | 没法"电脑编辑，手机查看" |
| Auth | 无 | 没法做付费会员云端校验 |

### 1.2 目标

- **G1**：用户一处操作，电脑、手机、PWA 数据自动同步
- **G2**：离线优先（offline-first）—— 弱网 / 断网下 App 仍能完整使用，联网时静默同步
- **G3**：v0.3.1 桌面 App 行为完全不变（向后兼容）
- **G4**：单设备匿名用户可零成本升级为注册用户，过程中数据不丢
- **G5**：冲突可解决（Last-Write-Wins），不会丢数据
- **G6**：免费额度内可支撑 1 万活跃用户

---

## 2. 为什么选 Supabase

| 方案 | 评分 | 理由 |
|------|------|------|
| **Supabase** | ⭐⭐⭐⭐⭐ | Postgres + Auth + Realtime + RLS + Storage 五合一，5 分钟接入，免费 500MB DB + 50k MAU 够用；TS 生态成熟 |
| Firebase | ⭐⭐⭐ | NoSQL + 实时同步体验好，但弱查询 + 文档型数据建模对关系型宠物记录不友好；Google 锁定风险 |
| 自建 Node + Postgres | ⭐⭐ | 灵活但要自己实现 Auth / Realtime / RLS / WebSocket 维护成本高 |
| PocketBase | ⭐⭐ | 单一二进制部署友好，但生态小、生产环境运维文档少 |
| Convex | ⭐⭐⭐ | DX 优秀，但国内网络可达性存疑 |

**最终选 Supabase**，核心理由：
1. **Postgres**：宠物 / 记录 / 提醒天然是关系型，SQL 查询 + JOIN 比 NoSQL 顺
2. **Realtime**：基于 Postgres 的 logical replication，免费 WebSocket，监听表变更做增量推送
3. **RLS**：行级安全策略天然适合"用户只能看自己的数据"场景，省去自建鉴权
4. **Auth**：邮箱 / 密码 / Magic Link / OAuth 一次给齐
5. **TypeScript**：官方 `@supabase/supabase-js` 类型完备，配合生成器自动出 `Database` 类型

---

## 3. 数据模型

### 3.1 表 → localStorage 字段映射

| Postgres 表 | 对应 localStorage 字段 | 增量字段 |
|-------------|------------------------|----------|
| `pets` | `pets` | `user_id`, `updated_at`, `device_id` |
| `records` | `records` | `user_id`, `updated_at`, `device_id` |
| `chats` | `chats` | `user_id`, `updated_at` |
| `health_checks` | `healthChecks` | `user_id`, `updated_at` |
| `walk_logs` | `walkLogs` | `user_id`, `updated_at` |
| `reminders` | `reminders` | `user_id`, `updated_at` |
| `food_checks` | `foodChecks` | `user_id`, `updated_at` |
| `pet_talks` | `petTalks` | `user_id`, `updated_at` |
| `achievement_unlocks` | `achievementUnlocks` | `user_id`, `updated_at` |
| `course_progress` | `courseProgress` | `user_id`, `updated_at` |
| `task_completions` | `taskCompletions` | `user_id`, `updated_at` |

**注意**：`drugs` / `tips` / `announcements` / `ads` / `foods` / `places` / `courses` / `achievements` 是**只读种子数据**，不参与同步，由运营侧单独发布。

### 3.2 完整 SQL Schema

```sql
-- ===== 用户 =====
-- Supabase 自带 auth.users，这里只建业务表

-- ===== 设备表（可选，用于多端管理） =====
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,                 -- 客户端生成的 UUID
  platform text not null,                  -- 'web' | 'tauri' | 'android' | 'pwa'
  device_name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

-- ===== 宠物 =====
create table public.pets (
  id text primary key,                     -- 客户端生成，前缀 pet_
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text not null,                   -- cat | dog | rabbit | bird | other
  breed text not null default '',
  age integer not null default 0,
  weight numeric not null default 0,
  gender text not null default 'unknown',
  avatar text not null default '',
  birthday date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  device_id text not null                   -- 最后修改的设备
);
create index pets_user_idx on public.pets(user_id);
create index pets_updated_idx on public.pets(user_id, updated_at desc);

-- ===== 记录（照片/笔记/体重/医疗） =====
create table public.records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text not null references public.pets(id) on delete cascade,
  type text not null,                      -- photo | note | weight | medical
  title text not null,
  content text not null default '',
  image_data_url text,                     -- base64 照片（小图）
  meta jsonb,                              -- 动态字段
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  device_id text not null
);
create index records_user_idx on public.records(user_id);
create index records_pet_idx on public.records(pet_id, created_at desc);
create index records_updated_idx on public.records(user_id, updated_at desc);

-- ===== 问答对话 =====
create table public.chats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text references public.pets(id) on delete set null,
  type text not null,                      -- 饮食 | 疾病 | 行为 | 用药
  question text not null,
  answer text not null,
  is_vip_only boolean default false,
  related_drug_ids text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chats_user_idx on public.chats(user_id, created_at desc);

-- ===== 提醒 =====
create table public.reminders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text not null references public.pets(id) on delete cascade,
  category text not null,
  title text not null,
  description text,
  repeat text not null,                    -- once | daily | weekly | monthly | quarterly | yearly
  next_at timestamptz not null,
  remind_before integer default 30,
  active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  device_id text not null
);
create index reminders_user_idx on public.reminders(user_id, next_at);

-- ===== 健康打卡 =====
create table public.health_checks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text not null references public.pets(id) on delete cascade,
  type text not null,
  rating smallint check (rating between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_checks_user_idx on public.health_checks(user_id, created_at desc);

-- ===== 遛狗记录 =====
create table public.walk_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text not null references public.pets(id) on delete cascade,
  duration_min integer not null,
  distance_km numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index walk_logs_user_idx on public.walk_logs(user_id, created_at desc);

-- ===== 食物成分查询 =====
create table public.food_checks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text not null references public.pets(id) on delete cascade,
  food_id text not null,
  score smallint not null,
  summary text not null,
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_checks_user_idx on public.food_checks(user_id, created_at desc);

-- ===== AI 宠物对话 =====
create table public.pet_talks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text not null references public.pets(id) on delete cascade,
  user_message text not null,
  pet_reply text not null,
  mood text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pet_talks_user_idx on public.pet_talks(user_id, created_at desc);

-- ===== 成就解锁 =====
create table public.achievement_unlocks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  context text,
  device_id text,
  unique (user_id, achievement_id)
);
create index ach_unlocks_user_idx on public.achievement_unlocks(user_id, unlocked_at desc);

-- ===== 课程进度 =====
create table public.course_progress (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  pet_id text not null references public.pets(id) on delete cascade,
  completed_step_ids text[] not null default '{}',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, pet_id)
);
create index course_progress_user_idx on public.course_progress(user_id, updated_at desc);

-- ===== 每日任务完成 =====
create table public.task_completions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  date date not null,
  pet_id text references public.pets(id) on delete set null,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id, date)
);
create index task_completions_user_idx on public.task_completions(user_id, date desc);

-- ===== updated_at 自动维护 =====
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array[
    'pets','records','chats','reminders','health_checks',
    'walk_logs','food_checks','pet_talks','course_progress'
  ]) loop
    execute format('create trigger %I_set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ===== RLS（行级安全） =====
alter table public.pets enable row level security;
alter table public.records enable row level security;
alter table public.chats enable row level security;
alter table public.reminders enable row level security;
alter table public.health_checks enable row level security;
alter table public.walk_logs enable row level security;
alter table public.food_checks enable row level security;
alter table public.pet_talks enable row level security;
alter table public.achievement_unlocks enable row level security;
alter table public.course_progress enable row level security;
alter table public.task_completions enable row level security;
alter table public.devices enable row level security;

-- 通用策略：用户只能看 / 改自己的数据
do $$
declare t text;
begin
  for t in select unnest(array[
    'pets','records','chats','reminders','health_checks','walk_logs',
    'food_checks','pet_talks','achievement_unlocks','course_progress',
    'task_completions','devices'
  ]) loop
    execute format('create policy %I_select on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('create policy %I_update on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('create policy %I_delete on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;
```

---

## 4. 同步策略

### 4.1 整体数据流

```
┌──────────────────────────────────────────────────────────┐
│  客户端（Zustand store）                                    │
│  ┌────────────┐  mutation   ┌──────────────┐            │
│  │  Page UI   │ ─────────► │  Zustand     │            │
│  └────────────┘            │  set(...)     │            │
│                            └──────┬────────┘            │
│                                   │                     │
│                                   ▼                     │
│                            ┌──────────────┐            │
│                            │ localStorage │ ◄── 单一   │
│                            │  (source of  │     数据源  │
│                            │   truth)     │            │
│                            └──────┬───────┘            │
│                                   │ subscribe          │
│                                   ▼                     │
│                            ┌──────────────┐            │
│                            │ sync-listener│            │
│                            └──────┬───────┘            │
│                                   │ enqueue            │
│                                   ▼                     │
│                            ┌──────────────┐            │
│                            │ sync-queue   │ ◄── 持久化 │
│                            │ (持久化)     │     (local) │
│                            └──────┬───────┘            │
│                                   │ flush              │
│                                   ▼                     │
│                            ┌──────────────┐            │
│                            │ sync-engine  │            │
│                            └──────┬───────┘            │
│                                   │                    │
└───────────────────────────────────┼────────────────────┘
                                    │ HTTPS / WSS
                                    ▼
                            ┌──────────────┐
                            │   Supabase   │
                            │  (Postgres)  │
                            └──────────────┘
                                    ▲
                                    │ Realtime
                                    │
                            ┌──────────────┐
                            │  其他设备     │
                            └──────────────┘
```

### 4.2 写操作（Push）

每个 store mutation action 末尾调 `enqueueSync(op)`：

```typescript
// 伪代码
addPet: (pet) => {
  const id = "pet_" + Date.now();
  set((s) => ({ pets: [...s.pets, { ...pet, id, createdAt: new Date().toISOString() }] }));
  // ↓ 新增：触发同步
  enqueueSync({
    table: "pets",
    op: "insert",
    row: get().pets[get().pets.length - 1],
  });
  return id;
}
```

**规则**：
- `enqueueSync` 内部先调 `getSupabase()`，没配 env → 直接 return（无副作用，v0.3.1 行为不变）
- 配了 env → 调 `syncEngine.pushToCloud(table, row)`，成功则丢弃 op；失败则入 `sync-queue`（localStorage 持久化）
- 队列每 30s flush 一次，或 `window.online` 事件触发立即 flush

### 4.3 读操作（Pull）

App 启动 / Auth 完成时：

```typescript
async function pullAll(): Promise<void> {
  const tables = ["pets", "records", "chats", /*...*/];
  for (const t of tables) {
    const since = getLastSyncedAt(t);     // 存在 localStorage
    const remote = await syncEngine.pullFromCloud(t, since);
    if (remote.length === 0) continue;
    const local = getTableFromStore(t);
    const merged = merge(local, remote);  // Last-Write-Wins
    setTableToStore(t, merged);
    setLastSyncedAt(t, new Date().toISOString());
  }
}
```

**全量首次同步**：since=null → 拉整表 → merge 后写 localStorage。
**增量同步**：since=ISO → 只拉 `updated_at > since` 的行。

### 4.4 实时订阅（Realtime）

登录后启动 WebSocket：

```typescript
const channel = supabase
  .channel(`user:${userId}`)
  .on('postgres_changes', { event: '*', schema: 'public', filter: `user_id=eq.${userId}` }, (payload) => {
    applyRealtimeEvent(payload);  // 写回 localStorage
  })
  .subscribe();
```

**注意**：
- 收到自己设备的回声事件要过滤（`payload.new.device_id === currentDeviceId` 直接忽略）
- Realtime 不保证顺序，所以本地仍以 `updated_at` 为权威

### 4.5 冲突解决：Last-Write-Wins（LWW）

```typescript
function merge<T extends { updated_at: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of local) map.set(r.id, r);
  for (const r of remote) {
    const existing = map.get(r.id);
    if (!existing || new Date(r.updated_at) > new Date(existing.updated_at)) {
      map.set(r.id, r);
    }
  }
  return Array.from(map.values());
}
```

**特殊情况**：
- 数组字段（`completedStepIds` / `pros` / `cons`）合并策略：union（取并集）
- 删除同步：软删除用 `deleted_at` 字段（暂未引入；v0.4 简单粗暴，删除操作直接广播覆盖）

### 4.6 设备标识

首次启动生成 UUID，存 `localStorage`：

```typescript
// 伪代码
const DEVICE_ID_KEY = "petcare-device-id";
function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
```

作用：
1. 标识数据来源（哪个设备最后改的）
2. 过滤 Realtime 回声（自己 push 的事件不再 apply 一次）
3. 多端管理 UI（"我的设备列表"）

---

## 5. Auth 流程

### 5.1 三种状态

```typescript
type AuthStatus =
  | { state: "anonymous" }   // 游客，localStorage 模式
  | { state: "authenticated"; userId: string; email: string }
  | { state: "expired" };    // token 失效，需重新登录
```

### 5.2 升级路径

```
v0.3.1 游客 ──(点"开启云同步"按钮)──> 注册/登录页
                                          │
                                          ▼
                            AuthGate 调用 supabase.auth.signUp / signInWithPassword
                                          │
                                          ▼
                            登录成功 → 触发 pullAll() → merge 远端 → 写 localStorage
                                          │
                                          ▼
                            启动 Realtime 订阅
```

**关键**：游客期间写入 localStorage 的数据，登录后会和云端 merge，不会丢。

### 5.3 客户端流程

`AuthGate` 组件挂在根 layout 之上：

```typescript
// 简化逻辑
function AuthGate({ children }) {
  const status = useAuthStatus();   // 从 supabase.auth.onAuthStateChange 派生

  if (status.state === "authenticated") {
    return <>{children}</>;
  }

  // 游客：展示子内容 + 顶部一个"☁️ 开启云同步"按钮
  // 不强制拦截，因为 v0.3.1 必须保留离线体验
  return (
    <>
      <CloudSyncBanner />
      {children}
    </>
  );
}
```

**设计取舍**：v0.4 阶段**不强制登录**。Banner 提示用户升级，登录后所有数据自动同步。v0.5 再考虑是否把"必须登录"作为前置条件。

---

## 6. 代码架构

### 6.1 新增文件

| 路径 | 作用 | 依赖 |
|------|------|------|
| `src/lib/supabase.ts` | 客户端封装 + Database 类型 + env 检测 | 无 |
| `src/lib/sync-engine.ts` | push/pull/merge/subscribe 主体逻辑 | supabase.ts |
| `src/lib/sync-queue.ts` | 离线队列 + 重试 + 持久化 | sync-engine.ts |
| `src/lib/sync-hooks.ts` | 暴露给 store 用的 `enqueueSync` helper | sync-queue.ts |
| `src/lib/sync-listener.ts` | 订阅 zustand 变化，批量入队 | sync-hooks.ts |
| `src/lib/auth.ts` | `useAuthStatus` hook + `getCurrentUser` | supabase.ts |
| `src/components/AuthGate.tsx` | 登录引导 Banner + 未登录遮罩 | auth.ts |
| `src/components/CloudSyncBanner.tsx` | 顶部"开启云同步"条 | auth.ts |
| `src/app/(auth)/login/page.tsx` | 登录页（独立路由组） | auth.ts |
| `src/app/(auth)/register/page.tsx` | 注册页 | auth.ts |
| `src/app/(auth)/layout.tsx` | 认证页 layout（无 AppShell） | — |

### 6.2 修改文件

| 路径 | 修改内容 |
|------|----------|
| `src/lib/store.ts` | **仅追加** `enqueueSync(...)` 调用到 mutation actions 末尾；不改动任何 set 逻辑 |
| `src/app/layout.tsx` | 加 `<AuthGate>` 包裹 children |
| `.env.example` | 新增 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `package.json` | v0.4 时加 `@supabase/supabase-js` 依赖（v0.3 阶段不装） |

### 6.3 不改的文件（v0.3.1 兼容性）

- 任何 `(main)/*` 下的 page（行为 100% 一致）
- `BottomNav` / `AppShell` / `AdSlot` / `Toast`
- `data.ts` / `ai-engine.ts` / `utils.ts`
- `artifacts/verification/v0.3.1/*` 任何产物

### 6.4 设计原则

1. **接口先行**：`supabase.ts` 定义完整 `Database` 类型，让 store / engine 都能拿到类型提示
2. **零运行时副作用**：env 未配置时所有 sync 函数都是 no-op，不影响 v0.3.1
3. **失败显式**：每个网络操作都用 try/catch，错误入队不抛到 UI 层
4. **可降级**：网络断开 / Supabase 故障 → App 仍能用 localStorage 工作

---

## 7. 迁移步骤（localStorage → Supabase）

### 7.1 首次升级（游客 → 注册用户）

```
1. 用户点"开启云同步"按钮
2. 跳转到 /register
3. 用户填邮箱密码
4. supabase.auth.signUp 成功 → auth.users 新增记录
5. 读取 localStorage 中所有业务表数据
6. 批量 push 到云端（每张表一次 .insert([...])）
7. pullAll() 拉取远端（理论上空，但保险起见）
8. merge 写入 localStorage
9. 启动 Realtime 订阅
10. 跳转回首页 + Toast "云同步已开启"
```

### 7.2 登录设备（旧设备）

```
1. 登录页输入邮箱密码
2. supabase.auth.signInWithPassword 成功
3. pullAll(since=null) 拉全量
4. merge 合并到 localStorage
5. 启动 Realtime
6. 跳转首页
```

### 7.3 数据合并

```typescript
// 关键：把 localStorage 数组 → cloud row 数组
function toCloudRow(table: string, row: any) {
  return {
    ...row,
    user_id: getCurrentUserId(),
    device_id: getDeviceId(),
    updated_at: new Date().toISOString(),
  };
}
```

冲突示例：
- 游客时在电脑 A 加了"小咪"
- 注册后第一次登录，手机 B 也有"小咪"（同 ID）
- merge 后保留 `updated_at` 更晚的版本（通常就是本机刚加的）

---

## 8. 成本估算

Supabase 免费层（截至 2026-08）：
- **Database**：500 MB
- **Auth**：50,000 MAU（Monthly Active Users）
- **Realtime**：500 并发连接 / 200 万消息/月
- **Storage**：1 GB（图片用）
- **Edge Functions**：500k 调用

### 单用户数据量估算

| 表 | 单条字节 | 预期年条数 | 年字节 |
|----|----------|------------|--------|
| pets | 0.5 KB | 2 | 1 KB |
| records | 5 KB（含 base64 小图） | 200 | 1 MB |
| chats | 2 KB | 100 | 200 KB |
| reminders | 0.3 KB | 20 | 6 KB |
| health_checks | 0.2 KB | 365 | 73 KB |
| walk_logs | 0.1 KB | 200 | 20 KB |
| food_checks | 0.5 KB | 30 | 15 KB |
| pet_talks | 1 KB | 100 | 100 KB |
| course_progress | 0.5 KB | 5 | 2.5 KB |
| task_completions | 0.1 KB | 365 | 36 KB |
| achievement_unlocks | 0.1 KB | 20 | 2 KB |
| **合计** | | | **~1.5 MB / 用户 / 年** |

### 容量天花板

- 1 万用户 × 1.5 MB/年 ≈ **15 GB / 年**（远超 500 MB 免费层）
- 500 MB ≈ 300 用户 × 1.5 MB
- **结论**：达到 500 用户时需要升级 Pro plan（$25/月，8 GB）

### Realtime 消息

- 每个 mutation ≈ 1 条 Postgres change event
- 假设每用户每天 5 次写 → 150 条/月 → 50k 用户 = 750 万消息
- **结论**：超过 25k MAU 后 Realtime 需升级

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **R1** Supabase 宕机 | 写失败 | localStorage 仍是 source of truth，sync-queue 持久化重试；UI 不报错 |
| **R2** 网络不稳定 | 实时不同步 | 30s 间隔拉取补漏；离线写全部入队 |
| **R3** LWW 误覆盖 | 罕见但可能丢数据 | v0.4 接受；v0.5 引入 CRDT（Yjs）or 操作日志 |
| **R4** 大照片同步慢 | 网络费流量 | v0.4 限制 record.imageDataUrl < 200KB；v0.5 改用 Supabase Storage + CDN |
| **R5** Realtime 回声 | 同一设备写两次 | 过滤 `device_id === self` |
| **R6** RLS 配错导致数据泄露 | 严重 | 测试用两个账号互相看对方数据；CI 加 RLS 单元测试 |
| **R7** 邮箱密码弱 | 账号被盗 | Supabase 默认 ≥6 位；v0.5 接 MFA |
| **R8** 用户误删 | 数据真没 | 软删除 `deleted_at` 字段（v0.5）；30 天回收站 |
| **R9** 多端同时编辑同一行 | 冲突 | LWW 兜底；v0.5 可加 ETag |
| **R10** 设备列表膨胀 | UI 难管 | `devices` 表只展示 last_seen < 30d 的活跃设备 |

---

## 10. 实施 Checklist（v0.4 阶段）

- [ ] 1. 注册 Supabase 项目，创建 org
- [ ] 2. 在 SQL Editor 执行 §3.2 完整 schema
- [ ] 3. 在 Project Settings → API 拿到 URL + anon key + service_role key
- [ ] 4. `.env.example` 加 3 个变量；`.env.local` 填入
- [ ] 5. `npm i @supabase/supabase-js`
- [ ] 6. 改 `src/lib/supabase.ts` 把 mock 切换为 `createClient<Database>(url, key)`
- [ ] 7. 本地手测：注册 → 写数据 → 切设备登录 → 数据同步
- [ ] 8. 配 Supabase Realtime：Database → Replication → 开启所有业务表
- [ ] 9. CI 加 RLS 单元测试（两个 anon key 互相访问应失败）
- [ ] 10. 灰度：先开 100 内部用户，监控 7 天

---

## 11. 测试方案

### 11.1 单元测试

- `merge(local, remote)`：本地空 / 远端空 / 都有 / 时间相同
- `enqueueSync`：env 未配时是 no-op；env 配时正确入队
- `sync-queue.flush()`：成功时丢弃、失败时保留、3 次失败后告警

### 11.2 集成测试（手测脚本）

| 场景 | 步骤 | 预期 |
|------|------|------|
| **T1** 单设备注册 | 注册账号 → 加宠物 → 刷新 → 数据还在 | ✅ |
| **T2** 多设备同步 | 设备 A 加宠物 → 设备 B 5s 内看到 | ✅ |
| **T3** 离线写 | 断网 → 加记录 → 联网 → 自动同步 | ✅ |
| **T4** 冲突 | A 改宠物名 → B 同时改宠物名 → 后改的胜 | ✅ |
| **T5** 注销登录 | 登出 → 数据仍在 localStorage | ✅ |
| **T6** RLS 隔离 | 用户 A token 查用户 B 数据 → 0 行 | ✅ |
| **T7** Realtime 回声 | A 写宠物 → A 不应收到自己 push 的事件 | ✅ |
| **T8** 队列持久化 | 断网写 10 条 → 关浏览器 → 重开联网 → 全部同步 | ✅ |
| **T9** 大图片拒绝 | 写一条 image > 200KB → 警告 + 跳过 | ✅ |
| **T10** 升级迁移 | 游客时加宠物 → 注册 → 宠物被 push 到云 | ✅ |

### 11.3 性能基准

- 启动 + pullAll 1MB 数据：< 2s
- 写一条 record 端到端：< 500ms
- Realtime 事件到达：< 1s（P95）
- 离线 → 在线 flush 100 条：< 10s

---

## 12. 时间线建议

| 周次 | 任务 |
|------|------|
| W1 | Supabase 项目 + schema + RLS；本地客户端跑通注册登录 |
| W2 | sync-engine + sync-queue + store 钩子；离线 / 联网测试 |
| W3 | Realtime + 冲突 + 设备列表；T1-T5 手测通过 |
| W4 | 内部灰度 100 用户；监控指标；v0.4.0 发布 |

---

## 附录 A：env 变量清单

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# 服务端用（可选，v0.4 不需要；v0.5 接后端 API 时用）
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 附录 B：术语

- **LWW** (Last-Write-Wins)：冲突解决策略，按 `updated_at` 时间戳取最新
- **RLS** (Row Level Security)：Postgres 行级安全策略
- **MAU** (Monthly Active Users)：月度活跃用户
- **Realtime**：Supabase 提供的 WebSocket 订阅，监听 Postgres change events
- **offline-first**：本地存储为单一数据源，云端为镜像
