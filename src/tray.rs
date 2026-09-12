//! Close-to-tray for Windows: a `Shell_NotifyIcon` host with Show/Quit.
//!
//! The icon is created on the calling (main) thread, whose Win32 message loop
//! GPUI pumps. A dedicated thread blocks on the tray and menu receivers and
//! forwards actions over an async channel; a GPUI-spawned task applies them,
//! so UI work never runs off the main thread. Any failure returns `None` and
//! the app keeps its historical quit-on-close behavior, so a tray that cannot
//! exist never strands a windowless app.

use std::sync::atomic::{AtomicBool, Ordering};

use tray_icon::{
    MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent,
    menu::{Menu, MenuEvent, MenuItem},
};

static TRAY_ACTIVE: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TrayAction {
    Show,
    Quit,
}

/// Whether a live tray icon owns this process's visibility. Close handlers
/// consult this instead of assuming the icon exists.
pub fn is_active() -> bool {
    TRAY_ACTIVE.load(Ordering::Acquire)
}

fn tray_image() -> Option<tray_icon::Icon> {
    let image = image::load_from_memory(include_bytes!("../website/public/app-icon.png")).ok()?;
    let rgba = image.into_rgba8();
    let (width, height) = (rgba.width(), rgba.height());
    tray_icon::Icon::from_rgba(rgba.into_raw(), width, height).ok()
}

/// Build the tray icon and return its action channel. Must run on the main
/// thread. `None` means tray-less: keep quit-on-close.
pub fn install() -> Option<smol::channel::Receiver<TrayAction>> {
    let icon = tray_image()?;
    let show = MenuItem::new("Show", true, None);
    let quit = MenuItem::new("Quit", true, None);
    let menu = Menu::new();
    if menu.append_items(&[&show, &quit]).is_err() {
        return None;
    }
    let tray = TrayIconBuilder::new()
        .with_tooltip("Waku")
        .with_icon(icon)
        .with_menu(Box::new(menu))
        .build()
        .ok()?;
    // TrayIcon is !Send, so it cannot move to the pump thread or a static.
    // Its lifetime is the process's: leaking is the honest ownership model,
    // and the OS reclaims the notification slot on exit.
    std::mem::forget(tray);
    let show_id = show.id().clone();
    let quit_id = quit.id().clone();
    let (actions_tx, actions_rx) = smol::channel::unbounded();
    std::thread::Builder::new()
        .name("waku-tray".into())
        .spawn(move || {
            let tray_events = TrayIconEvent::receiver();
            let menu_events = MenuEvent::receiver();
            loop {
                crossbeam_channel::select! {
                    recv(tray_events) -> event => {
                        let left_click = matches!(
                            event,
                            Ok(TrayIconEvent::Click {
                                button: MouseButton::Left,
                                button_state: MouseButtonState::Up,
                                ..
                            })
                        );
                        if left_click && actions_tx.try_send(TrayAction::Show).is_err() {
                            break;
                        }
                    }
                    recv(menu_events) -> event => {
                        let Ok(event) = event else { break };
                        if event.id == show_id {
                            if actions_tx.try_send(TrayAction::Show).is_err() {
                                break;
                            }
                        } else if event.id == quit_id {
                            let _ = actions_tx.try_send(TrayAction::Quit);
                            break;
                        }
                    }
                }
            }
        })
        .ok()?;
    TRAY_ACTIVE.store(true, Ordering::Release);
    Some(actions_rx)
}
