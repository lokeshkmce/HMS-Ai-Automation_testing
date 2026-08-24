import fs from 'fs';
import path from 'path';
import { logger } from './logger';

/**
 * Read and parse a JSON file.
 */
export function readJson<T = unknown>(filePath: string): T {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '..', filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  logger.info(`Read JSON file: ${absolutePath}`);
  return JSON.parse(raw) as T;
}

/**
 * Write data to a JSON file.
 */
export function writeJson(filePath: string, data: unknown): void {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '..', filePath);

  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2), 'utf-8');
  logger.info(`Wrote JSON file: ${absolutePath}`);
}

/**
 * Read a CSV file and return rows as an array of objects.
 * First row is treated as headers.
 */
export function readCsv(filePath: string): Record<string, string>[] {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '..', filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    rows.push(row);
  }

  logger.info(`Read CSV file: ${absolutePath} (${rows.length} rows)`);
  return rows;
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
