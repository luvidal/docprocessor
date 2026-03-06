/**
 * CLI tool for testing document extraction
 * Usage: npx tsx dev/cli.ts <path-to-file> [model]
 *
 * Examples:
 *   npx tsx dev/cli.ts ~/Documents/cedula.jpg
 *   npx tsx dev/cli.ts ~/Documents/liquidacion.pdf gemini
 *   npx tsx dev/cli.ts ~/Documents/multi.pdf claude
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { resolve, extname } from 'path'
import { Doc2Fields } from '../src/ocr'
import type { ModelArg } from '../src/types'

const file = process.argv[2]
const model = (process.argv[3] || 'gemini') as ModelArg

if (!file) {
  console.error('Usage: npx tsx dev/cli.ts <file> [model]')
  console.error('  model: gemini (default), claude, gpt5')
  process.exit(1)
}

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const ext = extname(file).toLowerCase()
const mimetype = MIME_MAP[ext]
if (!mimetype) {
  console.error(`Unsupported file type: ${ext}`)
  process.exit(1)
}

const buffer = readFileSync(resolve(file))
console.log(`Processing: ${file} (${mimetype}, ${Math.ceil(buffer.length / 1024)} KB, model: ${model})`)

Doc2Fields(buffer, mimetype, model)
  .then(result => {
    console.log(JSON.stringify(result, null, 2))
  })
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
