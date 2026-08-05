// ===== 毛球日记 v0.4.0 · 版本矩阵默认值(实施员 2 负责)=====
//
// 4 档 × 7 字段能力矩阵默认值。
// - 与 plan §2.7 字段定义一致
// - 与 impl §4.1 L948-969 "能力说明"表 一致
// - 真实编辑走 /admin/versions(勾选 UI),本文件只提供 default
//
// 字段说明:
//   adsEnabled      是否展示广告
//   exportData      是否允许导出全量 JSON(基础权利)
//   cloudSync       是否启用云同步(v0.4 仍 false;senior 可作卖点)
//   multiPet        是否允许多宠物档案
//   customTheme     是否允许切换主题
//   trialEligible   是否可开启 3 天试用
//   otaChannel      OTA 通道

import type { VersionMatrix } from "./types";

const RELEASED_AT = "2026-08-04T00:00:00.000Z";

export const DEFAULT_VERSION_MATRIX: VersionMatrix = {
  version: "0.4.0",
  releasedAt: RELEASED_AT,
  free: {
    adsEnabled: true,
    exportData: true,
    cloudSync: false,
    multiPet: true,
    customTheme: false, // free 锁死 young
    trialEligible: true, // 首次访问可激活 trial
    otaChannel: "stable",
  },
  trial: {
    adsEnabled: true, // 试用仍有广告(转化引导)
    exportData: true,
    cloudSync: false,
    multiPet: true,
    customTheme: true,
    trialEligible: false, // trial 档不能再开 trial
    otaChannel: "stable",
  },
  standard: {
    adsEnabled: false, // 完全免广告
    exportData: true,
    cloudSync: false, // v0.4 仍 false
    multiPet: true,
    customTheme: true,
    trialEligible: false,
    otaChannel: "stable",
  },
  senior: {
    adsEnabled: false,
    exportData: true,
    cloudSync: true, // senior 独占"卖点"
    multiPet: true,
    customTheme: true, // senior 锁死 senior(但能力位开启,UI 层强制锁)
    trialEligible: false,
    otaChannel: "stable",
  },
};

// ===== 工具：取当前 admin "view as" 档的最终能力 =====
//
// 供 useAppStore 派生 selector 使用。
// 优先级:admin viewAsTier > 用户真实档 > 兜底 free
import type { AppState } from "./store";
import type { MembershipTier, VersionCapabilities } from "./types";

/** 取"当前生效档"——admin viewAsTier 优先,否则用真实档 */
export function selectEffectiveTier(s: AppState): MembershipTier {
  if (s.viewAsTier) return s.viewAsTier;
  // 真实档 = membership.tier(trial/standard/senior 需检查有效期,简化用 raw)
  return s.membership.tier;
}

/** 取"当前生效档"的能力配置 */
export function selectEffectiveCapabilities(s: AppState): VersionCapabilities {
  const tier = selectEffectiveTier(s);
  return s.versionMatrix[tier];
}
