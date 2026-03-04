import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// Eat Sheet icon: plate with fork & knife on orange/dark theme
// Theme: orange #f97316, dark #1c1917
const createIconSvg = (size) => {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const plateR = s * 0.38;
  const innerR = s * 0.30;
  const rimR = s * 0.34;

  // Fork and knife positioned on either side of plate
  const forkX = cx - s * 0.14;
  const knifeX = cx + s * 0.14;
  const utensilTop = cy - s * 0.22;
  const utensilBottom = cy + s * 0.22;
  const tineLen = s * 0.10;
  const tineGap = s * 0.025;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <!-- Background -->
  <rect width="${s}" height="${s}" rx="${s * 0.18}" fill="#1c1917"/>

  <!-- Plate outer ring -->
  <circle cx="${cx}" cy="${cy}" r="${plateR}" fill="#f9731622" stroke="#f97316" stroke-width="${s * 0.015}"/>
  <circle cx="${cx}" cy="${cy}" r="${rimR}" fill="none" stroke="#f9731644" stroke-width="${s * 0.005}"/>
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="#f9731633" stroke-width="${s * 0.003}"/>

  <!-- Fork (left side) -->
  <g stroke="#f97316" stroke-width="${s * 0.018}" stroke-linecap="round" fill="none">
    <!-- Fork handle -->
    <line x1="${forkX}" y1="${cy + s * 0.02}" x2="${forkX}" y2="${utensilBottom}"/>
    <!-- Fork head / tines -->
    <line x1="${forkX - tineGap}" y1="${utensilTop}" x2="${forkX - tineGap}" y2="${utensilTop + tineLen}"/>
    <line x1="${forkX}" y1="${utensilTop}" x2="${forkX}" y2="${utensilTop + tineLen}"/>
    <line x1="${forkX + tineGap}" y1="${utensilTop}" x2="${forkX + tineGap}" y2="${utensilTop + tineLen}"/>
    <!-- Fork bridge -->
    <path d="M${forkX - tineGap} ${utensilTop + tineLen} Q${forkX} ${utensilTop + tineLen + s * 0.02} ${forkX + tineGap} ${utensilTop + tineLen}" />
  </g>

  <!-- Knife (right side) -->
  <g stroke="#f97316" stroke-width="${s * 0.018}" stroke-linecap="round" fill="none">
    <!-- Knife handle -->
    <line x1="${knifeX}" y1="${cy + s * 0.02}" x2="${knifeX}" y2="${utensilBottom}"/>
    <!-- Knife blade -->
    <path d="M${knifeX} ${utensilTop} L${knifeX} ${utensilTop + tineLen + s * 0.02} Q${knifeX + s * 0.04} ${utensilTop + tineLen * 0.5} ${knifeX} ${utensilTop}" fill="#f9731644"/>
  </g>

  <!-- "ES" text at bottom -->
  <text x="${cx}" y="${cy + s * 0.38}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="${s * 0.09}" fill="#f97316" letter-spacing="${s * 0.015}">EAT SHEET</text>
</svg>`;
};

const sizes = [
  { name: "icon-192.png", size: 192, dir: "icons" },
  { name: "icon-512.png", size: 512, dir: "icons" },
  { name: "apple-touch-icon.png", size: 180, dir: "" },
];

async function generate() {
  await mkdir(join(publicDir, "icons"), { recursive: true });

  for (const { name, size, dir } of sizes) {
    const svg = createIconSvg(size);
    const outPath = join(publicDir, dir, name);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outPath);

    console.log(`✓ ${outPath} (${size}x${size})`);
  }

  // Also update favicon.svg with the same design (scalable version)
  const faviconSvg = createIconSvg(100);
  await writeFile(join(publicDir, "favicon.svg"), faviconSvg);
  console.log(`✓ ${join(publicDir, "favicon.svg")} (SVG)`);

  console.log("\nAll icons generated!");
}

generate().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
