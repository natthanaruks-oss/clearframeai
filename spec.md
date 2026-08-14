# ClearFrame AI — v0.1.5 Detail Compare Specification

Status: Production candidate after smoke test.

## Objective

Improve perceived and actual enlargement quality while continuing to use Cloudflare Images `upscale=generate` (ESRGAN).

## Processing rules

### AI master
- Longest source side < 1200px: request a 4x AI master.
- Otherwise: request a 2x AI master.
- Apply Cloudflare output dimension/area caps.
- Never upscale beyond the generated AI master.

### Final output
- User may request 2x or 4x.
- If the requested output is smaller than the AI master, perform a chained downsample.
- Sharpen only after the resize/downsample step.
- Natural = 0.0
- Clear = 0.6
- Maximum = 1.1

### Color fidelity
Do not automatically alter brightness, contrast or saturation.

### Encoding
- JPG quality 95
- WebP quality 95
- PNG without quality parameter
- Do not use `compression=fast`

## Acceptance criteria

- Production health reports v0.1.4 and qualityPolicy `ai-master-then-downsample`.
- Real production image responses include:
  - `x-clearframe-ai-master`
  - `x-clearframe-ai-factor`
  - `x-clearframe-output`
  - `x-clearframe-sharpen`
  - `x-clearframe-quality-policy`
- JPG, PNG and WebP outputs have correct file signatures.
- No automatic color adjustment is present in Worker code.
- Original remains source of truth.

## v0.1.5 UI acceptance criteria

- Engine logic remains the v0.1.4 Cloudflare ESRGAN quality pipeline.
- Comparison toolbar includes Fit / 100% / 200%.
- Before and After images share the same pan transform.
- 100% displays output pixels without fit-to-screen scaling.
- Hold Before temporarily hides the enhanced layer for flick comparison.
- Center resets synchronized pan.
