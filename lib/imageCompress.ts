/**
 * Client-side image compression using <canvas>.
 *
 * For images that exceed `targetBytes`, scales down (preserving aspect ratio)
 * and re-encodes to JPEG at decreasing quality until under target or until
 * the floor (quality 0.5, max dim 1600px) is reached. Returns the original
 * file untouched if it's already small enough or if compression would be
 * lossy/inappropriate (PNG with transparency, GIF, SVG, non-images).
 *
 * No external dependencies — runs entirely in the browser.
 */

export interface CompressOptions {
  /** Skip compression if file is already <= this many bytes. Default 1 MB. */
  targetBytes?: number
  /** Initial max width/height in pixels. Default 2400. */
  maxDimension?: number
  /** Initial JPEG quality. Default 0.85. */
  initialQuality?: number
  /** Output mime type. Default 'image/jpeg'. */
  outputType?: 'image/jpeg' | 'image/webp'
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const targetBytes = opts.targetBytes ?? 1024 * 1024 // 1 MB
  const initialMax = opts.maxDimension ?? 2400
  const initialQuality = opts.initialQuality ?? 0.85
  const outputType = opts.outputType ?? 'image/jpeg'

  // Skip non-images, GIF (animation lost on canvas), SVG (vector), and small files
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  if (file.size <= targetBytes) return file

  // Decode the image
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Browser couldn't decode (HEIC on non-Safari, etc.) — return original
    return file
  }

  // Iterate down: shrink dimensions, then quality, until under target
  let maxDim = initialMax
  let quality = initialQuality
  let attempt = 0
  let blob: Blob | null = null

  while (attempt < 6) {
    const { width, height } = scaleToFit(bitmap.width, bitmap.height, maxDim)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) break

    // White background for JPEG (in case input has transparency)
    if (outputType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(bitmap, 0, 0, width, height)

    blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(b => resolve(b), outputType, quality)
    })

    if (!blob) break
    if (blob.size <= targetBytes) break

    // Tighten the screws: alternate quality drop and dimension drop
    if (attempt % 2 === 0) quality = Math.max(0.55, quality - 0.1)
    else maxDim = Math.max(1600, Math.round(maxDim * 0.85))
    attempt++
  }

  bitmap.close?.()

  if (!blob) return file
  // If compression somehow made it bigger, fall back to original
  if (blob.size >= file.size) return file

  // Replace extension to match output type
  const newName = file.name.replace(/\.[^/.]+$/, '') +
    (outputType === 'image/webp' ? '.webp' : '.jpg')

  return new File([blob], newName, { type: outputType, lastModified: Date.now() })
}

function scaleToFit(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w / h
  if (w >= h) return { width: max, height: Math.round(max / ratio) }
  return { width: Math.round(max * ratio), height: max }
}
