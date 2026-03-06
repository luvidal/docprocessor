/**
 * Face Detection for Chilean Cedulas — TIER 2 FALLBACK
 *
 * Uses smartcrop-sharp for face photo extraction.
 * Fallback when Gemini bbox detection (Tier 1) is unavailable.
 */

import smartcrop from 'smartcrop-sharp'
import sharp from 'sharp'
import { getLogger } from './config'

async function detectCardBounds(buffer: Buffer): Promise<{
    left: number
    top: number
    width: number
    height: number
} | null> {
    try {
        const { data, info } = await sharp(buffer)
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true })

        let minX = info.width, maxX = 0, minY = info.height, maxY = 0
        const threshold = 140

        for (let y = 0; y < info.height; y++) {
            for (let x = 0; x < info.width; x++) {
                const brightness = data[y * info.width + x]
                if (brightness > threshold) {
                    if (x < minX) minX = x
                    if (x > maxX) maxX = x
                    if (y < minY) minY = y
                    if (y > maxY) maxY = y
                }
            }
        }

        if (maxX > minX && maxY > minY) {
            const originalArea = info.width * info.height
            const detectedArea = (maxX - minX) * (maxY - minY)
            if (detectedArea < originalArea * 0.9) {
                return {
                    left: Math.max(0, minX - 5),
                    top: Math.max(0, minY - 5),
                    width: Math.min(maxX - minX + 10, info.width - minX),
                    height: Math.min(maxY - minY + 10, info.height - minY)
                }
            }
        }
        return null
    } catch {
        return null
    }
}

export async function detectAndCropFace(buffer: Buffer): Promise<string | null> {
    try {
        const cardBounds = await detectCardBounds(buffer)
        let cardBuffer = buffer
        let width: number, height: number

        if (cardBounds) {
            cardBuffer = await sharp(buffer)
                .extract(cardBounds)
                .toBuffer()
            width = cardBounds.width
            height = cardBounds.height
        } else {
            const metadata = await sharp(buffer).metadata()
            if (!metadata.width || !metadata.height) return null
            width = metadata.width
            height = metadata.height
        }

        const aspectRatio = height / width
        const isComposite = aspectRatio > 1.2

        const regionHeight = isComposite
            ? Math.round(height * 0.5)
            : height

        const regionWidth = Math.round(width * 0.4)
        const regionBuffer = await sharp(cardBuffer)
            .extract({
                left: 0,
                top: 0,
                width: regionWidth,
                height: regionHeight
            })
            .toBuffer()

        const faceWidth = Math.round(regionWidth * 0.5)
        const faceHeight = Math.round(regionHeight * 0.6)

        const boostRegion = {
            x: Math.round(regionWidth * 0.05),
            y: Math.round(regionHeight * 0.05),
            width: Math.round(regionWidth * 0.6),
            height: Math.round(regionHeight * 0.7),
            weight: 2.0
        }

        const result = await smartcrop.crop(regionBuffer, {
            width: faceWidth,
            height: faceHeight,
            boost: [boostRegion]
        })

        const crop = result.topCrop

        const croppedBuffer = await sharp(regionBuffer)
            .extract({
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height
            })
            .resize(256, 256, { fit: 'cover' })
            .jpeg({ quality: 92 })
            .toBuffer()

        if (croppedBuffer.length < 5000) {
            return null
        }

        return croppedBuffer.toString('base64')
    } catch (err) {
        getLogger().error(err, { module: 'face-detect', action: 'detect-face' })
        return null
    }
}
