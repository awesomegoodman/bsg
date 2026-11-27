import { describe, expect, it } from 'vitest';
import { VisitService } from '../src/services/visit-service.js';
import { GoogleSheetsVisitRepository } from '../src/repositories/google-sheets-visit-repository.js';
import { SheetsFixture } from './sheets-fixture.js';

describe('replaceable visit references', () => {
  it('retries a collision instead of overwriting an existing reference', async () => {
    const sheets = new SheetsFixture();
    const references = [
      'DI-AAAAAAAAAAAA',
      'DI-AAAAAAAAAAAA',
      'DI-BBBBBBBBBBBB',
    ];
    const service = new VisitService(
      new GoogleSheetsVisitRepository(sheets, 'Visitors'),
      undefined,
      () => references.shift()!,
    );
    const input = {
      firstName: 'Test',
      lastName: 'Visitor',
      phone: '+12025550101',
      email: '',
    };
    const first = await service.checkIn(input, 'Self-service');
    const second = await service.checkIn(
      { ...input, phone: '+12025550102' },
      'Self-service',
    );
    expect(second.visitId).not.toBe(first.visitId);
    expect(sheets.rows).toHaveLength(3);
  });
  it('fails safely after repeated collisions', async () => {
    const sheets = new SheetsFixture();
    const service = new VisitService(
      new GoogleSheetsVisitRepository(sheets, 'Visitors'),
      undefined,
      () => 'DI-AAAAAAAAAAAA',
    );
    const input = {
      firstName: 'Test',
      lastName: 'Visitor',
      phone: '+12025550101',
      email: '',
    };
    await service.checkIn(input, 'Self-service');
    await expect(
      service.checkIn({ ...input, phone: '+12025550102' }, 'Self-service'),
    ).rejects.toMatchObject({ code: 'REFERENCE_UNAVAILABLE' });
    expect(sheets.rows).toHaveLength(2);
  });
});
