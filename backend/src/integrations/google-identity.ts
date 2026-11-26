import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import type { Config } from '../configs/env.js';
import { AppError } from '../utils/errors.js';

export interface IdentityProvider {
  authorisationUrl(state: string, nonce: string, challenge: string): string;
  verify(code: string, verifier: string, nonce: string): Promise<string>;
}
export class GoogleIdentity implements IdentityProvider {
  private client: OAuth2Client;
  constructor(private config: Config) {
    this.client = new OAuth2Client(
      config.GOOGLE_OAUTH_CLIENT_ID,
      config.GOOGLE_OAUTH_CLIENT_SECRET,
      config.GOOGLE_OAUTH_CALLBACK_URL ??
        `${config.origin}/auth/google/callback`,
    );
  }
  authorisationUrl(state: string, nonce: string, challenge: string) {
    if (!this.config.oauthConfigured)
      throw new AppError(
        503,
        'AUTH_NOT_CONFIGURED',
        'Staff sign-in is not configured. Please contact your administrator.',
      );
    return this.client.generateAuthUrl({
      scope: ['openid', 'email'],
      state,
      nonce,
      prompt: 'select_account',
      code_challenge: challenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });
  }
  async verify(code: string, verifier: string, nonce: string) {
    try {
      const { tokens } = await this.client.getToken({
        code,
        codeVerifier: verifier,
      });
      if (!tokens.id_token) throw new Error('Missing ID token');
      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: this.config.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (
        !payload?.email_verified ||
        !payload.email ||
        (payload as unknown as { nonce?: string }).nonce !== nonce
      )
        throw new Error('Invalid identity');
      return payload.email.toLowerCase();
    } catch {
      throw new AppError(
        401,
        'AUTH_FAILED',
        'Google sign-in could not be verified. Please try again.',
      );
    }
  }
}
