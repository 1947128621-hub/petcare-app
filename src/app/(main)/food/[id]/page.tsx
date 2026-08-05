// 静态导出所需
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "f1" }, { id: "f2" }, { id: "f3" }, { id: "f4" }, { id: "f5" }, { id: "f6" }, { id: "f7" }, { id: "f8" }];
}

import ClientView from "./ClientView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientView id={id} />;
}
