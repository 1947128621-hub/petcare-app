// ===== 隐私政策页 =====
// v0.4.0 F-SEC-04：隐私政策公开可访问 + 首次启动 modal 引用
//
// 内容(plan F-SEC-04 + impl §10.8 验收)：5 大段
//   1. 收集什么
//   2. 怎么用
//   3. 怎么保护
//   4. 第三方
//   5. 你的权利
//
// 最后更新日期:2026-08-04

import type { Metadata } from "next";
import { ChevronLeft, Shield, Database, Lock, Users, UserCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "隐私政策 · 毛球日记",
  description: "毛球日记隐私政策:我们如何收集、使用、存储、保护你的宠物数据,以及你的权利。",
};

const LAST_UPDATED = "2026-08-04";

export default function PrivacyPage() {
  return (
    <div className="space-y-5 pb-12">
      {/* 顶部导航 */}
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
          aria-label="返回"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
          <Shield size={18} className="text-[var(--color-primary)]" />
          隐私政策
        </h1>
      </div>

      <p className="text-[11px] text-[var(--color-text-soft)] px-1">
        最后更新:<span className="font-semibold text-[var(--color-text)]">{LAST_UPDATED}</span>
        {" · "}
        <Link href="/terms" className="text-[var(--color-primary)] underline">查看用户协议</Link>
      </p>

      <p className="text-sm text-[var(--color-text-soft)] leading-relaxed px-1">
        毛球日记(以下简称「本应用」)尊重并保护你的隐私。本政策说明我们如何收集、使用、存储和保护你的信息,以及你享有的权利。
        请仔细阅读 — 使用本应用即表示你同意本政策。
      </p>

      {/* ===== 1. 收集什么 ===== */}
      <Section icon={Database} title="1. 我们收集什么" tone="primary">
        <p>本应用采用<strong>本地优先(offline-first)</strong>架构 — 你的大部分数据只存在你自己的设备上,不上传任何服务器。</p>

        <SubList items={[
          { name: "宠物档案", desc: "名字、品种、年龄、体重、性别、生日、备注(全部本地存储)" },
          { name: "宠物记录", desc: "照片(自动剥离 EXIF 元数据)、笔记、体重、医疗、问答历史(本地)" },
          { name: "提醒与打卡", desc: "喂药/驱虫/疫苗/洗澡/复诊等提醒、健康打卡、遛狗记录(本地)" },
          { name: "会员与购买", desc: "会员档位(免费/试用/标准/老年)、订阅状态(本地 + 未来云端支付凭证)" },
          { name: "设备信息", desc: "匿名设备 ID(用于多设备同步时识别同一用户,不收集 IMEI/MAC/位置)" },
          { name: "应用更新", desc: "检查 OTA 更新时上报当前版本号,不上报任何用户行为" },
        ]} />

        <Note>
          <strong>我们不收集:</strong>真实姓名、手机号、身份证号、通讯录、精确位置(GPS)、通讯记录、相机/麦克风原始数据(仅在拍照时使用,处理后立即释放)。
        </Note>
      </Section>

      {/* ===== 2. 怎么用 ===== */}
      <Section icon={Users} title="2. 我们如何使用你的信息" tone="secondary">
        <p>收集到的信息仅用于以下目的:</p>
        <SubList items={[
          { name: "核心功能", desc: "保存宠物档案、生成喂药/驱虫提醒、训练课程进度跟踪" },
          { name: "AI 问答", desc: "你和 AI 兽医角色的对话(本地)用于上下文理解,不上传用于模型训练" },
          { name: "多设备同步", desc: "v0.4.0 起可选 — 仅当你主动登录云同步,数据才会上传你的私有云空间" },
          { name: "应用更新", desc: "通过 OTA 通道推送新版本,只比对版本号,不收集使用行为" },
        ]} />
        <Note>
          <strong>绝不用于:</strong>广告精准投放、二次出售给第三方、用户画像分析、信用评估。
        </Note>
      </Section>

      {/* ===== 3. 怎么保护 ===== */}
      <Section icon={Lock} title="3. 我们如何保护你的信息" tone="success">
        <p>本应用采用<strong>多层防护</strong>,从数据产生到销毁全程守护:</p>
        <SubList items={[
          { name: "本地存储加密", desc: "所有 localStorage 数据仅本设备可读,无后门密钥" },
          { name: "照片 EXIF 清理", desc: "上传照片自动剥离 GPS 位置/拍摄时间/设备型号(详见下方 5)" },
          { name: "管理员入口保护", desc: "后台入口采用 6 位 challenge + 应急密码双保险,3 次失败锁定 5 分钟" },
          { name: "Tauri CSP 严格化", desc: "禁止任何外部脚本注入,仅允许白名单资源(self + 必要 CDN)" },
          { name: "数据最小化", desc: "云同步只传输必要业务字段,不收集诊断/行为/画像数据" },
          { name: "开源可审计", desc: "客户端代码完全开源,任何第三方可验证隐私承诺" },
        ]} />
      </Section>

      {/* ===== 4. 第三方 ===== */}
      <Section icon={Shield} title="4. 第三方服务" tone="warning">
        <p>v0.4.0 阶段本应用<strong>不接入任何第三方 SDK</strong>(无广告、无统计、无社交分享)。后续若接入,我们会:</p>
        <SubList items={[
          { name: "明示告知", desc: "在本页更新第三方名单,并在更新前 30 天通过应用内通知告知" },
          { name: "最小授权", desc: "只申请完成功能必需的权限,绝不过度申请" },
          { name: "可选关闭", desc: "非核心功能(如推荐、分享)提供独立关闭开关" },
        ]} />
        <p className="text-sm mt-2 text-[var(--color-text-soft)]">
          v0.4.0 内置资源仅:<code className="text-[10px] bg-[var(--bg-soft)] px-1 py-0.5 rounded">self</code>(应用自身)
          + <code className="text-[10px] bg-[var(--bg-soft)] px-1 py-0.5 rounded">*.supabase.co</code>(未来云同步)
          + <code className="text-[10px] bg-[var(--bg-soft)] px-1 py-0.5 rounded">*.vercel.app</code>(OTA 更新源)。
        </p>
      </Section>

      {/* ===== 5. 你的权利 ===== */}
      <Section icon={UserCheck} title="5. 你的权利" tone="primary">
        <p>你对自己的数据拥有完全控制权:</p>
        <SubList items={[
          { name: "查看权", desc: "应用内「我的」页面可查看所有数据统计" },
          { name: "导出权", desc: "v0.4.0 起,「设置 → 数据导出」可一键导出全量 JSON" },
          { name: "删除权", desc: "「设置 → 清除缓存」可彻底删除本地所有数据(不可恢复)" },
          { name: "撤回同意", desc: "v0.4.0 起可在「设置 → 撤回隐私同意」撤销隐私政策接受(等同清除全部数据)" },
          { name: "投诉举报", desc: "如发现违规,联系:privacy@maokiu.com(占位邮箱,v0.4.0 正式发布时启用)" },
        ]} />
      </Section>

      {/* ===== 联系 ===== */}
      <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10 rounded-2xl p-4 text-sm">
        <p className="font-semibold text-[var(--color-text)] mb-1">联系我们</p>
        <p className="text-[var(--color-text-soft)] text-xs leading-relaxed">
          如对本政策有任何疑问,可通过以下方式联系:<br />
          · 邮箱:privacy@maokiu.com(占位)<br />
          · 应用内:「我的 → 关于我们 → 问题反馈」<br />
          · 我们会在 7 个工作日内回复。
        </p>
      </div>

      {/* 底部同意按钮(当用户从首次启动 modal 进入时) */}
      <div className="pt-4">
        <Link
          href="/"
          className="block w-full text-center py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold active:scale-[0.98] transition-transform"
        >
          我已阅读并理解,返回应用
        </Link>
        <p className="text-[10px] text-center text-[var(--color-text-soft)] mt-2">
          继续使用即表示你同意本隐私政策 · v{LAST_UPDATED}
        </p>
      </div>
    </div>
  );
}

// ===== 内部小组件 =====

type Tone = "primary" | "secondary" | "success" | "warning";

const TONE_BG: Record<Tone, string> = {
  primary: "from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 border-[var(--color-primary)]/20",
  secondary: "from-[var(--color-secondary)]/10 to-[var(--color-secondary)]/5 border-[var(--color-secondary)]/20",
  success: "from-emerald-50 to-emerald-100/30 border-emerald-200",
  warning: "from-amber-50 to-amber-100/30 border-amber-200",
};

const TONE_ICON: Record<Tone, string> = {
  primary: "text-[var(--color-primary)] bg-[var(--color-primary)]/15",
  secondary: "text-[var(--color-secondary)] bg-[var(--color-secondary)]/15",
  success: "text-emerald-600 bg-emerald-100",
  warning: "text-amber-600 bg-amber-100",
};

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof Shield;
  title: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border-2 bg-gradient-to-br ${TONE_BG[tone]} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${TONE_ICON[tone]}`}>
          <Icon size={16} />
        </div>
        <h2 className="text-base font-bold text-[var(--color-text)]">{title}</h2>
      </div>
      <div className="text-sm text-[var(--color-text)] leading-relaxed space-y-2 [&_p]:text-sm [&_strong]:font-semibold [&_strong]:text-[var(--color-text)]">
        {children}
      </div>
    </section>
  );
}

function SubList({ items }: { items: Array<{ name: string; desc: string }> }) {
  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((it) => (
        <li key={it.name} className="flex items-start gap-2 text-sm">
          <span className="text-[var(--color-primary)] font-bold mt-0.5 flex-shrink-0">·</span>
          <div className="min-w-0">
            <strong className="text-[var(--color-text)]">{it.name}</strong>
            <span className="text-[var(--color-text-soft)]"> — {it.desc}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 px-3 py-2 rounded-xl bg-white/60 border border-[var(--color-border)] text-[11px] text-[var(--color-text-soft)] leading-relaxed">
      {children}
    </div>
  );
}
