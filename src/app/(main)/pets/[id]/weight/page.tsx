// 静态导出所需
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "pet_demo_1" }, { id: "pet_demo_2" }];
}

import ClientView from "./ClientView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientView id={id} />;
}
