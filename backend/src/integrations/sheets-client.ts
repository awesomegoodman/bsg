import { JWT } from 'google-auth-library';
import type { Config } from '../configs/env.js';
import { AppError } from '../utils/errors.js';

export interface SheetsClient {
  read(range: string): Promise<string[][]>;
  update(range: string, values: string[][]): Promise<void>;
  append(range: string, values: string[][]): Promise<void>;
}

export class GoogleSheetsClient implements SheetsClient {
  private auth: JWT;
  private base: string;
  constructor(private config: Config) {
    this.auth = new JWT({
      email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: config.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.GOOGLE_SHEET_ID)}/values/`;
  }
  private async request(
    range: string,
    method: 'GET' | 'PUT' | 'POST',
    values?: string[][],
  ): Promise<{ values?: string[][] }> {
    if (!this.config.sheetsConfigured)
      throw new AppError(
        503,
        'STORAGE_NOT_CONFIGURED',
        'The welcome desk cannot save visits yet. Please ask reception for assistance.',
      );
    const url = `${this.base}${encodeURIComponent(range)}${method === 'POST' ? ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS' : method === 'PUT' ? '?valueInputOption=RAW' : ''}`;
    const attempts = method === 'POST' ? 1 : 3;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        // Disable client retries: an append must never be replayed automatically.
        const result = await this.auth.request<{ values?: string[][] }>({
          url,
          method,
          data: values ? { values } : undefined,
          timeout: 10000,
          retry: false,
        });
        return result.data;
      } catch (error) {
        const status =
          error && typeof error === 'object' && 'response' in error
            ? (error.response as { status?: number } | undefined)?.status
            : undefined;
        const temporary = !status || status === 429 || status >= 500;
        if (temporary && attempt < attempts - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 250 * 2 ** attempt + Math.random() * 150),
          );
          continue;
        }
        throw new AppError(
          503,
          'STORAGE_UNAVAILABLE',
          'The visitor register is temporarily unavailable. Please ask reception for assistance.',
        );
      }
    }
    throw new AppError(
      503,
      'STORAGE_UNAVAILABLE',
      'The visitor register is temporarily unavailable.',
    );
  }
  async read(range: string) {
    return (await this.request(range, 'GET')).values ?? [];
  }
  async update(range: string, values: string[][]) {
    await this.request(range, 'PUT', values);
  }
  async append(range: string, values: string[][]) {
    await this.request(range, 'POST', values);
  }
}
