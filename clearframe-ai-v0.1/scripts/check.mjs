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

JSON.parse(readFileSync("package.json", "utf8"));
JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));

const html = readFileSync("public/index.html", "utf8");
for (const id of ["fileInput", "enhanceButton", "compareSlider", "downloadButton"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing UI element: ${id}`);
}

const worker = readFileSync("src/index.js", "utf8");
for (const route of ["/api/health", "/api/enhance"]) {
  if (!worker.includes(route)) throw new Error(`Missing API route: ${route}`);
}

console.log("Checks passed: syntax, required files, manifest and critical UI/API hooks.");
