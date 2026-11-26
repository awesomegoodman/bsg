export type VisitMethod = 'Self-service' | 'Receptionist' | 'Visitor';
export interface Visit {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  purpose: string;
  signedInAt: string;
  signedOutAt: string;
  signInMethod: VisitMethod;
  signOutMethod: VisitMethod | '';
  status: 'Active' | 'Signed out';
}
