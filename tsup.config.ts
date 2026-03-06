import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'doctypes/index': 'src/doctypes/index.ts',
        'multipart/index': 'src/multipart/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['sharp', 'smartcrop-sharp', '@anthropic-ai/sdk', 'openai', '@google/genai', 'pdf-lib', 'pdf-to-png-converter'],
    treeshake: true,
})
