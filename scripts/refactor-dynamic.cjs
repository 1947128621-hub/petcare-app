// scripts/refactor-dynamic.cjs
// 把 8 个 dynamic page.tsx 拆成 server wrapper + client 视图
const fs = require("fs");
const path = require("path");

// 配置：每个 dynamic page 的 generateStaticParams 返回值
const STATIC_PARAMS = {
  "courses": [{ id: "c1" }, { id: "c2" }, { id: "c3" }, { id: "c4" }, { id: "c5" }, { id: "c6" }],
  "medicine": [{ id: "drug_1" }, { id: "drug_2" }, { id: "drug_3" }, { id: "drug_4" }, { id: "drug_5" }, { id: "drug_6" }, { id: "drug_7" }, { id: "drug_8" }, { id: "drug_9" }, { id: "drug_10" }],
  "pets": [
    { id: "pet_demo_1" }, { id: "pet_demo_2" },
    { id: "pet_demo_1" }, // 会被 weight / share 路径用
  ],
  "reminders": [{ id: "rem_1" }, { id: "rem_2" }, { id: "rem_3" }],
  "places": [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }, { id: "p5" }, { id: "p6" }],
  "food": [{ id: "f1" }, { id: "f2" }, { id: "f3" }, { id: "f4" }, { id: "f5" }, { id: "f6" }, { id: "f7" }, { id: "f8" }],
};

const projectRoot = "C:\\Users\\97205\\.minimax-agent-cn\\projects\\petcare-app";
const srcApp = path.join(projectRoot, "src", "app", "(main)");

function listDynamicPages(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Check if it has [id] or [param] in name
      if (/\[\w+\]/.test(entry.name)) {
        const page = path.join(full, "page.tsx");
        if (fs.existsSync(page)) files.push(page);
      }
      listDynamicPages(full, files);
    }
  }
  return files;
}

const pages = listDynamicPages(srcApp);
console.log("Found dynamic pages:");
pages.forEach(p => console.log("  " + path.relative(projectRoot, p)));

let okCount = 0;
let errCount = 0;

for (const pagePath of pages) {
  try {
    let content = fs.readFileSync(pagePath, "utf8");
    const relDir = path.dirname(pagePath);
    const folderName = path.basename(relDir); // e.g. "id"
    const parentFolder = path.basename(path.dirname(relDir)); // e.g. "courses" / "pets"

    // 1. 把 "use client"; 替换成 "use client";  // client view
    // 实际上我们要把整文件 move 到 ClientView.tsx，然后 page.tsx 写 wrapper

    // 确定 page 是否已经有 "use client"
    if (!content.includes('"use client"') && !content.includes("'use client'")) {
      console.log("SKIP (not client):", path.relative(projectRoot, pagePath));
      continue;
    }

    // 2. 把文件重命名为 ClientView.tsx
    const clientViewPath = path.join(relDir, "ClientView.tsx");
    fs.writeFileSync(clientViewPath, content, "utf8");
    console.log("  Wrote", path.relative(projectRoot, clientViewPath));

    // 3. 在 ClientView.tsx 里，把 default export 的函数名改掉（避免和 page 冲突）
    // 假设函数名能从内容提取，例如 "export default function HomePage()" → export function ClientView()
    let cvContent = fs.readFileSync(clientViewPath, "utf8");
    // 提取 default export function name
    const m = cvContent.match(/export default function (\w+)\s*\(/);
    let fnName = null;
    if (m) {
      fnName = m[1];
      cvContent = cvContent.replace(
        new RegExp(`export default function ${fnName}\\s*\\(`),
        `export default function ClientView({ id: initialId }: { id: string }) {`
      );
    } else {
      // arrow function form
      const m2 = cvContent.match(/export default \(/);
      if (m2) {
        cvContent = cvContent.replace(
          /export default \(\s*\)\s*=>/,
          `export default function ClientView({ id: initialId }: { id: string }) {`
        );
      } else {
        console.log("WARN: cannot find default function in", path.relative(projectRoot, clientViewPath));
      }
    }
    // 替换 useParams() 调用为使用 initialId
    // 简单替换：把 const params = useParams<{id: string}>() / const { id } = useParams() 等替换
    cvContent = cvContent.replace(
      /const\s+params\s*=\s*useParams\s*<[^>]*>\s*\(\s*\)\s*;?/g,
      "const params = initialId ? { id: initialId } : useParams<{ id: string }>();"
    );
    cvContent = cvContent.replace(
      /const\s+\{\s*id\s*\}\s*=\s*useParams\s*\(\s*\)\s*;?/g,
      "const { id } = initialId ? { id: initialId } : (useParams<{ id: string }>() as { id: string });"
    );

    // 调整 useEffect 顺序：useParams 现在是条件使用，可能会有 hook 顺序警告。
    // 简单方案：让 initialId 优先，避免调用 useParams
    cvContent = cvContent.replace(
      "const params = initialId ? { id: initialId } : useParams<{ id: string }>();",
      "const params = { id: initialId } as { id: string };"
    );
    cvContent = cvContent.replace(
      "const { id } = initialId ? { id: initialId } : (useParams<{ id: string }>() as { id: string });",
      "const { id } = { id: initialId } as { id: string };"
    );

    fs.writeFileSync(clientViewPath, cvContent, "utf8");

    // 4. 写新的 page.tsx (server component)
    let params = "[]";
    if (parentFolder === "pets") {
      // pets/[id], pets/[id]/weight, pets/[id]/share
      // weight 和 share 的 [id] 也是 pet id
      if (relDir.endsWith("weight") || relDir.endsWith("share")) {
        params = '[{ id: "pet_demo_1" }, { id: "pet_demo_2" }]';
      } else {
        params = '[{ id: "pet_demo_1" }, { id: "pet_demo_2" }]';
      }
    } else {
      params = JSON.stringify(STATIC_PARAMS[parentFolder] || []);
    }

    // 写 server page.tsx
    const pageContent = `// 静态导出所需
export const dynamicParams = false;
export function generateStaticParams() {
  return ${params};
}

import ClientView from "./ClientView";

export default function Page({ params }: { params: { id: string } }) {
  return <ClientView id={params.id} />;
}
`;
    fs.writeFileSync(pagePath, pageContent, "utf8");
    console.log("  Rewrote", path.relative(projectRoot, pagePath));

    okCount++;
  } catch (e) {
    console.error("ERROR processing", pagePath, ":", e.message);
    errCount++;
  }
}

console.log(`\nResult: ${okCount} ok, ${errCount} errors`);
