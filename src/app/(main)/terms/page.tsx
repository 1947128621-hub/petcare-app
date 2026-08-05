// ===== 用户协议页 =====
// v0.4.0 F-SEC-04：用户协议公开可访问
//
// 内容(plan F-SEC-04 + impl §10.8 + MUST-05 补建)：4 大段
//   1. 服务范围
//   2. 账号
//   3. 付费
//   4. 免责
//
// 最后更新日期:2026-08-04

import type { Metadata } from "next";
import { ChevronLeft, FileText, User, CreditCard, AlertOctagon } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "用户协议 · 毛球日记",
  description: "毛球日记用户协议:服务范围、账号管理、付费规则、免责声明与争议解决。",
};

const LAST_UPDATED = "2026-08-04";

export default function TermsPage() {
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
          <FileText size={18} className="text-[var(--color-primary)]" />
          用户协议
        </h1>
      </div>

      <p className="text-[11px] text-[var(--color-text-soft)] px-1">
        最后更新:<span className="font-semibold text-[var(--color-text)]">{LAST_UPDATED}</span>
        {" · "}
        <Link href="/privacy" className="text-[var(--color-primary)] underline">查看隐私政策</Link>
      </p>

      <p className="text-sm text-[var(--color-text-soft)] leading-relaxed px-1">
        欢迎使用毛球日记(以下简称「本应用」)。本协议是你与本应用运营方之间就使用本应用所订立的协议。
        请仔细阅读 — 使用本应用即表示你同意本协议全部条款。
      </p>

      {/* ===== 1. 服务范围 ===== */}
      <Section icon={FileText} title="1. 服务范围" tone="primary">
        <p>本应用为宠物主人提供以下服务:</p>
        <SubList items={[
          { name: "宠物档案管理", desc: "创建/编辑/删除宠物基础信息(名字、品种、年龄、体重等)" },
          { name: "日常记录", desc: "拍照、笔记、体重、医疗记录(数据存本地,可选云同步)" },
          { name: "健康提醒", desc: "喂药/驱虫/疫苗/洗澡/复诊等定时提醒" },
          { name: "训练课程", desc: "基础服从 / 行为矫正 / 社交训练课程(带进度跟踪)" },
          { name: "AI 问答", desc: "宠物健康、行为、饮食相关问题咨询(基于知识库 + AI)" },
          { name: "药品库", desc: "48+ 款常见宠物药品的成分、用法、副作用参考" },
        ]} />
        <Note>
          <strong>服务边界:</strong>本应用<strong>不提供</strong>在线问诊、宠物保险、宠物交易、宠物殡葬等第三方服务(后续如接入会单独签署协议)。
        </Note>
      </Section>

      {/* ===== 2. 账号 ===== */}
      <Section icon={User} title="2. 账号管理" tone="secondary">
        <SubList items={[
          { name: "本地账号", desc: "v0.4.0 默认使用本地存储,无后端账号 — 卸载应用 = 清除所有数据" },
          { name: "云同步账号", desc: "v0.4.0 后续版本可选用 Supabase Auth 登录(邮箱+密码或 OAuth)" },
          { name: "账号注销", desc: "你可随时在「设置 → 清除缓存」中删除所有本地数据;云端数据需联系客服" },
          { name: "账号安全", desc: "请妥善保管登录凭证;因密码泄露导致的损失由用户自行承担" },
        ]} />
      </Section>

      {/* ===== 3. 付费 ===== */}
      <Section icon={CreditCard} title="3. 付费与订阅" tone="success">
        <p>v0.4.0 起本应用采用<strong>4 档会员制</strong>(详见会员中心):</p>
        <SubList items={[
          { name: "免费档 (Free)", desc: "1 只宠物 / 10 款药品 / 基础提醒 / 含广告" },
          { name: "试用档 (Trial)", desc: "免费体验 3 天 = Standard 全部权益 + 转化券" },
          { name: "标准档 (Standard)", desc: "¥24/月 或 ¥188/年(年付立省 35%) — 48 款药品 / 主题切换 / 课程 / AI" },
          { name: "老年特惠档 (Senior)", desc: "¥12/月 或 ¥118/年 — 强制 senior 主题(老人友好)+ 紧急联系常驻" },
        ]} />
        <SubList items={[
          { name: "退订", desc: "会员到期自动降级为免费档,数据保留;不强制自动续费" },
          { name: "退款", desc: "购买后 7 天内未使用高级功能可申请全额退款(联系客服)" },
          { name: "价格调整", desc: "运营方保留调整价格的权利,会提前 30 天通知" },
        ]} />
        <Note>
          v0.4.0 阶段付款为 mock 模式(无真实支付),仅展示价格和升级流程;真实支付接入计划 v0.4.1。
        </Note>
      </Section>

      {/* ===== 4. 免责 ===== */}
      <Section icon={AlertOctagon} title="4. 免责声明" tone="warning">
        <SubList items={[
          { name: "医疗免责声明", desc: "本应用的药品库、训练课程、AI 问答仅供参考,不替代执业兽医的诊断和治疗。宠物出现健康问题请及时就医。" },
          { name: "数据丢失免责", desc: "运营方不保证数据 100% 持久化(尽管已采用本地 + 可选云同步双保险);建议定期使用「数据导出」功能备份。" },
          { name: "服务变更免责", desc: "运营方保留随时修改、暂停或终止本应用的权利,会通过应用内通知告知。" },
          { name: "第三方内容免责", desc: "本应用不接入第三方 SDK(v0.4.0),后续如接入(广告/分享/统计),由该第三方对其内容负责。" },
          { name: "不可抗力", desc: "因自然灾害、网络中断、监管要求等不可抗力导致的服务中断,运营方不承担责任。" },
        ]} />
      </Section>

      {/* ===== 5. 知识产权 + 争议解决 ===== */}
      <Section icon={FileText} title="5. 知识产权与争议解决" tone="primary">
        <SubList items={[
          { name: "知识产权", desc: "本应用的代码、设计、文案、图标均由运营方所有;未经许可不得复制、修改或商业使用" },
          { name: "用户内容", desc: "你创建的宠物档案、照片、笔记等归你所有;本应用仅在你的设备上存储和使用" },
          { name: "争议解决", desc: "本协议适用中华人民共和国法律;发生争议时双方应友好协商,协商不成交由运营方所在地有管辖权的人民法院诉讼解决" },
          { name: "协议变更", desc: "运营方保留修改本协议的权利,会通过应用内通知告知;重大变更(影响核心权利)会征求你的同意" },
        ]} />
      </Section>

      {/* 联系方式 */}
      <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10 rounded-2xl p-4 text-sm">
        <p className="font-semibold text-[var(--color-text)] mb-1">联系我们</p>
        <p className="text-[var(--color-text-soft)] text-xs leading-relaxed">
          如对本协议有任何疑问,可通过以下方式联系:<br />
          · 邮箱:legal@maokiu.com(占位)<br />
          · 应用内:「我的 → 关于我们 → 问题反馈」<br />
          · 我们会在 7 个工作日内回复。
        </p>
      </div>

      {/* 底部返回按钮 */}
      <div className="pt-4">
        <Link
          href="/"
          className="block w-full text-center py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold active:scale-[0.98] transition-transform"
        >
          我已阅读并理解,返回应用
        </Link>
        <p className="text-[10px] text-center text-[var(--color-text-soft)] mt-2">
          继续使用即表示你同意本用户协议 · v{LAST_UPDATED}
        </p>
      </div>
    </div>
  );
}

// ===== 内部小组件(同 /privacy 风格)=====

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
  icon: typeof FileText;
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
