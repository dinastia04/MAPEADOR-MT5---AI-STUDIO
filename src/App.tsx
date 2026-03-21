/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { FileDrop } from './components/FileDrop';
import { Dashboard } from './components/Dashboard';
import { useFileProcessor } from './hooks/useFileProcessor';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle, Activity } from 'lucide-react';

export default function App() {
  const { processFiles, isProcessing, result, error, reset } = useFileProcessor();
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  const handleFilesSelected = useCallback((json: File | null, csv: File | null) => {
    setJsonFile(json);
    setCsvFile(csv);
  }, []);

  const handleStartMapping = () => {
    if (jsonFile && csvFile) {
      processFiles(jsonFile, csvFile);
    }
  };

  const handleReset = () => {
    setJsonFile(null);
    setCsvFile(null);
    reset();
  };

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!result) {
      setIsGlobalDragging(true);
    }
  }, [result]);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we are leaving the main container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsGlobalDragging(false);
  }, []);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGlobalDragging(false);
    
    if (result) return; // Don't process drops if already showing results

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      let newJson: File | null = jsonFile;
      let newCsv: File | null = csvFile;

      Array.from(e.dataTransfer.files).forEach((file: File) => {
        if (file.name.endsWith('.json') || file.name.endsWith('.txt')) {
          newJson = file;
        } else if (file.name.endsWith('.csv')) {
          newCsv = file;
        }
      });

      handleFilesSelected(newJson, newCsv);
    }
  }, [jsonFile, csvFile, handleFilesSelected, result]);

  return (
    <div 
      className="min-h-screen bg-[#000000] text-[#EDEDED] selection:bg-white selection:text-black relative font-sans"
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      {/* Technical Grid Background */}
      <div className="absolute inset-0 tech-grid pointer-events-none z-0 opacity-50" />
      
      {/* Global Drag Overlay */}
      <AnimatePresence>
        {isGlobalDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm border-4 border-dashed border-white/20 m-4 rounded-3xl pointer-events-none"
          >
            <div className="text-center">
              <Activity className="w-16 h-16 text-white mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-semibold text-white tracking-tight">Suelta los archivos aquí</h2>
              <p className="text-zinc-400 mt-2">Capturaremos el JSON y el CSV automáticamente</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded-md font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-semibold tracking-tight text-white">Mapeador MT5</span>
        </div>
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          v2.0.0 // AI Studio
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-3xl flex flex-col items-center"
            >
              <div className="text-center mb-12">
                <h1 className="text-5xl font-semibold tracking-tight text-white mb-4">Sincronizar Datos</h1>
                <p className="text-zinc-400 max-w-md mx-auto">
                  Mapea tus operaciones de AI Studio con los registros de ejecución de MetaTrader 5 usando nuestro algoritmo avanzado.
                </p>
              </div>

              <FileDrop onFilesSelected={handleFilesSelected} jsonFile={jsonFile} csvFile={csvFile} />

              <div className="mt-10 flex flex-col items-center gap-4 h-24">
                <AnimatePresence>
                  {jsonFile && csvFile && !isProcessing && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={handleStartMapping}
                      className="px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                    >
                      Iniciar Proceso de Mapeo
                    </motion.button>
                  )}
                  
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 text-zinc-400 px-8 py-3"
                    >
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span className="font-medium">Analizando operaciones...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-rose-400 bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{error}</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full pt-20 pb-12"
            >
              <Dashboard result={result} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
