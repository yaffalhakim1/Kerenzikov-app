//! First-run guidance shown before the user has anything set up.
//!
//! The empty state already told a returning user to open a project, but a new
//! install has a step before that one: no agent CLI is present, so every task
//! would fail at `Start`. This module owns that earlier step — it reads the
//! same provider probes the settings page uses and, when nothing is installed,
//! says which CLIs Waku can drive and where to get them.
//!
//! It renders nothing once at least one provider is installed, so the ordinary
//! "open a project" hero is what an established user sees.

use super::*;

/// Providers worth naming on the first-run screen, in the order that best
/// matches how most people start. This is deliberately shorter than
/// [`ProviderKind::ALL`]: the screen is guidance, not a catalog.
const SUGGESTED_PROVIDERS: [ProviderKind; 4] = [
    ProviderKind::Claude,
    ProviderKind::Codex,
    ProviderKind::OpenCode,
    ProviderKind::Cursor,
];

/// Whether any installed provider has been seen at all.
pub(super) fn has_installed_provider(probes: &[ProviderProbe]) -> bool {
    probes.iter().any(|probe| probe.installed)
}

/// The install hint for one provider, or `None` when it is not in the
/// suggested set.
pub(super) fn suggested_install_url(provider: ProviderKind) -> Option<&'static str> {
    match provider {
        ProviderKind::Claude => Some("https://claude.com/claude-code"),
        ProviderKind::Codex => Some("https://github.com/openai/codex"),
        ProviderKind::OpenCode => Some("https://opencode.ai"),
        ProviderKind::Cursor => Some("https://cursor.com/cli"),
        _ => None,
    }
}

/// Renders the "install an agent first" panel, or `None` when a provider is
/// already available or detection has not answered yet.
///
/// `detected` is what separates "no agent is installed" from "we have not
/// looked yet": `probes` is seeded with every provider marked uninstalled at
/// startup, so a non-empty list means nothing on its own. Reading it as an
/// answer is what made this panel flash on startup and then vanish as soon as
/// the real detection replaced the seed.
pub(super) fn render_provider_setup(
    probes: &[ProviderProbe],
    detected: bool,
    theme: &Theme,
    cx: &mut Context<Waku>,
) -> Option<AnyElement> {
    if !setup_is_due(probes, detected) {
        return None;
    }
    Some(provider_setup_body(theme, cx).into_any_element())
}

/// Whether the install panel is the right thing to show: detection has
/// answered, and it found nothing to run.
fn setup_is_due(probes: &[ProviderProbe], detected: bool) -> bool {
    detected && !has_installed_provider(probes)
}

fn provider_setup_body(theme: &Theme, cx: &mut Context<Waku>) -> Div {
    let rows = SUGGESTED_PROVIDERS
        .into_iter()
        .map(|provider| provider_setup_row(provider, theme))
        .collect::<Vec<_>>();
    div()
        .flex_1()
        .flex()
        .flex_col()
        .items_center()
        .justify_center()
        .px_8()
        .pb(px(46.0))
        .child(icon("icons/wrench.svg", 24.0, theme.accent))
        .child(
            div()
                .mt(px(16.0))
                .text_size(sp(20.0))
                .font_weight(FontWeight::MEDIUM)
                .text_color(theme.text)
                .child(tr_cow!("onboarding.install_agent")),
        )
        .child(
            div()
                .mt(px(8.0))
                .max_w(px(420.0))
                .text_center()
                .text_size(sp(12.5))
                .line_height(sp(19.0))
                .text_color(theme.text_tertiary)
                .child(tr_cow!("onboarding.install_agent_description")),
        )
        .child(
            div()
                .mt(px(20.0))
                .w(px(420.0))
                .rounded(px(12.0))
                .border_1()
                .border_color(theme.border)
                .bg(theme.surface)
                .overflow_hidden()
                .children(rows),
        )
        .child(
            div()
                .mt(px(16.0))
                .text_size(sp(12.0))
                .text_color(theme.text_tertiary)
                .child(tr_cow!("onboarding.install_agent_footer")),
        )
        .child(
            div()
                .id("onboarding-refresh-providers")
                .tab_index(0)
                .mt(px(14.0))
                .h(px(30.0))
                .px(px(13.0))
                .rounded_full()
                .flex()
                .items_center()
                .cursor_default()
                .text_color(theme.text_secondary)
                .text_size(sp(12.5))
                .hover(|element| element.bg(theme.overlay))
                .active(|element| element.bg(theme.overlay_strong))
                .focus_visible(|style| style.border_1().border_color(theme.accent))
                .tooltip(Tooltip::text(tr!("providers.refresh")))
                .child(tr_cow!("providers.refresh"))
                .on_click(cx.listener(|this, _, _, cx| {
                    this.refresh_provider_detection(None);
                    cx.notify();
                }))
                .on_key_down(cx.listener(|this, event: &KeyDownEvent, _, cx| {
                    if matches!(event.keystroke.key.as_str(), "enter" | "space") {
                        this.refresh_provider_detection(None);
                        cx.notify();
                        cx.stop_propagation();
                    }
                })),
        )
}

fn provider_setup_row(provider: ProviderKind, theme: &Theme) -> Div {
    let Some(url) = suggested_install_url(provider) else {
        return div();
    };
    div()
        .w_full()
        .px(px(12.0))
        .py(px(9.0))
        .flex()
        .items_center()
        .gap(px(9.0))
        .border_b_1()
        .border_color(theme.border)
        .child(
            div()
                .flex_none()
                .child(provider_mark(theme, provider, 14.0, theme.text_secondary)),
        )
        .child(
            div()
                .flex_1()
                .min_w_0()
                .text_size(sp(12.5))
                .text_color(theme.text)
                .child(SharedString::from(provider.display_name())),
        )
        .child(
            div()
                .id(SharedString::from(format!("onboarding-install-{}", provider.id())))
                .tab_index(0)
                .flex_none()
                .text_size(sp(12.0))
                .font_weight(FontWeight::MEDIUM)
                .text_color(theme.accent)
                .underline()
                .cursor_default()
                .focus_visible(|style| style.border_1().border_color(theme.accent))
                .child(tr_cow!("providers.install"))
                .on_click(move |_, _, cx| {
                    cx.open_url(url);
                }),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn probe(provider: ProviderKind, installed: bool) -> ProviderProbe {
        ProviderProbe {
            provider,
            installed,
            path: None,
            models: Vec::new(),
            agent_presets: Vec::new(),
            catalog_error: None,
        }
    }

    /// The startup seed marks every provider uninstalled, so a non-empty list
    /// is not evidence of anything. Treating it as an answer made the panel
    /// flash on launch and vanish once detection replaced the seed.
    #[test]
    fn seeded_uninstalled_probes_are_not_an_answer() {
        let seeded = vec![
            probe(ProviderKind::Claude, false),
            probe(ProviderKind::Codex, false),
        ];
        assert!(!has_installed_provider(&seeded));

        // Not yet detected: keep the ordinary empty state, whatever the seed
        // happens to say.
        assert!(!setup_is_due(&seeded, false));
        // Detection answered and found nothing: now the panel is due.
        assert!(setup_is_due(&seeded, true));
    }

    #[test]
    fn an_installed_provider_suppresses_the_panel() {
        let detected = vec![probe(ProviderKind::Codex, true)];
        assert!(has_installed_provider(&detected));
        assert!(!setup_is_due(&detected, true));
    }
}
