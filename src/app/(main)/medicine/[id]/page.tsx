// 静态导出所需
export const dynamicParams = false;

// v0.4.0 改造 (实施员 3 负责):10 → 52 款
// 数据源:src/lib/drugs/seed-v040.ts
// 这里 hard-code 52 个 id 保持纯静态导出 (next export 要求 generateStaticParams 返回所有 id)
import { seedDrugsV040 } from "@/lib/drugs/seed-v040";
import ClientView from "./ClientView";

export function generateStaticParams() {
  return seedDrugsV040.map((d) => ({ id: d.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientView id={id} />;
}
