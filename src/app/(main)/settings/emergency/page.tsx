// ===== v0.4.0 · 紧急联系页(senior 主题常驻功能位)=====
//
// 实施员 5 · 6 个合作位占位 之 emergency-contact
// - 这**不是广告位**,是 senior 主题 home 顶部的"紧急联系"功能
// - 默认 enabled=true / tier=live,展示真实可用的紧急联系信息
// - 数据来自 src/lib/partner-slots.ts 的 PARTNER_CONFIG.emergency-contact
//   (静态 mock;v0.4.2 才会接真实本地存储 + GPS 找附近医院)
//
// 不在本页范围:
// - ❌ 真实 GPS 定位附近医院(v0.4.2)
// - ❌ 一键拨号(浏览器限制;Web 端只能 tel: 链接,真机由 Tauri 处理)
// - ❌ 子女联系方式远程同步(本地存;v0.4.1 才接云)

"use client";

import Link from "next/link";
import {
  ArrowLeft, Hospital, Stethoscope, Phone, Heart, MapPin, Clock, Shield,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
// v0.4.0 — 6 个合作位组件
import PartnerSlot from "@/components/PartnerSlot";

interface EmergencyContact {
  type: "hospital" | "vet" | "family" | "poison";
  icon: typeof Hospital;
  title: string;
  phone: string;
  desc: string;
  available: string; // 服务时间描述
  accent: string;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    type: "hospital",
    icon: Hospital,
    title: "24h 宠物医院(本市)",
    phone: "021-12345",
    desc: "上海市浦东新区某宠物医院(示例数据)",
    available: "24 小时",
    accent: "from-rose-50 to-pink-50 border-rose-200",
  },
  {
    type: "vet",
    icon: Stethoscope,
    title: "签约兽医",
    phone: "138-0000-0000",
    desc: "李兽医(示例数据;正式版可绑定真实兽医)",
    available: "工作日 9:00 - 21:00",
    accent: "from-emerald-50 to-teal-50 border-emerald-200",
  },
  {
    type: "poison",
    icon: Shield,
    title: "宠物中毒急救热线",
    phone: "010-12345",
    desc: "全国宠物中毒咨询(示例数据)",
    available: "24 小时",
    accent: "from-orange-50 to-amber-50 border-orange-200",
  },
  {
    type: "family",
    icon: Heart,
    title: "紧急联系人(子女)",
    phone: "138-0000-0001",
    desc: "张某某(示例数据;可在 v0.4.1 子女联系功能设置)",
    available: "随时",
    accent: "from-blue-50 to-indigo-50 border-blue-200",
  },
];

export default function EmergencyPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="紧急联系" back />

      <div className="-mt-2">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-soft)] active:opacity-60"
        >
          <ArrowLeft size={16} />
          返回我的
        </Link>
      </div>

      {/* v0.4.0 — 合作位:emergency-contact(本页是它的"live"实现) */}
      <PartnerSlot type="emergency-contact" />

      {/* 顶部醒目提示 */}
      <section className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Phone size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold">紧急情况?</h2>
            <p className="text-[12px] opacity-95 mt-0.5 leading-relaxed">
              下方电话可一键拨打。建议提前保存到通讯录。
            </p>
          </div>
        </div>
      </section>

      {/* 联系列表 */}
      <section>
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-2.5 flex items-center gap-1.5">
          <Phone size={14} className="text-rose-500" />
          紧急联系(示例数据)
        </h3>
        <div className="space-y-2.5">
          {EMERGENCY_CONTACTS.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.type}
                href={`tel:${c.phone}`}
                className={`block rounded-2xl border bg-gradient-to-br p-4 shadow-soft active:scale-[0.98] transition-transform ${c.accent}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[var(--color-text)]">
                      {c.title}
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
                      {c.desc}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--color-text-soft)]">
                      <span className="inline-flex items-center gap-0.5">
                        <Clock size={10} />
                        {c.available}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin size={10} />
                        本地存储
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-rose-600 font-mono tracking-wider">
                      {c.phone}
                    </p>
                    <span className="text-[10px] text-rose-500 font-medium">点拨打 →</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* 提示卡 */}
      <section className="bg-white rounded-2xl shadow-soft p-4 text-xs text-[var(--color-text-soft)] leading-relaxed space-y-2">
        <p className="font-bold text-[var(--color-text)] text-sm flex items-center gap-1.5">
          <Shield size={14} className="text-[var(--color-primary)]" />
          温馨提示
        </p>
        <p>· 以上电话均为<strong>示例数据</strong>,v0.4.2 将支持自定义保存真实医院/兽医电话</p>
        <p>· 本页数据仅存储在你<strong>本机本地</strong>(localStorage),不上传到云端</p>
        <p>· 如宠物中毒/误食,请第一时间拨打"宠物中毒急救热线"或就近送医</p>
        <p>· 老年版(senior 主题)用户:本页已加入 home 顶部固定入口</p>
      </section>
    </div>
  );
}
