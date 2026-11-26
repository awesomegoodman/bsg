import 'dotenv/config';
import {
  DEFAULT_BACKEND_PORT,
  DEFAULT_FRONTEND_PORT,
} from '../../../config/network.mjs';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_BACKEND_PORT),
  APP_BASE_URL: z.url().default(`http://localhost:${DEFAULT_FRONTEND_PORT}`),
  TIME_ZONE: z
    .string()
    .default('Africa/Lagos')
    .refine((zone) => {
      try {
        new Intl.DateTimeFormat('en-GB', { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    }, 'Invalid time zone'),
  SESSION_KEYS: z.string().optional(),
  RECEPTIONIST_EMAILS: z.string().default(''),
  GOOGLE_SHEET_ID: z.string().default(''),
  GOOGLE_SHEET_TAB: z.string().min(1).max(100).default('Visitors'),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().default(''),
  GOOGLE_PRIVATE_KEY: z.string().default(''),
  GOOGLE_OAUTH_CLIENT_ID: z.string().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().default(''),
  GOOGLE_OAUTH_CALLBACK_URL: z.url().optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse({
    ...source,
    PORT: source.BACKEND_PORT ?? source.PORT,
  });
  if (!parsed.success)
    throw new Error(
      `Invalid configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  const env = parsed.data;
  const sessionKeys =
    env.SESSION_KEYS?.split(',')
      .map((key) => key.trim())
      .filter(Boolean) ?? [];
  if (
    env.NODE_ENV === 'production' &&
    (!sessionKeys.length ||
      sessionKeys.some((key) => key.length < 48) ||
      !env.APP_BASE_URL.startsWith('https://'))
  ) {
    throw new Error(
      'Production requires HTTPS APP_BASE_URL and SESSION_KEYS of at least 48 characters each.',
    );
  }
  return {
    ...env,
    origin: new URL(env.APP_BASE_URL).origin,
    sessionKeys: sessionKeys.length
      ? sessionKeys
      : [randomBytes(48).toString('hex')],
    allowedEmails: new Set(
      env.RECEPTIONIST_EMAILS.split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
    sheetsConfigured: Boolean(
      env.GOOGLE_SHEET_ID &&
      env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      env.GOOGLE_PRIVATE_KEY,
    ),
    oauthConfigured: Boolean(
      env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET,
    ),
  };
}
export type Config = ReturnType<typeof loadConfig>;
