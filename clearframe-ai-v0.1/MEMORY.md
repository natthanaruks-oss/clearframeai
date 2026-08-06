# MEMORY.md

## 2026-08-06 — Project Start

### What happened

Created ClearFrame AI MVP v0.1 as a Cloudflare Worker + Images binding application.

### Why

The fastest credible path is to use an existing AI upscaler rather than train a new model. Cloudflare Images currently exposes `upscale: "generate"` using ESRGAN and fits the user's API-token-only deployment policy.

### Decisions

- Web/PWA, not native Android
- No OAuth, login, Cloud database or image history
- No image persistence in MVP
- Cloudflare API-token-only deployment
- Conservative Natural mode is default
- Face mode is not marketed as dedicated face restoration
- Local fallback must be labeled “not AI”
- Original image remains the source of truth

### Next time

1. Deploy and capture evidence from `/api/health`.
2. Test actual AI output using a controlled image set.
3. Compare Natural/Clear/Maximum for artifacts.
4. Add dedicated model only if benchmark proves a real gap.
5. Add batch and monetization only after quality and cost are measured.
