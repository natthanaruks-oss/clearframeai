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
  jpg: { mime: "image/jpeg", extension: "jpg", quality: 95 },
  png: { mime: "image/png", extension: "png", quality: null },
  webp: { mime: "image/webp", extension: "webp", quality: 95 },
};

const STRENGTH_PRESETS = {
  natural: { sharpen: 0.0 },
  clear: { sharpen: 0.6 },
  maximum: { sharpen: 1.1 },
};

const MODES = new Set(["general", "photo", "face", "document", "auto"]);

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

function safeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function clampOutput(width, height) {
  let targetWidth = width;
  let targetHeight = height;

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

function chooseAiMaster(width, height) {
  const longest = Math.max(width, height);

  // Quality-first policy:
  // small images => full 4x AI master
  // medium images => 2x AI master
  // large images => 2x only if safe, otherwise preserve size
  let factor = 2;

  if (longest < 1200) factor = 4;
  else if (longest <= 2200) factor = 2;
  else factor = 2;

  const master = clampOutput(width * factor, height * factor);

  // If limits force the result to barely exceed source size, don't pretend it is 2x/4x.
  const effectiveFactor = Math.min(master.width / width, master.height / height);

  return {
    requestedFactor: factor,
    effectiveFactor,
    width: master.width,
    height: master.height,
  };
}

function chooseRequestedOutput(width, height, requestedScale) {
  return clampOutput(width * requestedScale, height * requestedScale);
}

function outputOptions(format) {
  const config = OUTPUT_FORMATS[format];
  const options = {
    format: config.mime,
    anim: false,
  };
  if (config.quality !== null) options.quality = config.quality;
  return options;
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

  const modeRaw = String(form.get("mode") || "general");
  const mode = MODES.has(modeRaw) ? modeRaw : "general";
  const strength = safeEnum(
    String(form.get("strength") || ""),
    Object.keys(STRENGTH_PRESETS),
    "natural",
  );
  const requestedScale = Number(form.get("scale")) === 4 ? 4 : 2;
  const outputFormat = safeEnum(
    String(form.get("format") || ""),
    Object.keys(OUTPUT_FORMATS),
    "jpg",
  );

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

  const master = chooseAiMaster(width, height);
  const requestedOutput = chooseRequestedOutput(width, height, requestedScale);

  // Never enlarge past the AI master. This avoids bicubic enlargement after ESRGAN.
  const finalOutput = {
    width: Math.min(requestedOutput.width, master.width),
    height: Math.min(requestedOutput.height, master.height),
  };

  const sharpen = STRENGTH_PRESETS[strength].sharpen;

  try {
    let pipeline = env.IMAGES
      .input(file.stream())
      .transform({
        width: master.width,
        height: master.height,
        fit: "contain",
        upscale: "generate",
        anim: false,
      });

    // If final requested output is smaller than AI master, downsample first, then sharpen.
    if (
      finalOutput.width !== master.width ||
      finalOutput.height !== master.height
    ) {
      pipeline = pipeline.transform({
        width: finalOutput.width,
        height: finalOutput.height,
        fit: "contain",
      });
    }

    // Sharpen is deliberately last and conservative.
    if (sharpen > 0) {
      pipeline = pipeline.transform({
        sharpen,
      });
    }

    const transformed = (
      await pipeline.output(outputOptions(outputFormat))
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

    const format = OUTPUT_FORMATS[outputFormat];

    return new Response(transformed.body, {
      status: 200,
      headers: {
        "content-type":
          transformed.headers.get("content-type") || format.mime,
        "cache-control": "no-store",
        "content-disposition":
          `inline; filename="clearframe-${Date.now()}.${format.extension}"`,
        "x-clearframe-engine": "cloudflare-images-esrgan",
        "x-clearframe-original": `${width}x${height}`,
        "x-clearframe-ai-master": `${master.width}x${master.height}`,
        "x-clearframe-ai-factor": master.effectiveFactor.toFixed(2),
        "x-clearframe-output": `${finalOutput.width}x${finalOutput.height}`,
        "x-clearframe-mode": mode,
        "x-clearframe-strength": strength,
        "x-clearframe-sharpen": String(sharpen),
        "x-clearframe-format": outputFormat,
        "x-clearframe-color-policy": "preserve",
        "x-clearframe-quality-policy":
          outputFormat === "png" ? "lossless-png" : "quality-95",
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
        version: "0.1.5",
        imagesBinding: Boolean(env.IMAGES),
        outputFormats: Object.keys(OUTPUT_FORMATS),
        colorPolicy: "preserve",
        qualityPolicy: "ai-master-then-downsample",
        comparisonModes: ["fit", "100%", "200%"],
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
