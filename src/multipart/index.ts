// Universal entry point — no heavy deps
// Safe to import from frontend code

export {
  getMultiPartConfig,
  isMultiPartDocType,
  getMultiPartDocTypeIds,
  getPartIdFromFilename,
  getDocTypeFromFilename,
  isMultiPartFile,
  getPartLabel,
  partFilenameConditions,
} from '../multipart'

export type { MultiPartConfig } from '../types'
