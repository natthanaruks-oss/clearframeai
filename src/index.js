const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_AREA = 40_000_000;
const MAX_OUTPUT_DIMENSION = 12_000;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

const OUTPUT_FORMATS = {
  jpg: { mime: "image/jpeg", extension: "jpg", supportsQuality: true },
  png: { mime: "image/png", extension: "png", supportsQuality: false },
  webp: { mime: "image/webp", extension: "webp", supportsQuality: true },
};

const STRENGTH_PRESETS = {
  natural: { sharpen: 0.8, contrast: 1.02, saturation: 1.0, quality: 88 },
  clear: { sharpen: 1.5, contrast: 1.06, saturation: 1.0, quality: 91 },
  maximum: { sharpen: 2.3, contrast: 1.1, saturation: 1.02, quality: 94 },
};

const MODE_ADJUSTMENTS = {
  auto: { sharpen: 0, contrast: 0, saturation: 0 },
  photo: { sharpen: 0.1, contrast: 0, saturation: 0.02 },
  face: { sharpen: -0.2, contrast: -0.01, saturation: 0 },
  document: { sharpen: 0.8, contrast: 0.12, saturation: -0.08 },
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function calculateTargetSize(width, height, scale) {
  let targetWidth = width * scale;
  let targetHeight = height * scale;

  const dimensionRatio = Math.min(
    1,
    MAX_OUTPUT_DIMENSION / targetWidth,
    MAX_OUTPUT_DIMENSION / targetHeight,
  );

  targetWidth *= dimensionRatio;
  targetHeight *= dimensionRatio;

  const area = targetWidth * targetHeight;
  if (area > MAX_OUTPUT_AREA) {
    const areaRatio = Math.sqrt(MAX_OUTPUT_AREA / area);
    targetWidth *= areaRatio;
    targetHeight *= areaRatio;
  }

  return {
    width: Math.max(1, Math.round(targetWidth)),
    height: Math.max(1, Math.round(targetHeight)),
  };
}

function buildTransform(mode, strength, width, height, scale, outputFormat) {
  const base = STRENGTH_PRESETS[strength];
  const modeAdjustment = MODE_ADJUSTMENTS[mode];
  const target = calculateTargetSize(width, height, scale);
  const preserveAlpha = outputFormat === "png" || outputFormat === "webp";

  return {
    target,
    options: {
      width: target.width,
      height: target.height,
      fit: "contain",
      upscale: "generate",
      sharpen: clamp(base.sharpen + modeAdjustment.sharpen, 0, 10),
      contrast: clamp(base.contrast + modeAdjustment.contrast, 0.5, 2),
      saturation: clamp(base.saturation + modeAdjustment.saturation, 0, 2),
      background: preserveAlpha ? "rgba(0,0,0,0)" : "white",
      anim: false,
    },
    quality: base.quality,
  };
}

async function enhance(request, env) {
  if (!env.IMAGES) {
    return json(
      {
        error: "IMAGES_BINDING_MISSING",
        message: "Cloudflare Images binding is not available in this environment.",
      },
      503,
    );
  }

  const form = await request.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return json({ error: "IMAGE_REQUIRED", message: "Please upload an image." }, 400);
  }

  if (file.size <= 0 || file.size > MAX_INPUT_BYTES) {
    return json(
      {
        error: "INVALID_FILE_SIZE",
        message: "Image must be larger than 0 bytes and no more than 20 MB.",
      },
      413,
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json(
      {
        error: "UNSUPPORTED_FORMAT",
        message: "Supported inputs: JPEG, PNG, WebP, GIF and HEIC.",
      },
      415,
    );
  }

  const mode = safeEnum(String(form.get("mode") || ""), Object.keys(MODE_ADJUSTMENTS), "auto");
  const strength = safeEnum(
    String(form.get("strength") || ""),
    Object.keys(STRENGTH_PRESETS),
    "natural",
  );
  const outputFormat = safeEnum(
    String(form.get("format") || ""),
    Object.keys(OUTPUT_FORMATS),
    "jpg",
  );
  const scale = Number(form.get("scale")) === 4 ? 4 : 2;
  const format = OUTPUT_FORMATS[outputFormat];

  let info;
  try {
    info = await env.IMAGES.info(file.stream());
  } catch (error) {
    console.error("Image info error", error);
    return json(
      {
        error: "INVALID_IMAGE",
        message: "The uploaded file could not be decoded as a valid image.",
      },
      400,
    );
  }

  const width = Number(info.width || 0);
  const height = Number(info.height || 0);

  if (!width || !height) {
    return json(
      {
        error: "DIMENSIONS_UNAVAILABLE",
        message: "Could not read the image dimensions.",
      },
      400,
    );
  }

  const plan = buildTransform(mode, strength, width, height, scale, outputFormat);
  const outputOptions = {
    format: format.mime,
    anim: false,
  };

  if (format.supportsQuality) {
    outputOptions.quality = plan.quality;
  }

  try {
    const transformed = (
      await env.IMAGES.input(file.stream())
        .transform(plan.options)
        .output(outputOptions)
    ).response();

    if (!transformed.ok) {
      const detail = await transformed.text().catch(() => "");
      console.error("Images transformation failed", transformed.status, detail);
      return json(
        {
          error: "ENHANCEMENT_FAILED",
          message: "Cloudflare Images could not enhance this image.",
          status: transformed.status,
        },
        502,
      );
    }

    return new Response(transformed.body, {
      status: 200,
      headers: {
        "content-type": transformed.headers.get("content-type") || format.mime,
        "cache-control": "no-store",
        "content-disposition": `inline; filename="clearframe-${Date.now()}.${format.extension}"`,
        "x-clearframe-engine": "cloudflare-images-esrgan",
        "x-clearframe-original": `${width}x${height}`,
        "x-clearframe-output": `${plan.target.width}x${plan.target.height}`,
        "x-clearframe-mode": mode,
        "x-clearframe-strength": strength,
        "x-clearframe-format": outputFormat,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Enhancement exception", error);
    return json(
      {
        error: "ENHANCEMENT_EXCEPTION",
        message: "Unexpected error while enhancing the image.",
      },
      500,
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        ok: true,
        app: "ClearFrame AI",
        version: "0.1.1",
        imagesBinding: Boolean(env.IMAGES),
        outputFormats: Object.keys(OUTPUT_FORMATS),
      });
    }

    if (request.method === "POST" && url.pathname === "/api/enhance") {
      return enhance(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "NOT_FOUND", message: "API route not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
