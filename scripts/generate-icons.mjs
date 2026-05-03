import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function extractPngFromSvg(svgPath) {
  const svgText = readFileSync(svgPath, "utf8");
  const match = svgText.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  if (!match) throw new Error(`No embedded PNG found in ${svgPath}`);
  return Buffer.from(match[1], "base64");
}

if (!existsSync(join(ROOT, "public/icons"))) {
  mkdirSync(join(ROOT, "public/icons"), { recursive: true });
}

const whitePng = extractPngFromSvg(
  join(ROOT, "Logo/MotoYaar primary logo white background.svg")
);
const blackPng = extractPngFromSvg(
  join(ROOT, "Logo/MotoYaar primary logo black background.svg")
);

// UI logo — white background variant, 400px wide (2× retina for ~200px display)
await sharp(whitePng)
  .resize({ width: 400 })
  .png({ compressionLevel: 9 })
  .toFile(join(ROOT, "public/logo.png"));
console.log("✓ public/logo.png");

// PWA icons — black background variant (solid bg looks correct as an app icon)
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-512-maskable.png", 512],
]) {
  await sharp(blackPng)
    .resize({ width: size, height: size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(join(ROOT, `public/icons/${name}`));
  console.log(`✓ public/icons/${name}`);
}

console.log("Done.");
