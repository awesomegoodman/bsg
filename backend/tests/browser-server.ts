/** Local browser QA only. Never imported into the production application. */
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/configs/env.js';
import { GoogleSheetsVisitRepository } from '../src/repositories/google-sheets-visit-repository.js';
import { SheetsFixture } from './sheets-fixture.js';

if (process.env.NODE_ENV !== 'test')
  throw new Error('Browser fixture requires NODE_ENV=test');
const config = loadConfig({
  NODE_ENV: 'test',
  APP_BASE_URL: 'http://localhost:3000',
  RECEPTIONIST_EMAILS: 'reception@example.test',
  GOOGLE_OAUTH_CLIENT_ID: 'fixture-only',
  GOOGLE_OAUTH_CLIENT_SECRET: 'fixture-only',
});
const server = createApp(config, {
  repository: new GoogleSheetsVisitRepository(new SheetsFixture(), 'Visitors'),
  identity: {
    authorisationUrl(state) {
      return `/auth/google/callback?code=fixture-only&state=${state}`;
    },
    async verify(code) {
      if (code !== 'fixture-only') throw new Error('Invalid fixture code');
      return 'reception@example.test';
    },
  },
}).listen(4001, '127.0.0.1', () =>
  console.log(
    'TEST ONLY: browser fixture API on 4001; records disappear on exit.',
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => server.close());
