import type { SheetsClient } from '../src/integrations/sheets-client.js';

/** Test double for Google's transport only; exercises the real repository and services. */
export class SheetsFixture implements SheetsClient {
  rows: string[][] = [];
  appendCalls = 0;
  failReads = false;
  ambiguousAppend = false;
  async read() {
    if (this.failReads) throw new Error('Simulated upstream outage');
    return this.rows.map((row) => [...row]);
  }
  async update(range: string, values: string[][]) {
    if (range.endsWith('A1:K1')) {
      this.rows[0] = [...values[0]!];
      return;
    }
    const match = /!H(\d+):K\d+$/.exec(range);
    if (!match) throw new Error('Unexpected test range');
    const row = this.rows[Number(match[1]) - 1];
    if (!row) throw new Error('Missing fixture row');
    row.splice(7, 4, ...values[0]!);
  }
  async append(_range: string, values: string[][]) {
    this.appendCalls++;
    this.rows.push(...values.map((row) => [...row]));
    if (this.ambiguousAppend) throw new Error('Response lost after append');
  }
}
