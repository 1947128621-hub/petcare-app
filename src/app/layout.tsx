import type { Metadata, Viewport } from "next";
import "./globals.css";

// v0.4.0.3 — 启动 telemetry 脚本
// 必须放在 head 最前面;Next.js 服务端 HTML 流式输出,这个 inline script 是浏览器侧第一段执行的 JS
// 通过 console.log + 全局 error 捕获,真机 logcat -s chromium 就能看到启动失败原因
// 关键约束:不要 throw,不要 await,纯同步快速执行
const TauriV0403_BOOT = `
(function(){
  var TAG = "TauriV0403-WebView";
  function log(msg){
    try { console.log("[" + TAG + "] " + msg); } catch(e) {}
  }
  function logErr(msg){
    try { console.error("[" + TAG + "] " + msg); } catch(e) {}
  }
  // 标记 window.__tauri_v0403 启动时间戳
  window.__tauri_v0403 = { t0: Date.now(), url: (typeof location !== "undefined" ? location.href : "?") };
  log("BOOT start, url=" + window.__tauri_v0403.url);

  // 检查 Tauri 接口是否存在
  if (typeof window.__TAURI__ !== "undefined") {
    log("__TAURI__ present (Tauri v2)");
  } else {
    log("__TAURI__ MISSING — running in plain browser / WebView asset loader mode");
  }

  // 检查 WebView 类型
  if (typeof window.chrome !== "undefined" && window.chrome.webview) {
    log("Edge WebView2 detected");
  } else if (navigator.userAgent.indexOf("; wv)") > 0) {
    log("Android WebView detected (UA wv marker)");
  } else {
    log("Unknown WebView, UA=" + (navigator.userAgent || "?").substring(0, 80));
  }

  // 全局 error 捕获 — 推到 localStorage 让用户能看到
  window.addEventListener("error", function(e){
    var msg = (e && e.message) ? e.message : "?";
    var src = (e && e.filename) ? e.filename : "?";
    var ln = (e && e.lineno) != null ? e.lineno : "?";
    var col = (e && e.colno) != null ? e.colno : "?";
    logErr("window.error: " + msg + " @ " + src + ":" + ln + ":" + col);
    try {
      var arr = JSON.parse(localStorage.getItem("petcare-v0403-errors") || "[]");
      arr.push({ ts: Date.now(), kind: "error", msg: msg, src: src, line: ln, col: col });
      if (arr.length > 50) arr = arr.slice(-50);
      localStorage.setItem("petcare-v0403-errors", JSON.stringify(arr));
    } catch(_) {}
  });
  window.addEventListener("unhandledrejection", function(e){
    var r = e && e.reason;
    var msg = (r && r.message) ? r.message : String(r);
    logErr("unhandledrejection: " + msg);
    try {
      var arr = JSON.parse(localStorage.getItem("petcare-v0403-errors") || "[]");
      arr.push({ ts: Date.now(), kind: "unhandledrejection", msg: msg });
      if (arr.length > 50) arr = arr.slice(-50);
      localStorage.setItem("petcare-v0403-errors", JSON.stringify(arr));
    } catch(_) {}
  });

  log("BOOT end (event listeners attached, control returning to HTML parser)");
})();
`;

export const metadata: Metadata = {
  title: "毛球日记 · 宠物健康陪伴",
  description: "AI 健康问答 · 拍照记事 · 用药推荐 · 一站式宠物护理",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "毛球日记",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ff8c5a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        {/* v0.4.0.3 — 启动 telemetry, 必须放最前(head 第一个 script) */}
        <script dangerouslySetInnerHTML={{ __html: TauriV0403_BOOT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW 注册失败:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
