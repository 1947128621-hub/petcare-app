// 静态导出所需
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "rem_1" }, { id: "rem_2" }, { id: "rem_3" }];
}

import ClientView from "./ClientView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientView id={id} />;
}
