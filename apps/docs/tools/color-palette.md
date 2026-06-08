---
description: Extract dominant colors from an image as a color palette.
---

# Color Palette

Extract the dominant colors from an image and return them as hex color values. Uses quantized frequency analysis to identify the most prominent and visually distinct colors.

## API Endpoint

`POST /api/v1/tools/color-palette`

Accepts multipart form data with an image file. No settings field is needed.

## Parameters

This tool has no configurable parameters. Simply upload the image file.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | The image to extract colors from |

## Example Request

```bash
curl -X POST http://localhost:1349/api/v1/tools/color-palette \
  -H "Authorization: Bearer si_your-api-key" \
  -F "file=@photo.jpg"
```

## Example Response

```json
{
  "filename": "photo.jpg",
  "colors": [
    "#304080",
    "#e0a060",
    "#f0f0f0",
    "#203020",
    "#a0c0e0",
    "#806040"
  ],
  "count": 6
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| filename | string | Sanitized filename |
| colors | array | Array of hex color strings, ordered by dominance (most frequent first) |
| count | number | Number of colors extracted |

## Notes

- Returns up to 8 dominant colors, sorted by frequency (most common first).
- The image is internally resized to 50x50 pixels for analysis, so the palette represents overall color distribution rather than small details.
- Colors are quantized to the nearest multiple of 16 to reduce noise, then similar colors (within RGB Manhattan distance of 48) are merged to avoid near-duplicate entries.
- The alpha channel is removed before analysis, so transparent areas are not considered.
- This is a read-only endpoint. It does not produce a downloadable output file or a `jobId`.
- HEIC, RAW, PSD, and SVG inputs are automatically decoded before analysis.
