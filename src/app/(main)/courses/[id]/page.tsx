// 静态导出所需
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "c1" }, { id: "c2" }, { id: "c3" }, { id: "c4" }, { id: "c5" }, { id: "c6" }];
}

import ClientView from "./ClientView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientView id={id} />;
}
