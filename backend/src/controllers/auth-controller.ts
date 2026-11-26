import { createHash, randomBytes } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Config } from '../configs/env.js';
import type { IdentityProvider } from '../integrations/google-identity.js';
import { AppError } from '../utils/errors.js';

export class AuthController {
  constructor(
    private config: Config,
    private identity: IdentityProvider,
  ) {}
  begin: RequestHandler = (req, res) => {
    const state = randomBytes(24).toString('hex');
    const nonce = randomBytes(24).toString('hex');
    const verifier = randomBytes(48).toString('base64url');
    const url = this.identity.authorisationUrl(
      state,
      nonce,
      createHash('sha256').update(verifier).digest('base64url'),
    );
    req.session = {
      oauthState: state,
      nonce,
      verifier,
      oauthStartedAt: Date.now(),
    };
    res.redirect(url);
  };
  callback: RequestHandler = async (req, res) => {
    const session = req.session;
    req.session = null;
    if (
      typeof req.query.code !== 'string' ||
      typeof req.query.state !== 'string' ||
      !session?.oauthState ||
      req.query.state !== session.oauthState ||
      typeof session.oauthStartedAt !== 'number' ||
      Date.now() - session.oauthStartedAt > 10 * 60 * 1000 ||
      typeof session.verifier !== 'string' ||
      typeof session.nonce !== 'string'
    ) {
      res.redirect('/staff?authError=invalid');
      return;
    }
    try {
      const email = await this.identity.verify(
        req.query.code,
        session.verifier,
        session.nonce,
      );
      if (!this.config.allowedEmails.has(email))
        throw new AppError(
          403,
          'NOT_AUTHORISED',
          'This account is not authorised.',
        );
      req.session = {
        email,
        csrfToken: randomBytes(24).toString('hex'),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };
      res.redirect('/staff');
    } catch {
      res.redirect('/staff?authError=denied');
    }
  };
  session: RequestHandler = (req, res) => {
    res.json({ email: req.session!.email, csrfToken: req.session!.csrfToken });
  };
  logout: RequestHandler = (req, res) => {
    req.session = null;
    res.status(204).end();
  };
}
