"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Camera, FileText, Scale, Trash2, X,
  Calendar, Weight, Heart, Pencil, TrendingUp, Share2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { PhotoUploader } from "@/components/PhotoUploader";
import PetAgeCard from "@/components/PetAgeCard";
import { AdBottom, AdSidebar } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useConfirm } from "@/components/useConfirm";
import { useAppStore } from "@/lib/store";
import {
  formatDate, formatDateShort, speciesLabel, speciesEmoji, cn,
} from "@/lib/utils";
import type { Pet, PetRecord, RecordType } from "@/lib/types";

const LONG_PRESS_MS = 600;

const typeMeta: Record<RecordType, { icon: typeof Camera; bg: string; color: string; label: string }> = {
  photo: { icon: Camera, bg: "bg-[var(--color-secondary)]", color: "text-white", label: "拍照" },
  weight: { icon: Scale, bg: "bg-[var(--color-success)]", color: "text-white", label: "体重" },
  medical: { icon: Heart, bg: "bg-[var(--color-danger)]", color: "text-white", label: "医疗" },
  note: { icon: FileText, bg: "bg-[var(--color-warning)]", color: "text-white", label: "笔记" },
};

const genderLabel = (g: Pet["gender"]) =>
  g === "male" ? "弟弟" : g === "female" ? "妹妹" : "未知";

// ===== Modal 基础 =====
function Modal({
  open, onClose, title, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 animate-fade-up" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-card animate-fade-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--color-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-soft)] hover:bg-[var(--bg-soft)]"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ===== 记录卡片（含长按删除）=====
function RecordItem({
  rec, onDelete,
}: {
  rec: PetRecord;
  onDelete: () => void;
}) {
  const meta = typeMeta[rec.type];
  const Icon = meta.icon;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const start = () => {
    triggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      onDelete();
    }, LONG_PRESS_MS);
  };
  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        onDelete();
      }}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchMove={cancel}
      onTouchCancel={cancel}
      className="bg-white rounded-2xl p-3.5 shadow-soft flex gap-3"
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", meta.bg)}>
        <Icon size={18} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">{rec.title}</h4>
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-text-soft)] hover:bg-[var(--bg-soft)] hover:text-[var(--color-danger)] flex-shrink-0"
            aria-label="删除记录"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {rec.content && (
          <p className="text-xs text-[var(--color-text-soft)] mt-0.5 line-clamp-3 whitespace-pre-wrap">
            {rec.content}
          </p>
        )}
        {rec.imageDataUrl && (
          // base64 数据走原生 <img>，不走 next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rec.imageDataUrl}
            alt={rec.title}
            className="mt-2 w-full max-h-64 object-cover rounded-xl"
          />
        )}
        {rec.meta && Object.keys(rec.meta).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(rec.meta).map(([k, v]) => (
              <span
                key={k}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
              >
                {k}: {String(v)}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[var(--color-text-soft)] mt-1.5">{formatDate(rec.createdAt)}</p>
      </div>
    </div>
  );
}

export default function ClientView({ id }: { id: string }) {
  const router = useRouter();

  const pet = useAppStore((s) => s.pets.find((p) => p.id === id));
  const allRecords = useAppStore((s) => s.records);
  const addRecord = useAppStore((s) => s.addRecord);
  const deleteRecord = useAppStore((s) => s.deleteRecord);
  const confirm = useConfirm();
  const deletePet = useAppStore((s) => s.deletePet);

  const petRecords = useMemo(
    () => (pet ? allRecords.filter((r) => r.petId === pet.id) : []),
    [allRecords, pet]
  );

  // ===== Modal 状态 =====
  const [photoOpen, setPhotoOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);

  // ===== 拍照表单状态 =====
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoContent, setPhotoContent] = useState("");
  const [photoData, setPhotoData] = useState<string | undefined>(undefined);

  // ===== 笔记表单状态 =====
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  // ===== 体重表单状态 =====
  const [weightInput, setWeightInput] = useState("");
  const [weightNote, setWeightNote] = useState("");

  if (!pet) {
    return (
      <div className="pt-6 px-4 text-center">
        <p className="text-[var(--color-text-soft)] mb-4">找不到这只宠物了</p>
        <Link
          href="/pets"
          className="inline-block px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold"
        >
          返回列表
        </Link>
      </div>
    );
  }

  const submitPhoto = () => {
    if (!photoData) {
      pushToast({ kind: "warning", title: "还没选图", message: "请点击下方按钮拍照或选图" });
      return;
    }
    addRecord({
      petId: pet.id,
      type: "photo",
      title: photoTitle.trim() || "今日份的可爱",
      content: photoContent.trim(),
      imageDataUrl: photoData,
    });
    pushToast({ kind: "success", title: "已记录", message: "照片已保存到时间线" });
    setPhotoTitle(""); setPhotoContent(""); setPhotoData(undefined);
    setPhotoOpen(false);
  };

  const submitNote = () => {
    const t = noteTitle.trim();
    if (!t) {
      pushToast({ kind: "warning", title: "请填写标题" });
      return;
    }
    addRecord({
      petId: pet.id,
      type: "note",
      title: t,
      content: noteContent.trim(),
    });
    pushToast({ kind: "success", title: "已记录", message: "笔记已保存" });
    setNoteTitle(""); setNoteContent("");
    setNoteOpen(false);
  };

  const submitWeight = () => {
    const w = Number(weightInput);
    if (!weightInput.trim() || Number.isNaN(w) || w <= 0) {
      pushToast({ kind: "warning", title: "请填有效体重", message: "必须大于 0" });
      return;
    }
    const rounded = Math.round(w * 10) / 10;
    addRecord({
      petId: pet.id,
      type: "weight",
      title: `体重 ${rounded} kg`,
      content: weightNote.trim() || `当前体重 ${rounded} kg`,
      meta: { weight: rounded },
    });
    pushToast({ kind: "success", title: "已记录", message: `体重 ${rounded} kg` });
    setWeightInput(""); setWeightNote("");
    setWeightOpen(false);
  };

  const handleDeleteRecord = async (rec: PetRecord) => {
    const ok = await confirm({ title: `删除记录「${rec.title}」`, description: "此操作不可恢复。", variant: "danger", confirmText: "删除" });
    if (!ok) return;
    deleteRecord(rec.id);
    pushToast({ kind: "info", title: "已删除" });
  };

  const handleDeletePet = async () => {
    const ok = await confirm({ title: `删除「${pet.name}」`, description: "将同时删除它的所有记录，此操作不可恢复。", variant: "danger", confirmText: "删除" });
    if (!ok) return;
    deletePet(pet.id);
    pushToast({ kind: "success", title: "已删除", message: `${pet.name} 的档案已移除` });
    router.push("/pets");
  };

  return (
    <div className="relative pb-10">
      {/* 返回按钮 */}
      <Link
        href="/pets"
        aria-label="返回"
        className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
      >
        <ChevronLeft size={20} />
      </Link>

      <PageHeader
        title={pet.name}
        subtitle={`${speciesLabel(pet.species)} · ${genderLabel(pet.gender)}`}
        right={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                pushToast({ kind: "info", title: "编辑功能", message: "v0.1 暂未开放，敬请期待" });
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text-soft)]"
              aria-label="编辑"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={handleDeletePet}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-danger)]"
              aria-label="删除"
            >
              <Trash2 size={15} />
            </button>
          </div>
        }
      />

      {/* Hero 区 */}
      <div className="mt-2 rounded-3xl bg-gradient-warm text-white p-6 shadow-card relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-[120px] opacity-10 select-none">
          {pet.avatar || speciesEmoji(pet.species)}
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-5xl flex-shrink-0 border-2 border-white/30">
            {pet.avatar || speciesEmoji(pet.species)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold truncate">{pet.name}</h2>
            <p className="text-sm opacity-90 mt-0.5">
              {pet.breed || speciesLabel(pet.species)} · {pet.age} 岁
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-sm">
                {speciesLabel(pet.species)}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-sm">
                {genderLabel(pet.gender)}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-sm">
                {pet.weight}kg
              </span>
            </div>
          </div>
        </div>
        {pet.notes && (
          <p className="relative mt-4 text-xs opacity-90 leading-relaxed border-t border-white/20 pt-3">
            {pet.notes}
          </p>
        )}
      </div>

      {/* v0.2 纪念日 / 生日卡 */}
      <div className="mt-3">
        <PetAgeCard pet={pet} />
      </div>

      {/* 关键信息 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="bg-white rounded-2xl p-3 shadow-soft flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-soft)] flex items-center justify-center text-[var(--color-primary)]">
            <Calendar size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--color-text-soft)]">生日</p>
            <p className="text-sm font-semibold text-[var(--color-text)] truncate">
              {pet.birthday ? formatDateShort(pet.birthday) : "未填"}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-soft flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-soft)] flex items-center justify-center text-[var(--color-primary)]">
            <Weight size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--color-text-soft)]">当前体重</p>
            <p className="text-sm font-semibold text-[var(--color-text)] truncate">{pet.weight} kg</p>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setPhotoOpen(true)}
          className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-secondary)] text-white flex items-center justify-center shadow-soft">
            <Camera size={24} />
          </div>
          <span className="text-xs font-medium text-[var(--color-text)]">拍照记录</span>
        </button>
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-warning)] text-white flex items-center justify-center shadow-soft">
            <FileText size={24} />
          </div>
          <span className="text-xs font-medium text-[var(--color-text)]">写笔记</span>
        </button>
        <button
          type="button"
          onClick={() => setWeightOpen(true)}
          className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-success)] text-white flex items-center justify-center shadow-soft">
            <Scale size={24} />
          </div>
          <span className="text-xs font-medium text-[var(--color-text)]">记录体重</span>
        </button>
      </div>

      {/* 时间线 */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-[var(--color-text)]">
            记录时间线
            <span className="ml-2 text-xs font-normal text-[var(--color-text-soft)]">
              {petRecords.length} 条
            </span>
          </h3>
        </div>

        {petRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-soft">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-sm text-[var(--color-text-soft)]">还没有记录</p>
            <p className="text-xs text-[var(--color-text-soft)] mt-1 opacity-70">
              点击上方按钮开始记录吧
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {petRecords.map((r) => (
              <RecordItem key={r.id} rec={r} onDelete={() => handleDeleteRecord(r)} />
            ))}
          </div>
        )}
      </section>

      {/* v0.2 — 体重曲线 / 分享卡 入口 */}
      <section className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`/pets/${id}/weight`}
          className="bg-white rounded-2xl p-3 shadow-soft flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-vip text-white flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
          <span className="text-[11px] font-medium text-[var(--color-text)]">体重曲线</span>
        </Link>
        <Link
          href={`/pets/${id}/share`}
          className="bg-white rounded-2xl p-3 shadow-soft flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-svip text-white flex items-center justify-center">
            <Share2 size={18} />
          </div>
          <span className="text-[11px] font-medium text-[var(--color-text)]">分享档案</span>
        </Link>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-3">
        <AdBottom />
        <AdSidebar />
      </div>

      {/* ===== 拍照 Modal ===== */}
      <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} title="📷 拍照记录">
        <p className="text-[11px] text-[var(--color-text-soft)] bg-[var(--bg-soft)] rounded-xl px-3 py-2 mb-3">
          v0.1 演示：图片存在本地不上传服务器
        </p>

        {/* v0.4.0 F-SEC-03:PhotoUploader(canvas 重画削 EXIF:GPS/拍摄时间/设备) */}
        <PhotoUploader
          currentDataUrl={photoData}
          onChange={(dataUrl) => setPhotoData(dataUrl ?? undefined)}
          capture="environment"
        />

        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">标题</label>
            <input
              type="text"
              value={photoTitle}
              onChange={(e) => setPhotoTitle(e.target.value)}
              placeholder="例如：今天阳光真好"
              maxLength={30}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">描述（可选）</label>
            <textarea
              value={photoContent}
              onChange={(e) => setPhotoContent(e.target.value)}
              placeholder="记录这一刻的想法…"
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {photoData && (
            <button
              type="button"
              onClick={() => setPhotoData(undefined)}
              className="px-4 py-2.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text)] text-sm font-medium"
            >
              重选
            </button>
          )}
          <button
            type="button"
            onClick={submitPhoto}
            className="flex-1 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            保存到时间线
          </button>
        </div>
      </Modal>

      {/* ===== 笔记 Modal ===== */}
      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="📝 写笔记">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">
              标题 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="例如：今天去公园了"
              maxLength={30}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">内容</label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="记录今天发生的事…"
              rows={5}
              maxLength={500}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={submitNote}
          className="w-full mt-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          保存笔记
        </button>
      </Modal>

      {/* ===== 体重 Modal ===== */}
      <Modal open={weightOpen} onClose={() => setWeightOpen(false)} title="⚖️ 记录体重">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">
              体重 (kg) <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={`当前 ${pet.weight} kg`}
              min="0"
              max="200"
              step="0.1"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">备注（可选）</label>
            <input
              type="text"
              value={weightNote}
              onChange={(e) => setWeightNote(e.target.value)}
              placeholder="例如：饭前 / 刚运动完"
              maxLength={50}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={submitWeight}
          className="w-full mt-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          保存体重
        </button>
      </Modal>
    </div>
  );
}
