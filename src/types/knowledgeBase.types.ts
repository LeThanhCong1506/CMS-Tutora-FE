export type KbStatus = 'processing' | 'ready' | 'failed';

export interface KbDocument {
  id: string;
  fileName: string;
  sourceType: string; // pdf | docx | xlsx | manual
  chunkCount: number;
  status: KbStatus | string;
  createdAt: string | null;
}

export interface KbDocumentDetail extends KbDocument {
  content: string;
}

export interface KbUploadResult {
  documentId: string;
  fileName: string;
  chunkCount: number;
}
