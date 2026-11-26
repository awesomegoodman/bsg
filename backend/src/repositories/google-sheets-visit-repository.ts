import type { Visit, VisitMethod } from '@diaspora/shared';
import type { SheetsClient } from '../integrations/sheets-client.js';
import type { VisitRepository } from './visit-repository.js';
import { AppError } from '../utils/errors.js';
import { Mutex } from '../utils/mutex.js';

export const HEADERS = [
  'Visit ID',
  'First Name',
  'Last Name',
  'Phone Number',
  'Email',
  'Purpose of Visit',
  'Sign-in Time',
  'Sign-out Time',
  'Sign-in Method',
  'Sign-out Method',
  'Visit Status',
];
const ALTERNATE_HEADERS = [
  'Visit ID',
  'First Name',
  'Last Name',
  'Phone',
  'Email',
  'Purpose',
  'Signed In At',
  'Signed Out At',
  'Sign In Method',
  'Sign Out Method',
  'Status',
];
const MAX_VISITS = 20000;
export function toRow(visit: Visit): string[] {
  return [
    visit.id,
    visit.firstName,
    visit.lastName,
    visit.phone,
    visit.email,
    visit.purpose,
    visit.signedInAt,
    visit.signedOutAt,
    visit.signInMethod,
    visit.signOutMethod,
    visit.status,
  ];
}

export class GoogleSheetsVisitRepository implements VisitRepository {
  private mutex = new Mutex();
  private cache?: { at: number; rows: string[][] };
  private tab: string;
  constructor(
    private sheets: SheetsClient,
    tab: string,
  ) {
    this.tab = `'${tab.replace(/'/g, "''")}'`;
  }
  exclusive<T>(operation: () => Promise<T>) {
    return this.mutex.run(async () => {
      this.cache = undefined;
      return operation();
    });
  }
  private async rows(force = false): Promise<string[][]> {
    if (!force && this.cache && Date.now() - this.cache.at < 3000)
      return this.cache.rows;
    const rows = await this.sheets.read(`${this.tab}!A1:K${MAX_VISITS + 2}`);
    if (!rows.length) {
      await this.sheets.update(`${this.tab}!A1:K1`, [HEADERS]);
      rows.push(HEADERS);
    }
    if (
      HEADERS.some(
        (header, index) =>
          rows[0]?.[index] !== header &&
          rows[0]?.[index] !== ALTERNATE_HEADERS[index],
      )
    )
      throw new AppError(
        503,
        'SHEET_LAYOUT',
        'The visitor register needs attention. Please contact reception.',
      );
    if (rows.length > MAX_VISITS + 1)
      throw new AppError(
        503,
        'SHEET_CAPACITY',
        'The visitor register needs archiving. Please contact reception.',
      );
    this.cache = { at: Date.now(), rows };
    return rows;
  }
  async all(): Promise<Visit[]> {
    return (await this.rows())
      .slice(1)
      .filter((row) => row[0])
      .map((row) => ({
        id: row[0] ?? '',
        firstName: row[1] ?? '',
        lastName: row[2] ?? '',
        phone: row[3] ?? '',
        email: row[4] ?? '',
        purpose: row[5] ?? '',
        signedInAt: row[6] ?? '',
        signedOutAt: row[7] ?? '',
        signInMethod:
          row[8] === 'Receptionist' ? 'Receptionist' : 'Self-service',
        signOutMethod:
          row[9] === 'Receptionist' ? 'Receptionist' : row[9] ? 'Visitor' : '',
        status: row[10] === 'Signed out' ? 'Signed out' : 'Active',
      }));
  }
  async append(visit: Visit) {
    const rows = await this.rows();
    if (rows.length >= MAX_VISITS + 1)
      throw new AppError(
        503,
        'SHEET_CAPACITY',
        'The visitor register needs archiving. Please contact reception.',
      );
    try {
      await this.sheets.append(`${this.tab}!A:K`, [toRow(visit)]);
    } catch (error) {
      this.cache = undefined;
      // An append may have succeeded despite a lost response. Reconcile, never replay.
      try {
        if ((await this.rows(true)).some((row) => row[0] === visit.id)) return;
      } catch {
        /* Report uncertainty without another write. */
      }
      if (error instanceof AppError && error.code === 'STORAGE_NOT_CONFIGURED')
        throw error;
      throw new AppError(
        503,
        'SAVE_UNCERTAIN',
        'We could not confirm your check-in. Ask reception to check the register before trying again.',
      );
    } finally {
      this.cache = undefined;
    }
  }
  async finish(id: string, time: string, method: VisitMethod) {
    const rows = await this.rows(true);
    const index = rows.findIndex((row) => row[0] === id);
    if (index < 1)
      throw new AppError(
        404,
        'VISIT_NOT_FOUND',
        'We could not find that visit. Check your confirmation reference.',
      );
    const row = rows[index]!;
    if (row[10] === 'Signed out')
      throw new AppError(
        409,
        'ALREADY_CHECKED_OUT',
        'This visit has already been checked out.',
      );
    try {
      await this.sheets.update(`${this.tab}!H${index + 1}:K${index + 1}`, [
        [time, row[8] ?? 'Self-service', method, 'Signed out'],
      ]);
    } finally {
      this.cache = undefined;
    }
  }
}
