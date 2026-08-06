import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const required = [
  "package.json",
  "wrangler.jsonc",
  "src/index.js",
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "public/service-worker.js",
  "public/manifest.webmanifest",
  "spec.md",
  "README.md"
];

for (const file of required) {
  if (!existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

for (const file of ["src/index.js", "public/app.js", "public/service-worker.js"]) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
if (packageJson.version !== "0.1.1") throw new Error("Unexpected package version");

const html = readFileSync("public/index.html", "utf8");
for (const id of ["fileInput", "enhanceButton", "compareSlider", "downloadButton", "resetButton"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing UI element: ${id}`);
}
for (const format of ["jpg", "png", "webp"]) {
  if (!html.includes(`name="format" value="${format}"`)) {
    throw new Error(`Missing output format option: ${format}`);
  }
}

const worker = readFileSync("src/index.js", "utf8");
for (const route of ["/api/health", "/api/enhance"]) {
  if (!worker.includes(route)) throw new Error(`Missing API route: ${route}`);
}
for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
  if (!worker.includes(mime)) throw new Error(`Missing output MIME: ${mime}`);
}
if (!worker.includes('version: "0.1.1"')) throw new Error("Health version was not updated");
if (!worker.includes('form.get("format")')) throw new Error("API format input is missing");

const app = readFileSync("public/app.js", "utf8");
if (!app.includes('formData.append("format", outputFormat)')) {
  throw new Error("Frontend does not send output format");
}
if (!app.includes("-clearframe.${format.extension}")) {
  throw new Error("Download extension is not dynamic");
}

console.log("Checks passed: v0.1.1 syntax, required files, JPG/PNG/WebP flow and critical UI/API hooks.");
