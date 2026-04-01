/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JSONOperation, CSVOperation, NormalizedOp, DateInfo } from '../types';

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

export function parseJSONCreateTime(createTimeStr: string | undefined | null): DateInfo | null {
  if (!createTimeStr) return null;
  const match = createTimeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const day = parseInt(match[3]);
  const hour = parseInt(match[4]);
  const minute = parseInt(match[5]);
  const second = parseInt(match[6]);
  
  // Convert UTC to MT5 Server Time (UTC+2 winter, UTC+3 summer)
  // Summer starts March 8th. We assume it ends Nov 1st.
  const isSummer = (month > 3 || (month === 3 && day >= 8)) && (month < 11);
  const offsetHours = isSummer ? 3 : 2;
  
  const dt = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  dt.setUTCHours(dt.getUTCHours() + offsetHours);
  
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
    hour: dt.getUTCHours()
  };
}

export function parseCSVDate(dateStr: string | undefined | null): DateInfo | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})[./-](\d{2})[./-](\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    return {
      year: parseInt(match[1]),
      month: parseInt(match[2]),
      day: parseInt(match[3]),
      hour: parseInt(match[4])
    };
  }
  return null;
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
      original: jsonOp,
      dateInfo: parseJSONCreateTime(jsonOp.createTime),
      confianza: jsonOp.Confianza || null
    };
  } else {
    const csvOp = op as any;
    const tipoOrden = String(csvOp['Tipo Orden'] || '').toUpperCase();
    const opType = tipoOrden.split(' ')[0] || '';
    
    let comment = String(csvOp['Comentario'] || '');
    let confianzaCsv = null;
    const confMatch = comment.match(/C:\s*(\d+%?)/i);
    if (confMatch) {
      confianzaCsv = confMatch[1];
      if (!confianzaCsv.endsWith('%')) {
        confianzaCsv += '%';
      }
      comment = comment.replace(/C:\s*\d+%?\s*/i, '').trim();
    }

    return {
      symbol: normalizeSymbol(csvOp['Simbolo']),
      entry: parseNumber(csvOp['Entrada']),
      tp: parseNumber(csvOp['TP']),
      sl: parseNumber(csvOp['STL']),
      type: opType,
      comment: comment,
      compositeKey: createCompositeKey(comment),
      words: getSignificantWords(comment),
      original: csvOp,
      dateInfo: parseCSVDate(csvOp['Hora Colocacion']),
      confianza: confianzaCsv
    };
  }
}
