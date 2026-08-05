# ===== 毛球日记 v0.4.0.1 — ADB 真机烟测脚本 =====
#
# 范围：手机 admin 入口端到端冒烟（profile / settings / help 三个位置）
# 用法：
#   1) 手机 USB 连电脑 + 开启 USB 调试
#   2) powershell -ExecutionPolicy Bypass -File scripts\adb-smoke-test.ps1
#   3) 按提示手动操作（或全自动：传 -Auto）
#   4) 截图落到 artifacts\verification\v0.4.0.1\adb-screenshots\
#
# 依赖：adb（Android Platform Tools）
# 失败时：所有 adb 命令的 stderr 会打印 + 退出码非 0
#
# 必读：
# - 真机第一次跑会装 v0.4.0 APK 验证入口能进；如果你已经装了 v0.4.0，可加 -SkipInstall
# - 截图保存路径用 .\<timestamp>\ 形式方便多轮跑不互相覆盖

[CmdletBinding()]
param(
    [string]$ApkPath = "artifacts\verification\v0.4.0\毛球日记_v0.4.0-universal-debug.apk",
    [string]$PackageName = "com.petcare.diary",
    [switch]$Auto,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

# ===== 1) 前置检查 =====
Write-Host "===== 毛球日记 v0.4.0.1 ADB 烟测 =====" -ForegroundColor Cyan
Write-Host "时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# 检查 adb
try {
    $adbVer = & adb version 2>&1 | Select-Object -First 1
    Write-Host "✓ adb: $adbVer"
} catch {
    Write-Host "✗ adb 未找到，请先装 Android Platform Tools" -ForegroundColor Red
    exit 1
}

# 检查设备
$devices = & adb devices 2>&1
Write-Host "设备列表:`n$devices"
$online = $devices | Where-Object { $_ -match "\tdevice$" }
if (-not $online) {
    Write-Host "✗ 没有在线设备，请插手机 + 开 USB 调试" -ForegroundColor Red
    exit 1
}

# 准备截图目录
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$screenshotDir = Join-Path "artifacts\verification\v0.4.0.1\adb-screenshots" $ts
New-Item -ItemType Directory -Force -Path $screenshotDir | Out-Null
Write-Host "截图目录: $screenshotDir" -ForegroundColor Green

function Capture-Screen {
    param([string]$Name)
    $path = Join-Path $screenshotDir "$Name.png"
    & adb exec-out screencap -p > $path 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 截图失败 $Name" -ForegroundColor Red
    } else {
        Write-Host "✓ 截图 $Name → $path" -ForegroundColor Green
    }
    return $path
}

# ===== 2) 安装 APK（可选）=====
if (-not $SkipInstall) {
    $fullApk = Join-Path (Get-Location) $ApkPath
    if (-not (Test-Path $fullApk)) {
        Write-Host "✗ APK 不存在: $fullApk" -ForegroundColor Red
        Write-Host "  提示：传 -ApkPath <你的 apk 路径> 或加 -SkipInstall 跳过安装"
        exit 1
    }
    Write-Host "===== 安装 APK =====" -ForegroundColor Cyan
    Write-Host "APK: $fullApk"
    & adb install -r $fullApk
    if ($LASTEXITCODE -ne 0) { Write-Host "✗ 安装失败" -ForegroundColor Red; exit 1 }
} else {
    Write-Host "===== 跳过安装（-SkipInstall）=====" -ForegroundColor Yellow
}

# ===== 3) 启动 app =====
Write-Host "===== 启动 app =====" -ForegroundColor Cyan
& adb shell am start -n "$PackageName/.MainActivity" 2>&1
if ($LASTEXITCODE -ne 0) {
    # Tauri app 启动 Activity 可能不是 .MainActivity
    Write-Host "  ↑ 启动失败，尝试用 monkey 启动（兜底）" -ForegroundColor Yellow
    & adb shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1
}
Start-Sleep -Seconds 3
Capture-Screen "01-app-launched"

# ===== 4) 导航到 profile =====
Write-Host "`n===== 步骤 1: 进入「我的」页 =====" -ForegroundColor Cyan
Write-Host "请在手机上点击底部 nav 的「我的」按钮"
if (-not $Auto) {
    Read-Host "完成按 Enter 继续"
} else {
    Start-Sleep -Seconds 2
}
Capture-Screen "02-profile-page"

# ===== 5) 滚到底部找 admin 入口 =====
Write-Host "`n===== 步骤 2: 滚到「我的」页底部 =====" -ForegroundColor Cyan
Write-Host "请在手机上向上滚动到「我的」页最底部"
if (-not $Auto) {
    Read-Host "完成按 Enter 继续"
} else {
    # 自动向上滚 5 次
    for ($i = 0; $i -lt 5; $i++) {
        & adb shell input swipe 500 1500 500 500 300
        Start-Sleep -Milliseconds 500
    }
}
Capture-Screen "03-profile-bottom"

# ===== 6) 点 admin 入口 =====
Write-Host "`n===== 步骤 3: 点「🔧 管理员登录」按钮 =====" -ForegroundColor Cyan
Write-Host "请在手机底部点「🔧 管理员登录」灰色小字"
if (-not $Auto) {
    Read-Host "完成按 Enter 继续"
} else {
    # 兜底：点屏幕底部中间（admin 入口大致位置）
    & adb shell input tap 540 2100
    Start-Sleep -Seconds 2
}
Capture-Screen "04-admin-challenge-dialog"

# ===== 7) 输 challenge 答案 =====
Write-Host "`n===== 步骤 4: 计算 challenge 答案 =====" -ForegroundColor Cyan
Write-Host "手机屏幕会显示 6 位 challenge 码（如 'K7X9M2'）"
Write-Host "答案 = SHA256(那 6 位码) 后 8 位 hex（小写）"
Write-Host "PowerShell 计算命令（替换 K7X9M2 为屏幕上的 6 位）:"
Write-Host "  (Get-FileHash -InputStream ([IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes('K7X9M2'))) -Algorithm SHA256).Hash.Substring(-8).ToLower()"
Write-Host "或更简单（mac/linux bash）:"
Write-Host "  echo -n 'K7X9M2' | sha256sum | awk '{print substr(\$1,length(\$1)-7)}'"
if (-not $Auto) {
    $answer = Read-Host "请在手机上输入 8 位 hex 答案，然后按 Enter 继续"
} else {
    $answer = "auto"
}
Capture-Screen "05-admin-challenge-entered"

# ===== 8) 验证进入 admin =====
Write-Host "`n===== 步骤 5: 验证进入 admin 后台 =====" -ForegroundColor Cyan
Write-Host "应能看到：返回首页 / 登出 / 4 sub-route 入口（Challenge / Emergency / Versions）"
if (-not $Auto) {
    Read-Host "看到 admin 主页按 Enter 继续"
}
Capture-Screen "06-admin-home"

# ===== 9) 退出 admin =====
Write-Host "`n===== 步骤 6: 点登出 / 返回 =====" -ForegroundColor Cyan
Write-Host "请在手机上点 admin 顶部的登出按钮退出"
if (-not $Auto) {
    Read-Host "完成按 Enter 继续"
} else {
    & adb shell input keyevent KEYCODE_BACK
    Start-Sleep -Seconds 1
}
Capture-Screen "07-after-logout"

# ===== 10) 备用入口 1: settings =====
Write-Host "`n===== 步骤 7 (备用): 进 settings 页验证 admin 应急入口 =====" -ForegroundColor Cyan
Write-Host "请在手机上点底部 nav 的「设置」"
if (-not $Auto) {
    Read-Host "完成按 Enter 继续"
}
Capture-Screen "08-settings-page"

Write-Host "`n===== 步骤 8 (备用): 点 settings 底部「应急登录（管理员专用）」按钮 =====" -ForegroundColor Cyan
Write-Host "请点 settings 页面中部的「应急登录（管理员专用）」"
if (-not $Auto) {
    Read-Host "完成按 Enter 继续"
}
Capture-Screen "09-admin-emergency-page"

# ===== 11) 输 12345 =====
Write-Host "`n===== 步骤 9 (备用): 输 12345 进 admin =====" -ForegroundColor Cyan
Write-Host "请在 emergency 页输入 12345"
if (-not $Auto) {
    Read-Host "完成按 Enter 继续"
}
Capture-Screen "10-admin-after-emergency"

# ===== 完成 =====
Write-Host "`n===== 烟测完成 =====" -ForegroundColor Green
Write-Host "截图全部落在: $screenshotDir"
Write-Host "请人工检查每张图："
Write-Host "  02-profile-page  → 顶部应有「运营后台」醒目卡（v0.4.0 实施 2 已有）"
Write-Host "  03-profile-bottom → 底部应有「🔧 管理员登录」灰色小字（v0.4.0.1 新增）"
Write-Host "  04-admin-challenge-dialog → 应弹 challenge 输入弹窗（不跳 /admin/login）"
Write-Host "  06-admin-home → 应见 admin 后台主页（4 sub-route 入口 + 实时预览切档）"
Write-Host "  08-settings-page → 顶部「主题」「紧急联系」+ 底部「应急登录（管理员专用）」"
Write-Host "  09-admin-emergency-page → 应见 emergency 应急登录页（不是 /settings/emergency 医院电话）"
Write-Host ""
Write-Host "如果 06 / 10 看到 admin 后台 = P0-1 三个入口都通"
Write-Host "如果 tsc 0 错 + next build 通过 + 烟测 3 个入口都进 = v0.4.0.1 验收完成 ✓"
