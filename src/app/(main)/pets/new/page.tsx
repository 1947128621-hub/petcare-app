"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Check } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { speciesLabel, cn } from "@/lib/utils";
import type { PetSpecies, PetGender } from "@/lib/types";

const SPECIES_OPTIONS: Array<{ value: PetSpecies; emoji: string }> = [
  { value: "cat", emoji: "🐱" },
  { value: "dog", emoji: "🐶" },
  { value: "rabbit", emoji: "🐰" },
  { value: "bird", emoji: "🐦" },
  { value: "other", emoji: "🐾" },
];

const GENDER_OPTIONS: Array<{ value: PetGender; label: string; emoji: string }> = [
  { value: "male", label: "弟弟", emoji: "♂️" },
  { value: "female", label: "妹妹", emoji: "♀️" },
  { value: "unknown", label: "未知", emoji: "❓" },
];

const AVATAR_OPTIONS = ["🐱", "🐶", "🐰", "🐦", "🐹", "🐢", "🐠", "🐾"];

export default function NewPetPage() {
  const router = useRouter();
  const addPet = useAppStore((s) => s.addPet);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<PetSpecies>("cat");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [gender, setGender] = useState<PetGender>("unknown");
  const [avatar, setAvatar] = useState<string>("🐱");
  const [customAvatar, setCustomAvatar] = useState("");
  const [notes, setNotes] = useState("");

  const finalAvatar = customAvatar.trim() || avatar;

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      pushToast({ kind: "warning", title: "请填写名字", message: "名字是必填项" });
      return;
    }

    const ageNum = age.trim() === "" ? 0 : Number(age);
    const weightNum = weight.trim() === "" ? 0 : Number(weight);

    if (age.trim() !== "" && (Number.isNaN(ageNum) || ageNum < 0)) {
      pushToast({ kind: "warning", title: "年龄格式不对", message: "请填非负数字" });
      return;
    }
    if (weight.trim() !== "" && (Number.isNaN(weightNum) || weightNum < 0)) {
      pushToast({ kind: "warning", title: "体重格式不对", message: "请填非负数字" });
      return;
    }

    const id = addPet({
      name: trimmedName,
      species,
      breed: breed.trim(),
      age: ageNum,
      weight: Math.round(weightNum * 10) / 10,
      gender,
      avatar: finalAvatar,
      notes: notes.trim() || undefined,
    });

    pushToast({ kind: "success", title: "添加成功", message: `欢迎 ${trimmedName}！` });
    router.push(`/pets/${id}`);
  };

  return (
    <div className="relative pb-28">
      {/* 返回按钮（覆盖在 PageHeader 左侧） */}
      <Link
        href="/pets"
        aria-label="返回"
        className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
      >
        <ChevronLeft size={20} />
      </Link>

      <PageHeader title="添加宠物" subtitle="为你的毛孩子建立档案" />

      <div className="mt-2 space-y-5">
        {/* 名字 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
            名字 <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：橘大力"
            maxLength={20}
            className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </section>

        {/* 种类 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">种类</label>
          <div className="grid grid-cols-5 gap-2">
            {SPECIES_OPTIONS.map((opt) => {
              const active = species === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSpecies(opt.value);
                    // 同步切换默认头像（仅当用户没自定义过）
                    if (!customAvatar && !AVATAR_OPTIONS.includes(avatar)) {
                      // 保留用户已选
                    } else if (!customAvatar) {
                      setAvatar(opt.emoji);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 rounded-2xl transition-all active:scale-95",
                    active
                      ? "bg-[var(--color-primary)] text-white shadow-soft"
                      : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-[11px] font-medium">{speciesLabel(opt.value)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 品种 / 年龄 / 体重 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">品种</label>
            <input
              type="text"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="例如：金毛、英短、中华田园猫"
              maxLength={30}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">年龄（岁）</label>
              <input
                type="number"
                inputMode="decimal"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="0"
                min="0"
                max="50"
                step="0.5"
                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">体重（kg）</label>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.0"
                min="0"
                max="200"
                step="0.1"
                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </section>

        {/* 性别 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">性别</label>
          <div className="grid grid-cols-3 gap-2">
            {GENDER_OPTIONS.map((opt) => {
              const active = gender === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95",
                    active
                      ? "bg-[var(--color-primary)] text-white shadow-soft"
                      : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                  )}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 头像 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">头像</label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {AVATAR_OPTIONS.map((emo) => {
              const active = !customAvatar && avatar === emo;
              return (
                <button
                  key={emo}
                  type="button"
                  onClick={() => {
                    setAvatar(emo);
                    setCustomAvatar("");
                  }}
                  className={cn(
                    "aspect-square flex items-center justify-center text-3xl rounded-2xl transition-all active:scale-95",
                    active
                      ? "bg-[var(--color-primary)] shadow-soft"
                      : "bg-[var(--bg-soft)]"
                  )}
                >
                  {emo}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-soft)] flex-shrink-0">自定义：</span>
            <input
              type="text"
              value={customAvatar}
              onChange={(e) => setCustomAvatar(e.target.value)}
              placeholder="任意 emoji 或字符"
              maxLength={4}
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-soft)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {customAvatar && (
              <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-xl">
                {customAvatar}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 p-3 rounded-2xl bg-[var(--bg-soft)]">
            <span className="text-xs text-[var(--color-text-soft)]">预览：</span>
            <div className="w-10 h-10 rounded-full bg-gradient-warm flex items-center justify-center text-2xl">
              {finalAvatar}
            </div>
            <span className="text-sm font-semibold text-[var(--color-text)]">{name.trim() || "未命名"}</span>
          </div>
        </section>

        {/* 备注 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">备注</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="性格、爱好、特殊习惯…"
            rows={3}
            maxLength={200}
            className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
          />
        </section>
      </div>

      {/* 底部保存按钮 */}
      <div className="fixed left-0 right-0 bottom-20 z-30 px-4">
        <div className="max-w-[480px] mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-full bg-[var(--color-primary)] text-white font-semibold shadow-card active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Check size={18} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
