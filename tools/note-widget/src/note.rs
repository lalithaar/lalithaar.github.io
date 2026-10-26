//! Slug / frontmatter / MDX assembly and `<Image>` tag parsing.
//! Everything here is pure so it can be unit tested without a window.

use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::state::PastedImage;

pub const NOTES_DIR: &str = "src/notes";
pub const ATTACHMENTS_DIR: &str = "src/attachments";

/// Today's date in IST (UTC+05:30) whatever the machine's timezone is, so the
/// widget and `scripts/new-note.ps1` agree on the slug prefix.
pub fn today_ist() -> String {
    let secs = SystemTimeNow::secs();
    let ist = secs + 5 * 3600 + 30 * 60;
    let (y, m, d) = civil_from_days((ist / 86_400) as i64);
    format!("{y:04}-{m:02}-{d:02}")
}

struct SystemTimeNow;
impl SystemTimeNow {
    fn secs() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
    }
}

/// `yyyymmdd-<32 hex>` — the exact shape `new-note.ps1` writes, but `.mdx`.
pub fn new_slug(date: &str) -> String {
    format!("{}-{}", date.replace('-', ""), Uuid::new_v4().simple())
}

/// Random name for a pasted attachment: `<32 hex>.<ext>`.
pub fn new_attachment_name(ext: &str) -> String {
    format!("{}.{}", Uuid::new_v4().simple(), ext)
}

/// Howard Hinnant's days->civil inverse.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// One `<Image src={img_1} alt="" width={560} height={350} />` in a draft.
/// Only the ident is returned: sizing is done by the UI, which owns the tag it
/// just inserted, but a tag without numbers is not one of ours.
pub struct ImageTag {
    pub ident: String,
}

pub fn find_image_tags(text: &str) -> Vec<ImageTag> {
    let mut out = Vec::new();
    let mut search = 0usize;
    while let Some(rel) = text[search..].find("<Image") {
        let start = search + rel;
        let body_at = start + "<Image".len();
        let Some(gt) = text[body_at..].find('>') else { break };
        let tag = &text[start..body_at + gt];        if let (Some(ident), Some(_width), Some(_height)) = (
            brace_attr(tag, "src={").map(|(_, value)| value),
            num_attr(tag, "width={"),
            num_attr(tag, "height={"),
        ) {
            out.push(ImageTag { ident });
        }
        search = body_at + gt + 1;
    }
    out
}

/// Offset of `name` in `tag`, and the value between `{` and `}`.
fn brace_attr(tag: &str, name: &str) -> Option<(usize, String)> {
    let at = tag.find(name)?;
    let inner = at + name.len();
    let end = tag[inner..].find('}')? + inner;
    Some((inner, tag[inner..end].to_string()))
}

/// Same, but the value must be digits and the returned range covers them.
fn num_attr(tag: &str, name: &str) -> Option<(usize, usize)> {
    let (at, value) = brace_attr(tag, name)?;
    let digits: String = value.chars().take_while(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }
    Some((at, at + digits.len()))
}

pub fn make_image_tag(ident: &str, width: u32, height: u32) -> String {
    format!("<Image src={{{ident}}} alt=\"\" width={{{width}}} height={{{height}}} />")
}

/// Height that keeps a picture's aspect ratio for a chosen display width.
pub fn scaled_height(nat_w: u32, nat_h: u32, width: u32) -> u32 {
    if nat_w == 0 || nat_h == 0 {
        return width.max(1);
    }
    (((width as u64 * nat_h as u64) + nat_w as u64 / 2) / nat_w as u64).max(1) as u32
}

/// Next free `img_N` ident: one past the highest N used by the draft or the
/// stored image list, so a paste never collides with an existing tag.
pub fn next_ident(text: &str, images: &[PastedImage]) -> String {
    let mut max = 0u32;
    let mut scan = |ident: &str| {
        if let Some(rest) = ident.strip_prefix("img_") {
            if let Ok(n) = rest.parse::<u32>() {
                max = max.max(n);
            }
        }
    };
    for tag in find_image_tags(text) {
        scan(&tag.ident);
    }
    for image in images {
        scan(&image.ident);
    }
    format!("img_{}", max + 1)
}

/// The finished `.mdx` file: frontmatter, then the imports for the images the
/// body actually references, then the body.
pub fn build_mdx(date: &str, body: &str, images: &[PastedImage]) -> String {
    let mut imports: Vec<String> = Vec::new();
    let used: Vec<&PastedImage> = images
        .iter()
        .filter(|image| body.contains(&format!("src={{{}}}", image.ident)))
        .collect();
    if !used.is_empty() {
        imports.push("import { Image } from 'astro:assets';".into());
        for image in used {
            imports.push(format!(
                "import {} from '../attachments/{}';",
                image.ident, image.file
            ));
        }
    }
    let mut out = format!("---\ndate: {date}\n---\n\n");
    if !imports.is_empty() {
        out.push_str(&imports.join("\n"));
        out.push_str("\n\n");
    }
    out.push_str(body.trim_matches('\n'));
    out.push('\n');
    out
}

/// Write `src/notes/<date>-<32 hex>.mdx` and return the path.
pub fn save_note(
    root: &Path,
    date: &str,
    body: &str,
    images: &[PastedImage],
) -> std::io::Result<PathBuf> {
    let dir = root.join(NOTES_DIR);
    std::fs::create_dir_all(&dir)?;
    let mut slug = new_slug(date);
    let mut path = dir.join(format!("{slug}.mdx"));
    let mut tries = 0;
    while path.exists() && tries < 8 {
        tries += 1;
        slug = new_slug(date);
        path = dir.join(format!("{slug}.mdx"));
    }
    std::fs::write(&path, build_mdx(date, body, images))?;
    Ok(path)
}

/// Extensions we are willing to store as an attachment, decided by the
/// clipboard payload rather than by the user.
pub fn safe_ext(ext: &str) -> Result<String, String> {
    let e = ext.trim().trim_start_matches('.').to_ascii_lowercase();
    const OK: [&str; 8] = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff"];
    if OK.contains(&e.as_str()) {
        Ok(e)
    } else {
        Err(format!("unsupported image type: {e}"))
    }
}

pub fn mime_for(ext: &str) -> &'static str {
    match ext {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "tif" | "tiff" => "image/tiff",
        _ => "application/octet-stream",
    }
}

/// Write an attachment under an exact file name, creating the directory.
pub fn write_attachment(root: &Path, name: &str, bytes: &[u8]) -> std::io::Result<()> {
    let dir = root.join(ATTACHMENTS_DIR);
    std::fs::create_dir_all(&dir)?;
    std::fs::write(dir.join(name), bytes)
}

/// Copy the pending files referenced by `body` into `src/attachments`.
///
/// Images already present in the repo are left alone, so retrying a save after
/// a failure does not duplicate work. Returns how many files were copied.
pub fn commit_attachments(
    root: &Path,
    pending_dir: &Path,
    body: &str,
    images: &[PastedImage],
) -> Result<usize, String> {
    let mut committed = 0;
    for image in images {
        if !body.contains(&format!("src={{{}}}", image.ident)) {
            continue;
        }
        if image.file.is_empty()
            || image.file.contains('/')
            || image.file.contains('\\')
            || image.file.contains("..")
        {
            return Err(format!("bad attachment name: {}", image.file));
        }
        if root.join(ATTACHMENTS_DIR).join(&image.file).exists() {
            continue;
        }

        let pending = pending_dir.join(&image.file);
        let bytes = std::fs::read(&pending)
            .map_err(|e| format!("attachment {} is missing: {e}", image.file))?;
        write_attachment(root, &image.file, &bytes).map_err(|e| e.to_string())?;
        committed += 1;
    }
    Ok(committed)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = "hello\n<Image src={img_1} alt=\"\" width={560} height={350} />\nbye";

    #[test]
    fn today_is_iso_and_ist() {
        let date = today_ist();
        assert_eq!(date.len(), 10);
        assert_eq!(&date[4..5], "-");
        let y: u32 = date[0..4].parse().unwrap();
        assert!((2020..2100).contains(&y));
    }

    #[test]
    fn slug_matches_the_powershell_one() {
        let date = "2026-10-26";
        let slug = new_slug(date);
        assert_eq!(&slug[..8], "20261026");
        assert_eq!(slug.len(), 8 + 1 + 32);
        assert!(slug[9..].chars().all(|c| c.is_ascii_hexdigit()));
        assert_eq!(slug.matches('-').count(), 1);
    }

    #[test]
    fn parses_tags_and_ranges() {
        let tags = find_image_tags(SAMPLE);
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].ident, "img_1");
    }

    #[test]
    fn made_tag_round_trips() {
        let text = make_image_tag("img_7", 480, 300);
        let tags = find_image_tags(&text);
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].ident, "img_7");
    }

    #[test]
    fn height_keeps_the_aspect_ratio() {
        assert_eq!(scaled_height(1000, 500, 600), 300);
        assert_eq!(scaled_height(1000, 500, 601), 301); // rounds half up
        assert_eq!(scaled_height(300, 900, 100), 300);
        assert_eq!(scaled_height(0, 0, 120), 120);
    }

    #[test]
    fn ignores_broken_and_foreign_tags() {
        assert!(find_image_tags("<Image src={img_1} width={10} />").is_empty());
        assert!(find_image_tags("<img src='x.png' />").is_empty());
        assert!(find_image_tags("no tags here").is_empty());
    }

    #[test]
    fn next_ident_never_collides() {
        let images = vec![PastedImage {
            ident: "img_3".into(),
            file: "a.png".into(),
            nat_w: 10,
            nat_h: 10,
        }];
        assert_eq!(next_ident("", &images), "img_4");
        assert_eq!(
            next_ident(&make_image_tag("img_9", 1, 1), &images),
            "img_10"
        );
        assert_eq!(next_ident("", &[]), "img_1");
    }

    #[test]
    fn mdx_carries_frontmatter_and_only_used_imports() {
        let images = vec![
            PastedImage { ident: "img_1".into(), file: "a.png".into(), nat_w: 1, nat_h: 1 },
            PastedImage { ident: "img_2".into(), file: "b.png".into(), nat_w: 1, nat_h: 1 },
        ];
        let body = make_image_tag("img_1", 560, 350);
        let mdx = build_mdx("2026-10-26", &body, &images);
        assert!(mdx.starts_with("---\ndate: 2026-10-26\n---\n\n"));
        assert!(mdx.contains("import { Image } from 'astro:assets';"));
        assert!(mdx.contains("import img_1 from '../attachments/a.png';"));
        assert!(!mdx.contains("img_2"));
        assert!(mdx.trim_end().ends_with(&body));
    }

    #[test]
    fn a_text_only_note_has_no_import_block() {
        let mdx = build_mdx("2026-10-26", "just words", &[]);
        assert_eq!(mdx, "---\ndate: 2026-10-26\n---\n\njust words\n");
    }

    #[test]
    fn only_known_image_extensions_are_stored() {
        assert_eq!(safe_ext("PNG").as_deref(), Ok("png"));
        assert_eq!(safe_ext(".jpeg").as_deref(), Ok("jpeg"));
        assert!(safe_ext("exe").is_err());
        assert!(safe_ext("").is_err());
    }

    /// The whole point of the widget: a real file, on disk, in the right place
    /// with frontmatter and only the imports the body uses.
    #[test]
    fn writes_a_real_mdx_file_into_the_repo_layout() {
        let root = std::env::temp_dir().join(format!("note-widget-test-{}", std::process::id()));
        let images = vec![PastedImage {
            ident: "img_1".into(),
            file: "pic.png".into(),
            nat_w: 800,
            nat_h: 400,
        }];
        let body = make_image_tag("img_1", 400, 200);

        let path = save_note(&root, "2026-10-26", &body, &images).expect("note written");
        let written = std::fs::read_to_string(&path).expect("readable");

        assert_eq!(path.extension().unwrap(), "mdx");
        assert!(path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with("20261026-"));
        assert!(path.starts_with(root.join(NOTES_DIR)));
        assert!(written.starts_with("---\ndate: 2026-10-26\n---\n\n"));
        assert!(written.contains("import { Image } from 'astro:assets';"));
        assert!(written.contains("import img_1 from '../attachments/pic.png';"));
        assert!(written.trim_end().ends_with(&body));

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn attachments_land_under_src_attachments_with_random_names() {
        let root = std::env::temp_dir().join(format!("note-widget-att-{}", std::process::id()));
        let name = new_attachment_name("png");
        write_attachment(&root, &name, b"\x89PNG fake").expect("written");
        assert_eq!(name.len(), 36); // 32 hex + ".png"
        assert!(name.ends_with(".png"));
        assert!(root.join(ATTACHMENTS_DIR).join(&name).exists());
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn pending_images_are_committed_only_when_the_body_uses_them() {
        let root = std::env::temp_dir().join(format!("note-widget-commit-{}", std::process::id()));
        let pending =
            std::env::temp_dir().join(format!("note-widget-commit-pending-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let _ = std::fs::remove_dir_all(&pending);
        std::fs::create_dir_all(&pending).unwrap();

        let images = vec![
            PastedImage { ident: "img_1".into(), file: "one.png".into(), nat_w: 10, nat_h: 10 },
            PastedImage { ident: "img_2".into(), file: "two.png".into(), nat_w: 10, nat_h: 10 },
        ];
        std::fs::write(pending.join("one.png"), b"one").unwrap();
        std::fs::write(pending.join("two.png"), b"two").unwrap();

        let body = make_image_tag("img_1", 100, 100);
        assert_eq!(commit_attachments(&root, &pending, &body, &images).unwrap(), 1);
        assert_eq!(
            std::fs::read(root.join(ATTACHMENTS_DIR).join("one.png")).unwrap(),
            b"one"
        );
        assert!(!root.join(ATTACHMENTS_DIR).join("two.png").exists());

        let _ = std::fs::remove_dir_all(&root);
        let _ = std::fs::remove_dir_all(&pending);
    }

    #[test]
    fn a_missing_pending_image_stops_the_save() {
        let root = std::env::temp_dir().join(format!("note-widget-missing-{}", std::process::id()));
        let pending = std::env::temp_dir()
            .join(format!("note-widget-missing-pending-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let _ = std::fs::remove_dir_all(&pending);
        std::fs::create_dir_all(&pending).unwrap();

        let images = vec![PastedImage {
            ident: "img_1".into(),
            file: "gone.png".into(),
            nat_w: 10,
            nat_h: 10,
        }];
        let body = make_image_tag("img_1", 100, 100);
        let err = commit_attachments(&root, &pending, &body, &images).unwrap_err();
        assert!(err.contains("missing"), "{err}");
        assert!(!root.join(ATTACHMENTS_DIR).join("gone.png").exists());

        let _ = std::fs::remove_dir_all(&root);
        let _ = std::fs::remove_dir_all(&pending);
    }
}
