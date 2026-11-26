import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
export const DEFAULT_BACKEND_PORT = 8080;
export const DEFAULT_FRONTEND_PORT = 3000;
function readEnv(path) {
  try {
    return parse(readFileSync(new URL(path, import.meta.url)));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}
function port(value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1 || number > 65535)
    throw new Error('Port must be an integer between 1 and 65535.');
  return number;
}
export function networkConfig() {
  const backend = readEnv('../backend/.env');
  const frontend = {
    ...readEnv('../frontend/.env'),
    ...readEnv('../frontend/.env.local'),
  };
  const backendPort = port(
    process.env.BACKEND_PORT ?? backend.PORT,
    DEFAULT_BACKEND_PORT,
  );
  const frontendPort = port(
    process.env.FRONTEND_PORT ?? frontend.FRONTEND_PORT,
    DEFAULT_FRONTEND_PORT,
  );
  const backendUrl = new URL(
    process.env.BACKEND_URL ??
      frontend.BACKEND_URL ??
      `http://127.0.0.1:${backendPort}`,
  );
  if (
    !['http:', 'https:'].includes(backendUrl.protocol) ||
    backendUrl.username ||
    backendUrl.password
  )
    throw new Error('BACKEND_URL must be an HTTP(S) URL without credentials.');
  return { frontendPort, backendUrl: backendUrl.origin };
}
