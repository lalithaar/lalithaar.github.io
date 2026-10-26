# note-widget

A frameless desktop capture widget for the site. Type Markdown, paste images,
press <kbd>Ctrl</kbd>+<kbd>S</kbd>. It writes the note directly into the repo:

- `src/notes/yyyymmdd-<32 hex>.mdx`
- `src/attachments/<32 hex>.<ext>` for pasted images

The widget sits on the desktop, above the wallpaper and below normal windows,
the same way `tools/desktop_todo` does. Click it to bring it forward; when it
loses focus it drops back behind your other windows.

## Run

From this folder:

```powershell
cd D:\cat-nap\tools\note-widget
cargo tauri dev
```

`cargo run` also works, because the frontend is plain static files in `ui/` —
there is no Node dev server to start.

The first build takes a while. Later runs are incremental.

Requirements:

- Rust with the MSVC toolchain
- Visual Studio Build Tools with the Windows SDK
- WebView2 (already present on Windows 10/11)

## Build a release binary

```powershell
cargo tauri build
```

The executable is `target\release\note-widget.exe`. Run it from inside the site
checkout. `repo_root()` finds the repo from the crate location
(`tools/note-widget/../..`) and, failing that, by walking up from the current
directory until it sees `src/notes`. If you copy the `.exe` somewhere else, start
it with the repo as the working directory.

## Using it

| Action | How |
| --- | --- |
| New note | Type in the box |
| Save | <kbd>Ctrl</kbd>+<kbd>S</kbd> or the **save** button |
| Attach an image | <kbd>Ctrl</kbd>+<kbd>V</kbd> adds the image you copied |
| Attach several images | Drag any number of files onto the window, or click **img** and multi-select |
| Resize an image | Drag the left/right edge of its thumbnail |
| Close | The × in the title bar |

Each attached image gets its own `<Image />` line in the draft. While you are
composing, images are held in `%APPDATA%\NoteWidget\pending`; they are copied
into `src/attachments` only when you save the note, so an abandoned draft never
writes into the repo.

The image strip stays hidden while a note has no images, so the widget is a
single writing surface until you attach something.

The unsaved draft is kept in `%APPDATA%\NoteWidget\state.json` and restored on
launch. Window position and size live there too.

## Tests

```powershell
cargo test
```

The tests cover the `.mdx` assembly, filename shape, attachment naming, image
tag parsing, and aspect-ratio sizing.
