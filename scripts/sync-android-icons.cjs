/**
 * v0.3.2 — prebuild:android hook
 * 把布偶猫大脸照自动同步到 Android mipmap-* 目录
 * 防止 cargo-mobile2 重新 init 时覆盖我们的自定义 icon
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "artifacts", "verification", "v0.3.2", "icon-master-1024-fixed.png");
const ANDROID_RES = path.join(ROOT, "src-tauri", "gen", "android", "app", "src", "main", "res");

const DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

if (!fs.existsSync(MASTER)) {
  console.error("[sync-android-icons] Master icon not found:", MASTER);
  console.error("    Please ensure artifacts/verification/v0.3.2/icon-master-1024-fixed.png exists.");
  process.exit(1);
}
if (!fs.existsSync(ANDROID_RES)) {
  console.error("[sync-android-icons] Android res dir not found:", ANDROID_RES);
  console.error("    Run 'tauri android init' first.");
  process.exit(1);
}

console.log("[sync-android-icons] Master:", MASTER);
console.log("[sync-android-icons] Target:", ANDROID_RES);

// 用 PowerShell + .NET 缩放（避免引入 sharp 依赖）
const ps = `
Add-Type -AssemblyName System.Drawing
$master = "${MASTER.replace(/\\/g, "\\\\")}"
$src = [System.Drawing.Image]::FromFile((Resolve-Path $master))
foreach ($d in @("mdpi","hdpi","xhdpi","xxhdpi","xxxhdpi")) {
  $px = switch ($d) {
    "mdpi" { 48 } "hdpi" { 72 } "xhdpi" { 96 } "xxhdpi" { 144 } "xxxhdpi" { 192 }
  }
  $dir = Join-Path "${ANDROID_RES.replace(/\\/g, "\\\\")}" ("mipmap-" + $d)
  if (Test-Path $dir) {
    $bmp = New-Object System.Drawing.Bitmap($src, $px, $px)
    $bmp.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host ("  mipmap-" + $d + " " + $px + "x" + $px + " OK")
  }
}
$src.Dispose()
`;

try {
  execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
  console.log("[sync-android-icons] Done.");
} catch (e) {
  console.error("[sync-android-icons] Failed:", e.message);
  process.exit(1);
}
