// ===== 通用工具 =====

export function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHr < 24) return `${diffHr} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function speciesLabel(s: string): string {
  return { cat: "猫", dog: "狗", rabbit: "兔", bird: "鸟", other: "其他" }[s] || s;
}

export function speciesEmoji(s: string): string {
  return { cat: "🐱", dog: "🐶", rabbit: "🐰", bird: "🐦", other: "🐾" }[s] || "🐾";
}

export function uid(): string {
  return "u_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}
