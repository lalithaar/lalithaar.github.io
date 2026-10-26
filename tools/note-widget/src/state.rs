//! Widget geometry, the unsaved draft, and where the site lives.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::note::NOTES_DIR;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PastedImage {
    pub ident: String,
    /// File name inside `src/attachments/`.
    pub file: String,
    pub nat_w: u32,
    pub nat_h: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct WidgetState {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    /// Unsaved markdown, restored on launch so a closed widget loses nothing.
    pub draft: String,
    pub images: Vec<PastedImage>,
}

impl Default for WidgetState {
    fn default() -> Self {
        Self {
            x: 80,
            y: 80,
            w: 460,
            h: 400,
            draft: String::new(),
            images: Vec::new(),
        }
    }
}

fn data_dir() -> PathBuf {
    let base = std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    base.join("NoteWidget")
}

pub fn state_path() -> PathBuf {
    data_dir().join("state.json")
}

/// Images live here between being added and the note being saved. `save_note`
/// copies the referenced ones into `src/attachments`; until then, abandoning a
/// draft leaves the repo untouched.
pub fn pending_dir() -> PathBuf {
    data_dir().join("pending")
}

pub fn pending_path(file: &str) -> PathBuf {
    pending_dir().join(file)
}

/// Store an added image in the pending folder and return its file name.
pub fn save_pending(ext: &str, bytes: &[u8]) -> std::io::Result<String> {
    let dir = pending_dir();
    std::fs::create_dir_all(&dir)?;
    let name = crate::note::new_attachment_name(ext);
    std::fs::write(dir.join(&name), bytes)?;
    Ok(name)
}

impl WidgetState {
    pub fn load() -> WidgetState {
        let path = state_path();
        let Ok(raw) = std::fs::read_to_string(&path) else {
            return WidgetState::default();
        };
        serde_json::from_str(&raw).unwrap_or_default()
    }

    /// Written on every change: tmp file + rename, so a crash can't truncate it.
    pub fn save(&self) {
        let path = state_path();
        let Some(dir) = path.parent() else { return };
        if std::fs::create_dir_all(dir).is_err() {
            return;
        }
        let Ok(json) = serde_json::to_string_pretty(self) else { return };
        let tmp = dir.join("state.json.tmp");
        if std::fs::write(&tmp, json).is_ok() {
            let _ = std::fs::rename(&tmp, &path);
        }
    }
}

/// The site checkout: `<repo>/tools/note-widget` is where this crate lives, so
/// two directories up is the repo. Falls back to walking up from the cwd.
pub fn repo_root() -> PathBuf {
    let manifest = Path::new(env!("CARGO_MANIFEST_DIR"));
    if let Some(root) = manifest.parent().and_then(|p| p.parent()) {
        if root.join(NOTES_DIR).is_dir() {
            return root.to_path_buf();
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        for dir in cwd.ancestors() {
            if dir.join(NOTES_DIR).is_dir() {
                return dir.to_path_buf();
            }
        }
    }
    manifest.to_path_buf()
}
