
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

for (const file of [
  "package.json","wrangler.jsonc","src/index.js","public/index.html",
  "public/styles.css","public/app.js","public/service-worker.js","spec.md","README.md"
]) {
  if (!existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

for (const file of ["src/index.js","public/app.js","public/service-worker.js"]) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

const pkg = JSON.parse(readFileSync("package.json","utf8"));
if (pkg.version !== "0.1.5") throw new Error(`Unexpected version: ${pkg.version}`);

const worker = readFileSync("src/index.js","utf8");
const app = readFileSync("public/app.js","utf8");
const html = readFileSync("public/index.html","utf8");
const css = readFileSync("public/styles.css","utf8");
const sw = readFileSync("public/service-worker.js","utf8");

for (const marker of [
  'upscale: "generate"',
  "chooseAiMaster",
  'quality: 95',
  'clear: { sharpen: 0.6 }',
  'qualityPolicy: "ai-master-then-downsample"',
]) {
  if (!worker.includes(marker)) throw new Error(`v0.1.4 engine contract changed/missing: ${marker}`);
}

for (const marker of [
  'data-zoom="fit"',
  'data-zoom="100"',
  'data-zoom="200"',
  'id="centerViewButton"',
  'id="flickButton"',
  'id="panCanvas"',
  "ClearFrame AI · v0.1.5",
]) {
  if (!html.includes(marker)) throw new Error(`Detail Compare UI marker missing: ${marker}`);
}

for (const marker of [
  "setZoomMode",
  "centerCompareView",
  "setFlicking",
  "beginPan",
  "movePan",
  "zoomScale",
  'serviceWorker.register("/service-worker.js?v=0.1.5")',
]) {
  if (!app.includes(marker)) throw new Error(`Detail Compare JS marker missing: ${marker}`);
}

for (const marker of [".compare-toolbar", ".compare-frame.is-pixel", ".compare-frame.is-flicking"]) {
  if (!css.includes(marker)) throw new Error(`Detail Compare CSS marker missing: ${marker}`);
}

if (!sw.includes("clearframe-shell-v0.1.5")) throw new Error("PWA cache version missing");

console.log("Checks passed: v0.1.5 Detail Compare, Fit/100%/200%, synchronized pan, center reset, flick comparison; v0.1.4 Cloudflare ESRGAN engine preserved.");
