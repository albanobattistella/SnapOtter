---
layout: home

hero:
  name: "SnapOtter"
  text: "Self-Hosted Image Toolkit"
  tagline: 50+ tools. Resize, compress, convert, remove backgrounds, upscale, OCR, and more. One Docker container, fully offline.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: API reference
      link: /api/rest

features:
  - title: 53 Image Tools
    details: Resize, crop, compress, convert, watermark, adjust colors, vectorize, create GIFs, build collages, and more.
  - title: Local AI
    details: "16 ML tools: background removal, upscaling, enhancement, colorization, OCR, object erasure. Fully local."
  - title: Pipelines
    details: Chain tools into reusable workflows. Batch process unlimited images at once.
  - title: REST API
    details: Every tool via API with key auth. Interactive docs at /api/docs plus /llms.txt for AI agents.
  - title: File Library
    details: Persistent storage with full version history. Trace every step from original to output.
  - title: Teams & Access Control
    details: "Multi-user with admin/user roles, per-resource permissions, and audit logging."
---

<div class="quick-start-banner">

```bash
docker run -d --name SnapOtter -p 1349:1349 -v SnapOtter-data:/data snapotter/snapotter:latest
```

</div>
