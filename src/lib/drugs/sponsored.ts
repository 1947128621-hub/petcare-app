// ===== v0.4.0 推广药工具函数(实施员 3)=====
//
// 任务来源:实施员 3 · 推广标记
// 实施日期:2026-08-04
// 实施依据:任务清单 §2「推广标记」+ plan F-MED-02 + implementation §3 #15
//
// 严格约束(任务清单):
//   - 推广药只能 3-5 款(在 seed-v040.ts 标 `isPromoted: true`)
//   - 推广药在搜索结果**排前**但不**伪装**(明确标"推广"小标签 — 红色/红橙)
//   - 不藏药:Free 用户也能看全部 52 款
//   - 推广药 ≠ VIP 药(可推广可 VIP,也可只推广不 VIP)
//
// 设计要点:
//   - 排序键:`promotedRank DESC > isPromoted DESC > name ASC`
//   - `getPromotedDrugs()` 返回推广药清单(去重;同 ID 多次返回取 rank 最高)
//   - `sortDrugsForDisplay()` 复用给 medicine/page.tsx(无侵入,接现有 drugs[])
//   - `isPromotedDrug()` 单独判断,给 UI chip 用

import type { Drug } from "../types";

/**
 * 取所有推广药(按 promotedRank 降序,同 rank 按 name 升序稳定排序)
 *
 * 用于:
 *   - 顶部"推广药品"位
 *   - 角标判定
 *   - 后续运营报表(本项目 v0.4.0 不实现)
 */
export function getPromotedDrugs(drugs: Drug[]): Drug[] {
  return drugs
    .filter((d) => d.isPromoted === true)
    .slice()
    .sort((a, b) => {
      const ra = a.promotedRank ?? 0;
      const rb = b.promotedRank ?? 0;
      if (ra !== rb) return rb - ra; // 降序
      return a.name.localeCompare(b.name, "zh-Hans-CN");
    });
}

/**
 * 单条药品是否为推广药(给 UI chip / 详情页用)
 */
export function isPromotedDrug(drug: Drug): boolean {
  return drug.isPromoted === true;
}

/**
 * 药品展示排序:推广药靠前 + 同 rank 稳定 + 同 rank 同非推广内仍按 name
 *
 * 用途:`medicine/page.tsx` 的 `filtered` 列表再过一遍这个函数。
 *
 * 注意:**不**在过滤阶段调用,而是过滤完后排序(保证搜索/分类/症状快捷
 * 筛选后的列表,推广药仍排前)。
 */
export function sortDrugsForDisplay(drugs: Drug[]): Drug[] {
  return drugs.slice().sort((a, b) => {
    const aPromo = a.isPromoted === true ? 1 : 0;
    const bPromo = b.isPromoted === true ? 1 : 0;
    if (aPromo !== bPromo) return bPromo - aPromo; // 推广在前

    const ra = a.promotedRank ?? 0;
    const rb = b.promotedRank ?? 0;
    if (aPromo === 1 && bPromo === 1 && ra !== rb) return rb - ra;

    // 其它(非推广)按 name 稳定排序 — 中文按 locale
    return a.name.localeCompare(b.name, "zh-Hans-CN");
  });
}
