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
  compareFrame: document.querySelector("#compareFrame"),
  panCanvas: document.querySelector("#panCanvas"),
  compareHint: document.querySelector("#compareHint"),
  centerViewButton: document.querySelector("#centerViewButton"),
  flickButton: document.querySelector("#flickButton"),
  zoomButtons: [...document.querySelectorAll("[data-zoom]")],
  downloadButton: document.querySelector("#downloadButton"),
  resetButton: document.querySelector("#resetButton"),
  engineLabel: document.querySelector("#engineLabel"),
  originalDimensions: document.querySelector("#originalDimensions"),
  outputDimensions: document.querySelector("#outputDimensions"),
  resultDetails: document.querySelector("#resultDetails"),
  statusBox: document.querySelector("#statusBox"),
};

const state = {
  file: null,
  originalUrl: null,
  enhancedUrl: null,
  enhancedBlob: null,
  originalWidth: 0,
  originalHeight: 0,
  outputWidth: 0,
  outputHeight: 0,
  engine: null,
  outputFormat: "jpg",
  zoomMode: "fit",
  panX: 0,
  panY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  panStartX: 0,
  panStartY: 0,
  flicking: false,
};


function zoomScale() {
  if (state.zoomMode === "200") return 2;
  if (state.zoomMode === "100") return 1;
  return 1;
}

function updateCompareTransform() {
  if (!elements.compareFrame || !elements.panCanvas) return;

  elements.compareFrame.classList.toggle("is-fit", state.zoomMode === "fit");
  elements.compareFrame.classList.toggle("is-pixel", state.zoomMode !== "fit");

  if (state.zoomMode === "fit") {
    elements.panCanvas.style.transform = "";
    elements.panCanvas.style.width = "100%";
    elements.panCanvas.style.height = "100%";
    elements.panCanvas.style.cursor = "default";
  } else {
    const scale = zoomScale();
    elements.panCanvas.style.width = `${Math.max(1, state.outputWidth || state.originalWidth)}px`;
    elements.panCanvas.style.height = `${Math.max(1, state.outputHeight || state.originalHeight)}px`;
    elements.panCanvas.style.transform =
      `translate(${state.panX}px, ${state.panY}px) scale(${scale})`;
    elements.panCanvas.style.transformOrigin = "0 0";
    elements.panCanvas.style.cursor = state.dragging ? "grabbing" : "grab";
  }

  for (const button of elements.zoomButtons || []) {
    button.classList.toggle("is-active", button.dataset.zoom === state.zoomMode);
  }

  if (elements.compareHint) {
    elements.compareHint.textContent =
      state.zoomMode === "fit"
        ? "Fit ทำให้ภาพเต็มกรอบ แต่จะซ่อนความต่างระดับ pixel — ใช้ 100% เพื่อเทียบจริง"
        : state.zoomMode === "100"
          ? "100% = 1 image pixel ต่อ 1 screen pixel · ลากภาพเพื่อดูตำแหน่งเดียวกัน"
          : "200% = ขยายตรวจ edge / halo / texture · ลากภาพเพื่อเลื่อนตำแหน่ง";
  }

  updateSlider();
}

function centerCompareView() {
  state.panX = 0;
  state.panY = 0;

  if (state.zoomMode !== "fit" && elements.compareFrame) {
    const rect = elements.compareFrame.getBoundingClientRect();
    const scale = zoomScale();
    const contentWidth = Math.max(1, state.outputWidth || state.originalWidth) * scale;
    const contentHeight = Math.max(1, state.outputHeight || state.originalHeight) * scale;
    state.panX = Math.round((rect.width - contentWidth) / 2);
    state.panY = Math.round((rect.height - contentHeight) / 2);
  }

  updateCompareTransform();
}

function setZoomMode(mode) {
  if (!["fit", "100", "200"].includes(mode)) return;
  state.zoomMode = mode;
  centerCompareView();
}

function setFlicking(active) {
  state.flicking = active;
  elements.compareFrame?.classList.toggle("is-flicking", active);
  if (elements.flickButton) {
    elements.flickButton.classList.toggle("is-active", active);
    elements.flickButton.textContent = active ? "Showing Before" : "Hold Before";
  }
}

function beginPan(event) {
  if (state.zoomMode === "fit") return;
  if (event.target === elements.compareSlider) return;

  state.dragging = true;
  state.dragStartX = event.clientX;
  state.dragStartY = event.clientY;
  state.panStartX = state.panX;
  state.panStartY = state.panY;
  elements.panCanvas?.setPointerCapture?.(event.pointerId);
  updateCompareTransform();
}

function movePan(event) {
  if (!state.dragging || state.zoomMode === "fit") return;

  state.panX = state.panStartX + (event.clientX - state.dragStartX);
  state.panY = state.panStartY + (event.clientY - state.dragStartY);
  updateCompareTransform();
}

function endPan(event) {
  if (!state.dragging) return;
  state.dragging = false;
  elements.panCanvas?.releasePointerCapture?.(event.pointerId);
  updateCompareTransform();
}

function showStatus(message, type = "info") {
  elements.statusBox.textContent = message;
  elements.statusBox.classList.remove("hidden", "warning", "error");
  if (type !== "info") elements.statusBox.classList.add(type);
}

function hideStatus() {
  elements.statusBox.classList.add("hidden");
  elements.statusBox.classList.remove("warning", "error");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
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
  elements.enhanceButton.classList.toggle("is-loading", busy);
  elements.enhanceButtonLabel.textContent = busy ? "Enhancing…" : "Enhance";
}

async function readDimensions(file) {
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

function clearEnhancedResult() {
  revokeUrl(state.enhancedUrl);
  state.enhancedUrl = null;
  state.enhancedBlob = null;
  state.outputWidth = 0;
  state.outputHeight = 0;
  state.engine = null;
  elements.downloadButton.disabled = true;

  if (state.originalUrl) {
    elements.afterImage.src = state.originalUrl;
    elements.outputDimensions.textContent = "ยังไม่ได้ประมวลผล";
    elements.engineLabel.textContent = "Ready";
    elements.resultDetails.textContent = "";
    elements.compareSlider.value = "100";
    state.panX = 0;
    state.panY = 0;
    setFlicking(false);
    updateCompareTransform();
  }
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
    state.enhancedBlob = null;
    state.originalWidth = dimensions.width;
    state.originalHeight = dimensions.height;

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
    elements.resultDetails.textContent = "";
    elements.engineLabel.textContent = "Ready";
    elements.compareSlider.value = "100";
    state.zoomMode = "fit";
    state.panX = 0;
    state.panY = 0;
    setFlicking(false);
    updateCompareTransform();

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

function resetStudio() {
  revokeUrl(state.originalUrl);
  revokeUrl(state.enhancedUrl);

  state.file = null;
  state.originalUrl = null;
  state.enhancedUrl = null;
  state.enhancedBlob = null;
  state.originalWidth = 0;
  state.originalHeight = 0;
  state.outputWidth = 0;
  state.outputHeight = 0;
  state.engine = null;
  state.zoomMode = "fit";
  state.panX = 0;
  state.panY = 0;
  state.dragging = false;
  state.flicking = false;

  elements.fileInput.value = "";
  elements.fileSummary.classList.add("hidden");
  elements.dropZone.classList.remove("hidden");
  elements.comparisonView.classList.add("hidden");
  elements.emptyPreview.classList.remove("hidden");
  hideStatus();
  setBusy(false);
}

function updateSlider() {
  const value = Number(elements.compareSlider.value);
  elements.afterLayer.style.width = `${value}%`;
  elements.compareHandle.style.left = `${value}%`;
}

async function localEnhance(file, scale) {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 4096;
  const ratio = Math.min(
    1,
    maxDimension / (Math.max(bitmap.width, bitmap.height) * scale),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale * ratio));
  const height = Math.max(1, Math.round(bitmap.height * scale * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = "none";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (output) => (output ? resolve(output) : reject(new Error("Canvas export failed"))),
      "image/png",
    );
  });

  return { blob, width, height };
}

async function enhanceImage() {
  if (!state.file) return;

  setBusy(true);
  hideStatus();

  const mode = getSelected("mode") || "general";
  const scale = Number(getSelected("scale") || 2);
  const strength = getSelected("strength") || "natural";
  const format = getSelected("format") || "jpg";

  const formData = new FormData();
  formData.append("image", state.file);
  formData.append("mode", mode);
  formData.append("scale", String(scale));
  formData.append("strength", strength);
  formData.append("format", format);

  let blob;
  let outputDimensions;
  let engine;
  let detailText = "";

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
    const outputMatch = outputHeader.match(/^(\d+)x(\d+)$/);

    if (outputMatch) {
      outputDimensions = {
        width: Number(outputMatch[1]),
        height: Number(outputMatch[2]),
      };
    } else {
      outputDimensions = await readDimensions(blob);
    }

    const aiMaster = response.headers.get("x-clearframe-ai-master");
    const aiFactor = response.headers.get("x-clearframe-ai-factor");
    const sharpen = response.headers.get("x-clearframe-sharpen");
    const qualityPolicy = response.headers.get("x-clearframe-quality-policy");

    engine = "Cloudflare ESRGAN";
    detailText = [
      aiMaster ? `AI master ${aiMaster}` : "",
      aiFactor ? `AI ${aiFactor}×` : "",
      sharpen ? `Sharpen ${sharpen}` : "",
      qualityPolicy === "lossless-png" ? "PNG lossless" : "Quality 95",
    ]
      .filter(Boolean)
      .join(" · ");
  } catch (error) {
    console.warn("AI endpoint unavailable, using local fallback", error);

    showStatus(
      "AI endpoint ยังไม่พร้อม จึงแสดง Local Preview เพื่อทดสอบ UX เท่านั้น ผลนี้ไม่ใช่ AI Enhance",
      "warning",
    );

    const local = await localEnhance(state.file, scale);
    blob = local.blob;
    outputDimensions = { width: local.width, height: local.height };
    engine = "Local Preview · ไม่ใช่ AI";
    detailText = "Browser interpolation only";
  }

  revokeUrl(state.enhancedUrl);

  state.enhancedBlob = blob;
  state.enhancedUrl = URL.createObjectURL(blob);
  state.outputWidth = outputDimensions.width;
  state.outputHeight = outputDimensions.height;
  state.engine = engine;
  state.outputFormat = format;

  elements.afterImage.src = state.enhancedUrl;
  elements.engineLabel.textContent = engine;
  elements.outputDimensions.textContent =
    `Output ${outputDimensions.width} × ${outputDimensions.height} · ${formatBytes(blob.size)}`;
  elements.resultDetails.textContent = detailText;
  elements.compareSlider.value = "50";
  state.panX = 0;
  state.panY = 0;
  setFlicking(false);
  if (state.zoomMode === "fit") {
    updateCompareTransform();
  } else {
    requestAnimationFrame(centerCompareView);
  }

  setBusy(false);
}

function downloadEnhanced() {
  if (!state.enhancedUrl) return;

  const link = document.createElement("a");
  const baseName = state.file?.name?.replace(/\.[^.]+$/, "") || "image";
  const extension = state.outputFormat === "jpg" ? "jpg" : state.outputFormat;

  link.href = state.enhancedUrl;
  link.download = `${baseName}-clearframe.${extension}`;
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
elements.resetButton?.addEventListener("click", resetStudio);
elements.compareSlider.addEventListener("input", updateSlider);

for (const button of elements.zoomButtons) {
  button.addEventListener("click", () => setZoomMode(button.dataset.zoom));
}

elements.centerViewButton?.addEventListener("click", centerCompareView);

elements.flickButton?.addEventListener("pointerdown", () => setFlicking(true));
elements.flickButton?.addEventListener("pointerup", () => setFlicking(false));
elements.flickButton?.addEventListener("pointercancel", () => setFlicking(false));
elements.flickButton?.addEventListener("pointerleave", () => setFlicking(false));

elements.panCanvas?.addEventListener("pointerdown", beginPan);
elements.panCanvas?.addEventListener("pointermove", movePan);
elements.panCanvas?.addEventListener("pointerup", endPan);
elements.panCanvas?.addEventListener("pointercancel", endPan);

window.addEventListener("resize", () => {
  if (state.zoomMode === "fit") updateCompareTransform();
});

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

for (const input of document.querySelectorAll('input[name="mode"], input[name="scale"], input[name="strength"], input[name="format"]')) {
  input.addEventListener("change", clearEnhancedResult);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js?v=0.1.5").catch(console.warn);
  });
}
