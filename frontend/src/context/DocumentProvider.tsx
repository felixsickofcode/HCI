import React, { useCallback, useMemo, useState } from 'react';
import { extractText } from '../lib/api';
import {
  buildArticleDocument,
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

  const submitArticle = useCallback((title: string, body: string) => {
    const problem = validatePastedText(body);
    if (problem) throw new Error(problem);
    setDocument(buildArticleDocument(title, body));
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
    () => ({
      document,
      submitPastedText,
      submitArticle,
      submitFile,
      clearDocument,
    }),
    [document, submitPastedText, submitArticle, submitFile, clearDocument],
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
};
