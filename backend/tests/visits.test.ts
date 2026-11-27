import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/configs/env.js';
import {
  GoogleSheetsVisitRepository,
  HEADERS,
} from '../src/repositories/google-sheets-visit-repository.js';
import { SheetsFixture } from './sheets-fixture.js';
import { checkInSchema } from '@diaspora/shared';
import { AppError } from '../src/utils/errors.js';

const visitor = {
  firstName: 'Amara',
  lastName: 'Okafor',
  phone: '+2348012345678',
  email: '',
};
let sheets: SheetsFixture;
let app: ReturnType<typeof createApp>;
beforeEach(() => {
  sheets = new SheetsFixture();
  app = createApp(loadConfig({ NODE_ENV: 'test' }), {
    repository: new GoogleSheetsVisitRepository(sheets, 'Visitors'),
  });
});

describe('visitor API through the real Sheets repository', () => {
  it('records a visit and checks it out without disclosing contact details', async () => {
    const result = await request(app)
      .post('/api/visits/check-in')
      .send(visitor)
      .expect(201);
    expect(result.body.visitId).toMatch(/^DI-[2-9A-HJ-NP-Z]{12}$/);
    expect(result.body).not.toHaveProperty('phone');
    expect(sheets.rows[0]).toEqual(HEADERS);
    expect(sheets.rows[1]?.[5]).toBe('');
    expect(sheets.rows[1]?.[8]).toBe('Self-service');
    const out = await request(app)
      .post('/api/visits/check-out')
      .send({ visitId: result.body.visitId })
      .expect(200);
    expect(Object.keys(out.body)).toEqual(['signedOutAt']);
    expect(sheets.rows[1]?.[10]).toBe('Signed out');
    await request(app)
      .post('/api/visits/check-out')
      .send({ visitId: result.body.visitId })
      .expect(409);
    await request(app).post('/api/visits/check-in').send(visitor).expect(201);
  });
  it('allows only one of two concurrent sign-ins for the same phone', async () => {
    const results = await Promise.all([
      request(app).post('/api/visits/check-in').send(visitor),
      request(app)
        .post('/api/visits/check-in')
        .send({ ...visitor, phone: '+234 (801) 234-5678' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(sheets.appendCalls).toBe(1);
  });
  it('allows one concurrent checkout and preserves the original sign-in method', async () => {
    const result = await request(app)
      .post('/api/visits/check-in')
      .send(visitor);
    const responses = await Promise.all([
      request(app)
        .post('/api/visits/check-out')
        .send({ visitId: result.body.visitId }),
      request(app)
        .post('/api/visits/check-out')
        .send({ visitId: result.body.visitId }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(sheets.rows[1]?.[8]).toBe('Self-service');
    expect(sheets.rows[1]?.[9]).toBe('Visitor');
  });
  it('reconciles an ambiguous append without writing a second row', async () => {
    sheets.ambiguousAppend = true;
    await request(app).post('/api/visits/check-in').send(visitor).expect(201);
    expect(sheets.appendCalls).toBe(1);
    expect(sheets.rows).toHaveLength(2);
  });
  it('rejects malformed input, extra privilege fields and malformed JSON', async () => {
    const response = await request(app)
      .post('/api/visits/check-in')
      .send({ ...visitor, firstName: ' ', email: 'wrong' })
      .expect(400);
    expect(response.body.error.fields).toHaveProperty('firstName');
    await request(app)
      .post('/api/visits/check-in')
      .send({ ...visitor, signInMethod: 'Receptionist' })
      .expect(400);
    await request(app)
      .post('/api/visits/check-in')
      .set('Content-Type', 'application/json')
      .send('{oops')
      .expect(400);
    expect(sheets.appendCalls).toBe(0);
  });
  it('does not reveal records or allow anonymous staff actions', async () => {
    await request(app).get('/api/staff/session').expect(401);
    await request(app).post('/api/staff/visits').send(visitor).expect(401);
    await request(app).get('/api/admin/visitors').expect(404);
    await request(app)
      .post('/api/visits/check-out')
      .send({ visitId: 'DI-UNKNOWNREFERENCE' })
      .expect(404);
  });
  it('rejects cross-origin writes and non-JSON posts', async () => {
    await request(app)
      .post('/api/visits/check-in')
      .set('Origin', 'https://untrusted.example')
      .send(visitor)
      .expect(403);
    await request(app)
      .post('/api/visits/check-in')
      .type('form')
      .send(visitor)
      .expect(415);
  });
  it('rejects incompatible sheet headers without overwriting existing records', async () => {
    sheets.rows = [['Unrelated spreadsheet'], ['Important data']];
    await request(app).post('/api/visits/check-in').send(visitor).expect(503);
    expect(sheets.rows).toEqual([
      ['Unrelated spreadsheet'],
      ['Important data'],
    ]);
  });
  it('retains legacy phone matching, purpose and VST references', async () => {
    sheets.rows = [
      HEADERS,
      [
        'VST-LEGACYREFERENCE',
        'Test',
        'Visitor',
        "'+2348012345678",
        '',
        'Existing purpose',
        '2026-11-25T09:00:00+01:00',
        '',
        'Receptionist',
        '',
        'Active',
      ],
    ];
    await request(app).post('/api/visits/check-in').send(visitor).expect(409);
    await request(app)
      .post('/api/visits/check-out')
      .send({ visitId: 'vst-legacyreference' })
      .expect(200);
    expect(sheets.rows[1]?.[5]).toBe('Existing purpose');
    expect(sheets.rows[1]?.[8]).toBe('Receptionist');
  });
  it('returns an explicit unavailable response when credentials are absent', async () => {
    const unconfigured = createApp(loadConfig({ NODE_ENV: 'test' }));
    const response = await request(unconfigured)
      .post('/api/visits/check-in')
      .send(visitor)
      .expect(503);
    expect(response.body.error.code).toBe('STORAGE_NOT_CONFIGURED');
    await request(unconfigured).get('/auth/google').expect(503);
  });
  it('generates a real SVG QR and rejects unsupported destinations', async () => {
    const response = await request(app)
      .get('/api/qr?mode=check-in')
      .expect(200);
    expect(response.headers['content-type']).toContain('image/svg+xml');
    expect(
      Buffer.isBuffer(response.body)
        ? response.body.toString('utf8')
        : response.text,
    ).toContain('<svg');
    await request(app)
      .get('/api/qr?mode=https://untrusted.example')
      .expect(400);
  });
});

describe('domain validation and configuration', () => {
  it('trims names, normalises phones and accepts optional email', () => {
    expect(
      checkInSchema.parse({
        firstName: ' Amara ',
        lastName: 'Okafor',
        phone: '+234 (801) 234-5678',
      }),
    ).toEqual(visitor);
    expect(checkInSchema.safeParse({ ...visitor, phone: '123' }).success).toBe(
      false,
    );
  });
  it('fails closed for unsafe production configuration', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
      'Production requires HTTPS',
    );
    expect(() => loadConfig({ TIME_ZONE: 'Invalid/Zone' })).toThrow(
      'TIME_ZONE',
    );
  });
  it('returns an uncertainty error if append and reconciliation both fail', async () => {
    const repo = new GoogleSheetsVisitRepository(
      {
        read: async () => [HEADERS],
        update: async () => undefined,
        append: async () => {
          throw new Error('Lost response');
        },
      },
      'Visitors',
    );
    await expect(
      repo.append({
        ...visitor,
        id: 'DI-TESTREFERENCE',
        purpose: '',
        signedInAt: new Date().toISOString(),
        signedOutAt: '',
        signInMethod: 'Self-service',
        signOutMethod: '',
        status: 'Active',
      }),
    ).rejects.toMatchObject({
      code: 'SAVE_UNCERTAIN',
    } satisfies Partial<AppError>);
  });
});
