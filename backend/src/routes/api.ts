import { Router } from 'express';
import QRCode from 'qrcode';
import type { Config } from '../configs/env.js';
import type { VisitController } from '../controllers/visit-controller.js';
import type { AuthController } from '../controllers/auth-controller.js';
import { csrfProtection, staffOnly } from '../middlewares/security.js';
import { AppError } from '../utils/errors.js';

export function apiRoutes(
  config: Config,
  visits: VisitController,
  auth: AuthController,
) {
  const api = Router();
  api.get('/health', (_req, res) => {
    res.json({ ok: true, persistenceConfigured: config.sheetsConfigured });
  });
  api.get('/config', (_req, res) => {
    res.json({
      timeZone: config.TIME_ZONE,
      staffSignInAvailable: config.oauthConfigured,
    });
  });
  api.get('/qr', async (req, res) => {
    const mode = req.query.mode ?? 'check-in';
    if (mode !== 'check-in' && mode !== 'check-out')
      throw new AppError(400, 'INVALID_MODE', 'Choose check-in or check-out.');
    const svg = await QRCode.toString(`${config.origin}/${mode}`, {
      type: 'svg',
      width: 300,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    res.type('image/svg+xml').send(svg);
  });
  api.post('/visits/check-in', visits.checkIn);
  api.post('/visits/check-out', visits.checkOut);
  api.get('/staff/session', staffOnly(config), auth.session);
  api.post('/staff/visits', staffOnly(config), csrfProtection, visits.register);
  api.post('/staff/logout', staffOnly(config), csrfProtection, auth.logout);
  return api;
}
