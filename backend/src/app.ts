import express from 'express';
import cookieSession from 'cookie-session';
import { helmet } from 'helmet';
import { rateLimit } from 'express-rate-limit';
import type { Config } from './configs/env.js';
import type { VisitRepository } from './repositories/visit-repository.js';
import { GoogleSheetsVisitRepository } from './repositories/google-sheets-visit-repository.js';
import { GoogleSheetsClient } from './integrations/sheets-client.js';
import {
  GoogleIdentity,
  type IdentityProvider,
} from './integrations/google-identity.js';
import { VisitService } from './services/visit-service.js';
import { VisitController } from './controllers/visit-controller.js';
import { AuthController } from './controllers/auth-controller.js';
import { errorHandler } from './middlewares/errors.js';
import { originProtection } from './middlewares/security.js';
import { apiRoutes } from './routes/api.js';

export function createApp(
  config: Config,
  dependencies: {
    repository?: VisitRepository;
    identity?: IdentityProvider;
  } = {},
) {
  const app = express();
  app.disable('x-powered-by');
  if (config.TRUST_PROXY_HOPS) app.set('trust proxy', config.TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many requests. Please wait a minute.',
        },
      },
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use(
    cookieSession({
      name: 'diaspora_session',
      keys: config.sessionKeys,
      httpOnly: true,
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    }),
  );
  app.use(originProtection(config));
  const repository =
    dependencies.repository ??
    new GoogleSheetsVisitRepository(
      new GoogleSheetsClient(config),
      config.GOOGLE_SHEET_TAB,
    );
  const visits = new VisitController(new VisitService(repository));
  const auth = new AuthController(
    config,
    dependencies.identity ?? new GoogleIdentity(config),
  );
  app.use('/api', apiRoutes(config, visits, auth));
  app.get('/auth/google', auth.begin);
  app.get('/auth/google/callback', auth.callback);
  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'This endpoint does not exist.' },
    });
  });
  app.use(errorHandler);
  return app;
}
