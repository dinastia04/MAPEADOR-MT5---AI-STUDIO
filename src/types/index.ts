/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface JSONOperation {
  id?: string;
  symbol: string;
  entry: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
  type: string;
  comentario: string;
  Confianza?: string;
  createTime?: string;
}

export interface CSVOperation {
  "ID Orden"?: string;
  "Simbolo": string;
  "Tipo"?: string;
  "Tipo Orden"?: string;
  "Volumen"?: string;
  "Hora Colocacion"?: string;
  "Hora Activacion"?: string;
  "Hora Cierre"?: string;
  "Tiempo Espera (seg)"?: string;
  "Categoria Espera"?: string;
  "Duracion Posicion (seg)"?: string;
  "Entrada": number | null;
  "TP": number | null;
  "STL": number | null;
  "PNL"?: string;
  "Comision"?: string;
  "Swap"?: string;
  "Comentario": string;
}

export interface DateInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
}

export interface NormalizedOp {
  symbol: string;
  entry: number | null;
  tp: number | null;
  sl: number | null;
  type: string;
  comment: string;
  compositeKey: string;
  words: Set<string>;
  original: any;
  dateInfo: DateInfo | null;
  confianza: string | null;
}

export interface MatchedPair {
  json_idx: number;
  csv_idx: number;
  json_op: NormalizedOp;
  csv_op: NormalizedOp;
  score: number;
  reasons: string[];
}

export interface MappingResult {
  matchedPairs: MatchedPair[];
  unmatchedJSON: { idx: number; op: NormalizedOp }[];
  unmatchedCSV: { idx: number; op: NormalizedOp }[];
  allJSON: any[];
  allCSV: any[];
  summary: {
    totalJSON: number;
    validJSON: number;
    totalCSV: number;
    matchedCount: number;
    unmatchedJSONCount: number;
    unmatchedCSVCount: number;
    jsonMatchPercent: string;
    csvMatchPercent: string;
  };
}
