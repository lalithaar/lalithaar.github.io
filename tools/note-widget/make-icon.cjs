// One-off: writes icons/icon.ico (32x32, 32bpp, alpha) so tauri-build can
// attach a Windows resource. Not part of the app build.
const fs = require("fs");
const path = require("path");

const W = 32;
const H = 32;
const BG = [0x1b, 0x1b, 0x1f]; // widget body
const ACCENT = [0x7a, 0xa2, 0xf7];

// Logical top-down RGBA first; the ICO bitmap rows go out bottom-up.
const rgba = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const corner =
      (x < 5 && y < 5) || (x >= W - 5 && y < 5) || (x < 5 && y >= H - 5) || (x >= W - 5 && y >= H - 5);
    const onBar = y >= 6 && y < 12; // title-bar stripe
    const onText = y >= 17 && y < 20 && x >= 7 && x <= 24; // "body" line
    const onText2 = y >= 22 && y < 25 && x >= 7 && x <= 19;
    const c = onBar || onText || onText2 ? ACCENT : BG;
    rgba[i] = c[0];
    rgba[i + 1] = c[1];
    rgba[i + 2] = c[2];
    rgba[i + 3] = corner ? 0 : 255;
  }
}

const xor = Buffer.alloc(W * H * 4);
for (let row = 0; row < H; row++) {
  const src = (H - 1 - row) * W * 4; // bottom-up
  rgba.copy(xor, row * W * 4, src, src + W * 4);
}
const and = Buffer.alloc(((W + 31) >> 5) * 4 * H); // all opaque

const bmi = Buffer.alloc(40);
bmi.writeUInt32LE(40, 0);
bmi.writeInt32LE(W, 4);
bmi.writeInt32LE(H * 2, 8);
bmi.writeUInt16LE(1, 12);
bmi.writeUInt16LE(32, 14);
bmi.writeUInt32LE(0, 16);
bmi.writeUInt32LE(xor.length + and.length, 20); // DIB size including the AND mask

const image = Buffer.concat([bmi, xor, and]);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry[0] = W;
entry[1] = H;
entry.writeUInt16LE(1, 4); // planes
entry.writeUInt16LE(32, 6); // bpp
entry.writeUInt32LE(image.length, 8);
entry.writeUInt32LE(22, 12); // dwImageOffset: 6-byte header + 16-byte entry

const out = path.join(__dirname, "icons");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "icon.ico"), Buffer.concat([header, entry, image]));
console.log("wrote icons/icon.ico");
