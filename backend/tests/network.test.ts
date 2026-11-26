import { describe, expect, it } from 'vitest';
import { networkConfig } from '../../config/network.mjs';
import { loadConfig } from '../src/configs/env.js';
import { GoogleSheetsVisitRepository } from '../src/repositories/google-sheets-visit-repository.js';
import { SheetsFixture } from './sheets-fixture.js';

describe('network configuration', () => {
  it('keeps the API target independent of the PORT Next sets for itself', () => {
    const previous = process.env.PORT;
    const override = process.env.BACKEND_PORT;
    try {
      process.env.PORT = '3000';
      process.env.BACKEND_PORT = '18080';
      expect(networkConfig().backendUrl).toBe('http://127.0.0.1:18080');
      expect(loadConfig({ BACKEND_PORT: '18080', PORT: '3000' }).PORT).toBe(
        18080,
      );
      expect(loadConfig({}).PORT).toBe(8080);
    } finally {
      if (previous === undefined) delete process.env.PORT;
      else process.env.PORT = previous;
      if (override === undefined) delete process.env.BACKEND_PORT;
      else process.env.BACKEND_PORT = override;
    }
  });
  it('reads the existing ordered header labels without rewriting them', async () => {
    const sheets = new SheetsFixture();
    const headers = [
      'Visit ID',
      'First Name',
      'Last Name',
      'Phone',
      'Email',
      'Purpose',
      'Signed In At',
      'Signed Out At',
      'Sign In Method',
      'Sign Out Method',
      'Status',
    ];
    sheets.rows = [headers];
    expect(
      await new GoogleSheetsVisitRepository(sheets, 'Visitors').all(),
    ).toEqual([]);
    expect(sheets.rows[0]).toEqual(headers);
  });
});
