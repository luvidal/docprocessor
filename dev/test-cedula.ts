/**
 * Full cedula pipeline test
 * Usage: source /Users/avd/GitHub/jogi/.env.local && npx tsx dev/test-cedula.ts <cedula-image>
 *
 * Tests: V3 composite split (front/back), field extraction, face extraction
 * Saves all outputs to ~/Desktop/tmp_cedula/
 */

import 'dotenv/config'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, extname } from 'path'
import { detectAndSplitCompositeCedulaV3 } from '../src/cedulasplit'
import { Doc2Fields } from '../src/ocr'
import { extractFace } from '../src/faceextract'
import type { ModelArg } from '../src/types'

const file = process.argv[2]
const model = (process.argv[3] || 'gemini') as ModelArg
const OUT = resolve(process.env.HOME || '~', 'Desktop/tmp_cedula')

if (!file) {
  console.error('Usage: npx tsx dev/test-cedula.ts <cedula-image> [model]')
  process.exit(1)
}

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const ext = extname(file).toLowerCase()
const mimetype = MIME_MAP[ext]
if (!mimetype) {
  console.error(`Unsupported: ${ext}`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

const buffer = readFileSync(resolve(file))
console.log(`\n=== Cedula Pipeline Test ===`)
console.log(`File: ${file} (${mimetype}, ${Math.ceil(buffer.length / 1024)} KB, model: ${model})`)
console.log(`Output: ${OUT}\n`)

async function run() {
  // --- 1. V3 Composite Split ---
  console.log('--- Step 1: V3 Composite Cedula Split ---')
  const t0 = Date.now()
  const splitResult = await detectAndSplitCompositeCedulaV3(buffer, mimetype, model)
  console.log(`  Time: ${Date.now() - t0}ms`)

  if (!splitResult) {
    console.log('  Result: NOT a composite cedula (or split failed)')
    console.log('  Falling back to single-image extraction...\n')

    // Fallback: treat as single image
    console.log('--- Fallback: Doc2Fields (single image) ---')
    const t1 = Date.now()
    const result = await Doc2Fields(buffer, mimetype, model)
    console.log(`  Time: ${Date.now() - t1}ms`)
    console.log(`  Result:`)
    console.log(JSON.stringify(result, null, 2))
    writeFileSync(`${OUT}/fields.json`, JSON.stringify(result, null, 2))

    // Face extraction on the full image
    console.log('\n--- Fallback: Face Extraction (full image) ---')
    const t2 = Date.now()
    const face = await extractFace(buffer)
    console.log(`  Time: ${Date.now() - t2}ms`)
    if (face) {
      console.log(`  Faces detected: ${face.facesDetected}`)
      console.log(`  Confidence: ${face.confidence.toFixed(1)}%`)
      console.log(`  BBox: ${JSON.stringify(face.bbox)}`)
      const faceBuf = Buffer.from(face.face, 'base64')
      writeFileSync(`${OUT}/face.jpg`, faceBuf)
      console.log(`  Saved: face.jpg (${Math.ceil(faceBuf.length / 1024)} KB)`)
    } else {
      console.log('  No face detected')
    }
    return
  }

  // Composite cedula detected
  console.log(`  Parts: ${splitResult.parts.length}`)

  for (const part of splitResult.parts) {
    console.log(`\n  [${part.partId.toUpperCase()}]`)
    console.log(`    Buffer: ${Math.ceil(part.buffer.length / 1024)} KB`)
    console.log(`    Date: ${part.docdate || 'none'}`)

    // Save the cropped card image
    writeFileSync(`${OUT}/${part.partId}.jpg`, part.buffer)
    console.log(`    Saved: ${part.partId}.jpg`)

    // Parse and display fields
    const fields = JSON.parse(part.aiFields)
    console.log(`    Fields:`)
    for (const [k, v] of Object.entries(fields)) {
      if (k === 'foto_base64') {
        const faceBuf = Buffer.from(v as string, 'base64')
        writeFileSync(`${OUT}/face.jpg`, faceBuf)
        console.log(`      foto_base64: [saved as face.jpg, ${Math.ceil(faceBuf.length / 1024)} KB]`)
      } else {
        console.log(`      ${k}: ${v}`)
      }
    }
  }

  // Save combined fields
  const allFields: Record<string, any> = {}
  for (const part of splitResult.parts) {
    allFields[part.partId] = {
      docdate: part.docdate,
      fields: JSON.parse(part.aiFields),
    }
  }
  // Remove base64 from JSON for readability
  if (allFields.front?.fields?.foto_base64) {
    allFields.front.fields.foto_base64 = '[see face.jpg]'
  }
  writeFileSync(`${OUT}/fields.json`, JSON.stringify(allFields, null, 2))
  console.log(`\n  Saved: fields.json`)

  console.log('\n=== Done ===')
  console.log(`All files in: ${OUT}`)
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
