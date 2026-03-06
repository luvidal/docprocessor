# Codebase Improvement Plan

12 improvement areas identified from a thorough codebase analysis.

## High Priority

### 1. Eliminate ~50 `any` types

The codebase has `strict: true` but undermines it everywhere. SDK clients, AI responses, and core functions like `parseRawDocs`/`normalizeDoc` all use `any`.

### 2. Deduplicate Gemini client

Identical lazy-init code exists in 3 files (`ai.ts`, `ocr.ts`, `faceextract.ts`), creating 3 separate client instances.

### 3. Deduplicate face extraction logic

The Gemini->smartcrop->fixed-bbox fallback chain is copy-pasted twice in `ocr.ts` (~30 identical lines).

### 4. Add missing test coverage

7 of 13 modules have zero tests: `ai.ts`, `cedula.ts`, `facedetect.ts`, `faceextract.ts`, `thumbnail.ts`, `config.ts`, `utils.ts`.

## Medium Priority

### 5. Consolidate card bounds detection

3 different implementations with different thresholds across `ocr.ts`, `cedula.ts`, `facedetect.ts`.

### 6. Centralize rate-limit detection

`ai.ts` has a comprehensive check, but `ocr.ts` and `faceextract.ts` use incomplete inline checks.

### 7. Fix console.warn bypass

`ai.ts` calls `console.warn` directly instead of using the pluggable logger, bypassing Sentry in production.

### 8. Break up ocr.ts

At 898 lines, `Doc2Fields` alone is ~270 lines with deeply nested PDF chunking, classification, extraction, and post-processing.

## Lower Priority

### 9. Remove duplicate ASPECT_RATIO_THRESHOLD constants

### 10. Harden model2vision silent empty-string return

### 11. Review tsup build config

### 12. Consider dependency injection for AI clients (future)
