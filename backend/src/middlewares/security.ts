import type { RequestHandler } from 'express';
import type { Config } from '../configs/env.js';
import { AppError } from '../utils/errors.js';

export const staffOnly =
  (config: Config): RequestHandler =>
  (req, _res, next) => {
    if (
      !req.session?.email ||
      typeof req.session.email !== 'string' ||
      !config.allowedEmails.has(req.session.email) ||
      typeof req.session.expiresAt !== 'number' ||
      req.session.expiresAt < Date.now()
    ) {
      req.session = null;
      throw new AppError(
        401,
        'AUTH_REQUIRED',
        'Sign in with an authorised reception account.',
      );
    }
    next();
  };
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (
    !req.session?.csrfToken ||
    req.get('x-csrf-token') !== req.session.csrfToken
  )
    throw new AppError(
      403,
      'INVALID_CSRF',
      'Your session needs refreshing. Please reload the page.',
    );
  next();
};
export const originProtection =
  (config: Config): RequestHandler =>
  (req, _res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.get('origin') && req.get('origin') !== config.origin)
        throw new AppError(
          403,
          'INVALID_ORIGIN',
          'This request is not permitted.',
        );
      if (!req.is('application/json'))
        throw new AppError(415, 'JSON_REQUIRED', 'Send JSON request data.');
    }
    next();
  };
