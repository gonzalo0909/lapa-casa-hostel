// lapa-casa-hostel/frontend/src/lib/utils.ts

/**
 * Utility Functions Library
 * 
 * Common utility functions for Lapa Casa application.
 * Includes string manipulation, date handling, formatting, and class name management.
 * 
 * @module lib/utils
 * @requires clsx
 * @requires tailwind-merge
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper conflict resolution
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 * 
 * @example
 * ```ts
 * cn('px-2 py-1', 'px-4') // Returns: 'py-1 px-4'
 * cn('text-red-500', condition && 'text-blue-500') // Conditional classes
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency value to BRL
 * 
 * @param value - Numeric value to format
 * @param includeSymbol - Whether to include R$ symbol
 * @returns Formatted currency string
 * 
 * @example
 * ```ts
 * formatCurrency(60.5) // Returns: 'R$ 60,50'
 * formatCurrency(1234.56, false) // Returns: '1.234,56'
 * ```
 */
export function formatCurrency(value: number, includeSymbol: boolean = true): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

  return includeSymbol ? formatted : formatted.replace('R$', '').trim();
}

/**
 * Format date to Brazilian format (DD/MM/YYYY)
 * 
 * @param date - Date string or Date object
 * @param format - Output format ('short' | 'long' | 'iso')
 * @returns Formatted date string
 * 
 * @example
 * ```ts
 * formatDate('2025-01-15') // Returns: '15/01/2025'
 * formatDate(new Date(), 'long') // Returns: '15 de janeiro de 2025'
 * formatDate('2025-01-15', 'iso') // Returns: '2025-01-15'
 * ```
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'iso' = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  if (format === 'iso') {
    return dateObj.toISOString().slice(0, 10);
  }

  if (format === 'long') {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
}

// FIX (auditoría 2026-08-30): calculateNights duplicada acá sin ningún
// import externo -- la versión real en uso es lib/pricing.ts (usada
// internamente por calculateTotalPrice/etc ahí mismo).

/**
 * Generate unique ID with optional prefix
 * 
 * @param prefix - Optional prefix for the ID
 * @returns Unique identifier string
 * 
 * @example
 * ```ts
 * generateId() // Returns: 'k3j5h7g9'
 * generateId('booking') // Returns: 'booking_k3j5h7g9'
 * ```
 */
export function generateId(prefix?: string): string {
  const id = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Debounce function execution
 * 
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 * 
 * @example
 * ```ts
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching:', query);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function execution
 * 
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 * 
 * @example
 * ```ts
 * const throttledScroll = throttle(() => {
 *   console.log('Scrolling');
 * }, 100);
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Sleep/delay function
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 * 
 * @example
 * ```ts
 * await sleep(1000); // Wait 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Capitalize first letter of string
 * 
 * @param str - String to capitalize
 * @returns Capitalized string
 * 
 * @example
 * ```ts
 * capitalize('hello world') // Returns: 'Hello world'
 * ```
 */
export function capitalize(str: string): string {
  if (!str) {return '';}
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncate string to specified length
 * 
 * @param str - String to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to append (default: '...')
 * @returns Truncated string
 * 
 * @example
 * ```ts
 * truncate('Long text here', 10) // Returns: 'Long te...'
 * ```
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (!str || str.length <= length) {return str;}
  return str.substring(0, length).trim() + suffix;
}

/**
 * Parse query string to object
 * 
 * @param queryString - Query string to parse
 * @returns Object with parsed parameters
 * 
 * @example
 * ```ts
 * parseQueryString('?foo=bar&baz=qux') // Returns: { foo: 'bar', baz: 'qux' }
 * ```
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * Build query string from object
 * 
 * @param params - Object with parameters
 * @returns Query string
 * 
 * @example
 * ```ts
 * buildQueryString({ foo: 'bar', baz: 'qux' }) // Returns: 'foo=bar&baz=qux'
 * ```
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * 
 * @param value - Value to check
 * @returns True if empty
 * 
 * @example
 * ```ts
 * isEmpty(null) // Returns: true
 * isEmpty([]) // Returns: true
 * isEmpty({}) // Returns: true
 * isEmpty('text') // Returns: false
 * ```
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {return true;}
  if (typeof value === 'string') {return value.trim().length === 0;}
  if (Array.isArray(value)) {return value.length === 0;}
  if (typeof value === 'object') {return Object.keys(value).length === 0;}
  return false;
}

/**
 * Deep clone object
 * 
 * @param obj - Object to clone
 * @returns Cloned object
 * 
 * @example
 * ```ts
 * const original = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(original);
 * ```
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {return obj;}
  if (obj instanceof Date) {return new Date(obj.getTime()) as any;}
  if (obj instanceof Array) {return obj.map((item) => deepClone(item)) as any;}
  if (obj instanceof Object) {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Compare two dates (ignoring time)
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 * 
 * @example
 * ```ts
 * compareDates('2025-01-15', '2025-01-20') // Returns: -1
 * ```
 */
export function compareDates(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);

  if (d1.getTime() < d2.getTime()) {return -1;}
  if (d1.getTime() > d2.getTime()) {return 1;}
  return 0;
}

/**
 * Check if date is in range
 * 
 * @param date - Date to check
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @returns True if date is in range
 * 
 * @example
 * ```ts
 * isDateInRange('2025-01-16', '2025-01-15', '2025-01-20') // Returns: true
 * ```
 */
export function isDateInRange(
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  d.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return d >= start && d <= end;
}

/**
 * Get array of dates between two dates
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of date strings
 * 
 * @example
 * ```ts
 * getDateRange('2025-01-15', '2025-01-17')
 * // Returns: ['2025-01-15', '2025-01-16', '2025-01-17']
 * ```
 */
export function getDateRange(startDate: string | Date, endDate: string | Date): string[] {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const dates: string[] = [];

  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(formatDate(currentDate, 'iso'));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// FIX (auditoría 2026-08-30): formatPhone duplicada acá sin ningún import
// externo -- la versión real en uso (con soporte de "+55" en vivo
// mientras se tipea) es components/booking/hostel-engine.utils.ts. No es
// el mismo algoritmo (esta era una versión más simple para exactamente
// 10-11 dígitos), así que no se puede fusionar sin decidir cuál
// comportamiento es el correcto -- se elimina la que nadie usa.

/**
 * Format date as YYYY-MM-DD (date-only, no time component)
 *
 * @param date - Date object
 * @returns ISO date string truncated to the date part
 *
 * @example
 * ```ts
 * toDateOnly(new Date('2025-01-15T10:00:00Z')) // Returns: '2025-01-15'
 * ```
 */
export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Split a full name into first and last name
 *
 * @param fullName - Full name string
 * @returns Object with firstName and lastName
 *
 * @example
 * ```ts
 * splitFullName('João da Silva') // Returns: { firstName: 'João', lastName: 'da Silva' }
 * splitFullName('Madonna') // Returns: { firstName: 'Madonna', lastName: 'Madonna' }
 * ```
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || fullName,
    lastName: parts.slice(1).join(' ') || parts[0] || fullName,
  };
}

/**
 * Safely access nested object properties
 * 
 * @param obj - Object to access
 * @param path - Property path (e.g., 'user.address.city')
 * @param defaultValue - Default value if path not found
 * @returns Property value or default
 * 
 * @example
 * ```ts
 * getNestedValue({ user: { name: 'John' } }, 'user.name') // Returns: 'John'
 * getNestedValue({ user: {} }, 'user.age', 0) // Returns: 0
 * ```
 */
export function getNestedValue(obj: any, path: string, defaultValue?: any): any {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue;
}

// FIX (auditoría 2026-08-30): validateCPF/formatCPF estaban duplicadas
// -- byte por byte el mismo algoritmo, solo con estilo distinto -- en
// components/booking/apartment-engine.utils.ts y hostel-engine.utils.ts.
// Se consolidan acá; ambos motores ahora importan de este único lugar.

/** Valida un CPF brasileño por dígito verificador (módulo 11). */
export function validateCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) { return false; }
  let s = 0;
  for (let i = 0; i < 9; i++) { s += parseInt(cpf[i] ?? '0', 10) * (10 - i); }
  let d = (s * 10) % 11; if (d >= 10) { d = 0; }
  if (d !== parseInt(cpf[9] ?? '0', 10)) { return false; }
  s = 0;
  for (let i = 0; i < 10; i++) { s += parseInt(cpf[i] ?? '0', 10) * (11 - i); }
  d = (s * 10) % 11; if (d >= 10) { d = 0; }
  return d === parseInt(cpf[10] ?? '0', 10);
}

/** Formatea dígitos de CPF progresivamente como 000.000.000-00 mientras se tipea. */
export function formatCPF(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 9) { return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`; }
  if (digits.length > 6) { return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`; }
  if (digits.length > 3) { return `${digits.slice(0, 3)}.${digits.slice(3)}`; }
  return digits;
}
