//! Shared loading placeholders.
//!
//! Every daemon-backed surface answers a request that takes a beat to come
//! back. Rendering nothing for that beat reads as "broken", so each surface
//! draws bars shaped like the content it is about to receive. The shapes are
//! per-surface, but the bars and the fade are the same everywhere, which is
//! what this module owns.

use gpui::{
    AnyElement, Div, IntoElement, ParentElement, Styled, div, pulsating_between, px,
};

use crate::theme::Theme;
use crate::ui::motion;

/// One placeholder bar.
pub fn bar(width: f32, height: f32, theme: &Theme) -> Div {
    div()
        .h(px(height))
        .w(px(width))
        .flex_none()
        .rounded(px(height / 2.0))
        .bg(theme.overlay_strong)
}

/// A full-width placeholder track, for fill-meter stand-ins.
pub fn track(theme: &Theme) -> Div {
    div()
        .h(px(4.0))
        .w_full()
        .flex_none()
        .rounded_full()
        .bg(theme.overlay_strong)
}

/// A block placeholder, for cards and previews rather than text runs.
pub fn block(width: f32, height: f32, radius: f32, theme: &Theme) -> Div {
    div()
        .w(px(width))
        .h(px(height))
        .flex_none()
        .rounded(px(radius))
        .bg(theme.overlay_strong)
}

/// Wraps a placeholder group in the gentle opacity pulse every skeleton uses.
///
/// This rides the app's shared pulse clock rather than its own animation, so a
/// dozen skeletons cost one timer, and a reduced-motion user gets the static
/// shape with no motion.
pub fn pulse(body: Div) -> AnyElement {
    motion::pulse(std::time::Duration::from_millis(1400), move |phase| {
        div()
            .child(body)
            .opacity(pulsating_between(0.45, 0.9)(phase))
            .into_any_element()
    })
    .every(2)
    .into_any_element()
}
