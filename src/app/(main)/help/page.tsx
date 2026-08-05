"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, PawPrint, Camera, Calendar, Heart, MapPin, Pill, BookHeart,
  Award, GraduationCap, ListTodo, FileText, Crown, Cloud, ShieldCheck,
  Sparkles, ChevronRight, MessageCircle, Bell, Activity, Cake,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const SECTIONS = [
  {
    icon: PawPrint,
    title: "欢迎使用毛球日记",
    desc: "一款为养宠人打造的桌面 / 移动 App。暖色治愈风，本地优先，可选云同步。",
    color: "from-amber-100 to-orange-100",
    iconColor: "text-amber-600",
  },
  {
    icon: Camera,
    title: "1. 添加你的第一个宠物",
    desc: "在「首页」点击「添加宠物」→ 上传头像 → 填写名字、品种、年龄。",
    color: "from-pink-100 to-rose-100",
    iconColor: "text-pink-600",
  },
  {
    icon: Calendar,
    title: "2. 设置日常提醒",
    desc: "在「提醒」页添加驱虫、疫苗、洗澡、喂药等。系统会按时间提前通知你。",
    color: "from-blue-100 to-indigo-100",
    iconColor: "text-blue-600",
  },
  {
    icon: Activity,
    title: "3. 每天打卡 + 记录体重",
    desc: "在「打卡」页打勾完成今日任务。在「体重」页记录体重变化趋势。",
    color: "from-green-100 to-emerald-100",
    iconColor: "text-green-600",
  },
  {
    icon: Cake,
    title: "4. 纪念日不再忘记",
    desc: "在「提醒」-「纪念日」添加生日、领养日、绝育日等，自动循环提醒。",
    color: "from-purple-100 to-fuchsia-100",
    iconColor: "text-purple-600",
  },
  {
    icon: MapPin,
    title: "5. 查找附近的医院",
    desc: "「附近」页显示宠物医院、宠物店地图，方便紧急情况。",
    color: "from-red-100 to-orange-100",
    iconColor: "text-red-600",
  },
  {
    icon: Pill,
    title: "6. 查询药品 / 食物成分",
    desc: "「药品」页可查常用药；「查粮」页分析猫粮狗粮成分是否合格。",
    color: "from-cyan-100 to-blue-100",
    iconColor: "text-cyan-600",
  },
  {
    icon: MessageCircle,
    title: "7. 和宠物对话（AI 角色）",
    desc: "「宠物说话」模拟你的猫/狗的口吻回复你，让你更懂它想什么。",
    color: "from-yellow-100 to-amber-100",
    iconColor: "text-yellow-600",
  },
  {
    icon: Award,
    title: "8. 收集成就徽章",
    desc: "坚持打卡、记录体重、添加宠物会解锁不同成就，让养宠有成就感。",
    color: "from-orange-100 to-rose-100",
    iconColor: "text-orange-600",
  },
  {
    icon: GraduationCap,
    title: "9. 学习养宠课程",
    desc: "「课程」页有系统的养宠知识，从新手到进阶，按章节学习。",
    color: "from-indigo-100 to-purple-100",
    iconColor: "text-indigo-600",
  },
  {
    icon: ListTodo,
    title: "10. 完成每日任务",
    desc: "「任务」页会自动生成今日该做的事，打卡 + 完成任务双重激励。",
    color: "from-teal-100 to-cyan-100",
    iconColor: "text-teal-600",
  },
  {
    icon: FileText,
    title: "11. 生成健康报告",
    desc: "「报告」页自动汇总你宠物的所有记录，可导出 PDF 分享给兽医。",
    color: "from-slate-100 to-gray-100",
    iconColor: "text-slate-600",
  },
];

const MEMBERSHIP = [
  { tier: "免费", price: "¥0", desc: "基础 AI 问答（每日 3 次），普通药品库，有广告。", color: "bg-gray-100" },
  { tier: "VIP", price: "¥19/月", desc: "无限 AI 问答，VIP 药品库，AI 病历分析，广告减 80%。", color: "bg-amber-100" },
  { tier: "SVIP", price: "¥49/月", desc: "VIP 全部 + 1 对 1 兽医咨询（每月 2 次），广告全免。", color: "bg-purple-100" },
  { tier: "终身", price: "¥999", desc: "SVIP 全部 + 永久使用，无广告 + 终身免费升级。", color: "bg-rose-100" },
];

export default function HelpPage() {
  const router = useRouter();
  const markManualSeen = useAppStore((s) => s.markManualSeen);
  useEffect(() => { markManualSeen(); }, [markManualSeen]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf8f3] to-[#fef3e8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-amber-50">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[var(--color-text)]">使用说明书</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">毛球日记 v0.3.2 · 5 分钟读懂</p>
          </div>
          <Sparkles className="text-amber-500" size={20} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome hero */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 text-center">
          <div className="text-5xl mb-3">🐱</div>
          <h2 className="text-2xl font-bold text-amber-900 mb-2">你好呀，养宠人</h2>
          <p className="text-sm text-amber-800 leading-relaxed">
            毛球日记帮你记录毛孩子的点点滴滴。<br />
            看完这份说明书，5 分钟就能上手。
          </p>
        </div>

        {/* 功能介绍 */}
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 px-1">📖 功能介绍（按使用顺序）</h3>
          <div className="space-y-3">
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`rounded-2xl p-4 bg-gradient-to-br ${s.color} flex items-start gap-3`}>
                  <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0 ${s.iconColor}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[var(--color-text)]">{s.title}</h4>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 会员 */}
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 px-1">💎 会员权益</h3>
          <div className="space-y-2">
            {MEMBERSHIP.map((m, i) => (
              <div key={i} className={`rounded-2xl p-4 ${m.color}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-[var(--color-text)]">{m.tier}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{m.price}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">{m.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2 px-1">
            💡 <strong>广告说明</strong>：终身会员 100% 免广告，SVIP 100% 免，VIP 减 80%，免费用户有完整广告。特价活动我们会另行通知。
          </p>
        </div>

        {/* 数据安全 */}
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 px-1">🔒 数据安全</h3>
          <div className="space-y-2">
            <div className="rounded-2xl p-4 bg-green-50 flex items-start gap-3">
              <ShieldCheck className="text-green-600 flex-shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-[var(--color-text)]">本地优先</h4>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">你的宠物数据默认存在本机，不上传云端。换设备不会丢，但需要手动备份。</p>
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-blue-50 flex items-start gap-3">
              <Cloud className="text-blue-600 flex-shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-[var(--color-text)]">多设备同步（v0.4 即将上线）</h4>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">登录后自动在手机/电脑间同步数据，端到端加密，永久免费。</p>
              </div>
            </div>
          </div>
        </div>

        {/* 常见问题 */}
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 px-1">❓ 常见问题</h3>
          <div className="rounded-2xl bg-white p-4 space-y-3">
            <details className="text-sm">
              <summary className="font-medium cursor-pointer">如何添加多只宠物？</summary>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">首页 → 切换宠物 tab 旁边的「+ 添加宠物」按钮，重复添加流程即可。</p>
            </details>
            <details className="text-sm">
              <summary className="font-medium cursor-pointer">AI 问答能用吗？</summary>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">v0.3.2 暂未开放，敬请期待 v0.4。届时免费用户每日 3 次，VIP/SVIP 无限。</p>
            </details>
            <details className="text-sm">
              <summary className="font-medium cursor-pointer">数据怎么备份？</summary>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">v0.3.2 在「我的」-「数据导出」可生成 JSON 备份文件。v0.4 起支持云端自动同步。</p>
            </details>
            <details className="text-sm">
              <summary className="font-medium cursor-pointer">怎么关闭广告？</summary>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">横幅广告右上角点 X 即可关闭 24h。彻底免广告请升级 SVIP 或终身会员。</p>
            </details>
            <details className="text-sm">
              <summary className="font-medium cursor-pointer">App 卡顿怎么办？</summary>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">「我的」-「清空缓存」可释放空间。如仍卡顿，在「设置」-「反馈问题」告诉我们。</p>
            </details>
          </div>
        </div>

        {/* 联系 */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 p-5 text-center">
          <Crown className="text-amber-600 mx-auto mb-2" size={28} />
          <h3 className="text-sm font-bold text-[var(--color-text)]">需要帮助？</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            v0.3.2 · 还有疑问？在「我的」-「反馈问题」告诉我们
          </p>
        </div>

        {/* v0.4.0.1 P0-1 位置 3 — 说明书底部 admin 入口(备用入口) */}
        <div className="text-center pt-2">
          <button
            onClick={() => router.push("/admin/challenge")}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] underline-offset-2 hover:underline transition-colors"
            aria-label="管理员入口"
          >
            管理员入口
          </button>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}
