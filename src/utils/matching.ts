/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NormalizedOp, MatchedPair, MappingResult } from '../types';
import { createOpKey } from './normalization';

export function calculateMatchScore(jsonOp: NormalizedOp, csvOp: NormalizedOp): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Symbol must match (critical)
  if (jsonOp.symbol !== csvOp.symbol || !jsonOp.symbol) {
    return { score: 0, reasons: [] };
  }

  score += 25;
  reasons.push(`Symbol: ${jsonOp.symbol}`);

  // Type matching (BUY/SELL)
  const jsonType = jsonOp.type;
  const csvType = csvOp.type;
  if (jsonType && csvType) {
    if (jsonType === csvType) {
      score += 15;
      reasons.push(`Type: ${jsonType}`);
    } else if (
      (jsonType.includes('BUY') && csvType.includes('BUY')) ||
      (jsonType.includes('SELL') && csvType.includes('SELL'))
    ) {
      score += 10;
      reasons.push(`Type similar`);
    }
  }

  // Word overlap in comments
  const jsonWords = jsonOp.words;
  const csvWords = csvOp.words;

  if (jsonWords.size > 0 && csvWords.size > 0) {
    const common = Array.from(jsonWords).filter(w => csvWords.has(w));
    if (common.length >= 3) {
      const overlapRatio = common.length / Math.min(jsonWords.size, csvWords.size);
      const wordScore = Math.min(40, Math.floor(overlapRatio * 50));
      score += wordScore;
      reasons.push(`Words: ${common.length} common (${common.slice(0, 5).join(', ')})`);
    } else if (common.length >= 1) {
      score += 5;
      reasons.push(`Words: ${common.length} common`);
    }
  }

  // Entry price similarity
  const jsonEntry = jsonOp.entry;
  const csvEntry = csvOp.entry;

  if (jsonEntry !== null && csvEntry !== null) {
    const relDiff = Math.abs(jsonEntry - csvEntry) / Math.max(Math.abs(jsonEntry), 0.0001);
    if (relDiff < 0.0001) {
      score += 20;
      reasons.push(`Entry match`);
    } else if (relDiff < 0.002) {
      score += 15;
      reasons.push(`Entry close`);
    } else if (relDiff < 0.01) {
      score += 5;
      reasons.push(`Entry similar`);
    }
  }

  // TP/SL matching
  if (jsonOp.tp !== null && csvOp.tp !== null) {
    const relDiff = Math.abs(jsonOp.tp - csvOp.tp) / Math.max(Math.abs(jsonOp.tp), 0.0001);
    if (relDiff < 0.005) {
      score += 10;
      reasons.push(`TP match`);
    }
  }

  if (jsonOp.sl !== null && csvOp.sl !== null) {
    const relDiff = Math.abs(jsonOp.sl - csvOp.sl) / Math.max(Math.abs(jsonOp.sl), 0.0001);
    if (relDiff < 0.005) {
      score += 10;
      reasons.push(`SL match`);
    }
  }

  return { score, reasons };
}

export function performMatching(jsonOps: any[], csvOps: any[]): MappingResult {
  const jsonValid = jsonOps.filter(op => op.comentario && op.entry !== null);
  const jsonKeys = jsonValid.map(op => createOpKey(op, 'json'));
  const csvKeys = csvOps.map(op => createOpKey(op, 'csv'));

  const matchedPairs: MatchedPair[] = [];
  const matchedJsonIdx = new Set<number>();
  const matchedCsvIdx = new Set<number>();

  // PASO 1: Lógica estricta solicitada por el usuario
  // 1. Filtro por llave compuesta (coincidencia parcial del comentario sin signos/espacios)
  // 2. Filtro por TP exacto
  for (let j = 0; j < jsonKeys.length; j++) {
    if (matchedJsonIdx.has(j)) continue;
    const jsonOp = jsonKeys[j];

    let bestCsvIdx = -1;
    let bestScore = 0;
    let bestReasons: string[] = [];

    // Filtrar CSVs por coincidencia parcial de la llave compuesta
    const candidateCsvs = [];
    for (let c = 0; c < csvKeys.length; c++) {
      if (matchedCsvIdx.has(c)) continue;
      const csvOp = csvKeys[c];

      const jsonKey = jsonOp.compositeKey;
      const csvKey = csvOp.compositeKey;

      // Si el CSV tiene una llave válida y está contenida en la del JSON (o viceversa)
      if (jsonKey && csvKey && csvKey.length > 2) {
        if (jsonKey.includes(csvKey) || csvKey.includes(jsonKey)) {
          candidateCsvs.push({ idx: c, op: csvOp });
        }
      }
    }

    // De los candidatos (decenas), filtrar por TP
    for (const candidate of candidateCsvs) {
      const csvOp = candidate.op;
      if (jsonOp.tp !== null && csvOp.tp !== null) {
        const tpDiff = Math.abs(jsonOp.tp - csvOp.tp);
        if (tpDiff < 0.0001) {
          bestCsvIdx = candidate.idx;
          bestScore = 100;
          bestReasons = [
            `Llave compuesta parcial: "${csvOp.compositeKey}"`,
            `TP exacto: ${jsonOp.tp}`
          ];
          break; // Encontramos el match perfecto
        }
      }
    }

    if (bestCsvIdx !== -1) {
      matchedPairs.push({
        json_idx: j,
        csv_idx: bestCsvIdx,
        json_op: jsonOp,
        csv_op: csvKeys[bestCsvIdx],
        score: bestScore,
        reasons: bestReasons
      });
      matchedJsonIdx.add(j);
      matchedCsvIdx.add(bestCsvIdx);
    }
  }

  // PASO 2: Fallback (Opcional, para los que no pasaron el filtro estricto pero son muy similares)
  // Usamos el calculateMatchScore original pero exigimos un puntaje alto (ej. >= 60)
  for (let j = 0; j < jsonKeys.length; j++) {
    if (matchedJsonIdx.has(j)) continue;
    const jsonOp = jsonKeys[j];

    let bestCsvIdx = -1;
    let bestScore = 0;
    let bestReasons: string[] = [];

    for (let c = 0; c < csvKeys.length; c++) {
      if (matchedCsvIdx.has(c)) continue;

      const { score, reasons } = calculateMatchScore(jsonOp, csvKeys[c]);
      if (score > bestScore) {
        bestScore = score;
        bestCsvIdx = c;
        bestReasons = reasons;
      }
    }

    if (bestScore >= 60) {
      matchedPairs.push({
        json_idx: j,
        csv_idx: bestCsvIdx,
        json_op: jsonOp,
        csv_op: csvKeys[bestCsvIdx],
        score: bestScore,
        reasons: bestReasons
      });
      matchedJsonIdx.add(j);
      matchedCsvIdx.add(bestCsvIdx);
    }
  }

  const unmatchedJSON = jsonKeys
    .map((op, idx) => ({ idx, op }))
    .filter(({ idx }) => !matchedJsonIdx.has(idx));

  const unmatchedCSV = csvKeys
    .map((op, idx) => ({ idx, op }))
    .filter(({ idx }) => !matchedCsvIdx.has(idx));

  matchedPairs.sort((a, b) => b.score - a.score);

  return {
    matchedPairs,
    unmatchedJSON,
    unmatchedCSV,
    allJSON: jsonOps,
    allCSV: csvOps,
    summary: {
      totalJSON: jsonOps.length,
      validJSON: jsonValid.length,
      totalCSV: csvOps.length,
      matchedCount: matchedPairs.length,
      unmatchedJSONCount: unmatchedJSON.length,
      unmatchedCSVCount: unmatchedCSV.length,
      jsonMatchPercent: `${((matchedPairs.length / (jsonValid.length || 1)) * 100).toFixed(1)}%`,
      csvMatchPercent: `${((matchedPairs.length / (csvOps.length || 1)) * 100).toFixed(1)}%`,
    }
  };
}
