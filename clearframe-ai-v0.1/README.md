# ClearFrame AI — MVP v0.1

Web/PWA สำหรับเพิ่ม Resolution และความคมชัดของภาพ โดยออกแบบตามหลัก:

- No OAuth / no `wrangler login`
- Deploy ด้วย `CLOUDFLARE_API_TOKEN` และ `CLOUDFLARE_ACCOUNT_ID`
- ไม่ฝัง API key หรือ token ใน source code / Git
- ไม่สร้างบัญชีผู้ใช้หรือ Cloud database
- ไม่เก็บไฟล์ภาพถาวรใน MVP
- แสดงคำเตือนเรื่อง AI-generated details ชัดเจน

## สิ่งที่ทำงานแล้ว

1. Upload / drag-and-drop ภาพ
2. รองรับ Auto, Photo, Face และ Document presets
3. AI Upscale 2x หรือ 4x ผ่าน Cloudflare Images `upscale: "generate"` (ESRGAN)
4. Controlled sharpen / contrast / saturation
5. Before–After slider
6. Download เป็น WebP
7. Local browser fallback สำหรับทดสอบ UX เมื่อ Images binding ยังไม่พร้อม
8. PWA shell และ responsive mobile layout
9. `/api/health` และ `/api/enhance`
10. Input validation สูงสุด 20 MB

> หมายเหตุ: Face mode ใน v0.1 เป็นการตั้งค่าที่ลด over-sharpen สำหรับใบหน้า ยังไม่ใช่ dedicated face-restoration model เช่น GFPGAN/CodeFormer

## Run in Codespaces

```bash
cd /workspaces
unzip clearframe-ai-v0.1.zip
cd clearframe-ai-v0.1
npm install
npm test
npm run dev
```

การทดสอบ AI Upscale จริงต้องใช้ Cloudflare remote runtime:

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
npm run dev:remote
```

ห้ามใช้ `wrangler login`

## Deploy

```bash
chmod +x deploy-codespace.sh
./deploy-codespace.sh
```

หรือ:

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
npm install
npm test
npx wrangler deploy
```

## Cloudflare permission

Token ต้องมีสิทธิ์อย่างน้อยที่จำเป็นสำหรับการ Deploy Worker ใน Account เป้าหมาย  
Images binding ถูกประกาศใน `wrangler.jsonc` จึงไม่ต้องสร้าง binding ผ่าน Dashboard

## API

### Health

```bash
curl https://<worker>.<subdomain>.workers.dev/api/health
```

### Enhance

```bash
curl -X POST \
  -F "image=@sample.jpg" \
  -F "mode=photo" \
  -F "scale=2" \
  -F "strength=natural" \
  https://<worker>.<subdomain>.workers.dev/api/enhance \
  --output enhanced.webp
```

## Current technical basis

Cloudflare Images documentation (checked 6 Aug 2026):

- Images binding accepts raw request bytes and supports chained transformations.
- `.input()` maximum is 20 MB.
- `upscale=generate` uses ESRGAN and supports an AI pass at 2x or 4x.
- Images Free includes up to 5,000 unique transformations per month; verify current pricing before commercial launch.

Official references:

- https://developers.cloudflare.com/images/optimization/binding/
- https://developers.cloudflare.com/images/optimization/features/
- https://developers.cloudflare.com/images/get-started/limits/
- https://developers.cloudflare.com/images/pricing/

## Definition of Done — MVP v0.1

- [x] User can upload a valid image.
- [x] App shows original dimensions.
- [x] Server validates type and size.
- [x] Production endpoint requests AI 2x/4x upscaling.
- [x] Result can be compared and downloaded.
- [x] No image persistence is implemented.
- [x] Local fallback is explicitly labeled as non-AI.
- [x] Code can deploy via API token without OAuth.
- [ ] Production deployment verified on the user's Cloudflare account.
- [ ] AI output quality benchmarked against a controlled test set.
