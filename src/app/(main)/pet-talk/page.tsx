"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle, Send, Sparkles, Trash2, Heart, AlertTriangle,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useConfirm } from "@/components/useConfirm";
import { useAppStore } from "@/lib/store";
import { talkAsPet } from "@/lib/ai-engine";
import { cn, formatDate, speciesEmoji, speciesLabel } from "@/lib/utils";
import type { Pet, PetMood, PetTalk } from "@/lib/types";

// ===== 8 种心情 emoji 映射 =====
const MOOD_EMOJI: Record<PetMood, string> = {
  happy: "😺",
  sleepy: "😴",
  hungry: "😋",
  playful: "😸",
  shy: "🙀",
  grumpy: "😾",
  curious: "😼",
  missing: "🥺",
};

const MOOD_LABEL: Record<PetMood, string> = {
  happy: "开心",
  sleepy: "困了",
  hungry: "饿了",
  playful: "想玩",
  shy: "害羞",
  grumpy: "傲娇",
  curious: "好奇",
  missing: "想你",
};

// ===== 快捷回复话题（猫/狗/其他各有侧重）=====
const QUICK_REPLIES_CAT: string[] = [
  "你今天开心吗",
  "想不想吃零食",
  "想我了吗",
  "陪我玩一会",
];
const QUICK_REPLIES_DOG: string[] = [
  "你今天开心吗",
  "想不想吃零食",
  "想出去遛弯吗",
  "想我了吗",
];
const QUICK_REPLIES_OTHER: string[] = [
  "你今天开心吗",
  "想不想吃零食",
  "想我了吗",
  "陪我玩一会",
];

function quickRepliesFor(species: Pet["species"]): string[] {
  if (species === "cat") return QUICK_REPLIES_CAT;
  if (species === "dog") return QUICK_REPLIES_DOG;
  return QUICK_REPLIES_OTHER;
}

// ===== 单条聊天气泡 =====
function TalkBubble({ talk, petName, petAvatar }: { talk: PetTalk; petName: string; petAvatar: string }) {
  return (
    <div className="space-y-2 animate-fade-up">
      {/* 用户消息（右对齐，暖橘气泡） */}
      <div className="flex justify-end">
        <div className="bubble-user px-4 py-2.5 max-w-[78%] text-sm leading-relaxed">
          {talk.userMessage}
        </div>
      </div>

      {/* 宠物回复（左对齐，白色气泡 + 心情 emoji） */}
      <div className="flex justify-start gap-2">
        <div className="w-9 h-9 rounded-full bg-gradient-warm flex items-center justify-center text-lg flex-shrink-0 shadow-soft">
          {petAvatar}
        </div>
        <div className="max-w-[80%] space-y-1">
          <div className="bubble-ai px-4 py-2.5 text-sm leading-relaxed">
            {talk.petReply}
          </div>
          <div className="flex items-center gap-1.5 pl-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)] font-medium flex items-center gap-0.5">
              <span>{MOOD_EMOJI[talk.mood]}</span>
              {MOOD_LABEL[talk.mood]}
            </span>
            <span className="text-[10px] text-[var(--color-text-soft)]">
              {formatDate(talk.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PetTalkPage() {
  const pets = useAppStore((s) => s.pets);
  const petTalks = useAppStore((s) => s.petTalks);
  const addPetTalk = useAppStore((s) => s.addPetTalk);
  const clearPetTalks = useAppStore((s) => s.clearPetTalks);
  const confirm = useConfirm();

  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id || null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 当前宠物
  const currentPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) || pets[0] || null,
    [pets, selectedPetId]
  );

  // 当前宠物的对话历史（按时间正序：旧 → 新）
  const talkHistory = useMemo(() => {
    if (!currentPet) return [];
    return petTalks
      .filter((t) => t.petId === currentPet.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [petTalks, currentPet]);

  // 最新一条回复的 mood
  const currentMood: PetMood | null = useMemo(() => {
    if (talkHistory.length === 0) return null;
    return talkHistory[talkHistory.length - 1].mood;
  }, [talkHistory]);

  // 切换宠物时确保 selectedPetId 有效
  useEffect(() => {
    if (!selectedPetId && pets[0]) {
      setSelectedPetId(pets[0].id);
    } else if (selectedPetId && !pets.find((p) => p.id === selectedPetId)) {
      setSelectedPetId(pets[0]?.id || null);
    }
  }, [pets, selectedPetId]);

  // 新消息自动滚到底部
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [talkHistory.length, thinking]);

  // 提交消息
  const handleSubmit = (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || !currentPet || thinking) return;

    setInput("");
    setThinking(true);

    // 模拟一点点"思考"延迟，体验更真实
    setTimeout(() => {
      const { reply, mood } = talkAsPet(text, currentPet.species);
      addPetTalk({
        petId: currentPet.id,
        userMessage: text,
        petReply: reply,
        mood,
      });
      setThinking(false);
      // 让输入框保持聚焦，方便连续对话
      inputRef.current?.focus();
    }, 400);
  };

  // 清空当前宠物对话
  const handleClear = async () => {
    if (!currentPet) return;
    const ok = await confirm({ title: "清空对话", description: `确定要清空与「${currentPet.name}」的对话吗？\n此操作不可恢复。`, variant: "danger", confirmText: "清空" });
    if (!ok) return;
    clearPetTalks(currentPet.id);
    pushToast({ kind: "success", title: "对话已清空" });
  };

  // 没有宠物时的空状态
  if (pets.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="和宠物说话" subtitle="用毛孩子的口吻，听听它在说什么" />
        <div className="mt-12 flex flex-col items-center text-center px-6">
          <div className="w-28 h-28 rounded-full bg-gradient-warm flex items-center justify-center text-6xl shadow-card mb-5">
            💬
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">还没有毛孩子</h2>
          <p className="text-sm text-[var(--color-text-soft)] mt-2 leading-relaxed">
            添加你的第一只宠物<br />开始和 TA 聊聊天
          </p>
        </div>
        <AdBottom />
      </div>
    );
  }

  const quickReplies = currentPet ? quickRepliesFor(currentPet.species) : [];

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 80px)" }}>
      <PageHeader
        title="和宠物说话"
        subtitle="用毛孩子的口吻，听听它在说什么"
        right={
          currentMood ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[var(--color-text)] border border-[var(--color-border)] text-xs font-medium shadow-soft">
              <span className="text-base leading-none">{MOOD_EMOJI[currentMood]}</span>
              {MOOD_LABEL[currentMood]}
            </span>
          ) : undefined
        }
      />

      {/* 宠物选择 chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 pt-1">
        {pets.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPetId(p.id)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              selectedPetId === p.id
                ? "bg-[var(--color-primary)] text-white shadow-soft"
                : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
            )}
          >
            <span className="mr-1.5">{p.avatar}</span>
            {p.name}
          </button>
        ))}
      </div>

      {/* 当前宠物心情面板 */}
      {currentPet && (
        <div className="rounded-3xl bg-white p-4 shadow-card mt-2">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-warm flex items-center justify-center text-3xl flex-shrink-0">
              {currentPet.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--color-text)] truncate">
                  {currentPet.name}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)] font-medium">
                  {speciesLabel(currentPet.species)}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-soft)] mt-1 flex items-center gap-1.5">
                <span className="text-sm leading-none">{speciesEmoji(currentPet.species)}</span>
                现在的心情：
                <span className="font-semibold text-[var(--color-text)]">
                  {currentMood ? `${MOOD_EMOJI[currentMood]} ${MOOD_LABEL[currentMood]}` : "未知（说句话试试）"}
                </span>
              </p>
            </div>
            {talkHistory.length > 0 && (
              <button
                onClick={handleClear}
                className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-soft)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-soft)] active:scale-95 transition-all flex-shrink-0"
                aria-label="清空对话"
                title="清空对话"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 聊天气泡区 */}
      <div className="flex-1 mt-3 space-y-3 overflow-y-auto" style={{ minHeight: "240px", maxHeight: "calc(100vh - 480px)" }}>
        {talkHistory.length === 0 && !thinking && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-warm flex items-center justify-center text-4xl shadow-soft mb-4">
              {currentPet?.avatar || "🐾"}
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">
              和 {currentPet?.name} 打个招呼吧
            </h3>
            <p className="text-xs text-[var(--color-text-soft)] mt-1.5 leading-relaxed max-w-[260px]">
              {currentPet?.species === "cat"
                ? "TA 会用喵星人的方式回应你～"
                : currentPet?.species === "dog"
                ? "TA 会用汪星人的热情回应你～"
                : "TA 会用自己的方式回应你～"}
            </p>
          </div>
        )}

        {talkHistory.map((t) => (
          <TalkBubble
            key={t.id}
            talk={t}
            petName={currentPet?.name || ""}
            petAvatar={currentPet?.avatar || "🐾"}
          />
        ))}

        {thinking && (
          <div className="flex justify-start gap-2 animate-fade-up">
            <div className="w-9 h-9 rounded-full bg-gradient-warm flex items-center justify-center text-lg flex-shrink-0 shadow-soft">
              {currentPet?.avatar || "🐾"}
            </div>
            <div className="bubble-ai px-4 py-3 flex items-center gap-1.5">
              <span className="text-xs text-[var(--color-text-soft)]">{currentPet?.name}在想</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-soft)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-soft)] animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-soft)] animate-bounce" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 快捷回复 */}
      {currentPet && quickReplies.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={12} className="text-[var(--color-warning)]" />
            <span className="text-[11px] text-[var(--color-text-soft)] font-medium">快捷话题</span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {quickReplies.map((q) => (
              <button
                key={q}
                onClick={() => handleSubmit(q)}
                disabled={thinking}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text)] text-xs font-medium border border-[var(--color-border)] active:scale-95 transition-transform disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div className="mt-3 bg-white rounded-3xl shadow-card p-2.5 flex items-end gap-2 sticky bottom-2 z-10">
        <div className="flex items-center gap-1.5 pl-2 pb-1.5 text-[var(--color-primary)]">
          <MessageCircle size={18} />
        </div>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={`跟 ${currentPet?.name || "毛孩子"} 说点啥…`}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none py-2 max-h-24"
          style={{ minHeight: "36px" }}
          disabled={thinking}
        />
        <button
          onClick={() => handleSubmit()}
          disabled={!input.trim() || thinking}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            input.trim() && !thinking
              ? "bg-[var(--color-primary)] text-white shadow-soft active:scale-95"
              : "bg-[var(--bg-soft)] text-[var(--color-text-soft)]/60"
          )}
          aria-label="发送"
        >
          <Send size={18} />
        </button>
      </div>

      {/* v0.1 mock 提示 */}
      <div className="mt-2.5 flex items-start gap-1.5 px-2">
        <AlertTriangle size={12} className="text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[var(--color-text-soft)] leading-relaxed">
          v0.1 mock 实现 — 基于关键词的回复模板。v0.3 接入 LLM 后会更聪明、更懂你的毛孩子。
        </p>
      </div>

      {/* 累计条数 */}
      {talkHistory.length > 0 && (
        <p className="mt-2 text-[10px] text-center text-[var(--color-text-soft)] flex items-center justify-center gap-1">
          <Heart size={10} className="text-[var(--color-secondary)]" />
          累计 {talkHistory.length} 条对话
        </p>
      )}

      <div className="mt-3">
        <AdBottom />
      </div>
    </div>
  );
}
