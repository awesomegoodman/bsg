export interface VisitReceipt {
  visitId: string;
  firstName: string;
  lastName: string;
  signedInAt: string;
  signedOutAt?: string;
}
export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}
export interface StaffSession {
  email: string;
  csrfToken: string;
}
export interface PublicConfig {
  timeZone: string;
  staffSignInAvailable: boolean;
}
