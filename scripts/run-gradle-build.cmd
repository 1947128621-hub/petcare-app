@echo off
setlocal
set "JAVA_HOME=C:\Users\97205\dev\jdk-17.0.20\jdk-17.0.20+8"
set "ANDROID_HOME=C:\Android"
set "ANDROID_SDK_ROOT=C:\Android"
set "NDK_HOME=C:\Android\ndk\26.1.10909125"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\build-tools\34.0.0;%ANDROID_HOME%\cmake\3.22.1\bin;%PATH%"

cd /d "C:\Users\97205\.minimax-agent-cn\projects\petcare-app\src-tauri\gen\android"

echo === env ===
java -version
echo JAVA_HOME = %JAVA_HOME%
echo ANDROID_HOME = %ANDROID_HOME%
echo.

echo === gradle assembleDebug ===
call gradlew.bat assembleDebug --no-daemon 2>&1
set EXITCODE=%ERRORLEVEL%
echo.
echo === gradle exit: %EXITCODE% ===
exit /b %EXITCODE%
