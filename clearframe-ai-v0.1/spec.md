# ClearFrame AI — Product & Technical Specification

**Version:** 0.1  
**Status:** Build-ready MVP  
**Product stance:** Truth-conscious image enhancement, not forensic reconstruction

## 1. Problem

ผู้ใช้มีภาพ Resolution ต่ำ ภาพแตก หรือรายละเอียดไม่ชัด และต้องการผลลัพธ์ที่ดูดีขึ้นโดยไม่ต้องใช้โปรแกรมแต่งภาพซับซ้อน

ข้อจำกัดสำคัญคือ AI ไม่สามารถกู้ “ข้อเท็จจริงที่หายไป” ได้ทั้งหมด และอาจคาดเดารายละเอียดขึ้นมา จึงต้องควบคุมการสื่อสารและไม่อ้างว่าภาพ Enhanced คือหลักฐานต้นฉบับ

## 2. MVP Objective

ให้ผู้ใช้ทำงานต่อไปนี้ได้ใน flow เดียว:

`Upload → Select preset → Enhance → Compare → Download`

## 3. Target Users — Initial Hypotheses

1. ผู้ใช้ทั่วไปที่มีภาพเก่า ภาพจาก LINE หรือภาพ Resolution ต่ำ
2. ทีม Sales / Marketing ที่ได้รับภาพหน้างานคุณภาพไม่สม่ำเสมอ
3. SME / e-commerce ที่ต้องปรับภาพสินค้าอย่างรวดเร็ว
4. ทีมเอกสารที่ต้องการให้ภาพเอกสารอ่านง่ายขึ้น แต่ไม่ใช้แทน OCR/ต้นฉบับ

## 4. Scope

### In scope

- Single image
- 2x / 4x AI upscale
- Natural / Clear / Maximum
- Auto / Photo / Face / Document preset
- Browser preview
- WebP download
- No persistence
- Mobile responsive PWA
- API-token-only deployment

### Out of scope

- User account / OAuth
- Cloud database
- Payment
- Image history
- True motion deblur
- Dedicated face restoration
- OCR
- Batch processing
- Native mobile app
- Forensic or legal evidence reconstruction

## 5. Functional Requirements

### FR-01 Upload

- Accept JPEG, PNG, WebP, GIF and HEIC where supported by the runtime
- Reject zero-byte and files over 20 MB
- Display filename, size and dimensions

### FR-02 Enhancement

- Send image bytes as multipart form data
- Apply Cloudflare Images AI upscaling
- Apply conservative preset adjustments
- Cap output at safe dimension and area limits
- Return WebP result without storage

### FR-03 Comparison

- Show Before / After using an accessible range slider
- Show original and output dimensions
- Identify engine as AI or Local Preview

### FR-04 Download

- Download result with a non-destructive filename
- Do not overwrite the original

### FR-05 Failure Handling

- Clearly label local fallback as “not AI”
- Show actionable Thai error messages
- Never claim enhancement succeeded when the server returned an error

## 6. Non-Functional Requirements

- Privacy: No image persistence or analytics payload containing image bytes
- Security: File validation, no secrets in browser, `nosniff`, no-store response
- Traceability: Response headers identify engine, preset and dimensions
- Performance: Single request and streamed response
- Portability: Plain Worker + static assets; no framework lock-in
- Accessibility: Keyboard upload and labeled comparison slider

## 7. Processing Policy

### Natural

Default mode. Preserve tone and minimize edge halos.

### Clear

Moderate sharpening and contrast for social / marketing use.

### Maximum

Stronger enhancement. Must remain opt-in due to higher artifact risk.

### Face

Avoid aggressive edge sharpening. Does not promise identity restoration.

### Document

Increase contrast and edge definition. Does not change or infer document text intentionally.

## 8. Governance

- Original is always the source of truth.
- UI must show an AI detail warning.
- Do not market as forensic enhancement.
- Do not use generated text or reconstructed faces as authoritative evidence.
- Future model changes require benchmark results and documented acceptance criteria.

## 9. Quality Benchmark — Next Gate

Prepare a controlled set of at least:

- 10 low-resolution photos
- 10 face images
- 10 document images
- 5 motion-blur images as known limitations
- 5 heavy-compression images

Score:

- Perceived clarity
- Identity preservation
- Text preservation
- Artifact / halo level
- Processing failure
- Output size and latency

No commercial launch until the benchmark identifies which use cases are acceptable and which must be blocked or warned.

## 10. Definition of Done

See README checklist. Production status requires deployment evidence and test outputs from the user's own Cloudflare account.
