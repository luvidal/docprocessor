import sharp from 'sharp'

const THUMB_WIDTH = 200
const THUMB_QUALITY = 65

/** Resize an image buffer to a small JPEG thumbnail. Returns null on failure. */
export async function generateThumbnailFromImage(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buffer)
      .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
      .toBuffer()
  } catch {
    return null
  }
}

/** Render first page of a PDF to a small JPEG thumbnail. Returns null on failure. */
export async function generateThumbnailFromPdf(buffer: Buffer): Promise<Buffer | null> {
  try {
    const { extractPdfPageAsImage } = await import('./ocr')
    const pageImage = await extractPdfPageAsImage(buffer, 1)
    if (!pageImage) return null
    return await generateThumbnailFromImage(pageImage)
  } catch {
    return null
  }
}
