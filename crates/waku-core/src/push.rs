//! Push notifications for mobile clients that are not watching the daemon.
//!
//! The phone is a WebSocket client that the OS suspends in the background, so
//! it cannot keep a socket alive (see `apps/mobile`'s `daemon-link`). Instead
//! it registers an Expo push token here; when a turn finishes, a permission is
//! requested, or structured input is needed while the device is backgrounded,
//! the daemon POSTs to Expo's push service, which relays through FCM/APNs and
//! wakes the device.
//!
//! The device decides when it is backgrounded: it re-registers with
//! `foreground: false` as it leaves. The daemon never infers that, because a
//! connected socket and a watching user are not the same thing.
//!
//! Sending blocks on a subprocess (`curl`) and is therefore only ever called
//! from the daemon's per-session event threads, never from a request handler
//! that a client is waiting on.

use std::sync::Arc;

use parking_lot::Mutex;
use serde::Serialize;
use serde_json::json;
use uuid::Uuid;

use crate::usage::http_post;

/// Expo's push endpoint. One POST may carry a batch; the daemon sends one
/// message per call, which keeps the request small and the errors legible.
const EXPO_PUSH_URL: &str = "https://exp.host/--/api/v2/push/send";

/// Where the phone should land when the notification is tapped. Expo Router
/// maps `waku://` to the app; the task id rides as a path segment.
const DEEP_LINK_SCHEME: &str = "waku";

/// One device that asked to be notified. `foreground` is the device's own
/// report: while true the daemon stays silent, because the user is looking.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PushRegistration {
    pub token: String,
    pub platform: String,
    pub foreground: bool,
}

/// The daemon's live set of push registrations, keyed by token so a device
/// that re-registers (foreground flip, app restart) replaces its old row.
/// Shared between the request handler that records registrations and the
/// event threads that read them.
#[derive(Clone, Default)]
pub struct PushRegistry {
    devices: Arc<Mutex<Vec<PushRegistration>>>,
}

impl PushRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Records or updates one device. An empty token clears every
    /// registration, which is how an app that revoked notification permission
    /// tells the daemon to stop pushing.
    pub fn register(&self, token: String, platform: String, foreground: bool) {
        let mut devices = self.devices.lock();
        if token.is_empty() {
            devices.clear();
            return;
        }
        devices.retain(|device| device.token != token);
        devices.push(PushRegistration {
            token,
            platform,
            foreground,
        });
    }

    /// The devices that should receive a notification right now: everything
    /// registered and currently backgrounded.
    pub fn backgrounded(&self) -> Vec<PushRegistration> {
        self.devices
            .lock()
            .iter()
            .filter(|device| !device.foreground)
            .cloned()
            .collect()
    }
}

/// What a push tells the user. Built from the daemon event, not the raw
/// provider payload, so private provider control markers never reach it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PushNotice {
    pub title: String,
    pub body: String,
    pub session_id: Option<Uuid>,
}

impl PushNotice {
    /// A finished turn. The body is the provider's summary when it gave one,
    /// so the notification says what happened without opening the app.
    pub fn turn_finished(success: bool, summary: Option<&str>, task: &str) -> Self {
        let title = if success {
            format!("{task} finished")
        } else {
            format!("{task} failed")
        };
        let body = summary
            .map(str::trim)
            .filter(|summary| !summary.is_empty())
            .unwrap_or(if success {
                "The task finished."
            } else {
                "The task stopped with an error."
            })
            .to_owned();
        Self {
            title,
            body,
            session_id: None,
        }
    }

    pub fn permission(title: &str, task: &str) -> Self {
        Self {
            title: format!("{task} needs permission"),
            body: title.trim().to_owned(),
            session_id: None,
        }
    }

    pub fn user_input(task: &str) -> Self {
        Self {
            title: format!("{task} needs an answer"),
            body: "The task is waiting for your input.".to_owned(),
            session_id: None,
        }
    }
}

/// The Expo push message. Serialized straight to the API's shape.
#[derive(Serialize)]
struct ExpoMessage<'a> {
    to: &'a str,
    title: &'a str,
    body: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<serde_json::Value>,
    sound: &'a str,
}

/// Sends one notice to every backgrounded device. Best-effort: a push that
/// fails is dropped, because a notification is a convenience and a daemon
/// event thread must not stall on a dead network or a bad token.
pub fn notify(registry: &PushRegistry, notice: &PushNotice) {
    let devices = registry.backgrounded();
    if devices.is_empty() {
        return;
    }
    let data = notice.session_id.map(|session_id| {
        json!({
            "url": format!("{DEEP_LINK_SCHEME}://task/{session_id}"),
            "sessionId": session_id,
        })
    });
    for device in devices {
        let message = ExpoMessage {
            to: &device.token,
            title: &notice.title,
            body: &notice.body,
            data: data.clone(),
            sound: "default",
        };
        let Ok(body) = serde_json::to_string(&message) else {
            continue;
        };
        let headers = [String::from("Content-Type: application/json")];
        // Errors are intentionally swallowed: see the doc comment above.
        let _ = http_post(EXPO_PUSH_URL, &headers, &body);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_registration_replaces_the_same_device_and_forgets_on_empty() {
        let registry = PushRegistry::new();
        registry.register("tok".into(), "android".into(), false);
        registry.register("tok".into(), "android".into(), true);
        assert_eq!(registry.backgrounded(), Vec::new());
        registry.register("tok".into(), "android".into(), false);
        assert_eq!(registry.backgrounded().len(), 1);

        registry.register(String::new(), "android".into(), false);
        assert!(registry.backgrounded().is_empty());
    }

    #[test]
    fn only_backgrounded_devices_are_notified() {
        let registry = PushRegistry::new();
        registry.register("foreground".into(), "android".into(), true);
        registry.register("background".into(), "android".into(), false);
        let backgrounded = registry.backgrounded();
        assert_eq!(backgrounded.len(), 1);
        assert_eq!(backgrounded[0].token, "background");
    }

    #[test]
    fn a_finished_turn_prefers_the_summary_then_falls_back() {
        let with_summary = PushNotice::turn_finished(true, Some("  done  "), "Fix login");
        assert_eq!(with_summary.title, "Fix login finished");
        assert_eq!(with_summary.body, "done");

        let without = PushNotice::turn_finished(false, Some("   "), "Fix login");
        assert_eq!(without.title, "Fix login failed");
        assert_eq!(without.body, "The task stopped with an error.");
    }

    #[test]
    fn notices_name_the_task_for_permissions_and_input() {
        assert_eq!(
            PushNotice::permission("Allow file writes", "Fix login").title,
            "Fix login needs permission"
        );
        assert_eq!(
            PushNotice::user_input("Fix login").title,
            "Fix login needs an answer"
        );
    }
}
