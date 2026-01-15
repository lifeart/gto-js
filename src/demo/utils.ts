/**
 * Utility functions for the demo app
 */
import type { PropertyData } from 'gto-js';

export function escapeHtml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape a string for use in a JavaScript single-quoted string literal inside an HTML attribute.
 * Handles: backslashes, single quotes, newlines, carriage returns, and then HTML entities.
 */
export function escapeJsStringInHtmlAttr(str: string): string {
  return str
    .replace(/\\/g, '\\\\')      // Escape backslashes first
    .replace(/'/g, "\\'")         // Escape single quotes
    .replace(/\n/g, '\\n')        // Escape newlines
    .replace(/\r/g, '\\r')        // Escape carriage returns
    .replace(/&/g, '&amp;')       // HTML entity escapes
    .replace(/"/g, '&quot;');
}

export function formatDataPreview(prop: PropertyData): string {
  const data = prop.data;
  if (!data || data.length === 0) return '<empty>';

  if (prop.type === 'string') {
    if (data.length === 1) return `"${escapeHtml(data[0])}"`;
    return `["${data.slice(0, 3).map(s => escapeHtml(s)).join('", "')}${data.length > 3 ? '", ...' : '"]'}`;
  }

  if (data.length <= 4) {
    return JSON.stringify(data);
  }

  return `[${data.slice(0, 4).join(', ')}, ... (${data.length} total)]`;
}

export function formatCompareValue(data: unknown): string {
  if (!Array.isArray(data)) return String(data);
  if (data.length <= 2) return JSON.stringify(data);
  return `[${data.length} items]`;
}

export function highlightText(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

export function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function $$(selector: string): NodeListOf<Element> {
  return document.querySelectorAll(selector);
}
