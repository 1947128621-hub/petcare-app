"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send, Loader2, History as HistoryIcon, Trash2, Plus, Crown,
  Sparkles, Lock, ChevronRight, Pill, MessageSquare,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useConfirm } from "@/components/useConfirm";
import { useAppStore, selectMembershipTier } from "@/lib/store";
import { askAI, classifyQuestion, type AIResponse } from "@/lib/ai-engine";
import { cn, formatDate, speciesEmoji, speciesLabel } from "@/lib/utils";
import type { QuestionType, QAChat } from "@/lib/types";

const TYPES: QuestionType[] = ["饮食", "疾病", "行为", "用药"];
const FREE_DAILY_LIMIT = 3;
// v0.3.1：App 版暂不启用 AI 问答（保留页面）
const AI_DISABLED = true;

// 来源徽章配置
const SOURCE_BADGE: Record<AIResponse["source"], { label: string; emoji: string; cls: string }> = {
  "mock-keyword": { label: "关键词匹配", emoji: "🟢", cls: "bg-[var(--color-success)]/15 text-[var(--color-success)]" },
  openai: { label: "OpenAI", emoji: "🔵", cls: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]" },
  ollama: { label: "Ollama", emoji: "🟣", cls: "bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]" },
  fallback: { label: "通用回复", emoji: "⚪", cls: "bg-[var(--bg-soft)] text-[var(--color-text-soft)]" },
};

// 单条聊天气泡（用户问题 / AI 回答）
function ChatBubble({
  chat,
  onAskAI,
}: {
  chat: QAChat;
  onAskAI?: (drugId: string) => void;
}) {
  const drugs = useAppStore((s) => s.drugs);
  const related = (chat.relatedDrugIds || [])
    .map((id) => drugs.find((d) => d.id === id))
    .filter(Boolean) as NonNullable<ReturnType<typeof drugs.find>>[];

  return (
    <div className="space-y-2 animate-fade-up">
      {/* 用户问题（右对齐，暖橘气泡） */}
      <div className="flex justify-end">
        <div className="bubble-user px-4 py-2.5 max-w-[78%] text-sm leading-relaxed">
          {chat.question}
        </div>
      </div>

      {/* AI 回答（左对齐，白色气泡） */}
      <div className="flex justify-start">
        <div className="max-w-[88%] space-y-2">
          <div className="bubble-ai px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
            {chat.answer}
          </div>

          {/* 来源徽章 + 类型 + VIP 标记 */}
          <div className="flex items-center gap-1.5 flex-wrap pl-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)] font-medium">
              {chat.type}
            </span>
            {chat.isVipOnly && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-vip text-white font-medium flex items-center gap-0.5">
                <Crown size={9} /> VIP 专属
              </span>
            )}
            <span className="text-[10px] text-[var(--color-text-soft)]">
              {formatDate(chat.createdAt)}
            </span>
          </div>

          {/* 相关药品推荐 */}
          {related.length > 0 && (
            <div className="mt-2 pl-1">
              <p className="text-[11px] text-[var(--color-text-soft)] font-semibold mb-1.5 flex items-center gap-1">
                <Pill size={11} /> 相关药品推荐
              </p>
              <div className="space-y-1.5">
                {related.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onAskAI?.(d.id)}
                    className="w-full flex items-center gap-2.5 bg-white rounded-xl p-2.5 shadow-soft active:scale-[0.98] transition-transform text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-warm flex items-center justify-center text-lg flex-shrink-0">
                      💊
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate">{d.name}</p>
                      <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5">
                        {d.category} · ¥{d.price}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-[var(--color-text-soft)] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 加载中气泡
function LoadingBubble() {
  return (
    <div className="flex justify-start animate-fade-up">
      <div className="bubble-ai px-4 py-3 flex items-center gap-2">
        <Loader2 size={16} className="animate-spin text-[var(--color-primary)]" />
        <span className="text-sm text-[var(--color-text-soft)]">AI 思考中...</span>
      </div>
    </div>
  );
}

// VIP 升级卡片
function VipUpgradeCard({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-sm rounded-3xl bg-gradient-vip text-white p-5 shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <Crown size={20} />
        <h3 className="font-bold text-base">升级 VIP 解锁无限问答</h3>
      </div>
      <p className="text-sm opacity-95 mb-3 leading-relaxed">{reason}</p>
      <Link
        href="/membership"
        className="block text-center py-2.5 bg-white text-[var(--color-text)] rounded-full font-semibold text-sm"
      >
        立即开通
      </Link>
    </div>
  );
}

export default function QAPage() {
  const router = useRouter();
  const tier = useAppStore(selectMembershipTier);
  const chats = useAppStore((s) => s.chats);
  const pets = useAppStore((s) => s.pets);
  const addChat = useAppStore((s) => s.addChat);
  const clearChats = useAppStore((s) => s.clearChats);
  const confirm = useConfirm();

  const [selectedType, setSelectedType] = useState<QuestionType>("疾病");
  const [input, setInput] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id || null);
  const [loading, setLoading] = useState(false);
  const [showPetPicker, setShowPetPicker] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) || pets[0],
    [pets, selectedPetId]
  );

  // 今日聊天计数（free 限制 3 次/天）
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return chats.filter((c) => new Date(c.createdAt).toDateString() === today).length;
  }, [chats]);

  const isFreeLimitReached = tier === "free" && todayCount >= FREE_DAILY_LIMIT;

  // 预填问题（从药品详情跳过来）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefill = sessionStorage.getItem("qa_prefill");
    if (prefill) {
      setInput(prefill);
      sessionStorage.removeItem("qa_prefill");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  // 新消息自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chats, loading]);

  // 提交问题
  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    if (isFreeLimitReached) {
      pushToast({
        kind: "warning",
        title: "今日免费次数已用完",
        message: "升级 VIP 即可无限问答",
      });
      return;
    }

    setInput("");
    setLoading(true);

    // 自动识别问题类型（不覆盖用户手动选择）
    const autoType = classifyQuestion(question);
    const finalType = selectedType || autoType;

    try {
      const aiResp: AIResponse = await askAI({
        question,
        type: finalType,
        petSpecies: currentPet?.species,
        membership: tier,
      });

      addChat({
        petId: currentPet?.id,
        type: finalType,
        question,
        answer: aiResp.answer,
        isVipOnly: aiResp.isVipOnly,
        relatedDrugIds: aiResp.relatedDrugIds,
      });
    } catch (err) {
      pushToast({
        kind: "error",
        title: "AI 回答失败",
        message: "请稍后再试",
      });
    } finally {
      setLoading(false);
    }
  };

  // 清空对话（二次确认）
  const handleClear = async () => {
    if (chats.length === 0) {
      pushToast({ kind: "info", title: "暂无对话" });
      return;
    }
    const ok = await confirm({ title: "清空对话", description: "此操作不可恢复。", variant: "danger", confirmText: "清空" });
    if (!ok) return;
    clearChats();
    pushToast({ kind: "success", title: "已清空对话" });
  };

  // 从药品卡片点击 → 跳药品详情
  const handleDrugClick = (drugId: string) => {
    router.push(`/medicine/${drugId}`);
  };

  // 选择宠物
  const handleAddPet = () => {
    if (showPetPicker) {
      setShowPetPicker(false);
      return;
    }
    setShowPetPicker(true);
  };

  // v0.3.1 — AI 问答功能暂未启用（用户要求先打包 App）
  if (AI_DISABLED) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-120px)]">
        <PageHeader
          title="AI 健康问答"
          subtitle="功能暂未启用 · 即将上线"
        />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-warm text-white flex items-center justify-center text-5xl mb-5 shadow-card">
            🤖
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
            AI 健康问答 即将上线
          </h2>
          <p className="text-sm text-[var(--color-text-soft)] leading-relaxed max-w-xs">
            当前版本（v0.3 App 版）暂未启用 AI 问答功能。<br/>
            页面已保留，后续版本将接入大模型，<br/>支持 4 种类型问题的智能回复。
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-soft)] rounded-full text-xs text-[var(--color-text-soft)]">
            <span>📋</span>
            <span>即将支持：饮食 / 疾病 / 行为 / 用药</span>
          </div>
          <Link
            href="/qa/history"
            className="mt-8 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-sm text-[var(--color-text)] shadow-soft active:scale-95 transition-transform"
          >
            查看历史问答
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col -mx-4 -mt-2 min-h-[calc(100vh-120px)]">
      <PageHeader
        title="AI 健康问答"
        subtitle="7×24 在线，秒级回复"
        right={
          <div className="flex items-center gap-1">
            <Link
              href="/qa/history"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft active:scale-95 transition-transform"
              aria-label="历史"
            >
              <HistoryIcon size={16} className="text-[var(--color-text)]" />
            </Link>
            <button
              onClick={handleClear}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft active:scale-95 transition-transform"
              aria-label="清空"
            >
              <Trash2 size={16} className="text-[var(--color-danger)]" />
            </button>
          </div>
        }
      />

      {/* 类型选择栏 */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {TYPES.map((t) => {
          const active = selectedType === t;
          return (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={cn(
                "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                active
                  ? "bg-[var(--color-primary)] text-white shadow-soft"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              )}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* 当前类型提示条 + 今日次数 */}
      <div className="px-4 pb-2 flex items-center justify-between text-[11px] text-[var(--color-text-soft)]">
        <span>
          当前类型：<span className="text-[var(--color-primary)] font-semibold">{selectedType}</span>
          {tier === "free" && (
            <> · 今日 {todayCount}/{FREE_DAILY_LIMIT}</>
          )}
        </span>
        {tier !== "free" && (
          <span className="flex items-center gap-0.5 text-[var(--color-vip)] font-semibold">
            <Sparkles size={11} /> 无限问答
          </span>
        )}
      </div>

      {/* 聊天消息区 */}
      <div className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto">
        {chats.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-warm flex items-center justify-center mb-4 shadow-card">
              <MessageSquare size={40} className="text-white" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)] mb-1">
              开始你的第一次问答
            </h3>
            <p className="text-xs text-[var(--color-text-soft)] max-w-xs leading-relaxed">
              支持饮食、疾病、行为、用药 4 大类问题<br />
              AI 会根据关键词匹配合适的答案
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-xs">
              {["猫咪不吃东西怎么办？", "狗狗拉稀怎么处理？", "猫咪需要打什么疫苗？", "狗狗关节不好吃什么？"].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white text-[var(--color-text)] border border-[var(--color-border)] shadow-soft active:scale-95 transition-transform"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chats.map((c) => <ChatBubble key={c.id} chat={c} onAskAI={handleDrugClick} />)
        )}

        {loading && <LoadingBubble />}

        {/* VIP 限制提示 */}
        {isFreeLimitReached && chats.length > 0 && (
          <div className="pt-2">
            <VipUpgradeCard reason="免费用户每天仅 3 次问答机会，升级 VIP 享受无限次 + 高级内容" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 宠物选择器（点击 + 出现） */}
      {showPetPicker && pets.length > 0 && (
        <div className="mx-4 mb-2 p-2 bg-white rounded-2xl shadow-card animate-fade-up">
          <p className="text-[10px] text-[var(--color-text-soft)] px-2 py-1">选择宠物（上下文引用）：</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setSelectedPetId(null); setShowPetPicker(false); }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full transition-all",
                !selectedPetId
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--bg-soft)] text-[var(--color-text)]"
              )}
            >
              不指定
            </button>
            {pets.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedPetId(p.id); setShowPetPicker(false); }}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full transition-all",
                  selectedPetId === p.id
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                )}
              >
                {p.avatar} {p.name} · {speciesLabel(p.species)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 当前引用宠物标签 */}
      {currentPet && !showPetPicker && (
        <div className="mx-4 mb-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-soft)]">
          <span>当前引用：</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-soft)]">
            <span>{speciesEmoji(currentPet.species)}</span>
            {currentPet.name}
          </span>
        </div>
      )}

      {/* 底部输入区 */}
      <div className="sticky bottom-0 left-0 right-0 bg-[var(--bg-cream)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-4 py-3 z-20">
        {isFreeLimitReached ? (
          <Link
            href="/membership"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-gradient-vip text-white font-semibold text-sm shadow-soft"
          >
            <Lock size={16} /> 今日免费次数已用完 · 升级 VIP 解锁无限问答
          </Link>
        ) : (
          <div className="flex items-end gap-2">
            <button
              onClick={handleAddPet}
              className={cn(
                "w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95",
                showPetPicker || currentPet
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              )}
              aria-label="添加宠物引用"
            >
              <Plus size={18} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入问题…（Enter 发送）"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-white rounded-2xl px-4 py-2.5 text-sm border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none placeholder:text-[var(--color-text-soft)] disabled:opacity-60 max-h-24"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="发送"
              className={cn(
                "w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all",
                input.trim() && !loading
                  ? "bg-[var(--color-primary)] text-white shadow-soft active:scale-95"
                  : "bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
              )}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        )}
      </div>

      {/* 底部广告 */}
      <div className="px-4 pb-2">
        <AdBottom />
      </div>
    </div>
  );
}
