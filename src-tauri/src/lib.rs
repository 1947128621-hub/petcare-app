// ===== Tauri 启动入口(v0.4.0.3 加 telemetry)=====
//
// 变更历史：
//   v0.4.0   原始 — 仅 debug 注册 tauri-plugin-log
//   v0.4.0.2.1 — 保留原始(没动)
//   v0.4.0.3 启动 bug 修复:
//
//     1. tauri-plugin-log 改为**全程开**(debug + release 都开) — 此前 release 没 log
//     2. level 升到 Debug — 拿到更多上下文
//     3. 加 TargetKind::Stdout — Android 走 android_logger::log → logcat (Rust 端日志)
//     4. 加 TargetKind::LogDir — 写日志到 app_log_dir (出问题后可取文件)
//     5. setup() 前后 eprintln + log 标记各阶段
//     6. on_page_load 监听 — 记录 WebView 加载事件
//     7. 加 panic hook — capture backtrace, 写 logcat
//
// 真机调试:用户跑 `adb logcat -d -s TauriV0403 chromium:V` 能看到 Tauri 各阶段日志

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // ===== TauriV0403 启动日志(先于 Builder 跑, logcat 必现)=====
  eprintln!("[TauriV0403] ========================================");
  eprintln!("[TauriV0403] Tauri v0.4.0.3-A starting...");
  eprintln!("[TauriV0403] cfg(debug_assertions) = {}", cfg!(debug_assertions));
  eprintln!("[TauriV0403] ========================================");

  // panic hook — 任何 panic 都写到 logcat
  std::panic::set_hook(Box::new(|panic_info| {
    eprintln!("[TauriV0403] PANIC: {}", panic_info);
    if let Some(location) = panic_info.location() {
      eprintln!(
        "[TauriV0403] PANIC at {}:{}:{}",
        location.file(),
        location.line(),
        location.column()
      );
    }
    if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
      eprintln!("[TauriV0403] PANIC payload: {}", s);
    } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
      eprintln!("[TauriV0403] PANIC payload: {}", s);
    }
  }));

  let builder_result = tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app| {
      eprintln!("[TauriV0403] setup() begin");
      log::info!("[TauriV0403] setup() begin");

      // v0.4.0.3 — 全程开 log(debug + release 都开)+ 升到 Debug
      // Stdout 目标在 Android 上走 android_logger::log → logcat
      // LogDir 目标写文件到 app_log_dir,出问题后可以读
      app.handle().plugin(
        tauri_plugin_log::Builder::new()
          .level(log::LevelFilter::Debug)
          .target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout))
          .target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: Some("tauri-v0403".into()) }))
          .build(),
      )?;
      log::info!("[TauriV0403] tauri-plugin-log attached (level=Debug, targets=Stdout+LogDir)");

      // 监听 WebView 加载事件
      if let Some(main_window) = app.get_webview_window("main") {
        let win = main_window.clone();
        main_window.on_page_load(move |_window, payload| {
          let ev = format!("{:?}", payload.event());
          let url = payload.url().to_string();
          eprintln!("[TauriV0403] on_page_load event={} url={}", ev, url);
          log::info!("[TauriV0403] on_page_load event={} url={}", ev, url);
          // 保持 win 不被 drop
          let _ = &win;
        });
        log::info!("[TauriV0403] on_page_load listener attached to main window");
      } else {
        log::warn!("[TauriV0403] main window not found");
      }

      eprintln!("[TauriV0403] setup() end");
      log::info!("[TauriV0403] setup() end");
      Ok(())
    })
    .run(tauri::generate_context!());

  match builder_result {
    Ok(_) => {
      eprintln!("[TauriV0403] tauri::Builder::run() returned Ok");
    }
    Err(e) => {
      eprintln!("[TauriV0403] tauri::Builder::run() FAILED: {}", e);
      eprintln!("[TauriV0403] error chain: {:?}", e);
      panic!("[TauriV0403] tauri run failed: {}", e);
    }
  }
}
