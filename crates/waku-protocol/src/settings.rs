use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use ts_rs::TS;

use crate::computer_use::ComputerAppGrant;
use crate::model::ProviderKind;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(default)]
pub struct DaemonSettings {
    pub computer_use_enabled: bool,
    pub computer_use_allowed_apps: Vec<ComputerAppGrant>,
    pub disabled_providers: Vec<ProviderKind>,
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub provider_binary_overrides: HashMap<ProviderKind, String>,
    /// The model Waku's own helper steps — task titling, commit subjects,
    /// memory extraction — run on, per provider. Empty means the built-in
    /// cheap-tier pin (or the provider default where there is no pin). The
    /// task router: cheap work goes to the model you point it at, whatever
    /// the session itself runs.
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub helper_models: HashMap<ProviderKind, String>,
    /// Backup models per provider, tried in order when a turn fails with a
    /// retriable provider error (overloaded, rate limit, capacity). The
    /// session's own model leads implicitly; this list is what comes after.
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub model_fallbacks: HashMap<ProviderKind, Vec<String>>,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

impl Default for DaemonSettings {
    fn default() -> Self {
        Self {
            computer_use_enabled: false,
            computer_use_allowed_apps: Vec::new(),
            disabled_providers: Vec::new(),
            provider_binary_overrides: HashMap::new(),
            helper_models: HashMap::new(),
            model_fallbacks: HashMap::new(),
            extra: BTreeMap::new(),
        }
    }
}

impl DaemonSettings {
    pub fn default_path() -> PathBuf {
        dirs::home_dir()
            .unwrap_or_else(std::env::temp_dir)
            .join(".waku")
            .join("settings.json")
    }

    pub fn discard_legacy_app_keys(&mut self) {
        for key in ["analytics_enabled", "favorite_models", "theme", "language"] {
            self.extra.remove(key);
        }
    }
}
