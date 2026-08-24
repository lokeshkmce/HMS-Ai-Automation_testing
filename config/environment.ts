import dotenv from 'dotenv';
import path from 'path';

const ENV = process.env.TEST_ENV || 'dev';
dotenv.config({ path: path.resolve(__dirname, 'env', `.env.${ENV}`) });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Resolve a credential from an environment variable.
 * Throws at startup if the variable is missing — prevents silent failures.
 */
function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(
      `[environment] Required environment variable "${key}" is not set. ` +
        `Copy .env.example to .env and fill in the missing value.`,
    );
  }
  return value;
}

export const environment = {
  env: ENV,
  baseURL: requireEnv('BASE_URL', 'https://dev.omnivva.com'),
  identityBaseURL: requireEnv('IDENTITY_BASE_URL', 'https://dev-identity.srivyn.in'),
  apiBaseURL: requireEnv('API_BASE_URL', 'https://jsonplaceholder.typicode.com'),
  apiToken: process.env.API_TOKEN ?? '',
} as const;

/**
 * Resolve a role-specific QA password from environment variables.
 * Passwords are NEVER stored in source files — they are injected via env vars.
 *
 * @example
 *   getRolePassword('QA_PASSWORD_DOCTOR')
 */
export function getRolePassword(envKey: string): string {
  const value = process.env[envKey];
  if (!value) {
    throw new Error(
      `[environment] Role password env var "${envKey}" is not set. ` +
        `Add it to .env or inject it via CI secrets.`,
    );
  }
  return value;
}
