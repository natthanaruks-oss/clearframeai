const elements = {
  dropZone: document.querySelector("#dropZone"),
  fileInput: document.querySelector("#fileInput"),
  fileSummary: document.querySelector("#fileSummary"),
  fileName: document.querySelector("#fileName"),
  fileMeta: document.querySelector("#fileMeta"),
  changeImageButton: document.querySelector("#changeImageButton"),
  enhanceButton: document.querySelector("#enhanceButton"),
  enhanceButtonLabel: document.querySelector("#enhanceButtonLabel"),
  emptyPreview: document.querySelector("#emptyPreview"),
  comparisonView: document.querySelector("#comparisonView"),
  beforeImage: document.querySelector("#beforeImage"),
  afterImage: document.querySelector("#afterImage"),
  afterLayer: document.querySelector("#afterLayer"),
  compareHandle: document.querySelector("#compareHandle"),
  compareSlider: document.querySelector("#compareSlider"),
  downloadButton: document.querySelector("#downloadButton"),
  engineLabel: document.querySelector("#engineLabel"),
  originalDimensions: document.querySelector("#originalDimensions"),
  outputDimensions: document.querySelector("#outputDimensions"),
  statusBox: document.querySelector("#statusBox"),
};

const state = {
  file: null,
  originalUrl: null,
  enhancedUrl: null,
  originalWidth: 0,
  originalHeight: 0,
  outputWidth: 0,
  outputHeight: 0,
  engine: null,
};

function showStatus(message, type = "info") {
  elements.statusBox.textContent = message;
  elements.statusBox.classList.remove("hidden", "warning", "error");
  if (type !== "info") elements.statusBox.classList.add(type);
}

function hideStatus() {
  elements.statusBox.classList.add("hidden");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSelected(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value;
}

function revokeUrl(url) {
  if (url) URL.revokeObjectURL(url);
}

function setBusy(busy) {
  elements.enhanceButton.disabled = busy || !state.file;
  elements.downloadButton.disabled = busy || !state.enhancedUrl;
  elements.enhanceButtonLabel.textContent = busy ? "Enhancing…" : "Enhance Image";
}

async function readDimensions(file) {
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

async function selectFile(file) {
  hideStatus();

  if (!file?.type?.startsWith("image/")) {
    showStatus("กรุณาเลือกไฟล์รูปภาพที่รองรับ", "error");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showStatus("ไฟล์มีขนาดเกิน 20 MB", "error");
    return;
  }

  try {
    const dimensions = await readDimensions(file);

    revokeUrl(state.originalUrl);
    revokeUrl(state.enhancedUrl);

    state.file = file;
    state.originalUrl = URL.createObjectURL(file);
    state.enhancedUrl = null;
    state.originalWidth = dimensions.width;
    state.originalHeight = dimensions.height;
    state.outputWidth = 0;
    state.outputHeight = 0;
    state.engine = null;

    elements.fileName.textContent = file.name;
    elements.fileMeta.textContent =
      `${dimensions.width} × ${dimensions.height} px · ${formatBytes(file.size)}`;
    elements.dropZone.classList.add("hidden");
    elements.fileSummary.classList.remove("hidden");
    elements.emptyPreview.classList.add("hidden");
    elements.comparisonView.classList.remove("hidden");
    elements.beforeImage.src = state.originalUrl;
    elements.afterImage.src = state.originalUrl;
    elements.originalDimensions.textContent =
      `Original ${dimensions.width} × ${dimensions.height}`;
    elements.outputDimensions.textContent = "ยังไม่ได้ประมวลผล";
    elements.engineLabel.textContent = "พร้อมประมวลผล";
    elements.compareSlider.value = "100";
    updateSlider();
    elements.downloadButton.disabled = true;
    setBusy(false);
  } catch (error) {
    console.error(error);
    showStatus("Browser ไม่สามารถอ่านไฟล์ภาพนี้ได้ ลองใช้ JPEG, PNG หรือ WebP", "error");
  }
}

function resetFilePicker() {
  elements.fileInput.value = "";
  elements.fileInput.click();
}

function updateSlider() {
  const value = Number(elements.compareSlider.value);
  elements.afterLayer.style.width = `${value}%`;
  elements.compareHandle.style.left = `${value}%`;

  const frameWidth = elements.afterLayer.parentElement?.clientWidth || 1;
  elements.afterImage.style.width = `${frameWidth}px`;
}

async function localEnhance(file, scale, mode, strength) {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 4096;
  const ratio = Math.min(1, maxDimension / (Math.max(bitmap.width, bitmap.height) * scale));
  const width = Math.max(1, Math.round(bitmap.width * scale * ratio));
  const height = Math.max(1, Math.round(bitmap.height * scale * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const strengthMap = {
    natural: { contrast: 1.03, saturate: 1.0 },
    clear: { contrast: 1.08, saturate: 1.02 },
    maximum: { contrast: 1.14, saturate: 1.04 },
  };
  const setting = strengthMap[strength];

  if (mode === "document") {
    context.filter = `contrast(${setting.contrast + 0.18}) saturate(0.9)`;
  } else if (mode === "face") {
    context.filter = `contrast(${Math.max(1, setting.contrast - 0.02)}) saturate(1)`;
  } else {
    context.filter = `contrast(${setting.contrast}) saturate(${setting.saturate})`;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (output) => (output ? resolve(output) : reject(new Error("Canvas export failed"))),
      "image/webp",
      0.92,
    );
  });

  return { blob, width, height };
}

async function enhanceImage() {
  if (!state.file) return;

  setBusy(true);
  hideStatus();

  const mode = getSelected("mode") || "auto";
  const scale = Number(getSelected("scale") || 2);
  const strength = getSelected("strength") || "natural";

  const formData = new FormData();
  formData.append("image", state.file);
  formData.append("mode", mode);
  formData.append("scale", String(scale));
  formData.append("strength", strength);

  let blob;
  let outputDimensions;
  let engine;

  try {
    const response = await fetch("/api/enhance", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.message || `Enhancement failed (${response.status})`);
    }

    blob = await response.blob();
    const outputHeader = response.headers.get("x-clearframe-output") || "";
    const match = outputHeader.match(/^(\d+)x(\d+)$/);

    if (match) {
      outputDimensions = { width: Number(match[1]), height: Number(match[2]) };
    } else {
      outputDimensions = await readDimensions(blob);
    }

    engine = "AI · Cloudflare ESRGAN";
  } catch (error) {
    console.warn("AI endpoint unavailable, using local fallback", error);
    showStatus(
      "AI endpoint ยังไม่พร้อม จึงแสดง Local Preview ด้วย browser interpolation เพื่อทดสอบ UX ก่อน ผลนี้ยังไม่ใช่ AI Upscale",
      "warning",
    );
    const local = await localEnhance(state.file, scale, mode, strength);
    blob = local.blob;
    outputDimensions = { width: local.width, height: local.height };
    engine = "Local Preview · ไม่ใช่ AI";
  }

  revokeUrl(state.enhancedUrl);
  state.enhancedUrl = URL.createObjectURL(blob);
  state.outputWidth = outputDimensions.width;
  state.outputHeight = outputDimensions.height;
  state.engine = engine;

  elements.afterImage.src = state.enhancedUrl;
  elements.engineLabel.textContent = engine;
  elements.outputDimensions.textContent =
    `Output ${outputDimensions.width} × ${outputDimensions.height}`;
  elements.compareSlider.value = "50";
  updateSlider();

  setBusy(false);
}

function downloadEnhanced() {
  if (!state.enhancedUrl) return;
  const link = document.createElement("a");
  const baseName = state.file?.name?.replace(/\.[^.]+$/, "") || "image";
  link.href = state.enhancedUrl;
  link.download = `${baseName}-clearframe.webp`;
  link.click();
}

elements.dropZone.addEventListener("click", resetFilePicker);
elements.dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    resetFilePicker();
  }
});
elements.fileInput.addEventListener("change", () => selectFile(elements.fileInput.files?.[0]));
elements.changeImageButton.addEventListener("click", resetFilePicker);
elements.enhanceButton.addEventListener("click", enhanceImage);
elements.downloadButton.addEventListener("click", downloadEnhanced);
elements.compareSlider.addEventListener("input", updateSlider);
window.addEventListener("resize", updateSlider);

for (const eventName of ["dragenter", "dragover"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragover");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragover");
  });
}

elements.dropZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file) selectFile(file);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(console.warn);
  });
}
