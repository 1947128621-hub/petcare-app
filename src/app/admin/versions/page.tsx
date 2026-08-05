"use client";

// ===== /admin/versions · 版本矩阵编辑器(实施员 2 负责)=====
//
// 4 档 × 7 字段 勾选 UI + 切换版本入口 + 实时预览联动
//
// 字段(trait):
//   adsEnabled      广告展示
//   exportData      数据导出
//   cloudSync       云同步
//   multiPet        多宠物
//   customTheme     主题切换
//   trialEligible   试用资格
//   otaChannel      OTA 通道(下拉选择 stable/beta/internal)
//
// 实时预览:UI 顶部 4 个 dropdown 让 admin 选"以 X 档视角查看 app"
//   → 写 store.viewAsTier → 整个 app (incl. 本页之外) 以该档视角渲染
//   → 详见 /admin 主页 + 后续 sub-route 切档使用
//
// 持久化:versionMatrix 和 viewAsTier 都在 store 的 partialize 里(已加)
//         切换 versionMatrix 单格自动持久化
//         viewAsTier 也持久化(刷新页面后保留 admin 预览档)

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Grid3x3,
  Check,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  Info,
  LogOut,
  Save,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DEFAULT_VERSION_MATRIX } from "@/lib/version-matrix";
import { AdminAuth } from "@/lib/admin-auth";
import { pushToast } from "@/components/Toast";
import { cn, formatDateShort } from "@/lib/utils";
import type {
  VersionCapabilities,
  VersionMatrix,
  MembershipTier,
} from "@/lib/types";

const TIERS: { key: MembershipTier; label: string; desc: string; color: string }[] = [
  { key: "free", label: "Free", desc: "免费", color: "bg-[var(--color-text-soft)]" },
  { key: "trial", label: "Trial", desc: "3 天试用", color: "bg-[var(--color-warning)]" },
  { key: "standard", label: "Standard", desc: "标准版", color: "bg-[var(--color-primary)]" },
  { key: "senior", label: "Senior", desc: "老年特惠", color: "bg-[var(--color-secondary)]" },
];

const CAPS: { key: keyof VersionCapabilities; label: string; type: "boolean" | "channel"; desc: string }[] = [
  { key: "adsEnabled", label: "广告", type: "boolean", desc: "是否展示广告" },
  { key: "exportData", label: "数据导出", type: "boolean", desc: "是否允许导出全量 JSON" },
  { key: "cloudSync", label: "云同步", type: "boolean", desc: "是否启用云同步" },
  { key: "multiPet", label: "多宠物", type: "boolean", desc: "是否允许多宠物档案" },
  { key: "customTheme", label: "主题切换", type: "boolean", desc: "是否允许切换主题" },
  { key: "trialEligible", label: "试用资格", type: "boolean", desc: "是否可开启 3 天试用" },
  { key: "otaChannel", label: "OTA 通道", type: "channel", desc: "stable / beta / internal" },
];

const CHANNELS: { value: "stable" | "beta" | "internal"; label: string }[] = [
  { value: "stable", label: "stable" },
  { value: "beta", label: "beta" },
  { value: "internal", label: "internal" },
];

export default function AdminVersionsPage() {
  const router = useRouter();
  const versionMatrix = useAppStore((s) => s.versionMatrix);
  const viewAsTier = useAppStore((s) => s.viewAsTier);
  const setViewAsTier = useAppStore((s) => s.setViewAsTier);
  const updateCap = useAppStore((s) => s.updateVersionCapability);
  const rollback = useAppStore((s) => s.rollbackVersionMatrix);

  // 待保存状态(dirty 标志)
  const [dirty, setDirty] = useState(false);
  const [previewMatrix, setPreviewMatrix] = useState<VersionMatrix>(versionMatrix);

  // 同步 store → 本地预览(避免编辑中 store 触发重渲染闪烁)
  // 注:本页用本地 draft 而不是直接改 store,这样可以"预览再保存"或"取消"
  // 但 v0.4 简陋版简化:点击 checkbox 立即写 store(无 draft)
  // 这里仅保留 dirty 标志用于"是否修改过"提示

  const handleToggleBool = useCallback(
    (tier: MembershipTier, key: keyof VersionCapabilities, current: boolean) => {
      updateCap(tier, key, !current);
      setPreviewMatrix((prev) => ({
        ...prev,
        [tier]: { ...prev[tier], [key]: !current },
      }));
      setDirty(true);
    },
    [updateCap]
  );

  const handleChangeChannel = useCallback(
    (
      tier: MembershipTier,
      key: keyof VersionCapabilities,
      value: "stable" | "beta" | "internal"
    ) => {
      updateCap(tier, key, value);
      setPreviewMatrix((prev) => ({
        ...prev,
        [tier]: { ...prev[tier], [key]: value },
      }));
      setDirty(true);
    },
    [updateCap]
  );

  const handleReset = useCallback(() => {
    rollback(DEFAULT_VERSION_MATRIX);
    setPreviewMatrix({ ...DEFAULT_VERSION_MATRIX, releasedAt: new Date().toISOString() });
    setDirty(false);
    pushToast({ kind: "info", title: "已重置", message: "版本矩阵已恢复为默认值" });
  }, [rollback]);

  const handleSave = useCallback(() => {
    // v0.4 简化:已在每次 toggle 时直接写 store;"保存"按钮只 toast 提示
    setDirty(false);
    pushToast({ kind: "success", title: "已保存", message: "版本矩阵已落盘" });
  }, []);

  const handleLogout = () => {
    AdminAuth.logout();
    if (typeof window !== "undefined") window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[var(--bg-cream)]">
      <header className="sticky top-0 z-30 bg-[var(--bg-cream)]/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-[var(--color-border)]">
        <Link
          href="/admin"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-soft active:scale-95"
          aria-label="返回"
        >
          <ArrowLeft size={18} className="text-[var(--color-text)]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-[var(--color-text)] truncate flex items-center gap-1.5">
            <Grid3x3 size={14} className="text-[var(--color-success)]" />
            版本矩阵
          </h1>
          <p className="text-[10px] text-[var(--color-text-soft)] truncate">
            v{versionMatrix.version} · 4 档 × 7 字段
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-soft text-[var(--color-text-soft)] active:scale-95"
          aria-label="登出"
        >
          <LogOut size={16} />
        </button>
      </header>

      <main className="w-full max-w-[480px] mx-auto px-4 py-4 space-y-4">
        {/* 实时预览切档器 */}
        <section className="bg-white rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-[var(--color-primary)]" />
            <h2 className="text-sm font-bold text-[var(--color-text)]">实时预览视角</h2>
            {viewAsTier && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white font-medium">
                {viewAsTier}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[var(--color-text-soft)] mb-2.5 leading-relaxed">
            选择"以 X 档视角"后,整个 app 立刻按该档渲染(广告 / 主题 / 试用等)。仅 admin 可见,不改真实数据。
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => {
                setViewAsTier(null);
                pushToast({ kind: "info", title: "已切回真实档" });
              }}
              className={cn(
                "py-2 rounded-xl text-[11px] font-medium transition-all",
                viewAsTier === null
                  ? "bg-[var(--color-text)] text-white shadow-soft"
                  : "bg-[var(--bg-soft)] text-[var(--color-text-soft)] border border-[var(--color-border)]"
              )}
            >
              真实档
            </button>
            {TIERS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setViewAsTier(t.key);
                  pushToast({ kind: "success", title: `已切到 ${t.label} 视角` });
                }}
                className={cn(
                  "py-2 rounded-xl text-[11px] font-medium transition-all",
                  viewAsTier === t.key
                    ? `${t.color} text-white shadow-soft`
                    : "bg-[var(--bg-soft)] text-[var(--color-text-soft)] border border-[var(--color-border)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {viewAsTier && (
            <button
              onClick={() => setViewAsTier(null)}
              className="mt-2 w-full py-1.5 rounded-lg text-[11px] text-[var(--color-text-soft)] hover:text-[var(--color-text)] flex items-center justify-center gap-1"
            >
              <EyeOff size={11} />
              退出预览模式
            </button>
          )}
        </section>

        {/* 版本矩阵表 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-1.5">
              <Grid3x3 size={14} className="text-[var(--color-success)]" />
              能力矩阵
            </h2>
            <div className="flex gap-1.5">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full bg-white border border-[var(--color-border)] text-[var(--color-text-soft)] active:scale-95"
                aria-label="重置"
              >
                <RotateCcw size={10} />
                重置
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full bg-gradient-warm text-white shadow-soft active:scale-95 disabled:opacity-40"
                aria-label="保存"
              >
                <Save size={10} />
                保存
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            {/* 表头 */}
            <div className="grid grid-cols-[80px_repeat(4,1fr)] gap-1 px-2 py-2 bg-[var(--bg-soft)] text-[10px] font-bold text-[var(--color-text-soft)] uppercase">
              <div>能力</div>
              {TIERS.map((t) => (
                <div key={t.key} className="text-center">
                  <div className={cn("inline-block w-2 h-2 rounded-full mr-1", t.color)} />
                  {t.label}
                </div>
              ))}
            </div>

            {/* 表格行 */}
            {CAPS.map((cap) => (
              <div
                key={cap.key}
                className="grid grid-cols-[80px_repeat(4,1fr)] gap-1 px-2 py-2.5 items-center border-t border-[var(--color-border)]"
              >
                <div className="text-[11px] text-[var(--color-text)] font-medium">
                  {cap.label}
                  <p className="text-[9px] text-[var(--color-text-soft)] mt-0.5 leading-tight font-normal">
                    {cap.desc}
                  </p>
                </div>
                {TIERS.map((t) => {
                  const caps = versionMatrix[t.key];
                  const value = caps[cap.key];
                  if (cap.type === "boolean") {
                    const boolVal = value === true;
                    return (
                      <div key={t.key} className="flex justify-center">
                        <button
                          onClick={() => handleToggleBool(t.key, cap.key, boolVal)}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90",
                            boolVal
                              ? "bg-[var(--color-success)] text-white"
                              : "bg-[var(--bg-soft)] text-[var(--color-text-soft)] border border-[var(--color-border)]"
                          )}
                          aria-label={`${t.label} ${cap.label} = ${boolVal ? "开启" : "关闭"}`}
                        >
                          {boolVal ? <Check size={12} /> : <X size={12} />}
                        </button>
                      </div>
                    );
                  }
                  // channel type
                  const channelVal = value as "stable" | "beta" | "internal";
                  return (
                    <div key={t.key} className="flex justify-center">
                      <select
                        value={channelVal}
                        onChange={(e) =>
                          handleChangeChannel(
                            t.key,
                            cap.key,
                            e.target.value as "stable" | "beta" | "internal"
                          )
                        }
                        className="text-[10px] px-1 py-0.5 rounded bg-[var(--bg-soft)] border border-[var(--color-border)] text-[var(--color-text)] font-mono"
                      >
                        {CHANNELS.map((ch) => (
                          <option key={ch.value} value={ch.value}>
                            {ch.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {dirty && (
            <p className="text-[10px] text-[var(--color-warning)] mt-1.5 text-center flex items-center justify-center gap-1">
              <Info size={10} />
              有未保存的更改(实际已自动落盘,点"保存"仅提示)
            </p>
          )}
        </section>

        {/* 字段说明 */}
        <section className="bg-white rounded-2xl p-3.5 shadow-soft">
          <h3 className="text-xs font-bold text-[var(--color-text)] mb-2">字段说明</h3>
          <ul className="text-[10px] text-[var(--color-text-soft)] space-y-1.5 leading-relaxed">
            <li>· <strong>广告</strong>:Standard / Senior 完全关闭弹窗广告</li>
            <li>· <strong>数据导出</strong>:基础权利,所有档都允许</li>
            <li>· <strong>云同步</strong>:Senior 独占(v0.4 仍 mock)</li>
            <li>· <strong>多宠物</strong>:v0.4 不再限制,所有档都给</li>
            <li>· <strong>主题切换</strong>:Free 锁死 young,Senior 锁死 senior</li>
            <li>· <strong>试用资格</strong>:仅 Free 用户能开 Trial</li>
            <li>· <strong>OTA 通道</strong>:Senior 可选 beta(未来)</li>
          </ul>
        </section>

        {/* 操作区 */}
        <section className="bg-white rounded-2xl p-3.5 shadow-soft space-y-2">
          <h3 className="text-xs font-bold text-[var(--color-text)]">回滚 / 发布</h3>
          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-xl bg-[var(--bg-soft)] text-[var(--color-text)] text-xs font-medium active:scale-[0.98]"
          >
            <RotateCcw size={11} className="inline -mt-0.5 mr-1" />
            回滚到默认矩阵
          </button>
          <p className="text-[10px] text-[var(--color-text-soft)] text-center leading-relaxed">
            实际回滚需 OTA 发版(打 tag 触发 GH Actions);此处仅 UI 演示。
          </p>
        </section>

        {/* 元数据 */}
        <p className="text-[10px] text-center text-[var(--color-text-soft)]">
          当前版本:v{versionMatrix.version} · 落盘时间 {formatDateShort(versionMatrix.releasedAt)}
        </p>
      </main>
    </div>
  );
}
