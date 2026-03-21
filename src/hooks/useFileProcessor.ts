/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { performMatching } from '../utils/matching';
import { MappingResult } from '../types';

export function useFileProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<MappingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFiles = useCallback(async (jsonFile: File, csvFile: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Read JSON
      const jsonText = await jsonFile.text();
      let jsonOps: any[];
      try {
        jsonOps = JSON.parse(jsonText);
      } catch (e) {
        throw new Error("Error al parsear el archivo JSON. Asegúrate de que sea un formato válido.");
      }

      // Read CSV
      const csvText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        // Try different encodings for CSV
        reader.readAsText(csvFile, 'latin1');
      });

      const csvResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      if (csvResult.errors.length > 0) {
        console.warn("CSV parsing warnings:", csvResult.errors);
      }

      const csvOps = csvResult.data;

      // Perform matching
      const mappingResult = performMatching(jsonOps, csvOps);
      setResult(mappingResult);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al procesar los archivos.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { processFiles, isProcessing, result, error, reset };
}
