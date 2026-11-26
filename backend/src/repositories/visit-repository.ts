import type { Visit, VisitMethod } from '@diaspora/shared';

export interface VisitRepository {
  exclusive<T>(operation: () => Promise<T>): Promise<T>;
  all(): Promise<Visit[]>;
  append(visit: Visit): Promise<void>;
  finish(id: string, time: string, method: VisitMethod): Promise<void>;
}
