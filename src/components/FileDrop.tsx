/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { UploadCloud, FileJson, FileSpreadsheet, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileDropProps {
  onFilesSelected: (jsonFile: File | null, csvFile: File | null) => void;
  jsonFile: File | null;
  csvFile: File | null;
}

export const FileDrop: React.FC<FileDropProps> = ({ onFilesSelected, jsonFile, csvFile }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    let newJson: File | null = jsonFile;
    let newCsv: File | null = csvFile;

    Array.from(files).forEach((file: File) => {
      if (file.name.endsWith('.json') || file.name.endsWith('.txt')) {
        newJson = file;
      } else if (file.name.endsWith('.csv')) {
        newCsv = file;
      }
    });

    onFilesSelected(newJson, newCsv);
  }, [jsonFile, csvFile, onFilesSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative overflow-hidden border border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group",
          isDragging ? "border-white/40 bg-white/[0.04]" : "border-white/10 bg-[#0A0A0A] hover:border-white/20 hover:bg-white/[0.02]"
        )}
      >
        <input
          type="file"
          multiple
          accept=".json,.txt,.csv"
          onChange={handleFileInput}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 ease-out">
          <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors" />
        </div>
        
        <h3 className="text-xl font-medium text-white mb-2 tracking-tight">Subir Datos de Trading</h3>
        <p className="text-sm text-zinc-500 text-center max-w-sm">
          Arrastra y suelta tus archivos JSON de AI Studio y CSV de MT5 aquí, o haz clic para buscar en tu equipo.
        </p>
      </div>

      {/* File Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileStatusCard 
          type="JSON" 
          label="Datos de AI Studio" 
          file={jsonFile} 
          icon={<FileJson className="w-5 h-5" />} 
          onRemove={() => onFilesSelected(null, csvFile)} 
        />
        <FileStatusCard 
          type="CSV" 
          label="Datos de MetaTrader 5" 
          file={csvFile} 
          icon={<FileSpreadsheet className="w-5 h-5" />} 
          onRemove={() => onFilesSelected(jsonFile, null)} 
        />
      </div>
    </div>
  );
};

const FileStatusCard = ({ type, label, file, icon, onRemove }: { type: string, label: string, file: File | null, icon: React.ReactNode, onRemove: () => void }) => {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
      file ? "bg-[#0A0A0A] border-white/10" : "bg-transparent border-white/5 border-dashed opacity-50"
    )}>
      <div className="flex items-center gap-4 overflow-hidden">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          file ? "bg-white/10 text-white" : "bg-white/5 text-zinc-600"
        )}>
          {icon}
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
          <p className={cn(
            "text-sm truncate font-medium",
            file ? "text-white" : "text-zinc-600"
          )}>
            {file ? file.name : `Esperando ${type}...`}
          </p>
        </div>
      </div>
      {file && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-2 shrink-0 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors relative z-20"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
