import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const required = [
  "package.json",
  "wrangler.jsonc",
  "src/index.js",
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "public/inspector.js",
  "public/service-worker.js",
  "public/manifest.webmanifest",
  "spec.md",
  "README.md",
];

for (const file of required) {
  if (!existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

for (const file of [
  "src/index.js",
  "public/app.js",
  "public/inspector.js",
  "public/service-worker.js",
]) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));

if (packageJson.version !== "0.1.3") {
  throw new Error(`Unexpected package version: ${packageJson.version}`);
}

if (!manifest.name) throw new Error("PWA manifest name is missing");

const worker = readFileSync("src/index.js", "utf8");
for (const route of ["/api/health", "/api/enhance"]) {
  if (!worker.includes(route)) throw new Error(`Missing API route: ${route}`);
}

for (const format of ["jpg", "png", "webp"]) {
  if (!worker.includes(`${format}:`)) throw new Error(`Missing format: ${format}`);
}

for (const forbidden of ["contrast:", "saturation:", "brightness:", "gamma:"]) {
  if (worker.includes(forbidden)) {
    throw new Error(`Color fidelity violation in Worker: ${forbidden}`);
  }
}

if (!worker.includes('"x-clearframe-color-policy": "preserve"')) {
  throw new Error("Missing color-preservation response header");
}

const app = readFileSync("public/app.js", "utf8");
for (const hook of [
  'context.filter = "none"',
  'new CustomEvent("clearframe:enhanced"',
  'classList.toggle("is-busy", busy)',
  '"AI Upscale · Preserve color"',
]) {
  if (!app.includes(hook)) throw new Error(`Missing app hook: ${hook}`);
}

const inspector = readFileSync("public/inspector.js", "utf8");
for (const hook of [
  'document.createElement("details")',
  "Inspect pixel detail",
  "100%",
  "200%",
  "clearframe:enhanced",
]) {
  if (!inspector.includes(hook)) throw new Error(`Missing inspector hook: ${hook}`);
}

const html = readFileSync("public/index.html", "utf8");
for (const hook of [
  'class="studio"',
  'class="controls-panel"',
  'class="preview-panel"',
  '/app.js?v=0.1.3',
  '/inspector.js?v=0.1.3',
  'ClearFrame AI · v0.1.3',
]) {
  if (!html.includes(hook)) throw new Error(`Missing UI hook: ${hook}`);
}

const css = readFileSync("public/styles.css", "utf8");
for (const hook of [
  ".studio {",
  ".primary-button.is-busy .button-spinner",
  ".detail-inspector > summary",
  "@media (max-width: 580px)",
  "@media (prefers-reduced-motion: reduce)",
]) {
  if (!css.includes(hook)) throw new Error(`Missing CSS hook: ${hook}`);
}

const serviceWorker = readFileSync("public/service-worker.js", "utf8");
if (!serviceWorker.includes("clearframe-shell-v0.1.3")) {
  throw new Error("Service worker cache version is stale");
}
for (const asset of [
  "/styles.css?v=0.1.3",
  "/app.js?v=0.1.3",
  "/inspector.js?v=0.1.3",
]) {
  if (!serviceWorker.includes(asset)) throw new Error(`Missing PWA cache asset: ${asset}`);
}

console.log(
  "Checks passed: v0.1.3 clean UI, compact workflow, loading state, collapsed Pixel Detail, responsive layout, color fidelity and output formats.",
);
