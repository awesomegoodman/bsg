import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/configs/env.js';
import { GoogleSheetsVisitRepository } from '../src/repositories/google-sheets-visit-repository.js';
import { SheetsFixture } from './sheets-fixture.js';
import type { IdentityProvider } from '../src/integrations/google-identity.js';

function fixture(email = 'reception@example.com') {
  const challenges: string[][] = [];
  const identity: IdentityProvider = {
    authorisationUrl(state, nonce, challenge) {
      challenges.push([state, nonce, challenge]);
      return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`;
    },
    async verify(_code, verifier, nonce) {
      expect(verifier.length).toBeGreaterThan(40);
      expect(nonce).toBe(challenges[0]?.[1]);
      return email;
    },
  };
  const config = loadConfig({
    NODE_ENV: 'test',
    RECEPTIONIST_EMAILS: 'reception@example.com',
  });
  const sheets = new SheetsFixture();
  const app = createApp(config, {
    identity,
    repository: new GoogleSheetsVisitRepository(sheets, 'Visitors'),
  });
  return { app, sheets, challenges };
}

describe('staff sessions', () => {
  it('validates state, issues an HttpOnly cookie, enforces CSRF and clears the session', async () => {
    const { app, sheets, challenges } = fixture();
    const agent = request.agent(app);
    const start = await agent.get('/auth/google').expect(302);
    expect(String(start.headers['set-cookie'])).toContain('httponly');
    expect(challenges[0]?.[2]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await agent
      .get(`/auth/google/callback?code=test-code&state=${challenges[0]?.[0]}`)
      .expect(302)
      .expect('Location', '/staff');
    const session = await agent.get('/api/staff/session').expect(200);
    const visitor = {
      firstName: 'Amara',
      lastName: 'Okafor',
      phone: '+2348012345678',
    };
    await agent.post('/api/staff/visits').send(visitor).expect(403);
    await agent
      .post('/api/staff/visits')
      .set('X-CSRF-Token', session.body.csrfToken)
      .send(visitor)
      .expect(201);
    expect(sheets.rows[1]?.[8]).toBe('Receptionist');
    await agent
      .post('/api/staff/logout')
      .set('X-CSRF-Token', session.body.csrfToken)
      .send({})
      .expect(204);
    await agent.get('/api/staff/session').expect(401);
  });
  it('rejects callback state mismatch', async () => {
    const { app } = fixture();
    const agent = request.agent(app);
    await agent.get('/auth/google');
    await agent
      .get('/auth/google/callback?code=test-code&state=wrong')
      .expect(302)
      .expect('Location', '/staff?authError=invalid');
    await agent.get('/api/staff/session').expect(401);
  });
  it('does not grant access to a verified Google user outside the allowlist', async () => {
    const { app, challenges } = fixture('outsider@example.com');
    const agent = request.agent(app);
    await agent.get('/auth/google');
    await agent
      .get(`/auth/google/callback?code=test-code&state=${challenges[0]?.[0]}`)
      .expect(302)
      .expect('Location', '/staff?authError=denied');
    await agent.get('/api/staff/session').expect(401);
  });
});
