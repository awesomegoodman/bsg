import { describe, expect, it, vi, beforeEach } from 'vitest';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('google-auth-library', () => ({
  JWT: class {
    request = request;
  },
}));
import { GoogleSheetsClient } from '../src/integrations/sheets-client.js';
import { loadConfig } from '../src/configs/env.js';

beforeEach(() => {
  request.mockReset();
});
const config = () =>
  loadConfig({
    NODE_ENV: 'test',
    GOOGLE_SHEET_ID: 'sheet',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@example.com',
    GOOGLE_PRIVATE_KEY: 'test',
  });
describe('Sheets transport safety', () => {
  it('retries throttled reads with a bounded retry policy', async () => {
    vi.useFakeTimers();
    request
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValueOnce({ data: { values: [['Visit ID']] } });
    const pending = new GoogleSheetsClient(config()).read("'Visitors'!A1:K1");
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual([['Visit ID']]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]?.[0]).toMatchObject({
      retry: false,
      timeout: 10000,
    });
    vi.useRealTimers();
  });
  it('never retries an append and writes formula-like text as RAW', async () => {
    request.mockRejectedValue({ response: { status: 503 } });
    await expect(
      new GoogleSheetsClient(config()).append("'Visitors'!A:K", [
        ['=not-a-formula'],
      ]),
    ).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0].url).toContain('valueInputOption=RAW');
    expect(request.mock.calls[0]?.[0].data).toEqual({
      values: [['=not-a-formula']],
    });
  });
  it('does not retry permanent permission failures or reveal upstream messages', async () => {
    request.mockRejectedValue({
      response: { status: 403, data: { secret: 'private-value' } },
    });
    await expect(
      new GoogleSheetsClient(config()).read('A:K'),
    ).rejects.toMatchObject({
      status: 503,
      message: expect.not.stringContaining('private-value'),
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
