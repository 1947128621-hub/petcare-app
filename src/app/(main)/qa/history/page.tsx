"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, MessageSquare, ChevronRight, Crown, MessageCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import type { QAChat } from "@/lib/types";

const TYPE_COLOR: Record<string, string> = {
  饮食: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  疾病: "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  行为: "bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]",
  用药: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
};

function ChatDetailModal({ chat, onClose }: { chat: QAChat; onClose: () => void }) {
  const drugs = useAppStore((s) => s.drugs);
  const related = (chat.relatedDrugIds || [])
    .map((id) => drugs.find((d) => d.id === id))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-up">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[480px] max-h-[85vh] bg-[var(--bg-cream)] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-card flex flex-col">
        {/* Modal 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", TYPE_COLOR[chat.type])}>
              {chat.type}
            </span>
            {chat.isVipOnly && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-vip text-white font-medium flex items-center gap-0.5">
                <Crown size={9} /> VIP
              </span>
            )}
            <span className="text-[10px] text-[var(--color-text-soft)] ml-auto flex-shrink-0">
              {formatDate(chat.createdAt)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-soft)] ml-2 flex-shrink-0"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal 内容 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* 用户问题 */}
          <div className="flex justify-end">
            <div className="bubble-user px-4 py-2.5 max-w-[78%] text-sm leading-relaxed">
              {chat.question}
            </div>
          </div>

          {/* AI 回答 */}
          <div className="flex justify-start">
            <div className="bubble-ai px-4 py-3 max-w-[88%] text-sm leading-relaxed whitespace-pre-wrap">
              {chat.answer}
            </div>
          </div>

          {/* 相关药品 */}
          {related.length > 0 && (
            <div>
              <p className="text-xs text-[var(--color-text-soft)] font-semibold mb-2 px-1">
                相关药品推荐
              </p>
              <div className="space-y-2">
                {related.map((d) => (
                  <Link
                    key={d!.id}
                    href={`/medicine/${d!.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-soft active:scale-[0.98] transition-transform"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-warm flex items-center justify-center text-xl flex-shrink-0">
                      💊
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate">{d!.name}</p>
                      <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
                        {d!.category} · ¥{d!.price}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 再次咨询按钮 */}
          <Link
            href={`/qa`}
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("qa_prefill", chat.question);
              }
              onClose();
            }}
            className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm shadow-soft active:scale-95 transition-transform"
          >
            <MessageCircle size={16} />
            再次咨询这个问题
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function QAHistoryPage() {
  const router = useRouter();
  const chats = useAppStore((s) => s.chats);
  const [selectedChat, setSelectedChat] = useState<QAChat | null>(null);

  return (
    <div>
      <PageHeader title="问答历史" subtitle={chats.length > 0 ? `共 ${chats.length} 条记录` : undefined} back />

      {chats.length === 0 ? (
        // 空状态
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-28 h-28 rounded-full bg-gradient-warm flex items-center justify-center mb-5 shadow-card">
            <MessageSquare size={48} className="text-white" />
          </div>
          <h3 className="text-base font-bold text-[var(--color-text)] mb-1.5">
            还没有问答记录
          </h3>
          <p className="text-xs text-[var(--color-text-soft)] max-w-xs leading-relaxed mb-5">
            你的健康问答都会保存在这里<br />
            开始第一次咨询吧
          </p>
          <Link
            href="/qa"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft active:scale-95 transition-transform"
          >
            <MessageCircle size={16} />
            去问问 AI
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {chats.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChat(c)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-soft active:scale-[0.98] transition-transform"
            >
              {/* 类型 + VIP + 时间 */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", TYPE_COLOR[c.type])}>
                  {c.type}
                </span>
                {c.isVipOnly && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-vip text-white font-medium flex items-center gap-0.5">
                    <Crown size={9} /> VIP
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-text-soft)] ml-auto">
                  {formatDate(c.createdAt)}
                </span>
              </div>

              {/* 问题（粗体） */}
              <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-1 mb-1">
                {c.question}
              </p>

              {/* 回答（2 行截断） */}
              <p className="text-xs text-[var(--color-text-soft)] line-clamp-2 leading-relaxed">
                {c.answer}
              </p>

              {/* 相关药品数量提示 */}
              {c.relatedDrugIds && c.relatedDrugIds.length > 0 && (
                <p className="text-[10px] text-[var(--color-primary)] mt-2 flex items-center gap-1">
                  💊 {c.relatedDrugIds.length} 个相关药品
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 详情 Modal */}
      {selectedChat && (
        <ChatDetailModal
          chat={selectedChat}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </div>
  );
}
