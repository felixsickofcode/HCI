import React, { useCallback, useMemo, useState } from 'react';
import { extractText } from '../lib/api';
import {
  blocksToText,
  buildFileDocument,
  buildPastedDocument,
  cloneBlocks,
  toExtractErrorMessage,
  validateFile,
  validatePastedText,
} from '../lib/document';
import type { ReadingBlock, ReadingDocument } from '../lib/document';
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

  const updateBlocks = useCallback((blocks: ReadingBlock[]) => {
    setDocument((current) =>
      current ? { ...current, blocks, text: blocksToText(blocks) } : current,
    );
  }, []);

  const restoreSource = useCallback(() => {
    setDocument((current) => {
      if (!current) return current;
      const blocks = cloneBlocks(current.sourceBlocks);
      return { ...current, blocks, text: blocksToText(blocks) };
    });
  }, []);

  const value = useMemo(
    () => ({
      document,
      submitPastedText,
      submitFile,
      clearDocument,
      updateBlocks,
      restoreSource,
    }),
    [document, submitPastedText, submitFile, clearDocument, updateBlocks, restoreSource],
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
};
