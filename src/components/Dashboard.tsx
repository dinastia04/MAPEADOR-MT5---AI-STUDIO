/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MappingResult } from '../types';
import { Download, RefreshCcw, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { parseNumber, createOpKey, convertCreateTime } from '../utils/normalization';

interface DashboardProps {
  result: MappingResult;
  onReset: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ result, onReset }) => {
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    const applyGlobalStyles = (ws: XLSX.WorkSheet) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            ...(ws[cellAddress].s || {}),
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
    };

    // Sheet 1: Matched
    const matchedData = result.matchedPairs.map(pair => {
      const json = pair.json_op.original;
      const csv = pair.csv_op.original;
      return {
        'Símbolo (JSON)': pair.json_op.symbol,
        'Símbolo (CSV)': pair.csv_op.symbol,
        'Tipo (JSON)': pair.json_op.type,
        'Tipo (CSV)': pair.csv_op.type,
        'Entrada (JSON)': pair.json_op.entry,
        'Entrada (CSV)': pair.csv_op.entry,
        'TP (JSON)': pair.json_op.tp,
        'TP (CSV)': pair.csv_op.tp,
        'SL (JSON)': pair.json_op.sl,
        'SL (CSV)': pair.csv_op.sl,
        'Comentario (JSON)': pair.json_op.comment,
        'Comentario (CSV)': pair.csv_op.comment,
        'Confianza (JSON)': pair.json_op.confianza,
        'Confianza (CSV)': pair.csv_op.confianza,
        'Score Mapeo (%)': pair.score,
        'Razones': pair.reasons.join('; '),
        'ID (JSON)': json.id,
        'ID Orden (CSV)': csv['ID Orden'],
        'Volumen (CSV)': parseNumber(csv['Volumen']),
        'Hora Colocacion (CSV)': csv['Hora Colocacion'],
        'Hora Activacion (CSV)': csv['Hora Activacion'],
        'Hora Cierre (CSV)': csv['Hora Cierre'],
        'PNL (CSV)': parseNumber(csv['PNL']),
        'Comision (CSV)': parseNumber(csv['Comision']),
        'Swap (CSV)': parseNumber(csv['Swap']),
        'createTime (JSON)': json.createTime,
        'Hora Convertida (createTime)': convertCreateTime(json.createTime),
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(matchedData);

    // Apply styles to Sheet 1
    const range = XLSX.utils.decode_range(ws1['!ref'] || "A1:A1");
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const headerCellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      const headerCell = ws1[headerCellAddress];
      if (!headerCell) continue;
      
      const headerText = String(headerCell.v);

      // Default Header Style
      headerCell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "333333" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      // Determine column color based on header text
      let colColor = null;
      if (headerText.includes("Entrada")) {
        colColor = "E2EFDA"; // Light green
      } else if (headerText.includes("TP")) {
        colColor = "D9E1F2"; // Light blue
      } else if (headerText.includes("SL")) {
        colColor = "FCE4D6"; // Light red/orange
      } else if (headerText.includes("Comentario")) {
        colColor = "FFF2CC"; // Light yellow
      } else if (headerText.includes("Confianza")) {
        colColor = "E2EFDA"; // Light green
      }

      // Apply color to the entire column if a color was determined
      if (colColor) {
        for (let R = 1; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws1[cellAddress]) {
            ws1[cellAddress] = { t: 's', v: '' };
          }
          ws1[cellAddress].s = {
            fill: { fgColor: { rgb: colColor } }
          };
        }
      }
    }

    // Adjust column widths for better aesthetics
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      colWidths.push({ wch: 15 }); // Default width
    }
    ws1['!cols'] = colWidths;
    applyGlobalStyles(ws1);

    XLSX.utils.book_append_sheet(wb, ws1, "OPERACIONES MAPEADAS");

    // Sheet 2: Unmatched JSON
    const unmatchedJSONData = result.unmatchedJSON.map(({ op }) => {
      const flatOp: Record<string, any> = { ...op.original };
      if (flatOp.entry !== undefined) flatOp.entry = parseNumber(flatOp.entry);
      if (flatOp.takeProfit !== undefined) flatOp.takeProfit = parseNumber(flatOp.takeProfit);
      if (flatOp.stopLoss !== undefined) flatOp.stopLoss = parseNumber(flatOp.stopLoss);
      
      flatOp['Hora Convertida (createTime)'] = convertCreateTime(flatOp.createTime);
      
      return flatOp;
    });
    const ws2 = XLSX.utils.json_to_sheet(unmatchedJSONData);
    applyGlobalStyles(ws2);
    XLSX.utils.book_append_sheet(wb, ws2, "NO MAPEADOS JSON");

    // Sheet 3: Unmatched CSV
    const unmatchedCSVData = result.unmatchedCSV.map(({ op }) => {
      const orig = op.original;
      return {
        'ID Orden': orig['ID Orden'],
        'Simbolo': op.symbol,
        'Tipo': op.type,
        'Tipo Orden': orig['Tipo Orden'],
        'Volumen': parseNumber(orig['Volumen']),
        'Hora Colocacion': orig['Hora Colocacion'],
        'Hora Activacion': orig['Hora Activacion'],
        'Hora Cierre': orig['Hora Cierre'],
        'Entrada': op.entry,
        'TP': op.tp,
        'STL': op.sl,
        'PNL': parseNumber(orig['PNL']),
        'Comision': parseNumber(orig['Comision']),
        'Swap': parseNumber(orig['Swap']),
        'Confianza (CSV)': op.confianza,
        'Comentario': op.comment
      };
    });
    const ws3 = XLSX.utils.json_to_sheet(unmatchedCSVData);
    applyGlobalStyles(ws3);
    XLSX.utils.book_append_sheet(wb, ws3, "NO MAPEADOS CSV");

    // Sheet 4: All JSON
    const allJSONData = result.allJSON.map(op => {
      // Create a flat object with all properties
      const flatOp: Record<string, any> = { ...op };
      // Parse known numerical fields if they exist
      if (flatOp.entry !== undefined) flatOp.entry = parseNumber(flatOp.entry);
      if (flatOp.takeProfit !== undefined) flatOp.takeProfit = parseNumber(flatOp.takeProfit);
      if (flatOp.stopLoss !== undefined) flatOp.stopLoss = parseNumber(flatOp.stopLoss);
      
      flatOp['Hora Convertida (createTime)'] = convertCreateTime(flatOp.createTime);
      
      return flatOp;
    });
    const ws4 = XLSX.utils.json_to_sheet(allJSONData);
    applyGlobalStyles(ws4);
    XLSX.utils.book_append_sheet(wb, ws4, "TODAS JSON");

    // Sheet 5: All CSV
    const allCSVData = result.allCSV.map(op => {
      const flatOp: Record<string, any> = { ...op };
      // Parse known numerical fields if they exist
      if (flatOp['Volumen'] !== undefined) flatOp['Volumen'] = parseNumber(flatOp['Volumen']);
      if (flatOp['Entrada'] !== undefined) flatOp['Entrada'] = parseNumber(flatOp['Entrada']);
      if (flatOp['TP'] !== undefined) flatOp['TP'] = parseNumber(flatOp['TP']);
      if (flatOp['STL'] !== undefined) flatOp['STL'] = parseNumber(flatOp['STL']);
      if (flatOp['PNL'] !== undefined) flatOp['PNL'] = parseNumber(flatOp['PNL']);
      if (flatOp['Comision'] !== undefined) flatOp['Comision'] = parseNumber(flatOp['Comision']);
      if (flatOp['Swap'] !== undefined) flatOp['Swap'] = parseNumber(flatOp['Swap']);
      
      const normalizedOp = createOpKey(op, 'csv');
      
      // Remove original Comentario to re-add it after Confianza
      delete flatOp['Comentario'];
      
      flatOp['Confianza (CSV)'] = normalizedOp.confianza;
      flatOp['Comentario'] = normalizedOp.comment;
      
      return flatOp;
    });
    const ws5 = XLSX.utils.json_to_sheet(allCSVData);
    applyGlobalStyles(ws5);
    XLSX.utils.book_append_sheet(wb, ws5, "TODAS CSV");

    // Sheet 6: Summary
    const summaryData = [
      ["RESUMEN DEL MAPEO DE OPERACIONES MT5-AI STUDIO"],
      [""],
      ["DATOS ORIGINALES"],
      ["Total operaciones en JSON (AI Studio)", result.summary.totalJSON],
      ["Operaciones JSON válidas (con comentario y entry)", result.summary.validJSON],
      ["Total operaciones en CSV (MT5)", result.summary.totalCSV],
      [""],
      ["RESULTADOS DEL MAPEO"],
      ["Operaciones mapeadas correctamente", result.summary.matchedCount],
      ["Operaciones JSON sin pareja", result.summary.unmatchedJSONCount],
      ["Operaciones CSV sin pareja", result.summary.unmatchedCSVCount],
      [""],
      ["PORCENTAJES"],
      ["% Mapeo sobre JSON válidas", result.summary.jsonMatchPercent],
      ["% Mapeo sobre CSV total", result.summary.csvMatchPercent],
    ];
    const ws6 = XLSX.utils.aoa_to_sheet(summaryData);
    applyGlobalStyles(ws6);
    XLSX.utils.book_append_sheet(wb, ws6, "RESUMEN");

    XLSX.writeFile(wb, `[${result.summary.matchedCount} OPS] [MT5-AI STUDIO].xlsx`);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">Resultados del Mapeo</h2>
          <div className="flex items-center gap-3 mt-3 text-sm text-zinc-500 font-mono">
            <span>AI Studio</span>
            <ArrowRight className="w-4 h-4" />
            <span>MetaTrader 5</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 ml-2">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-5 py-2.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Nuevo Mapeo
          </button>
          <button
            onClick={downloadExcel}
            className="px-5 py-2.5 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition-all text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <Download className="w-4 h-4" />
            Exportar a Excel
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Operaciones Mapeadas"
          value={result.summary.matchedCount}
          subtitle={`Tasa de éxito: ${result.summary.jsonMatchPercent}`}
          accent="bg-emerald-500"
        />
        <StatCard
          title="JSON No Mapeados"
          value={result.summary.unmatchedJSONCount}
          subtitle="Operaciones de AI Studio"
          accent="bg-amber-500"
        />
        <StatCard
          title="CSV No Mapeados"
          value={result.summary.unmatchedCSVCount}
          subtitle="Operaciones de MT5"
          accent="bg-rose-500"
        />
        <StatCard
          title="Total Procesado"
          value={result.summary.validJSON + result.summary.totalCSV}
          subtitle="Operaciones válidas"
          accent="bg-blue-500"
        />
      </div>

      {/* Results Table */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <button 
          onClick={() => setIsTableExpanded(!isTableExpanded)}
          className="w-full px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            {isTableExpanded ? <ChevronDown className="w-5 h-5 text-zinc-400" /> : <ChevronRight className="w-5 h-5 text-zinc-400" />}
            <h3 className="text-base font-medium text-white">Mapeos de Alta Confianza</h3>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-white/5 text-zinc-400 text-xs font-mono">Top 100</span>
        </button>
        
        {isTableExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider bg-[#050505]">
                <th className="px-6 py-4">Símbolo</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Entrada (JSON / CSV)</th>
                <th className="px-6 py-4 text-right">TP (JSON / CSV)</th>
                <th className="px-6 py-4 text-right">SL (JSON / CSV)</th>
                <th className="px-6 py-4 text-center">Score Mapeo</th>
                <th className="px-6 py-4 text-center">Confianza (JSON)</th>
                <th className="px-6 py-4 text-center">Confianza (CSV)</th>
                <th className="px-6 py-4">Razones del Mapeo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {result.matchedPairs.slice(0, 100).map((pair, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 font-mono text-sm text-white">{pair.json_op.symbol}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      pair.json_op.type.includes('BUY') 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {pair.json_op.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-right">
                    <div className="text-white">{pair.json_op.entry?.toFixed(5) || '-'}</div>
                    <div className="text-zinc-500 mt-0.5">{pair.csv_op.entry?.toFixed(5) || '-'}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-right">
                    <div className="text-white">{pair.json_op.tp?.toFixed(5) || '-'}</div>
                    <div className="text-zinc-500 mt-0.5">{pair.csv_op.tp?.toFixed(5) || '-'}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-right">
                    <div className="text-white">{pair.json_op.sl?.toFixed(5) || '-'}</div>
                    <div className="text-zinc-500 mt-0.5">{pair.csv_op.sl?.toFixed(5) || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-xs font-mono font-medium text-white w-6 text-right">{pair.score}</span>
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            pair.score >= 55 ? 'bg-emerald-500' : pair.score >= 40 ? 'bg-amber-500' : 'bg-zinc-500'
                          }`}
                          style={{ width: `${Math.min(100, pair.score)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-zinc-400">
                    {pair.json_op.confianza || '-'}
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-zinc-400">
                    {pair.csv_op.confianza || '-'}
                  </td>
                  <td className="px-6 py-4 text-[11px] text-zinc-500 max-w-[250px] truncate group-hover:whitespace-normal group-hover:bg-[#111111] group-hover:relative group-hover:z-10 group-hover:shadow-2xl group-hover:border group-hover:border-white/10 group-hover:rounded-lg group-hover:p-4 group-hover:-ml-4 group-hover:-mt-2 transition-all">
                    {pair.reasons.join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, accent }: { title: string, value: number | string, subtitle: string, accent: string }) => (
  <div className="p-6 rounded-xl bg-[#0A0A0A] border border-white/10 relative overflow-hidden group hover:border-white/20 transition-colors">
    <div className={`absolute top-0 left-0 w-full h-0.5 ${accent} opacity-50 group-hover:opacity-100 transition-opacity`} />
    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">{title}</p>
    <div className="flex items-baseline gap-3">
      <span className="text-4xl font-semibold tracking-tight text-white">{value}</span>
      <span className="text-xs font-mono text-zinc-500">{subtitle}</span>
    </div>
  </div>
);
