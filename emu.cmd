@echo off
setlocal enabledelayedexpansion
rem Start the agent-avd Android emulator with a visible window.
rem Both SDK env vars must point at Y:\android-sdk: the emulator resolves the
rem AVD's system image through ANDROID_HOME, and the user-wide Y:\Android\Sdk
rem has no system-images. The AVD also lives outside the default
rem %USERPROFILE%\.android\avd, so ANDROID_AVD_HOME is required too.
set "ANDROID_HOME=Y:\android-sdk"
set "ANDROID_SDK_ROOT=Y:\android-sdk"
set "ANDROID_AVD_HOME=Y:\android-sdk\avd"
set "ADB=Y:\android-sdk\platform-tools\adb.exe"

"%ADB%" devices | findstr /r "emulator-.*device" >nul
if %errorlevel%==0 (
  echo Emulator already running.
  goto ready
)

echo Starting agent-avd...
rem -gpu host: render with the host GPU (RTX 4050). The previous
rem swiftshader_indirect forced CPU rasterization, which capped the whole app
rem far below 60fps. Fall back to swiftshader_indirect only if host GPU fails.
start "" "Y:\android-sdk\emulator\emulator.exe" -avd agent-avd -no-audio -no-boot-anim -gpu host

echo Waiting for boot, about a minute...
"%ADB%" wait-for-device
:wait
timeout /t 3 /nobreak >nul
set "BOOT="
for /f "delims=" %%b in ('%ADB% shell getprop sys.boot_completed 2^>nul') do set "BOOT=%%b"
if not "!BOOT!"=="1" goto wait

:ready
echo Emulator ready. Run the app with:
echo   bun --filter @waku/mobile android
pause
