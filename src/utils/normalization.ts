/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JSONOperation, CSVOperation, NormalizedOp } from '../types';

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'en', 'es', 'un', 'una', 'que', 'y', 'a', 'por', 'para', 'con', 'se', 'no', 'al', 'su', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'tus', 'usted', 'ustedes', 'vos', 'os', 'mío', 'mía', 'míos', 'mías', 'tuyo', 'tuya', 'tuyos', 'tuyas', 'suyo', 'suya', 'suyos', 'suyas', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras', 'to', 'and', 'the', 'of', 'in', 'is', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'from', 'or', 'an', 'be', 'this', 'that', 'are', 'was', 'were', 'been', 'has', 'have', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used'
]);

const SYMBOL_MAPPING: Record<string, string> = {
  'USTEC': 'NDX',
  'USTECH100': 'NDX',
  'USTECH10': 'NDX',
  'XAU': 'XAUUSD',
  'GBP': 'GBPUSD',
  'EUR': 'EURUSD',
  'NZ': 'NZDUSD',
  'AUD': 'AUDUSD',
  'USD': 'USDJPY',
};

export function normalizeComment(comment: string | null | undefined): string {
  if (!comment) return "";
  let text = String(comment);
  // Remove emojis, special characters
  text = text.replace(/\?/g, ' ');
  text = text.replace(/[^\w\s.,;:\-()áéíóúÁÉÍÓÚñÑ]/g, ' ');
  text = text.split(/\s+/).join(' ');
  return text.toLowerCase().trim();
}

export function getSignificantWords(comment: string | null | undefined): Set<string> {
  const norm = normalizeComment(comment);
  const words = norm.split(/\s+/).filter(w => w.length > 3 && !STOPWORDS.has(w));
  return new Set(words);
}

export function normalizeSymbol(symbol: string | null | undefined): string {
  if (!symbol) return '';
  const s = String(symbol).toUpperCase().trim();
  return SYMBOL_MAPPING[s] || s;
}

export function createCompositeKey(comment: string | null | undefined): string {
  if (!comment) return "";
  let text = String(comment);
  // Remove all non-alphanumeric characters (including spaces, punctuation, emojis)
  // Keep only letters (including accented) and numbers
  text = text.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '');
  return text.toLowerCase();
}

export function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  let text = String(val).trim();
  // Remove spaces
  text = text.replace(/\s/g, '');
  
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // Comma is decimal: 1.234,56
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal: 1,234.56
      text = text.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Only commas.
    const parts = text.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      text = text.replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (lastDot > -1) {
    // Only dots.
    const parts = text.split('.');
    if (parts.length > 2) {
      // Multiple dots -> thousands separator
      text = text.replace(/\./g, '');
    }
  }
  
  const num = Number(text);
  return isNaN(num) ? null : num;
}

export function createOpKey(op: any, source: 'json' | 'csv'): NormalizedOp {
  if (source === 'json') {
    const jsonOp = op as JSONOperation;
    return {
      symbol: normalizeSymbol(jsonOp.symbol),
      entry: parseNumber(jsonOp.entry),
      tp: parseNumber(jsonOp.takeProfit),
      sl: parseNumber(jsonOp.stopLoss),
      type: String(jsonOp.type || '').toUpperCase().replace(' LIMIT', '').replace(' MARKET', '').replace(' STOP', ''),
      comment: String(jsonOp.comentario || ''),
      compositeKey: createCompositeKey(jsonOp.comentario),
      words: getSignificantWords(jsonOp.comentario),
      original: jsonOp
    };
  } else {
    const csvOp = op as any;
    const tipoOrden = String(csvOp['Tipo Orden'] || '').toUpperCase();
    const opType = tipoOrden.split(' ')[0] || '';
    return {
      symbol: normalizeSymbol(csvOp['Simbolo']),
      entry: parseNumber(csvOp['Entrada']),
      tp: parseNumber(csvOp['TP']),
      sl: parseNumber(csvOp['STL']),
      type: opType,
      comment: String(csvOp['Comentario'] || ''),
      compositeKey: createCompositeKey(csvOp['Comentario']),
      words: getSignificantWords(csvOp['Comentario']),
      original: csvOp
    };
  }
}
