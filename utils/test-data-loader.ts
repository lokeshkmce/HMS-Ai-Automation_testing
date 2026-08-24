import path from 'path';
import { readJson, readCsv } from './file-utils';

const TEST_DATA_DIR = path.resolve(__dirname, '..', 'test-data');

/**
 * Load test data from a JSON file in the test-data directory.
 */
export function loadJsonData<T = unknown>(fileName: string): T {
  return readJson<T>(path.join(TEST_DATA_DIR, fileName));
}

/**
 * Load test data from a CSV file in the test-data directory.
 */
export function loadCsvData(fileName: string): Record<string, string>[] {
  return readCsv(path.join(TEST_DATA_DIR, fileName));
}
