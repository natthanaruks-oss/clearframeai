const MAX_RENDER_DIMENSION = 20000;

const resultMeta = document.querySelector(".result-meta");

let current = null;
let zoom = 1;
let syncing = false;

const inspector = document.createElement("details");
inspector.id = "detailInspector";
inspector.className = "detail-inspector hidden";
inspector.innerHTML = `
  <summary>
    <span class="detail-summary-copy">Inspect pixel detail</span>
    <span class="detail-summary-hint">100% / 200%</span>
  </summary>
  <div class="detail-body">
    <div class="detail-toolbar">
      <div>
        <strong>Pixel Detail</strong>
        <span id="detailDescription">เปรียบเทียบที่ขนาด Pixel เดียวกัน</span>
      </div>
      <div class="detail-zoom-controls" role="group" aria-label="Detail zoom">
        <button type="button" data-detail-zoom="1" class="active">100%</button>
        <button type="button" data-detail-zoom="2">200%</button>
      </div>
    </div>
    <p class="detail-note">
      Before ถูกขยายด้วย Browser ให้มีขนาดเท่ากับ After เพื่อเทียบรายละเอียด ไม่ใช่การ Enhance เพิ่ม
    </p>
    <div class="detail-grid">
      <article class="detail-card">
        <header><strong>BEFORE</strong><span>Browser upscale</span></header>
        <div id="beforeDetailPane" class="detail-pane" tabindex="0">
          <img id="beforeDetailImage" alt="Original image detail" />
        </div>
      </article>
      <article class="detail-card">
        <header><strong>AFTER</strong><span>AI output</span></header>
        <div id="afterDetailPane" class="detail-pane" tabindex="0">
          <img id="afterDetailImage" alt="Enhanced image detail" />
        </div>
      </article>
    </div>
  </div>
`;

resultMeta?.insertAdjacentElement("afterend", inspector);

const beforePane = inspector.querySelector("#beforeDetailPane");
const afterPane = inspector.querySelector("#afterDetailPane");
const beforeImage = inspector.querySelector("#beforeDetailImage");
const afterImage = inspector.querySelector("#afterDetailImage");
const description = inspector.querySelector("#detailDescription");
const zoomButtons = [...inspector.querySelectorAll("[data-detail-zoom]")];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRelativeCenter(pane) {
  return {
    x: clamp((pane.scrollLeft + pane.clientWidth / 2) / Math.max(1, pane.scrollWidth), 0, 1),
    y: clamp((pane.scrollTop + pane.clientHeight / 2) / Math.max(1, pane.scrollHeight), 0, 1),
  };
}

function centerPane(pane, center) {
  pane.scrollLeft = Math.max(0, center.x * pane.scrollWidth - pane.clientWidth / 2);
  pane.scrollTop = Math.max(0, center.y * pane.scrollHeight - pane.clientHeight / 2);
}

function applyZoom(nextZoom, preservePosition = true) {
  if (!current) return;

  const center = preservePosition ? getRelativeCenter(afterPane) : { x: 0.5, y: 0.5 };
  zoom = nextZoom;

  const rawWidth = current.outputWidth * zoom;
  const rawHeight = current.outputHeight * zoom;
  const safetyScale = Math.min(
    1,
    MAX_RENDER_DIMENSION / Math.max(rawWidth, rawHeight),
  );
  const width = Math.max(1, Math.round(rawWidth * safetyScale));
  const height = Math.max(1, Math.round(rawHeight * safetyScale));
  const effectiveZoom = zoom * safetyScale;

  for (const image of [beforeImage, afterImage]) {
    image.style.width = `${width}px`;
    image.style.height = `${height}px`;
  }

  zoomButtons.forEach((button) => {
    const active = Number(button.dataset.detailZoom) === nextZoom;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  description.textContent = safetyScale < 1
    ? `${Math.round(effectiveZoom * 100)}% (จำกัดขนาดเพื่อความเสถียร)`
    : `${Math.round(zoom * 100)}% · ${width.toLocaleString()} × ${height.toLocaleString()} px`;

  requestAnimationFrame(() => {
    centerPane(beforePane, center);
    centerPane(afterPane, center);
  });
}

function synchronize(source, target) {
  if (syncing) return;
  syncing = true;

  const maxSourceX = Math.max(1, source.scrollWidth - source.clientWidth);
  const maxSourceY = Math.max(1, source.scrollHeight - source.clientHeight);
  const maxTargetX = Math.max(0, target.scrollWidth - target.clientWidth);
  const maxTargetY = Math.max(0, target.scrollHeight - target.clientHeight);

  target.scrollLeft = (source.scrollLeft / maxSourceX) * maxTargetX;
  target.scrollTop = (source.scrollTop / maxSourceY) * maxTargetY;

  requestAnimationFrame(() => {
    syncing = false;
  });
}

beforePane?.addEventListener("scroll", () => synchronize(beforePane, afterPane));
afterPane?.addEventListener("scroll", () => synchronize(afterPane, beforePane));

zoomButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyZoom(Number(button.dataset.detailZoom));
  });
});

inspector.addEventListener("toggle", () => {
  if (inspector.open && current) {
    requestAnimationFrame(() => applyZoom(zoom, false));
  }
});

window.addEventListener("clearframe:enhanced", (event) => {
  current = event.detail;
  beforeImage.src = current.originalUrl;
  afterImage.src = current.enhancedUrl;
  inspector.open = false;
  inspector.classList.remove("hidden");
  applyZoom(1, false);
});

window.addEventListener("clearframe:result-cleared", () => {
  current = null;
  inspector.open = false;
  beforeImage.removeAttribute("src");
  afterImage.removeAttribute("src");
  inspector.classList.add("hidden");
});

window.addEventListener("resize", () => {
  if (current && inspector.open) applyZoom(zoom);
});
