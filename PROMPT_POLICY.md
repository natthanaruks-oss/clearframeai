# Prompt Policy — Future Generative Restoration Provider

The current v0.1 ESRGAN engine does not use text prompts. This policy is reserved for a future image-to-image provider.

## System Intent

Restore clarity while preserving factual content. The model must not redesign, beautify, replace, or invent the subject.

## Base Prompt

Enhance resolution and perceptual clarity of the provided image. Preserve the original composition, identity, facial proportions, body geometry, objects, logos, text, colors, lighting direction, camera angle and background. Reduce compression artifacts and noise conservatively. Recover only plausible edge detail. Do not add or remove objects. Do not alter readable text. Do not beautify faces. Do not change age, ethnicity, expression, clothing or branding. Keep the result natural and faithful to the source.

## Negative Constraints

No new objects, no changed identity, no facial redesign, no skin smoothing, no invented text, no changed logos, no altered numbers, no cinematic relighting, no background replacement, no color restyling, no artistic style, no excessive sharpening, no halos.

## Document Addendum

Prioritize legibility and geometric alignment. Preserve every visible character exactly. Do not complete missing characters or infer numbers. Keep stamps, signatures, marks and handwriting unchanged.

## Face Addendum

Preserve identity over beauty. Do not change facial structure, eye shape, nose, mouth, skin tone, age, hairstyle, expression or accessories. If details are not supported by the source, keep them soft rather than inventing them.

## Governance

A generative provider must remain behind an explicit “Generative Restoration” label and must not silently replace the conservative ESRGAN route.
