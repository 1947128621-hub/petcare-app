// 静态导出所需
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }, { id: "p5" }, { id: "p6" }];
}

import ClientView from "./ClientView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientView id={id} />;
}
