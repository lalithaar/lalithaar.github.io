//! A tiny desktop capture widget for the site.
//!
//! The UI lives in `ui/` (a plain HTML/JS surface inside a frameless Tauri
//! window); this side owns the files. Attached images are staged in
//! `%APPDATA%\NoteWidget\pending` and copied to
//! `<repo>/src/attachments/<32 hex>.<ext>` only when Ctrl+S writes
//! `<repo>/src/notes/yyyymmdd-<32 hex>.mdx` with frontmatter plus the
//! `<Image />` imports — the same shape `scripts/new-note.ps1` produces, but
//! `.mdx` so a note can carry an `<Image />` with an explicit size.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod background;
mod note;
mod state;

use std::sync::Mutex;

use base64::Engine;
use tauri::{Manager, State};
use windows::Win32::Foundation::HWND;

use state::{PastedImage, WidgetState};

struct App {
    repo: std::path::PathBuf,
    state: Mutex<WidgetState>,
}

impl App {
    fn update<T>(&self, f: impl FnOnce(&mut WidgetState) -> T) -> Result<T, String> {
        let mut guard = self.state.lock().map_err(|_| "state locked".to_string())?;
        Ok(f(&mut guard))
    }
}

/// Everything the UI needs to redraw a draft it has never seen.
#[derive(serde::Serialize)]
struct Snapshot {
    draft: String,
    images: Vec<PastedImage>,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    repo: String,
}

#[tauri::command]
fn load_state(app: State<'_, App>) -> Result<Snapshot, String> {
    app.update(|s| Snapshot {
        draft: s.draft.clone(),
        images: s.images.clone(),
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        repo: app.repo.display().to_string(),
    })
}

/// Debounced from the UI as the draft changes, so a crash loses nothing.
#[tauri::command]
fn set_draft(app: State<'_, App>, draft: String) -> Result<(), String> {
    app.update(|s| {
        s.draft = draft;
        s.save();
    })
}

/// The frontend hands us the bytes (it already read them off the clipboard)
/// and the intrinsic size it measured. We park the bytes in `%APPDATA%` for
/// now: nothing enters the repo until the note is saved.
/// What the frontend gets back: the pending file name plus the exact tag to
/// drop at the caret, so the tag format lives in exactly one place.
#[derive(serde::Serialize)]
struct Pasted {
    ident: String,
    file: String,
    tag: String,
}

// Argument names are deliberately single words: the frontend and Rust then
// agree on them whatever case conversion Tauri applies.
#[tauri::command]
fn paste_image(app: State<'_, App>, b64: String, ext: String, w: u32, h: u32) -> Result<Pasted, String> {
    let ext = note::safe_ext(&ext)?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64.trim().trim_start_matches("data:").split_once(',').map_or(b64.trim(), |(_, tail)| tail))
        .map_err(|e| format!("clipboard bytes unreadable: {e}"))?;
    if bytes.is_empty() {
        return Err("clipboard image was empty".into());
    }
    let file = state::save_pending(&ext, &bytes).map_err(|e| e.to_string())?;
    let width = w.clamp(60, 720);
    let height = note::scaled_height(w, h, width);
    app.update(|s| {
        let ident = note::next_ident(&s.draft, &s.images);
        let tag = note::make_image_tag(&ident, width, height);
        s.images.push(PastedImage {
            ident: ident.clone(),
            file: file.clone(),
            nat_w: w,
            nat_h: h,
        });
        s.save();
        Pasted { ident, file, tag }
    })
}

/// Previews while composing: pending files first, then committed attachments
/// from older drafts. Returns a data URL (CSP is off locally).
#[tauri::command]
fn read_attachment(app: State<'_, App>, file: String) -> Result<String, String> {
    if file.contains('/') || file.contains('\\') || file.contains("..") || file.contains('\0') {
        return Err("bad attachment name".into());
    }
    let ext = note::safe_ext(std::path::Path::new(&file).extension().and_then(|e| e.to_str()).unwrap_or(""))?;
    let bytes = std::fs::read(app.repo.join(note::ATTACHMENTS_DIR).join(&file))
        .or_else(|_| std::fs::read(state::pending_path(&file)))
        .map_err(|e| format!("attachment gone: {e}"))?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{encoded}", note::mime_for(&ext)))
}

#[tauri::command]
fn save_note(app: State<'_, App>, body: String) -> Result<String, String> {
    if body.trim().is_empty() {
        return Err("nothing to save".into());
    }
    let date = note::today_ist();
    let (path, images) = {
        let mut guard = app.state.lock().map_err(|_| "state locked".to_string())?;
        let s = &mut *guard;

        // Only now do the referenced pending images land in `src/attachments`.
        note::commit_attachments(&app.repo, &state::pending_dir(), &body, &s.images)?;
        let path = note::save_note(&app.repo, &date, &body, &s.images)
            .map_err(|e| e.to_string())?;

        let images = std::mem::take(&mut s.images);
        s.draft.clear();
        s.save();
        (path, images)
    };

    // The draft became a note; the pending copies (used or abandoned) are done.
    for image in &images {
        let _ = std::fs::remove_file(state::pending_path(&image.file));
    }

    let slug = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    Ok(slug)
}

/// The frameless window has no system close button, so the title bar's × comes
/// here. The draft is already on disk (it is persisted as you type).
#[tauri::command]
fn quit(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }
}

fn main() {
    let repo = state::repo_root();
    tauri::Builder::default()
        .manage(App {
            repo,
            state: Mutex::new(WidgetState::load()),
        })
        .setup(|app| {
            let window = app.get_webview_window("main").expect("main window");
            let managed = app.state::<App>();
            let (x, y, w, h) = {
                let st = managed.state.lock().map_err(|e| e.to_string())?;
                (st.x, st.y, st.w, st.h)
            };
            if w > 0 && h > 0 {
                let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
                let _ = window.set_size(tauri::PhysicalSize::new(w as u32, h as u32));
            }

            // Match desktop_todo: sit on the desktop, not on top of the user's
            // work. The pin is re-applied on a timer because Windows reorders
            // windows whenever focus changes.
            let _ = window.set_always_on_top(false);
            background::pin(window.hwnd()?);
            spawn_pinner(window.hwnd()?);

            // Remember where the widget was parked and how big it was — but
            // ignore the transient rects Windows reports while the window is
            // being created, maximized or minimized.
            let handle = app.handle().clone();
            let _ = window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    if let Some(w) = handle.get_webview_window("main") {
                        if let Ok(hwnd) = w.hwnd() {
                            background::pin(hwnd);
                        }
                    }
                }
                let Some(s) = handle.try_state::<App>() else { return };
                let settled = handle
                    .get_webview_window("main")
                    .and_then(|w| {
                        let max = w.is_maximized().ok()?;
                        let min = w.is_minimized().ok()?;
                        Some(!max && !min)
                    })
                    .unwrap_or(false);
                if !settled {
                    return;
                }
                match event {
                    tauri::WindowEvent::Moved(pos) => {
                        if (-4000..4000).contains(&pos.x) && (-4000..4000).contains(&pos.y) {
                            let _ = s.update(|st| {
                                st.x = pos.x;
                                st.y = pos.y;
                                st.save();
                            });
                        }
                    }
                    tauri::WindowEvent::Resized(size) => {
                        if (300..=2000).contains(&size.width)
                            && (300..=2000).contains(&size.height)
                        {
                            let _ = s.update(|st| {
                                st.w = size.width as i32;
                                st.h = size.height as i32;
                                st.save();
                            });
                        }
                    }
                    _ => {}
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_state,
            set_draft,
            paste_image,
            read_attachment,
            save_note,
            quit
        ])
        .run(tauri::generate_context!())
        .expect("error while running note-widget");
}

/// Re-park the widget every half second. Cheap (a couple of User32 calls) and
/// it keeps the widget behind apps that were opened after it.
fn spawn_pinner(hwnd: HWND) {
    let raw = hwnd.0 as isize;
    std::thread::spawn(move || {
        let hwnd = HWND(raw as *mut core::ffi::c_void);
        loop {
            std::thread::sleep(std::time::Duration::from_millis(500));
            background::pin(hwnd);
        }
    });
}
