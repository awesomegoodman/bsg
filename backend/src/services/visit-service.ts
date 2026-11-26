import { randomBytes } from 'node:crypto';
import type {
  CheckInData,
  Visit,
  VisitMethod,
  VisitReceipt,
} from '@diaspora/shared';
import type { VisitRepository } from '../repositories/visit-repository.js';
import { AppError } from '../utils/errors.js';

const normalisePhone = (phone: string) => phone.replace(/[^\d]/g, '');
export class VisitService {
  constructor(
    private repository: VisitRepository,
    private now: () => Date = () => new Date(),
  ) {}
  async checkIn(data: CheckInData, method: VisitMethod): Promise<VisitReceipt> {
    return this.repository.exclusive(async () => {
      const existing = await this.repository.all();
      if (
        existing.some(
          (visit) =>
            visit.status === 'Active' &&
            normalisePhone(visit.phone) === normalisePhone(data.phone),
        )
      )
        throw new AppError(
          409,
          'ACTIVE_VISIT',
          'This phone number already has an active visit. Please check out first or ask reception for help.',
        );
      const visit: Visit = {
        ...data,
        id: `DI-${randomBytes(18).toString('hex').toUpperCase()}`,
        purpose: '',
        signedInAt: this.now().toISOString(),
        signedOutAt: '',
        signInMethod: method,
        signOutMethod: '',
        status: 'Active',
      };
      await this.repository.append(visit);
      return {
        visitId: visit.id,
        firstName: visit.firstName,
        lastName: visit.lastName,
        signedInAt: visit.signedInAt,
      };
    });
  }
  async checkOut(id: string) {
    return this.repository.exclusive(async () => {
      const time = this.now().toISOString();
      await this.repository.finish(id, time, 'Visitor');
      return { signedOutAt: time };
    });
  }
}
