import React, { useCallback, useMemo, useState } from 'react';
import { extractText } from '../lib/api';
import {
  buildFileDocument,
  buildPastedDocument,
  toExtractErrorMessage,
  validateFile,
  validatePastedText,
} from '../lib/document';
import type { ReadingDocument } from '../lib/document';
import { DocumentContext } from './document-context';

export interface DocumentProviderProps {
  children: React.ReactNode;
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ children }) => {
  const [document, setDocument] = useState<ReadingDocument | null>(null);

  const submitPastedText = useCallback((raw: string) => {
    const problem = validatePastedText(raw);
    if (problem) throw new Error(problem);
    setDocument(buildPastedDocument(raw));
  }, []);

  const submitFile = useCallback(async (file: File, signal?: AbortSignal) => {
    const problem = validateFile(file);
    if (problem) throw new Error(problem);

    try {
      const result = await extractText(file, signal);
      setDocument(buildFileDocument(file, result));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
        throw new Error(toExtractErrorMessage(error), { cause: error });
    }
  }, []);

  const clearDocument = useCallback(() => {
    setDocument(null);
  }, []);

  const value = useMemo(
    () => ({ document, submitPastedText, submitFile, clearDocument }),
    [document, submitPastedText, submitFile, clearDocument],
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
};