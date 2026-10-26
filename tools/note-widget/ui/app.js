//! Note widget frontend: one writing surface, an attachment strip that only
//! appears once a note actually has images, and Ctrl+S. Images arrive by paste,
//! by dragging files onto the window, or through the `img` button. Talks to the
//! Rust side only through `invoke`.

const invoke = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);

const editor = document.getElementById("editor");
const strip = document.getElementById("strip");
const statusEl = document.getElementById("status");

const MIN_W = 60;
const MAX_W = 4000;

let images = []; // { ident, file, nat_w, nat_h, dataUrl }
let selected = null;
const nodes = new Map(); // ident -> { fig, img, label }

const CHUNK = /<Image\b[^>]*\/\s*>/g;

/** Every `<Image … />` in the draft, with the numbers we can resize. */
function parseTags() {
  const value = editor.value;
  const re = new RegExp(CHUNK.source, "g");
  const out = [];
  let m;
  while ((m = re.exec(value))) {
    const src = m[0].match(/src=\{([\w$]+)\}/);
    const w = m[0].match(/width=\{(\d+)\}/);
    if (!src || !w) continue;
    const h = m[0].match(/height=\{(\d+)\}/);
    out.push({ ident: src[1], w: +w[1], h: h ? +h[1] : null, start: m.index, len: m[0].length });
  }
  return out;
}

function imageFor(ident) {
  return images.find((i) => i.ident === ident) || null;
}

/** Images that are actually referenced by an `<Image />` tag in the draft. */
function attachedCount() {
  return parseTags().filter((tag) => imageFor(tag.ident)).length;
}

function defaultStatus() {
  const count = attachedCount();
  if (!count) return "Ctrl+S saves · paste or drop images to attach";
  return `image${count > 1 ? "s" : ""} ${count} · drag an edge to resize · Ctrl+S saves`;
}

let statusTimer = 0;
function setStatus(msg, ms = 0) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("flash", ms > 0);
  clearTimeout(statusTimer);
  if (ms) statusTimer = setTimeout(() => setStatus(defaultStatus()), ms);
}

// ------------------------------------------------------------------ strip ---

function renderStrip() {
  const tags = parseTags();
  const items = [];
  for (const tag of tags) {
    const image = imageFor(tag.ident);
    if (!image || !image.nat_w || !image.nat_h) continue;
    const h = tag.h || Math.round((tag.w * image.nat_h) / image.nat_w);
    items.push({ ...tag, image, h });
  }

  strip.classList.toggle("has-images", items.length > 0);

  for (const [ident, node] of [...nodes]) {
    if (!items.some((i) => i.ident === ident)) {
      node.fig.remove();
      nodes.delete(ident);
    }
  }

  if (!items.length) return;

  // One shared scale so every thumbnail fits the strip's height; widths differ.
  const innerH = Math.max(1, strip.clientHeight - 16);
  const neededH = items.reduce((max, i) => Math.max(max, i.h), 1);
  const fit = Math.min(1, innerH / neededH);

  for (const item of items) {
    let node = nodes.get(item.ident);
    if (!node) node = createThumb(item.image);
    const w = Math.max(8, Math.round(item.w * fit));
    node.fig.style.width = `${w}px`;
    node.img.style.width = `${w}px`;
    node.label.textContent = `${item.w} px`;
    node.fig.classList.toggle("selected", selected === item.ident);
    strip.appendChild(node.fig); // also re-orders existing nodes
  }
}

function createThumb(meta) {
  const fig = document.createElement("figure");
  fig.className = "thumb";
  const img = document.createElement("img");
  img.alt = "";
  img.src = meta.dataUrl || "";
  const left = document.createElement("div");
  left.className = "handle left";
  const right = document.createElement("div");
  right.className = "handle right";
  const label = document.createElement("figcaption");
  label.className = "label";
  fig.append(img, left, right, label);
  strip.appendChild(fig);

  const node = { fig, img, label };
  nodes.set(meta.ident, node);

  const select = (e) => {
    e.stopPropagation();
    selected = meta.ident;
    renderStrip();
  };
  fig.addEventListener("pointerdown", select);
  attachDrag(left, meta.ident, true);
  attachDrag(right, meta.ident, false);
  return node;
}

function attachDrag(handle, ident, isLeft) {
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    selected = ident;
    renderStrip();

    const image = imageFor(ident);
    const tag = parseTags().find((t) => t.ident === ident);
    const node = nodes.get(ident);
    if (!image || !tag || !node) return;

    // Screen pixels per tag pixel: stays constant because `fit` only depends
    // on the strip height, never on this image's width.
    const ratio = node.img.getBoundingClientRect().width / tag.w || 1;
    const startX = e.clientX;
    const startW = tag.w;
    const heightFor = (w) => Math.max(1, Math.round((w * image.nat_h) / image.nat_w));

    handle.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dx = (ev.clientX - startX) / ratio;
      const next = Math.round(isLeft ? startW - dx : startW + dx);
      const clamped = Math.min(MAX_W, Math.max(MIN_W, next));
      if (clamped !== parseTags().find((t) => t.ident === ident)?.w) {
        setTagSize(ident, clamped, heightFor(clamped));
      }
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      saveDraft();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
}

/** Rewrite `width={…}`/`height={…}` for one tag, keeping the caret put. */
function setTagSize(ident, w, h) {
  const value = editor.value;
  const re = new RegExp(CHUNK.source);
  let m;
  let tag = null;
  while ((m = re.exec(value))) {
    if (m[0].includes(`src={${ident}}`)) {
      tag = { start: m.index, text: m[0] };
      break;
    }
  }
  if (!tag) return;

  const next = tag.text
    .replace(/width=\{\d+\}/, `width={${w}}`)
    .replace(/height=\{\d+\}/, `height={${h}}`);
  const delta = next.length - tag.text.length;
  const selStart = editor.selectionStart;
  const selEnd = editor.selectionEnd;

  editor.value =
    value.slice(0, tag.start) + next + value.slice(tag.start + tag.text.length);
  editor.setSelectionRange(
    selStart > tag.start ? selStart + delta : selStart,
    selEnd > tag.start ? selEnd + delta : selEnd,
  );
  renderStrip();
}

// -------------------------------------------------------------- attachments ---

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i;
const filesInput = document.getElementById("files");

/** Clipboard payloads sometimes arrive with an empty MIME type. */
function isImageFile(file) {
  return Boolean(
    file && ((file.type || "").startsWith("image/") || IMAGE_EXT.test(file.name || "")),
  );
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function measure(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function insertAtCaret(text) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.setRangeText(text, start, end, "end");
  editor.focus();
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

/** One `<Image />` per line, with breathing room around the block. */
function insertImageTags(tags) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const before = editor.value.slice(0, start);
  const after = editor.value.slice(end);
  const lead = before && !before.endsWith("\n") ? "\n" : "";
  const trail = after && !after.startsWith("\n") ? "\n" : "";
  insertAtCaret(lead + tags.join("\n") + trail);
}

async function uploadImage(file) {
  const dot = file.name.lastIndexOf(".");
  const fromName = dot > -1 ? file.name.slice(dot + 1) : "";
  const guessed = (fromName || file.type.split("/")[1] || "png").toLowerCase();
  const b64 = await toBase64(file);
  const dataUrl = `data:${file.type || "image/png"};base64,${b64}`;
  const size = await measure(dataUrl);
  if (!size || !size.w || !size.h) throw new Error("could not read that image");

  const pasted = await invoke("paste_image", {
    b64,
    ext: guessed,
    w: size.w,
    h: size.h,
  });
  return { ...pasted, nat_w: size.w, nat_h: size.h, dataUrl };
}

/** Attach every image in `fileList` and insert one tag per image. */
async function addFiles(fileList) {
  const files = Array.from(fileList || []).filter(isImageFile);
  if (!files.length) {
    setStatus("no images there — paste, drop or pick image files", 4000);
    return;
  }

  setStatus(`copying ${files.length} image${files.length > 1 ? "s" : ""}…`);
  const tags = [];
  let failed = 0;
  for (const file of files) {
    try {
      const meta = await uploadImage(file);
      images.push(meta);
      selected = meta.ident;
      tags.push(meta.tag);
    } catch (err) {
      failed += 1;
      console.error(err);
    }
  }

  if (tags.length) {
    insertImageTags(tags);
    saveDraft();
    renderStrip();
  }

  const added = tags.length;
  if (!failed) {
    setStatus(`added ${added} image${added > 1 ? "s" : ""} · Ctrl+S saves`, 4000);
  } else if (added) {
    setStatus(`added ${added}, skipped ${failed} unreadable or unsupported`, 6000);
  } else {
    setStatus(`could not attach ${failed} image${failed > 1 ? "s" : ""}`, 6000);
  }
}

editor.addEventListener("paste", (e) => {
  const dt = e.clipboardData;
  if (!dt) return;

  // Paste means "the image I just copied" — exactly one. Dragging files in or
  // using the img button is the way to add several at once.
  let file = null;
  for (const item of dt.items || []) {
    if (item.kind !== "file") continue;
    const candidate = item.getAsFile();
    if (isImageFile(candidate)) {
      file = candidate;
      break;
    }
  }
  if (!file) {
    for (const candidate of dt.files || []) {
      if (isImageFile(candidate)) {
        file = candidate;
        break;
      }
    }
  }

  const text = dt.getData("text/plain");
  if (file) {
    // A copied image sometimes drags a URL along as text — the picture wins.
    e.preventDefault();
    addFiles([file]);
  } else if (text) {
    setTimeout(saveDraft, 0); // the browser inserts it; we just persist
  }
});

function dragHasFiles(e) {
  return Boolean(e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files"));
}

function clearDropMark() {
  if (!editor.classList.contains("dropping")) return;
  editor.classList.remove("dropping");
  setStatus(defaultStatus());
}

document.addEventListener("dragenter", (e) => {
  if (!dragHasFiles(e)) return;
  e.preventDefault();
  editor.classList.add("dropping");
  setStatus("drop to attach the images");
});

document.addEventListener("dragover", (e) => {
  if (!dragHasFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
  editor.classList.add("dropping");
});

document.addEventListener("dragleave", (e) => {
  // relatedTarget is null only when the pointer leaves the whole window.
  if (e.relatedTarget === null) clearDropMark();
});

document.addEventListener("drop", (e) => {
  if (!dragHasFiles(e)) return;
  e.preventDefault();
  clearDropMark();
  const files = Array.from(e.dataTransfer.files || []);
  if (files.length) {
    editor.focus();
    addFiles(files);
  }
});

window.addEventListener("blur", clearDropMark);

filesInput.addEventListener("change", () => {
  const files = Array.from(filesInput.files || []);
  filesInput.value = ""; // so picking the same file again still fires
  if (files.length) addFiles(files);
});
document.getElementById("attach").addEventListener("click", () => filesInput.click());

// ------------------------------------------------------------------- save ---

let draftTimer = 0;
function saveDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    invoke("set_draft", { draft: editor.value }).catch(() => {});
  }, 400);
}

async function saveNote() {
  const body = editor.value;
  if (!body.trim()) {
    setStatus("nothing to save", 3000);
    return;
  }
  try {
    const slug = await invoke("save_note", { body });
    editor.value = "";
    images = [];
    selected = null;
    for (const [, node] of nodes) node.fig.remove();
    nodes.clear();
    renderStrip();
    setStatus(`saved src/notes/${slug}.mdx`, 6000);
  } catch (err) {
    setStatus(String(err), 6000);
  }
}

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.key === "Enter")) {
    e.preventDefault();
    saveNote();
  }
});

document.getElementById("save").addEventListener("click", saveNote);
document.getElementById("close").addEventListener("click", () => invoke("quit"));
editor.addEventListener("input", () => {
  saveDraft();
  renderStrip();
});
strip.addEventListener("pointerdown", (e) => {
  if (e.target === strip) {
    selected = null;
    renderStrip();
  }
});

// ------------------------------------------------------------------- init ---

async function init() {
  const snap = await invoke("load_state");
  editor.value = snap.draft || "";
  images = [];
  for (const image of snap.images || []) {
    let dataUrl = "";
    try {
      dataUrl = await invoke("read_attachment", { file: image.file });
    } catch {
      /* attachment deleted by hand — the thumbnail is simply blank */
    }
    images.push({ ...image, dataUrl });
  }
  renderStrip();
  setStatus(defaultStatus());
}

init().catch((err) => setStatus(String(err), 60000));
