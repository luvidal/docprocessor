# Codebase Improvement Plan

## 1. Eliminate Pervasive `any` Types

**Priority: High** | **Effort: Medium** | **Files: ai.ts, ocr.ts, faceextract.ts, doctypes.ts**

The codebase has `strict: true` in tsconfig but undermines it with ~50 uses of `any`. The worst offenders:

- **ai.ts** — All three SDK clients are typed `any`. The Gemini response helper `geminiText` takes `any`. The Anthropic content arrays are cast `as any`.
- **ocr.ts** — `parseRawDocs` returns `any[]`, `normalizeDoc` takes and partially returns `any`, `classifyAndExtractImage` returns `Promise<any[]>`, `extractFields` returns `Promise<any[]>`. The Gemini client is duplicated here as another `any`.
- **faceextract.ts** — Yet another duplicate `any`-typed Gemini client.
- **doctypes.ts** — `TYPE_DEFAULTS` is `Record<string, any>`.

**Actions:**
- Type the SDK clients using their actual types (`Anthropic`, `OpenAI`, `GoogleGenAI`)
- Define interfaces for `RawDoc`, `NormalizedDoc`, `ClassifiedDoc` to replace `any[]` returns in ocr.ts
- Type `TYPE_DEFAULTS` properly with a union type
- Remove `as any` casts on Anthropic content by using the SDK's content block types

---

## 2. Deduplicate Gemini Client Initialization

**Priority: High** | **Effort: Low** | **Files: ai.ts, ocr.ts, faceextract.ts**

The Gemini `GoogleGenAI` client is lazily initialized in **three separate files** with identical code:

1. `ai.ts:24-30` — `getGemini()`
2. `ocr.ts:39-46` — `getGemini()` (separate instance)
3. `faceextract.ts:12-19` — `getGemini()` (yet another instance)

Each creates its own singleton. This means 3 separate client instances, 3 places to update if the SDK changes, and 3 independent rate-limit cooldown timers that don't coordinate.

**Actions:**
- Move Gemini client to a shared module (e.g., extend `ai.ts` to export `getGeminiClient()`)
- Similarly consolidate Anthropic and OpenAI client getters
- Centralize rate-limit cooldown state so face extraction and OCR share the same backoff

---

## 3. Deduplicate Cedula Face Extraction Logic

**Priority: High** | **Effort: Medium** | **Files: ocr.ts**

The face extraction pipeline (Gemini bbox → smartcrop → fixed bbox fallback) appears **twice** in `ocr.ts`:

1. `detectCedulaSide()` (lines 408-441) — face extraction for side detection
2. `Doc2Fields()` result processing (lines 830-863) — identical face extraction

Both follow the same pattern: `cropCardWithGemini` → `cropToFrontCard` → `extractFaceWithGemini` → `detectAndCropFace` → `cropPhotoFromImage` fallback.

**Actions:**
- Extract a single `extractCedulaFacePhoto(imageBuffer: Buffer, aiBbox?: BBox): Promise<string | null>` function
- Call it from both `detectCedulaSide` and `Doc2Fields`

---

## 4. Deduplicate Cedula Bounds Detection

**Priority: Medium** | **Effort: Medium** | **Files: ocr.ts, cedula.ts, facedetect.ts**

Three different "detect card bounds" implementations exist:

1. `ocr.ts:detectCedulaBounds()` (lines 124-206) — brightness threshold, row/col scanning
2. `cedula.ts:findCardRegions()` via `findBestSplit()` — brightness + variance, more sophisticated
3. `facedetect.ts:detectCardBounds()` (lines 12-55) — different brightness threshold (140 vs 200), different algorithm

**Actions:**
- Consolidate into a single card detection module with configurable thresholds
- The cedula.ts implementation is the most robust; use it as the base

---

## 5. Consolidate Rate-Limit Detection

**Priority: Medium** | **Effort: Low** | **Files: ai.ts, ocr.ts, faceextract.ts**

Rate-limit error detection is duplicated:

1. `ai.ts:isRateLimitError()` — comprehensive check (status codes, message patterns)
2. `ocr.ts:113-115` — inline check for 429/RESOURCE_EXHAUSTED
3. `faceextract.ts:45` — inline check for 429/RESOURCE_EXHAUSTED

Each has slightly different logic. The ocr.ts and faceextract.ts versions miss the 503/quota/unavailable cases that ai.ts handles.

**Actions:**
- Export `isRateLimitError` from `ai.ts` and use it everywhere
- Consolidate cooldown timers with the client deduplication (item 2)

---

## 6. Add Missing Test Coverage

**Priority: High** | **Effort: Medium-High**

Current tests cover only pure/utility functions: `doctypes`, `multipart`, `cedulamerge`, and `parseRawDocs`/`normalizeDoc` from `ocr`. Missing coverage:

| Module | Lines | Tests |
|---|---|---|
| `ai.ts` | 142 | None |
| `cedula.ts` | 234 | None |
| `facedetect.ts` | 132 | None |
| `faceextract.ts` | 126 | None |
| `thumbnail.ts` | 28 | None |
| `config.ts` | 17 | None |
| `utils.ts` | 23 | None |

**Actions (unit-testable without AI/sharp mocking):**
- `config.ts` — test configure/getLogger
- `utils.ts` — test safeJsonParse edge cases
- `thumbnail.ts` — test with small test images
- `ai.ts` — test `stripFences`, `isRateLimitError`, `geminiText` helpers (currently not exported)
- `ocr.ts` — `cropToFrontCard`, `detectCedulaBounds` (currently not exported; consider exporting for testability)
- `cedula.ts` — `findBestSplit` and `findCardRegions` are pure functions that could be tested with synthetic data

**Actions (integration tests with mocked AI):**
- Mock `model2vision` to test `Doc2Fields` orchestration logic
- Mock Gemini client to test `cropCardWithGemini`, `extractFaceWithGemini`

---

## 7. Use `getLogger()` Consistently Instead of `console.warn`

**Priority: Medium** | **Effort: Low** | **Files: ai.ts**

The codebase has a proper pluggable logger (`config.ts`) but `ai.ts:123` uses `console.warn` directly:
```ts
console.warn('Gemini rate limited, falling back to Anthropic')
```

This bypasses the consumer's configured logger (Sentry in production).

**Actions:**
- Replace `console.warn` with `getLogger().warn()` in ai.ts
- Audit for any other direct console usage

---

## 8. Improve `ocr.ts` Function Size and Readability

**Priority: Medium** | **Effort: Medium** | **File: ocr.ts (898 lines)**

`ocr.ts` is the largest file at ~900 lines. `Doc2Fields` alone is ~270 lines with deeply nested logic for PDF chunking, classification, extraction, and post-processing.

**Actions:**
- Extract PDF chunking logic into a helper: `chunkAndClassifyPdf()`
- Extract the post-extraction merge into: `mergeClassificationWithExtraction()`
- Extract cedula front/back post-processing into: `postProcessCedulas()`
- Move `extractFaceWithGemini`, `cropToFrontCard`, `cropPhotoFromImage`, `detectCedulaBounds` out of ocr.ts into a dedicated face/card module (they're cedula-specific, not OCR-general)

---

## 9. Remove Duplicate `ASPECT_RATIO_THRESHOLD` Constants

**Priority: Low** | **Effort: Low** | **Files: ocr.ts, cedula.ts, facedetect.ts**

`ASPECT_RATIO_THRESHOLD = 1.2` is defined in both `ocr.ts:122` and `cedula.ts:14`. The same magic number `1.2` also appears in `facedetect.ts:77`.

**Actions:**
- Define once in a shared constants location and import

---

## 10. Harden `model2vision` Return Behavior

**Priority: Medium** | **Effort: Low** | **File: ai.ts**

If no model matches or no API key is set, `model2vision` silently returns `''`. Callers then attempt to `JSON.parse('')` which throws. This creates confusing error traces.

**Actions:**
- Throw a descriptive error when no valid model/key combination is available
- Or return a structured result type: `{ text: string; model: ModelId; ok: boolean }`

---

## 11. Add `tsup.config.ts` Review and Optimization

**Priority: Low** | **Effort: Low**

**Actions:**
- Verify external dependencies are properly marked (sharp, AI SDKs should be external)
- Consider adding `treeshake: true`
- Ensure source maps are generated for debugging

---

## 12. Consider Dependency Injection for AI Clients

**Priority: Low** | **Effort: Medium-High**

The current architecture hard-codes AI provider logic in `model2vision`. Adding a new provider or changing model versions requires editing a 142-line function.

**Actions (future consideration):**
- Define a `VisionProvider` interface: `{ name: string; call(mimetype, base64, prompt): Promise<string> }`
- Register providers at configure() time
- This would make testing much easier (inject mock providers) and decouple provider logic

---

## Recommended Execution Order

1. **Deduplicate Gemini client** (#2) — Quick win, reduces confusion
2. **Consolidate rate-limit detection** (#5) — Quick win alongside #2
3. **Fix `any` types** (#1) — Catches bugs, improves IDE experience
4. **Deduplicate face extraction** (#3) — Reduces the largest source of copy-paste
5. **Use logger consistently** (#7) — 1-line fix
6. **Add tests for pure functions** (#6, partial) — Build confidence before refactoring
7. **Break up ocr.ts** (#8) — Largest refactor, needs test safety net
8. **Deduplicate card detection** (#4) — Needs careful testing with real images
9. **Remaining items** (#9-12) — Lower priority polish
