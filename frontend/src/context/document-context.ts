import { createContext, useContext } from 'react';
import type { ReadingBlock, ReadingDocument } from '../lib/document';

export interface DocumentContextValue {
  document: ReadingDocument | null;
  submitPastedText: (raw: string) => void;
  submitFile: (file: File, signal?: AbortSignal) => Promise<void>;
  clearDocument: () => void;
  updateBlocks: (blocks: ReadingBlock[]) => void;
  restoreSource: () => void;
}

export const DocumentContext = createContext<DocumentContextValue | null>(null);

export const useDocument = (): DocumentContextValue => {
  const context = useContext(DocumentContext);
  if (!context) throw new Error('useDocument must be used within a DocumentProvider');
  return context;
};
