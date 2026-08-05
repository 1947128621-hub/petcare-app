// ===== Zustand 全局状—+ localStorage 持久—=====

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  seedPets, seedRecords, seedDrugs, seedTips, seedAnnouncements, seedAds,
  seedReminders, seedPlaces, seedFoods, seedAchievements, seedCourses,
} from "./data";
import type {
  Pet, PetRecord, QAChat, Drug, DailyTip, Announcement, AdConfig,
  Membership, MembershipTier, Reminder, NearbyPlace, FoodItem, FoodCheck,
  HealthCheck, WalkLog, Achievement, AchievementUnlock, Course, CourseProgress,
  TaskDefinition, TaskCompletion, PetTalk,
  VersionMatrix, VersionCapabilities,
} from "./types";
// v0.4.0 —版本矩阵默认—实施—2 负责;4 —× 7 字段)
import { DEFAULT_VERSION_MATRIX } from "./version-matrix";
// v0.3.1 新增：云同步钩子（fire-and-forget，env 未配—no-op，不影响原行为）
import { enqueueSync } from "./sync-hooks";

// 工具：把业务对象转成可入队的 record（保—camelCase，sync-engine 不关心命名）
// v0.4.0 F-SEC-05：数据最小化 ———sync 表白名单过滤字段
// 业务对象已通过 TypeScript 类型保护（不存在 `_` / 会员字段），白名单过滤是双保隔
import { minimizeData } from "./security";
import type { SyncTable } from "./supabase";

const toWhitelistedRow = <T extends object>(
  table: SyncTable,
  o: T
): Record<string, unknown> => minimizeData(o as Record<string, unknown>, table) as Record<string, unknown>;

export interface AppState {
  // 数据
  pets: Pet[];
  records: PetRecord[];
  chats: QAChat[];
  drugs: Drug[];
  tips: DailyTip[];
  announcements: Announcement[];
  ads: AdConfig[];
  // v0.2 新增
  reminders: Reminder[];
  places: NearbyPlace[];
  foods: FoodItem[];
  foodChecks: FoodCheck[];
  healthChecks: HealthCheck[];
  walkLogs: WalkLog[];
  // v0.3 新增
  achievements: Achievement[];
  achievementUnlocks: AchievementUnlock[];
  courses: Course[];
  courseProgress: CourseProgress[];
  taskCompletions: TaskCompletion[];
  petTalks: PetTalk[];

  // 用户状。
  membership: Membership;
  readTipIds: string[];
  readAnnouncementIds: string[];
  popupAdLastShown: string | null; // ISO date，控制弹窗广告每日只弹一。
  adPopupDismissed: boolean;       // 当前会话是否已关闭弹。
  bannerAdHiddenUntil: string | null; // v0.3.2 —横幅广告关闭—24h 隐藏
  hasSeenManual: boolean;          // v0.3.2 —是否已看过说明书（用于右上角 ? 角标—
  // Actions: Pet
  addPet: (pet: Omit<Pet, "id" | "createdAt">) => string;
  updatePet: (id: string, patch: Partial<Pet>) => void;
  deletePet: (id: string) => void;

  // Actions: Record
  addRecord: (rec: Omit<PetRecord, "id" | "createdAt">) => string;
  deleteRecord: (id: string) => void;

  // Actions: Chat
  addChat: (chat: Omit<QAChat, "id" | "createdAt">) => string;
  clearChats: () => void;

  // Actions: Membership (v0.3.x 兼容保留)
  upgradeMembership: (tier: MembershipTier, months: number, amount: number) => void;
  cancelMembership: () => void;

  // v0.4.0 —4 档会员新 actions
  /** 直接设置会员—供付款页 / admin 切换—;不清 trial/expiresAt 字段 */
  setMembership: (tier: MembershipTier) => void;
  /** 激—3 天试—写入 trialStartedAt / trialEndsAt,生成 couponCode) */
  startTrial: () => void;
  /** 强制结束试用(降级—free;数据保留) */
  endTrial: () => void;
  /** 切换主题(任何 tier 都能—Senior 档被强制锁定—senior 主题) */
  useTheme: (theme: "young" | "senior") => void;
  /** 累加积分(打卡 / 任务完成时调— */
  addPoints: (n: number) => void;
  /** 消费积分(v0.4.0 仅记—UI 不暴露入—v0.4.1 才用) */
  spendPoints: (n: number) => boolean;

  // Actions: Tips / Announcements
  markTipRead: (id: string) => void;
  markAnnouncementRead: (id: string) => void;

  // Actions: Tips / Announcements 管理（运营后台用。
  addTip: (tip: Omit<DailyTip, "id">) => void;
  addAnnouncement: (n: Omit<Announcement, "id">) => void;
  updateDrug: (id: string, patch: Partial<Drug>) => void;
  addDrug: (drug: Omit<Drug, "id">) => void;
  toggleAd: (id: string) => void;

  // Actions: 广告弹窗
  dismissPopupAd: () => void;
  hideBannerAd: (hours: number) => void; // v0.3.2 —关闭横幅广告 N 小时
  markManualSeen: () => void;            // v0.3.2 —标记已读说明—
  // v0.2 —Reminder 提醒
  addReminder: (r: Omit<Reminder, "id" | "createdAt">) => string;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;

  // v0.2 —HealthCheck 健康打卡
  addHealthCheck: (c: Omit<HealthCheck, "id" | "createdAt">) => string;
  deleteHealthCheck: (id: string) => void;

  // v0.2 —WalkLog 遛狗
  addWalkLog: (w: Omit<WalkLog, "id" | "createdAt">) => string;
  deleteWalkLog: (id: string) => void;

  // v0.2 —FoodCheck 食物成分查询
  addFoodCheck: (c: Omit<FoodCheck, "id" | "createdAt">) => string;
  deleteFoodCheck: (id: string) => void;

  // v0.3 —成就
  checkAndUnlockAchievements: () => string[]; // 返回新解锁的 id 列表

  // v0.3 —训练课程
  completeCourseStep: (courseId: string, petId: string, stepId: string) => void;

  // v0.3 —每日任务
  completeTask: (taskId: string, petId?: string) => void;

  // v0.3 —AI 宠物角色
  addPetTalk: (t: Omit<PetTalk, "id" | "createdAt">) => string;
  clearPetTalks: (petId: string) => void;

  // ===== v0.4.0 · 版本矩阵(实施—2)=====
  /** 4 —× 7 字段能力矩阵(可被 /admin/versions 编辑) */
  versionMatrix: VersionMatrix;
  /**
   * 管理员切档预——admin —/admin/versions 切换"假设我是 X —,
   * 所有页面以 X 档视角展—广告 / 主题 / 试用 / 多宠物等)
   * - `null` = 真实—默认)
   * - 其他—= admin 模拟视角
   * - **—*影响 view —不改 store.membership 持久化数—   * - 持久—刷新后保留预览档)
   */
  viewAsTier: MembershipTier | null;
  /** 修改单档的某个能—单元格勾—UI 触发) */
  updateVersionCapability: (
    tier: Exclude<keyof VersionMatrix, "version" | "releasedAt">,
    key: keyof VersionCapabilities,
    value: boolean | string
  ) => void;
  /** 切换 admin 模拟视角档位;null = 切回真实—*/
  setViewAsTier: (tier: MembershipTier | null) => void;
  /** 回滚版本矩阵到上一稳定版本(演示— */
  rollbackVersionMatrix: (target: VersionMatrix) => void;
}

const STORAGE_KEY = "petcare-app-state-v1";

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      pets: seedPets,
      records: seedRecords,
      chats: [],
      drugs: seedDrugs,
      tips: seedTips,
      announcements: seedAnnouncements,
      ads: seedAds,
      reminders: seedReminders,
      places: seedPlaces,
      foods: seedFoods,
      foodChecks: [],
      healthChecks: [],
      walkLogs: [],
      achievements: seedAchievements,
      achievementUnlocks: [],
      courses: seedCourses,
      courseProgress: [],
      taskCompletions: [],
      petTalks: [],

      // v0.4.0 —4 档会员初始化:theme 默认 young,points 默认 0
      // (trialStartedAt / trialEndsAt / couponCode —optional,—trial 激活时写入)
      membership: { tier: "free", expiresAt: null, history: [], theme: "young", points: 0 },
      readTipIds: [],
      readAnnouncementIds: [],
      popupAdLastShown: null,
      adPopupDismissed: false,
      bannerAdHiddenUntil: null,
      hasSeenManual: false,

      // ----- Pet -----
      addPet: (pet) => {
        const id = "pet_" + Date.now();
        const createdAt = new Date().toISOString();
        set((s) => ({
          pets: [...s.pets, { ...pet, id, createdAt }],
        }));
        enqueueSync("pets", "insert", id, toWhitelistedRow("pets", { ...pet, id, createdAt }));
        return id;
      },
      updatePet: (id, patch) => {
        set((s) => ({ pets: s.pets.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        const updated = get().pets.find((p) => p.id === id);
        if (updated) enqueueSync("pets", "update", id, toWhitelistedRow("pets", updated));
      },
      deletePet: (id) => {
        // v0.3.2 —级联清理：删除宠物时同时清理所—petId 关联的数据，避免孤儿记录。
        set((s) => ({
          pets: s.pets.filter((p) => p.id !== id),
          records: s.records.filter((r) => r.petId !== id),
          reminders: s.reminders.filter((r) => r.petId !== id),
          healthChecks: s.healthChecks.filter((r) => r.petId !== id),
          walkLogs: s.walkLogs.filter((r) => r.petId !== id),
          foodChecks: s.foodChecks.filter((r) => r.petId !== id),
          petTalks: s.petTalks.filter((r) => r.petId !== id),
        }));
        enqueueSync("pets", "delete", id, null);
      },

      // ----- Record -----
      addRecord: (rec) => {
        const id = "rec_" + Date.now();
        const createdAt = new Date().toISOString();
        set((s) => ({
          records: [{ ...rec, id, createdAt }, ...s.records],
        }));
        enqueueSync("records", "insert", id, toWhitelistedRow("records", { ...rec, id, createdAt }));
        return id;
      },
      deleteRecord: (id) => {
        set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
        enqueueSync("records", "delete", id, null);
      },

      // ----- Chat -----
      addChat: (chat) => {
        const id = "chat_" + Date.now();
        const createdAt = new Date().toISOString();
        set((s) => ({
          chats: [{ ...chat, id, createdAt }, ...s.chats],
        }));
        enqueueSync("chats", "insert", id, toWhitelistedRow("chats", { ...chat, id, createdAt }));
        return id;
      },
      clearChats: () => {
        const ids = get().chats.map((c) => c.id);
        set({ chats: [] });
        ids.forEach((id) => enqueueSync("chats", "delete", id, null));
      },

      // ----- Membership -----
      upgradeMembership: (tier, months, amount) => {
        const now = new Date();
        // v0.4.0 —用真—setFullYear / setMonth(避免 v0.3.1 —"+30—— 漂移 bug)
        // 月付:`setMonth(now.getMonth() + months)`(v0.4 暂保—
        // 年付—startTrial 之外入口(在付款页 setMembership("standard" | "senior") —1 年到—
        const expires = new Date(now);
        if (months >= 12) {
          expires.setFullYear(expires.getFullYear() + Math.floor(months / 12));
          expires.setMonth(expires.getMonth() + (months % 12));
        } else {
          expires.setMonth(expires.getMonth() + months);
        }
        set((s) => ({
          membership: {
            ...s.membership,
            tier,
            expiresAt: expires.toISOString(),
            history: [
              ...s.membership.history,
              { tier, startedAt: now.toISOString(), expiresAt: expires.toISOString(), amount },
            ],
          },
        }));
      },
      cancelMembership: () => {
        // v0.4.0 —取消时保—theme 字段(不重—;清除 trial 字段
        set((s) => ({
          membership: {
            ...s.membership,
            tier: "free",
            expiresAt: null,
            trialStartedAt: undefined,
            trialEndsAt: undefined,
            couponCode: undefined,
            history: s.membership.history,
          },
        }));
      },

      // v0.4.0 —4 档会员新 actions -----
      setMembership: (tier) => {
        // 直接切档;**—*—expiresAt(付款页自己处—;**—*—trial 字段
        set((s) => ({
          membership: {
            ...s.membership,
            tier,
            // Senior 档强—senior 主题(plan F-MEM-05)
            theme: tier === "senior" ? "senior" : s.membership.theme,
          },
        }));
      },
      startTrial: () => {
        // 激—3 天试—字段—trialStartedAt / trialEndsAt(MUST-03)
        const now = Date.now();
        const trialStartedAt = new Date(now).toISOString();
        const trialEndsAt = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
        // 转化券码:基于 trial 时间—确定——versions.ts.generateTrialCoupon)
        const couponCode = `TRIAL-${trialStartedAt.replace(/[^0-9]/g, "").slice(-4).toUpperCase()}-${trialEndsAt.replace(/[^0-9]/g, "").slice(-4).toUpperCase()}`;
        set((s) => ({
          membership: {
            ...s.membership,
            tier: "trial",
            trialStartedAt,
            trialEndsAt,
            couponCode,
          },
        }));
      },
      endTrial: () => {
        // 强制结束试用(数据保留:不清任何业务数据,只清 trial 状态字—
        set((s) => ({
          membership: {
            ...s.membership,
            tier: "free",
            expiresAt: null,
            trialStartedAt: undefined,
            trialEndsAt: undefined,
            couponCode: undefined,
          },
        }));
      },
      useTheme: (theme) => {
        // 切主—Senior 档被强制锁定—senior 主题(plan F-MEM-05)
        set((s) => {
          if (s.membership.tier === "senior" && theme !== "senior") {
            // 静默拒绝(Senior 档锁—senior 主题)
            return s;
          }
          return { membership: { ...s.membership, theme } };
        });
      },
      addPoints: (n) => {
        set((s) => ({
          membership: { ...s.membership, points: s.membership.points + n },
        }));
      },
      spendPoints: (n) => {
        // v0.4.0 仅记—v0.4.1 才实—spend UI
        const cur = get().membership.points;
        if (cur < n) return false;
        set((s) => ({
          membership: { ...s.membership, points: s.membership.points - n },
        }));
        return true;
      },

      // ----- Tips / Announcements -----
      markTipRead: (id) => set((s) => ({ readTipIds: [...new Set([...s.readTipIds, id])] })),
      markAnnouncementRead: (id) =>
        set((s) => ({ readAnnouncementIds: [...new Set([...s.readAnnouncementIds, id])] })),

      // ----- 运营后台 -----
      addTip: (tip) => set((s) => ({ tips: [{ ...tip, id: "tip_" + Date.now() }, ...s.tips] })),
      addAnnouncement: (n) =>
        set((s) => ({ announcements: [{ ...n, id: "n_" + Date.now() }, ...s.announcements] })),
      updateDrug: (id, patch) =>
        set((s) => ({ drugs: s.drugs.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      addDrug: (drug) => set((s) => ({ drugs: [...s.drugs, { ...drug, id: "drug_" + Date.now() }] })),
      toggleAd: (id) =>
        set((s) => ({ ads: s.ads.map((a) => (a.id === id ? { ...a, active: !a.active } : a)) })),

      dismissPopupAd: () => set({ adPopupDismissed: true, popupAdLastShown: new Date().toISOString() }),

      // v0.3.2 —关闭横幅广告 N 小时
      hideBannerAd: (hours) => {
        const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
        set({ bannerAdHiddenUntil: until });
      },
      markManualSeen: () => set({ hasSeenManual: true }),

      // ----- v0.2 Reminder -----
      addReminder: (r) => {
        const id = "rem_" + Date.now();
        const createdAt = new Date().toISOString();
        set((s) => ({
          reminders: [{ ...r, id, createdAt }, ...s.reminders],
        }));
        enqueueSync("reminders", "insert", id, toWhitelistedRow("reminders", { ...r, id, createdAt }));
        return id;
      },
      updateReminder: (id, patch) => {
        set((s) => ({ reminders: s.reminders.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        const updated = get().reminders.find((x) => x.id === id);
        if (updated) enqueueSync("reminders", "update", id, toWhitelistedRow("reminders", updated));
      },
      toggleReminder: (id) => {
        set((s) => ({ reminders: s.reminders.map((x) => (x.id === id ? { ...x, active: !x.active } : x)) }));
        const updated = get().reminders.find((x) => x.id === id);
        if (updated) enqueueSync("reminders", "update", id, toWhitelistedRow("reminders", updated));
      },
      deleteReminder: (id) => {
        set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) }));
        enqueueSync("reminders", "delete", id, null);
      },

      // ----- v0.2 HealthCheck -----
      addHealthCheck: (c) => {
        const id = "hc_" + Date.now();
        const createdAt = new Date().toISOString();
        set((s) => ({
          healthChecks: [{ ...c, id, createdAt }, ...s.healthChecks],
        }));
        enqueueSync("health_checks", "insert", id, toWhitelistedRow("health_checks", { ...c, id, createdAt }));
        return id;
      },
      deleteHealthCheck: (id) => {
        set((s) => ({ healthChecks: s.healthChecks.filter((x) => x.id !== id) }));
        enqueueSync("health_checks", "delete", id, null);
      },

      // ----- v0.2 WalkLog -----
      addWalkLog: (w) => {
        const id = "wl_" + Date.now();
        const createdAt = new Date().toISOString();
        set((s) => ({
          walkLogs: [{ ...w, id, createdAt }, ...s.walkLogs],
        }));
        enqueueSync("walk_logs", "insert", id, toWhitelistedRow("walk_logs", { ...w, id, createdAt }));
        return id;
      },
      deleteWalkLog: (id) => {
        set((s) => ({ walkLogs: s.walkLogs.filter((x) => x.id !== id) }));
        enqueueSync("walk_logs", "delete", id, null);
      },

      // ----- v0.2 FoodCheck -----
      addFoodCheck: (c) => {
        const id = "fc_" + Date.now();
        const createdAt = new Date().toISOString();
        set((s) => ({
          foodChecks: [{ ...c, id, createdAt }, ...s.foodChecks],
        }));
        enqueueSync("food_checks", "insert", id, toWhitelistedRow("food_checks", { ...c, id, createdAt }));
        return id;
      },
      deleteFoodCheck: (id) => {
        set((s) => ({ foodChecks: s.foodChecks.filter((x) => x.id !== id) }));
        enqueueSync("food_checks", "delete", id, null);
      },

      // ----- v0.3 成就系统 -----
      checkAndUnlockAchievements: () => {
        const state = get();
        const already = new Set(state.achievementUnlocks.map((u) => u.achievementId));
        const newlyUnlocked: string[] = [];

        // 统计各种数据
        const recordCount = state.records.length;
        const photoCount = state.records.filter((r) => r.type === "photo").length;
        const weightCount = state.records.filter((r) => r.type === "weight").length;
        const qaCount = state.chats.length;
        const petCount = state.pets.length;
        const walkCount = state.walkLogs.length;
        const readTipCount = state.readTipIds.length;

        // 计算连续打卡天数（健康打—+ 遛狗。
        const allCheckinDates = [
          ...state.healthChecks.map((c) => c.createdAt.slice(0, 10)),
          ...state.walkLogs.map((w) => w.createdAt.slice(0, 10)),
        ];
        const dateSet = new Set(allCheckinDates);
        let consecutive = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today.getTime() - i * 86400000);
          const key = d.toISOString().slice(0, 10);
          if (dateSet.has(key)) consecutive++;
          else if (i > 0) break;
        }

        // 检查每个成。
        const newUnlocks: AchievementUnlock[] = [];
        for (const a of state.achievements) {
          if (already.has(a.id)) continue;
          let unlocked = false;
          switch (a.condition) {
            case "add_pet_1": unlocked = petCount >= 1; break;
            case "add_pet_n": unlocked = petCount >= (a.threshold || 0); break;
            case "consecutive_checkin": unlocked = consecutive >= (a.threshold || 0); break;
            case "add_records": unlocked = recordCount >= (a.threshold || 0); break;
            case "add_photos": unlocked = photoCount >= (a.threshold || 0); break;
            case "ask_qa": unlocked = qaCount >= (a.threshold || 0); break;
            case "add_walks": unlocked = walkCount >= (a.threshold || 0); break;
            case "add_weights": unlocked = weightCount >= (a.threshold || 0); break;
            case "view_tips": unlocked = readTipCount >= (a.threshold || 0); break;
            case "unlock_all":
              // 全部其他成就（除自己外）都解锁了
              unlocked = state.achievements
                .filter((x) => x.id !== a.id)
                .every((x) => already.has(x.id));
              break;
          }
          if (unlocked) {
            newUnlocks.push({
              achievementId: a.id,
              unlockedAt: new Date().toISOString(),
              context: `统计: ${recordCount} 记录 / ${photoCount} 照片 / ${qaCount} 问答 / ${petCount} 宠物 / 连续 ${consecutive} 天`,
            });
            newlyUnlocked.push(a.id);
          }
        }

        if (newUnlocks.length > 0) {
          set((s) => ({ achievementUnlocks: [...newUnlocks, ...s.achievementUnlocks] }));
          // 同步每条新解。
          for (const u of newUnlocks) {
            enqueueSync("achievement_unlocks", "insert", `au_${u.achievementId}_${u.unlockedAt}`, toWhitelistedRow("achievement_unlocks", u));
          }
        }
        return newlyUnlocked;
      },

      // ----- v0.3 训练课程 -----
      completeCourseStep: (courseId, petId, stepId) => {
        set((s) => {
          const existing = s.courseProgress.find(
            (p) => p.courseId === courseId && p.petId === petId
          );
          const now = new Date().toISOString();
          if (existing) {
            if (existing.completedStepIds.includes(stepId)) return s;
            return {
              courseProgress: s.courseProgress.map((p) =>
                p === existing
                  ? { ...p, completedStepIds: [...p.completedStepIds, stepId], updatedAt: now }
                  : p
              ),
            };
          }
          return {
            courseProgress: [
              ...s.courseProgress,
              { courseId, petId, completedStepIds: [stepId], startedAt: now, updatedAt: now },
            ],
          };
        });
        const updated = get().courseProgress.find(
          (p) => p.courseId === courseId && p.petId === petId
        );
        if (updated) {
          // v0.4.0 F-SEC-05 + v0.3.1 Bug #6 修：sid 包含 stepId，每步独立 row
          //   之前 sid = cp_${courseId}_${petId} 会被 sync-queue dedupAndMerge 合并成 1 条
          //   修复后每步独立入队，验收"同时完成 3 步 → 队列入 3 条 op（不是 1 条合并）"
          const sid = `cp_${courseId}_${petId}_${stepId}`;
          enqueueSync("course_progress", "insert", sid, toWhitelistedRow("course_progress", updated));
        }
      },

      // ----- v0.3 每日任务 -----
      completeTask: (taskId, petId) => {
        const today = new Date().toISOString().slice(0, 10);
        set((s) => {
          if (s.taskCompletions.some((c) => c.taskId === taskId && c.date === today)) return s;
          return {
            taskCompletions: [
              {
                taskId,
                date: today,
                petId,
                completedAt: new Date().toISOString(),
              },
              ...s.taskCompletions,
            ],
          };
        });
        const completed = get().taskCompletions.find(
          (c) => c.taskId === taskId && c.date === today
        );
        if (completed) {
          const tid = `tc_${taskId}_${today}`;
          enqueueSync("task_completions", "insert", tid, toWhitelistedRow("task_completions", completed));
        }
      },

      // ----- v0.3 AI 宠物角色 -----
      addPetTalk: (t) => {
        const id = "pt_" + Date.now();
        const createdAt = new Date().toISOString();
        set((s) => ({
          petTalks: [{ ...t, id, createdAt }, ...s.petTalks],
        }));
        enqueueSync("pet_talks", "insert", id, toWhitelistedRow("pet_talks", { ...t, id, createdAt }));
        return id;
      },
      clearPetTalks: (petId) => {
        const ids = get().petTalks.filter((x) => x.petId === petId).map((x) => x.id);
        set((s) => ({ petTalks: s.petTalks.filter((x) => x.petId !== petId) }));
        ids.forEach((id) => enqueueSync("pet_talks", "delete", id, null));
      },

      // ===== v0.4.0 · 版本矩阵 actions(实施—2)=====
      versionMatrix: DEFAULT_VERSION_MATRIX,
      viewAsTier: null,

      updateVersionCapability: (tier, key, value) => {
        set((s) => ({
          versionMatrix: {
            ...s.versionMatrix,
            // tier —free/trial/standard/senior 之一,运行时已—VersionCapabilities 子集
            [tier]: {
              ...s.versionMatrix[tier],
              [key]: value,
            },
          },
        }));
      },
      setViewAsTier: (tier) => {
        set({ viewAsTier: tier });
      },
      rollbackVersionMatrix: (target) => {
        set({
          versionMatrix: {
            ...target,
            releasedAt: new Date().toISOString(),
          },
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pets: state.pets,
        records: state.records,
        chats: state.chats,
        drugs: state.drugs,
        tips: state.tips,
        announcements: state.announcements,
        ads: state.ads,
        // v0.4.0 —membership 整体持久——theme / points / trialStartedAt / trialEndsAt / couponCode)
        membership: state.membership,
        readTipIds: state.readTipIds,
        readAnnouncementIds: state.readAnnouncementIds,
        // v0.4.0.2.1 修复:补回 adPopupDismissed 持久化(原来只持久化 popupAdLastShown,
        // 导致关闭态跨会话丢失,体感"X 叉不掉")
        popupAdLastShown: state.popupAdLastShown,
        adPopupDismissed: state.adPopupDismissed,
        bannerAdHiddenUntil: state.bannerAdHiddenUntil,
        hasSeenManual: state.hasSeenManual,
        reminders: state.reminders,
        healthChecks: state.healthChecks,
        walkLogs: state.walkLogs,
        foodChecks: state.foodChecks,
        achievementUnlocks: state.achievementUnlocks,
        courseProgress: state.courseProgress,
        taskCompletions: state.taskCompletions,
        petTalks: state.petTalks,
        // v0.4.0 —版本矩阵 + admin 预览—实施—2)
        versionMatrix: state.versionMatrix,
        viewAsTier: state.viewAsTier,
      }),
    }
  )
);

// ===== 工具 selector =====

/** v0.4.0 —4 档会员档 + 自动过期降级 + 老档位兜—*/
export const selectMembershipTier = (s: AppState): MembershipTier => {
  const raw = s.membership.tier;

  // 1) 老档—v0.3.x 残留)兜底:vip/svip/lifetime —free
  // 实际项目从未发布 0.3.x,localStorage 里不应有老数—此处—用户从外部导入脏数据"时崩
  if (raw !== "free" && raw !== "trial" && raw !== "standard" && raw !== "senior") {
    return "free";
  }

  // 2) free 直接返回
  if (raw === "free") return "free";

  // 3) trial:检—trialEndsAt
  if (raw === "trial") {
    if (!s.membership.trialEndsAt) return "free";  // 缺时间戳视为无效
    return new Date(s.membership.trialEndsAt).getTime() > Date.now() ? "trial" : "free";
  }

  // 4) standard / senior:检—expiresAt
  if (!s.membership.expiresAt) return "free";
  return new Date(s.membership.expiresAt).getTime() > Date.now() ? raw : "free";
};

export const selectIsVipOrAbove = (s: AppState) => {
  // v0.4.0 —保留旧接—映射到新档位 standard / senior / trial
  const tier = selectMembershipTier(s);
  return tier === "standard" || tier === "senior" || tier === "trial";
};
