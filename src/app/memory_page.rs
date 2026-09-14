//! The Memory settings page: this project's `MEMORY.md` facts as an
//! editable list — add via the input, delete per row with a confirming
//! second click.
//!
//! Reads are filesystem work and live on the background executor
//! ([`Waku::ensure_memory`]); frames read only the cached sections.
//! Mutations are one-shot user actions — a single append or rewrite — so
//! they run synchronously in their click handlers and then rescan.

use super::*;

impl Waku {
    /// The project whose memory the page edits: the selected one, excluding
    /// projectless workspaces (generated directories with no `MEMORY.md`).
    fn memory_project_path(&self) -> Option<PathBuf> {
        self.selected_project()
            .filter(|project| !project.is_projectless())
            .map(|project| project.path.clone())
    }

    /// Start a background `MEMORY.md` read unless a load is in flight or the
    /// cache already covers this project. Results from superseded loads are
    /// discarded by generation.
    pub(super) fn ensure_memory(&mut self, force: bool, cx: &mut Context<Self>) {
        let Some(project) = self.memory_project_path() else {
            self.memory_entries = None;
            self.memory_project = None;
            self.memory_pending = false;
            self.memory_delete_arming = None;
            return;
        };
        if self.memory_pending {
            return;
        }
        if !force && self.memory_project.as_ref() == Some(&project) {
            return;
        }
        // A project switch disarms any pending delete: the armed title
        // belongs to another project's list.
        if self.memory_project.as_ref() != Some(&project) {
            self.memory_delete_arming = None;
        }
        self.memory_pending = true;
        self.memory_generation += 1;
        let generation = self.memory_generation;
        cx.spawn(async move |this, cx| {
            let sections = cx
                .background_executor()
                .spawn(async move { waku_client::project_memory::list_sections(&project) })
                .await;
            let _ = this.update(cx, |this, cx| {
                if this.memory_generation != generation {
                    return;
                }
                this.memory_pending = false;
                // `memory_project_path` is recomputed here so a switch
                // mid-load lands on the newer project, not this stale one.
                this.memory_project = this.memory_project_path();
                this.memory_entries = Some(Rc::new(sections));
                cx.notify();
            });
        })
        .detach();
    }

    /// Store the input's content as a fact for this project. Empty input
    /// only reports usage; it never touches the disk.
    pub(super) fn add_memory_fact(&mut self, cx: &mut Context<Self>) {
        let Some(project) = self.memory_project_path() else {
            self.show_toast(tr!("commands.memory_no_project"));
            cx.notify();
            return;
        };
        let text = self.memory_input.read(cx).content().trim().to_owned();
        if text.is_empty() {
            self.show_toast(tr!("commands.memory_usage"));
            cx.notify();
            return;
        }
        match waku_client::project_memory::remember(&project, &text) {
            Ok(_) => {
                self.memory_input.update(cx, |input, cx| input.clear(cx));
                self.show_success_toast(tr!("commands.memory_remembered"));
            }
            Err(_) => self.show_toast(tr!("commands.memory_remember_failed")),
        }
        self.ensure_memory(true, cx);
        cx.notify();
    }

    /// Delete the section titled `title` after a confirming second click.
    fn delete_memory_fact(&mut self, title: String, cx: &mut Context<Self>) {
        let Some(project) = self.memory_project_path() else {
            self.show_toast(tr!("commands.memory_no_project"));
            cx.notify();
            return;
        };
        if self.memory_delete_arming.as_ref() != Some(&title) {
            self.memory_delete_arming = Some(title);
            cx.notify();
            return;
        }
        self.memory_delete_arming = None;
        match waku_client::project_memory::forget_section(&project, &title) {
            Ok(true) => self.show_success_toast(tr!("memory.deleted")),
            _ => self.show_toast(tr!("commands.memory_found_nothing")),
        }
        self.ensure_memory(true, cx);
        cx.notify();
    }

    pub(super) fn render_memory_settings(&self, cx: &mut Context<Self>) -> AnyElement {
        // The cache follows the sidebar's project selection, which can move
        // while the page sits open. `ensure_memory` no-ops when fresh, so
        // this kick is one synchronous check per frame, never disk I/O.
        if !self.memory_pending && self.memory_project != self.memory_project_path() {
            cx.entity().update(cx, |this, cx| this.ensure_memory(false, cx));
        }
        let theme = Theme::current(cx);

        let Some(project) = self.selected_project() else {
            return self.render_memory_notice(
                &theme,
                tr!("memory.no_project"),
                tr!("memory.no_project_description"),
            );
        };
        if project.is_projectless() {
            return self.render_memory_notice(
                &theme,
                tr!("memory.no_project"),
                tr!("memory.no_project_description"),
            );
        }
        let project_name = project.display_name();
        let file_caption = tr!(
            "memory.file_caption",
            path = waku_client::project_memory::memory_file(&project.path)
                .display()
                .to_string()
        );

        // The project header is plain text, not a card: it labels the page,
        // while the add-fact input and the facts below keep the card look.
        let mut column = div().child(
            div()
                .mt(px(15.0))
                .w_full()
                .child(
                    div()
                        .text_size(sp(13.5))
                        .font_weight(FontWeight::MEDIUM)
                        .text_color(theme.text)
                        .child(project_name),
                )
                .child(
                    div()
                        .mt(px(5.0))
                        .text_size(sp(12.5))
                        .line_height(sp(18.0))
                        .text_color(theme.text_secondary)
                        .child(tr!("memory.description")),
                )
                .child(
                    div()
                        .mt(px(5.0))
                        .text_size(sp(12.0))
                        .font_family(crate::md::render::MONO_FAMILY)
                        .text_color(theme.text_tertiary)
                        .child(SharedString::from(file_caption)),
                ),
        );

        column = column.child(
            div()
                .mt(px(15.0))
                .w_full()
                .px(px(20.0))
                .py(px(14.0))
                .rounded(px(13.0))
                .bg(theme.raised)
                .child(
                    div()
                        .text_size(sp(13.5))
                        .font_weight(FontWeight::MEDIUM)
                        .text_color(theme.text)
                        .child(tr!("memory.add_title")),
                )
                .child(
                    div().mt(px(10.0)).child(
                        TextField::new("memory-add-field", self.memory_input.clone()).w_full(),
                    ),
                )
                .child(
                    div().mt(px(10.0)).flex().justify_end().child(
                        div()
                            .id("memory-remember-button")
                            .tab_index(0)
                            .focus_visible(|style| style.border_color(theme.accent))
                            .h(px(28.0))
                            .px(px(14.0))
                            .rounded(px(7.0))
                            .flex()
                            .items_center()
                            .gap(px(6.0))
                            .cursor_default()
                            .text_size(sp(13.0))
                            .bg(theme.inverse)
                            .text_color(theme.on_inverse)
                            .child(icon("icons/plus.svg", 13.0, theme.on_inverse))
                            .child(tr!("memory.remember"))
                            .on_click(cx.listener(|this, _, _, cx| {
                                this.add_memory_fact(cx);
                            })),
                    ),
                ),
        );

        let body: AnyElement = match self.memory_entries.clone() {
            None => div()
                .mt(px(15.0))
                .text_size(sp(12.5))
                .text_color(theme.text_tertiary)
                .child(if self.memory_pending {
                    tr!("memory.loading")
                } else {
                    String::new()
                })
                .into_any_element(),
            Some(entries) if entries.is_empty() => div()
                .mt(px(15.0))
                .w_full()
                .px(px(20.0))
                .py(px(14.0))
                .rounded(px(13.0))
                .bg(theme.raised)
                .child(
                    div()
                        .text_size(sp(13.5))
                        .font_weight(FontWeight::MEDIUM)
                        .text_color(theme.text)
                        .child(tr!("memory.empty_title")),
                )
                .child(
                    div()
                        .mt(px(5.0))
                        .text_size(sp(12.5))
                        .line_height(sp(18.0))
                        .text_color(theme.text_secondary)
                        .child(tr!("memory.empty_description")),
                )
                .into_any_element(),
            Some(entries) => {
                let mut list = div();
                // `MEMORY.md` appends, so the file order is oldest-first;
                // the page leads with the newest fact.
                for (title, fact_body) in entries.iter().rev() {
                    list = list.child(self.render_memory_row(title, fact_body, &theme, cx));
                }
                list.into_any_element()
            }
        };
        column.child(body).into_any_element()
    }

    fn render_memory_notice(&self, theme: &Theme, title: String, body: String) -> AnyElement {
        div()
            .child(
                div()
                    .mt(px(15.0))
                    .w_full()
                    .px(px(20.0))
                    .py(px(14.0))
                    .rounded(px(13.0))
                    .bg(theme.raised)
                    .child(
                        div()
                            .text_size(sp(13.5))
                            .font_weight(FontWeight::MEDIUM)
                            .text_color(theme.text)
                            .child(SharedString::from(title)),
                    )
                    .child(
                        div()
                            .mt(px(5.0))
                            .text_size(sp(12.5))
                            .line_height(sp(18.0))
                            .text_color(theme.text_secondary)
                            .child(SharedString::from(body)),
                    ),
            )
            .into_any_element()
    }

    fn render_memory_row(
        &self,
        title: &str,
        body: &str,
        theme: &Theme,
        cx: &mut Context<Self>,
    ) -> Div {
        let armed = self.memory_delete_arming.as_deref() == Some(title);
        let owned_title = title.to_owned();
        div()
            .mt(px(10.0))
            .w_full()
            .px(px(20.0))
            .py(px(12.0))
            .rounded(px(13.0))
            .bg(theme.raised)
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(10.0))
                    .child(
                        div()
                            .flex_1()
                            .min_w_0()
                            .text_size(sp(13.5))
                            .font_weight(FontWeight::MEDIUM)
                            .text_color(theme.text)
                            .child(SharedString::from(title.to_owned())),
                    )
                    .child(
                        div()
                            .id(SharedString::from(format!("memory-delete-{title}")))
                            .tab_index(0)
                            .focus_visible(|style| style.border_color(theme.accent))
                            .h(px(26.0))
                            .px(px(10.0))
                            .rounded(px(6.0))
                            .border_1()
                            .border_color(if armed {
                                theme.danger
                            } else {
                                theme.border_strong
                            })
                            .when(armed, |element| element.bg(theme.danger.opacity(0.12)))
                            .flex()
                            .flex_none()
                            .items_center()
                            .gap(px(5.0))
                            .cursor_default()
                            .text_size(sp(12.5))
                            .text_color(if armed {
                                theme.danger
                            } else {
                                theme.text_secondary
                            })
                            .hover(|element| element.bg(theme.overlay))
                            .child(icon(
                                "icons/trash.svg",
                                11.0,
                                if armed {
                                    theme.danger
                                } else {
                                    theme.text_tertiary
                                },
                            ))
                            .child(if armed {
                                tr!("memory.confirm_delete")
                            } else {
                                tr!("memory.delete")
                            })
                            .on_click(cx.listener(move |this, _, _, cx| {
                                this.delete_memory_fact(owned_title.clone(), cx);
                            })),
                    ),
            )
            .child(
                div()
                    .mt(px(4.0))
                    .text_size(sp(12.5))
                    .line_height(sp(18.0))
                    .text_color(theme.text_secondary)
                    .child(SharedString::from(body.trim().to_owned())),
            )
    }
}
